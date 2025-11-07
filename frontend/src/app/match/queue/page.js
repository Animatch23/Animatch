"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function MatchQueuePage() {
  const router = useRouter();
  const pollingIntervalRef = useRef(null);
  const hasJoinedQueue = useRef(false);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("sessionToken");
    if (!token) {
      router.push("/login");
      return;
    }

    // Join queue on mount
    joinQueue();

    // Cleanup on unmount
    return () => {
      stopPolling();
      leaveQueue();
    };
  }, [router]);

  const joinQueue = async () => {
    if (hasJoinedQueue.current) return;
    hasJoinedQueue.current = true;

    try {
      const token = localStorage.getItem("sessionToken");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/queue/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("sessionToken");
          router.push("/login");
          return;
        }
        console.error("Failed to join queue:", data.message);
        router.push("/match");
        return;
      }

      if (data.matched) {
        // Immediate match found
        handleMatchFound(data);
      } else {
        // Start polling for match
        startPolling();
      }
    } catch (error) {
      console.error("Queue join error:", error);
      router.push("/match");
    }
  };

  const startPolling = () => {
    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem("sessionToken");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/queue/status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            stopPolling();
            localStorage.removeItem("sessionToken");
            router.push("/login");
            return;
          }
          return;
        }

        const data = await response.json();

        if (data.matched) {
          stopPolling();
          handleMatchFound(data);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleMatchFound = (data) => {
    // Redirect to chat with matchId
    router.push(`/match/chat?matchId=${data.matchId}`);
  };

  const handleCancel = async () => {
    stopPolling();
    await leaveQueue();
    router.push("/match");
  };

  const leaveQueue = async () => {
    try {
      const token = localStorage.getItem("sessionToken");
      if (!token) return;

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/queue/leave`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error("Error leaving queue:", error);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#286633] text-white relative overflow-hidden">
      {/* Close button */}
      <div className="absolute top-4 left-4">
        <button
          type="button"
          aria-label="Cancel matching"
          className="p-2 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          onClick={handleCancel}
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* Center spinner with icon */}
  <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-6">
        <div className="relative w-56 h-56">
          {/* SVG spinner with rounded arc caps */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            {/* Base ring */}
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="12" />
            {/* Rotating arc with rounded ends */}
            <g className="animate-spin origin-center [transform-box:fill-box]" style={{ animationDuration: "1.5s" }}>
              {/* Fallback rotation for browsers that ignore CSS transforms on SVG */}
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

          {/* Center icon */}
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
        {/* Helper text under spinner */}
        <div className="text-white/90 text-base">Finding a good match for you...</div>
      </div>
    </div>
  );
}