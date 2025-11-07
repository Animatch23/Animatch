"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Queue page: full-screen green with cancel top-left and circular loader
export default function MatchQueuePage() {
  const router = useRouter();

  // Simulate match found after a delay (UI-only)
  useEffect(() => {
    const t = setTimeout(() => router.push("/match/chat"), 8000);
    return () => clearTimeout(t);
  }, [router]);


  return (
    <div className="min-h-screen bg-[#286633] text-white relative overflow-hidden">
      {/* Close button */}
      <div className="absolute top-4 left-4">
        <button
          type="button"
          aria-label="Cancel matching"
          className="p-2 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          onClick={() => router.push("/match")}
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* Center spinner with icon */}
      <div className="flex flex-col items-center justify-center min-h-screen gap-6">
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
