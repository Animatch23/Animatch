"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import SavedChatsList from "../../components/SavedChatsList";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// Intro/landing for matching flow (UI-only)
export default function MatchIntroPage() {
  const router = useRouter();
  const [hasActiveChat, setHasActiveChat] = useState(false);
  const [checkingActive, setCheckingActive] = useState(true);

  // Check for active unsaved chat
  const checkActiveChat = async (showLoading = true) => {
    const token = localStorage.getItem("sessionToken");
    if (!token) {
      setCheckingActive(false);
      return;
    }
    
    if (showLoading) setCheckingActive(true);
    
    try {
      // Use unsavedOnly=true to only detect unsaved active chats
      const res = await fetch(`${API_BASE}/api/chat/active?unsavedOnly=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setHasActiveChat(!!data?.chatSessionId);
      } else {
        // 404 means no unsaved active chat
        setHasActiveChat(false);
      }
    } catch (err) {
      console.error("Error checking active chat:", err);
      setHasActiveChat(false);
    } finally {
      setCheckingActive(false);
    }
  };

  // Check on mount
  useEffect(() => {
    checkActiveChat();
  }, []);

  // Re-check when window regains focus (user might have saved the chat in another tab/navigation)
  useEffect(() => {
    const handleFocus = () => {
      checkActiveChat(false); // Don't show loading spinner on focus re-check
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleReturnToActiveMatch = () => {
    router.push("/match/chat");
  };

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
            {/* Conditional button: Return to Active Match if active chat exists, otherwise Start Matching */}
            {checkingActive ? (
              <div className="text-center bg-white/50 text-green-800 font-semibold rounded-lg py-3 shadow">
                <div className="animate-spin inline-block w-5 h-5 border-2 border-green-800 border-t-transparent rounded-full"></div>
              </div>
            ) : hasActiveChat ? (
              <button
                onClick={handleReturnToActiveMatch}
                className="text-center bg-white text-green-800 font-semibold rounded-lg py-3 shadow hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Return to Active Match
              </button>
            ) : (
              <Link
                href="/match/queue"
                className="text-center bg-white text-green-800 font-semibold rounded-lg py-3 shadow hover:bg-white/90 transition-colors"
              >
                Start Matching
              </Link>
            )}
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