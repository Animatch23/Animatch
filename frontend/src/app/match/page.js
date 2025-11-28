"use client";

import Link from "next/link";
import Image from "next/image";
import SavedChatsList from "../../components/SavedChatsList";

// Intro/landing for matching flow (UI-only)
export default function MatchIntroPage() {
  // router not required here

  // no top-left back button on this page by design

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#286633] text-white relative overflow-hidden">
      {/* top-left back button intentionally removed to reduce UI clutter */}

      {/* Content */}
        {/* Use a symmetric 3-column layout on large screens so the center content remains visually centered
          - left column: saved chats (fixed width)
          - center column: actual page content (fluid)
          - right column: placeholder to balance the left sidebar width */}
        <div className="grid grid-cols-1 lg:grid-cols-[20rem_1fr_20rem] min-h-[calc(100vh-4rem)]">
        {/* Left Panel: Saved Chats */}
        <div className="hidden lg:block">
          <SavedChatsList visible={true} />
        </div>

        {/* Main Content - Centered */}
        {/* Center column */}
        <div className="lg:col-start-2 flex flex-col items-center justify-center px-6">
          {/* Center logo */}
          <div className="mb-10">
            <Image
              src="/animatch-logo-with-bg.png"
              alt="Animatch logo"
              width={80}
              height={80}
              className="w-20 h-20"
              priority
            />
          </div>

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

        {/* Right placeholder to balance the left sidebar and keep center content truly centered */}
        <div className="hidden lg:block" aria-hidden>
          {/* Intentionally empty: preserves symmetry so center column aligns to the page center */}
        </div>
      </div>
    </div>
  );
}