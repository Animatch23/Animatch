"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const POLL_INTERVAL_MS = 3000;

export default function MatchQueuePage() {
  const router = useRouter();
  const [status, setStatus] = useState("joining");
  const [error, setError] = useState("");
  const [matchingStatus, setMatchingStatus] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const authTokenRef = useRef("");
  const pollTimerRef = useRef(null);
  const isUnmountedRef = useRef(false);
  const isJoiningRef = useRef(false);
  const notInQueueCountRef = useRef(0); // Track consecutive "not in queue" responses
  const hasJoinedSuccessfullyRef = useRef(false); // Track if join was successful
  const socketRef = useRef(null); // Socket connection for ghost user cleanup

  useEffect(() => {
    const token = localStorage.getItem("sessionToken");
    if (!token) {
      router.replace("/login");
      return;
    }

    isUnmountedRef.current = false;
    authTokenRef.current = token;
    notInQueueCountRef.current = 0; // Reset counter on mount
    hasJoinedSuccessfullyRef.current = false; // Reset join status on mount
    sessionStorage.removeItem("activeChatSessionId");

    if (!API_BASE) {
      setError("API URL is not configured.");
      setStatus("error");
      return;
    }

    // ⭐ GHOST USER CLEANUP: Establish socket connection while in queue
    // When user closes browser/tab, socket disconnects and server cleans up queue entry
    const socket = io(API_BASE, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[QUEUE] Socket connected for ghost user tracking');
    });

    socket.on('disconnect', () => {
      console.log('[QUEUE] Socket disconnected');
    });

    const handleMatch = (chatSessionId) => {
      if (!chatSessionId) {
        return;
      }
      sessionStorage.setItem("activeChatSessionId", chatSessionId);
      // Redirect with session parameter for consistency and test compatibility
      router.replace(`/match/chat?session=${chatSessionId}`);
    };

    const pollStatus = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/chat/queue/status`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authTokenRef.current}`,
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Failed to check queue status");
        }

        if (isUnmountedRef.current) {
          return;
        }

        if (data.matched && data.chatSessionId) {
          setStatus("matched");
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          handleMatch(data.chatSessionId);
          return;
        }

        // Handle case where user is no longer in queue and not matched
        // This can happen due to race conditions in concurrent matching
        // Instead of redirecting, try to re-join the queue
        if (!data.queued && !data.matched) {
          notInQueueCountRef.current += 1;
          console.log(`[QUEUE] Not in queue (attempt ${notInQueueCountRef.current}), will try to re-join...`);
          
          // Only give up after many consecutive failures (not just 3)
          // This handles race conditions where we get temporarily removed
          if (notInQueueCountRef.current >= 10 && hasJoinedSuccessfullyRef.current) {
            console.log("[QUEUE] Too many consecutive 'not in queue' responses - redirecting to match page");
            if (pollTimerRef.current) {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
            }
            router.replace("/match");
            return;
          }
          
          // Try to re-join the queue instead of just waiting
          try {
            const rejoinResponse = await fetch(`${API_BASE}/api/chat/queue/join`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authTokenRef.current}`,
              },
            });
            const rejoinData = await rejoinResponse.json().catch(() => ({}));
            
            if (rejoinData.matched && rejoinData.chatSessionId) {
              console.log("[QUEUE] Re-join resulted in match!");
              setStatus("matched");
              if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
              }
              handleMatch(rejoinData.chatSessionId);
              return;
            }
            
            if (rejoinData.queued) {
              console.log("[QUEUE] Successfully re-joined queue");
              notInQueueCountRef.current = 0; // Reset counter on successful rejoin
              setStatus("waiting");
            }
          } catch (rejoinErr) {
            console.error("[QUEUE] Failed to re-join:", rejoinErr);
          }
          return;
        }

        // Reset the counter when we get a valid queued response
        notInQueueCountRef.current = 0;

        setStatus("waiting");
        setMatchingStatus(data.matchingStatus || null);
      } catch (err) {
        if (isUnmountedRef.current) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to check queue status");
        setStatus("error");
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      }
    };

    const joinQueue = async () => {
      // Prevent multiple simultaneous join requests
      if (isJoiningRef.current) {
        return;
      }

      try {
        isJoiningRef.current = true;
        setStatus("joining");
        setError("");

        // Safety timeout: reset state if join takes too long
        const safetyTimeout = setTimeout(() => {
          if (isJoiningRef.current) {
            setError("Network timeout. Please try again.");
            setStatus("error");
            isJoiningRef.current = false;
          }
        }, 10000); // 10 seconds

        const response = await fetch(`${API_BASE}/api/chat/queue/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authTokenRef.current}`,
          },
        });

        clearTimeout(safetyTimeout); // Clear timeout on success

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Failed to join queue");
        }

        if (isUnmountedRef.current) {
          return;
        }

        if (data.matched && data.chatSessionId) {
          setStatus("matched");
          hasJoinedSuccessfullyRef.current = true; // Mark as joined (matched immediately)
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          handleMatch(data.chatSessionId);
          return;
        }

        // Successfully joined the queue
        hasJoinedSuccessfullyRef.current = true;
        setStatus("waiting");
        setMatchingStatus(data.matchingStatus || null);
        pollTimerRef.current = window.setInterval(pollStatus, POLL_INTERVAL_MS);
      } catch (err) {
        if (isUnmountedRef.current) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to join queue");
        setStatus("error");
      } finally {
        isJoiningRef.current = false;
      }
    };

    joinQueue();

    return () => {
      isUnmountedRef.current = true;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      // Disconnect socket - this triggers server-side queue cleanup
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      // Also try HTTP cleanup (may not work on browser close, but works on navigation)
      if (API_BASE && authTokenRef.current) {
        fetch(`${API_BASE}/api/chat/queue/leave`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authTokenRef.current}`,
          },
        }).catch(() => {});
      }
    };
  }, [router]);

  const handleCancel = async () => {
    if (!API_BASE || !authTokenRef.current || isCancelling) {
      router.replace("/match");
      return;
    }

    try {
      setIsCancelling(true);
      await fetch(`${API_BASE}/api/chat/queue/leave`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authTokenRef.current}`,
        },
      }).catch(() => {});
    } finally {
      router.replace("/match");
    }
  };

  // t
  const getStatusLabel = () => {
    if (error) {
      return "We hit an issue while matching.";
    }

    switch (status) {
      case "joining":
        return "Joining the queue...";
      case "waiting":
        // If in similarity mode and best match is below threshold
        if (matchingStatus?.mode === 'similarity' && matchingStatus?.belowThreshold) {
          return "Finding a Better Match...";
        }
        return "Looking for a great match...";
      case "matched":
        return "Match found! Connecting you now...";
      case "error":
        return "We hit an issue while matching.";
      default:
        return "Preparing your match...";
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#286633] text-white relative overflow-hidden">
      <div className="absolute top-4 left-4">
        <button
          type="button"
          aria-label="Cancel matching"
          className="p-2 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          onClick={handleCancel}
          disabled={isCancelling}
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-6 px-4 text-center">
        <div className="relative w-56 h-56">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="12" />
          </svg>
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: "1.5s" }}>
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="white"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray="150 251"
            />
          </svg>

          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              viewBox="0 0 64 64"
              className="w-16 h-16 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 40 C24 22, 42 22, 54 40" />
              <path d="M10 40 L32 32" />
              <path d="M54 40 L32 32" />
              <path d="M50 28 l8 -2 l-2 8" />
            </svg>
          </div>
        </div>

        <div className="space-y-3 max-w-lg">
          <div className="text-lg font-medium text-white/95">{getStatusLabel()}</div>
          {error && (
            <div className="rounded-md border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-900">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
