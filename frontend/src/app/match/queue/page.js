"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const POLL_INTERVAL_MS = 3000;

export default function MatchQueuePage() {
  const router = useRouter();
  const [status, setStatus] = useState("joining");
  const [error, setError] = useState("");
  const [position, setPosition] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const authTokenRef = useRef("");
  const pollTimerRef = useRef(null);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem("sessionToken");
    if (!token) {
      router.replace("/login");
      return;
    }

    isUnmountedRef.current = false;
    authTokenRef.current = token;
    sessionStorage.removeItem("activeChatSessionId");

    if (!API_BASE) {
      setError("API URL is not configured.");
      setStatus("error");
      return;
    }

    const handleMatch = (chatSessionId) => {
      if (!chatSessionId) {
        return;
      }
      sessionStorage.setItem("activeChatSessionId", chatSessionId);
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

        setStatus("waiting");
        setPosition(typeof data.position === "number" ? data.position : null);
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
      try {
        setStatus("joining");
        setError("");

        const response = await fetch(`${API_BASE}/api/chat/queue/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authTokenRef.current}`,
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Failed to join queue");
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

        setStatus("waiting");
        setPosition(typeof data.position === "number" ? data.position : null);
        pollTimerRef.current = window.setInterval(pollStatus, POLL_INTERVAL_MS);
      } catch (err) {
        if (isUnmountedRef.current) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to join queue");
        setStatus("error");
      }
    };

    joinQueue();

    return () => {
      isUnmountedRef.current = true;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

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

  const getStatusLabel = () => {
    if (error) {
      return "We hit an issue while matching.";
    }

    switch (status) {
      case "joining":
        return "Joining the queue...";
      case "waiting":
        return position && position > 1
          ? `You are in the queue (position ${position}).`
          : "Looking for a great match...";
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
            <g className="animate-spin origin-center [transform-box:fill-box]" style={{ animationDuration: "1.5s" }}>
              <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="1.5s" repeatCount="indefinite" />
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
            </g>
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
          {status === "waiting" && position && position > 1 && (
            <div className="text-sm text-white/80">
              Hang tight! There {position === 2 ? "is" : "are"} {position - 1} {position - 1 === 1 ? "person" : "people"} ahead of you.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
