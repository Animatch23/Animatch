"use client";

import Link from "next/link";

// Intro/landing for matching flow (UI-only)
export default function MatchIntroPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-brand-700 text-white relative overflow-hidden">

      {/* Content */}
  <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-6">
        {/* Center logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/animatch-logo-2.png"
          alt="AniMatch Logo"
          className="w-20 h-20 mb-10 object-contain"
        />

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Link
            href="/match/queue"
            className="text-center bg-white text-green-800 font-semibold rounded-lg py-3 shadow hover:bg-white/90 transition-colors"
          >
            Start Matching
          </Link>
          <Link
            href="/profile/interests?from=match"
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