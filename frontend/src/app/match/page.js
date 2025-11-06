"use client";

import Link from "next/link";

// Intro/landing for matching flow (UI-only)
export default function MatchIntroPage() {
  return (
    <div className="min-h-screen bg-[#286633] text-white relative overflow-hidden">
      {/* Top bar with sidebar (saved chats) icon */}
      <div className="absolute top-4 left-4">
        <button
          type="button"
          aria-label="Open saved chats sidebar"
          className="p-2 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          onClick={() => console.log("[UI ONLY] open saved chats sidebar")}
        >
          {/* Hamburger */}
          <div className="space-y-1.5">
            <span className="block w-7 h-0.5 bg-white rounded"></span>
            <span className="block w-7 h-0.5 bg-white rounded"></span>
            <span className="block w-7 h-0.5 bg-white rounded"></span>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        {/* Center icon (simple bow/arrow style) */}
        <svg
          viewBox="0 0 64 64"
          className="w-20 h-20 text-white mb-10"
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

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Link
            href="/match/queue"
            className="text-center bg-white text-green-800 font-semibold rounded-lg py-3 shadow hover:bg-white/90 transition-colors"
          >
            Start Matching
          </Link>
          <Link
            href="/profile-setup"
            className="text-center bg-white text-green-800 font-semibold rounded-lg py-3 shadow hover:bg-white/90 transition-colors"
          >
            Select Interests
          </Link>
        </div>

        {/* No stats shown (per request) */}
      </div>
    </div>
  );
}