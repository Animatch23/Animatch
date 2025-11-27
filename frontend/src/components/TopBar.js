"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// App-wide top bar; left-side menu toggles chat history on chat pages, profile on right
export default function TopBar() {
  const pathname = usePathname();
  const showMenu = pathname === "/match/chat" || pathname?.startsWith("/match/chat/");
  const toggleSavedChats = () => {
    try {
      window.dispatchEvent(new CustomEvent("animatch:toggleSavedChats"));
    } catch (_) {
      // no-op on SSR
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 h-16 bg-[#286633] text-white z-40 shadow">
      <div className="max-w-6xl mx-auto h-full px-4 grid grid-cols-3 items-center">
        {/* Left: menu (chat history toggle) */}
        <div className="flex items-center">
          {showMenu && (
            <button
              type="button"
              aria-label="Open saved chats"
              className="p-2 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
              onClick={toggleSavedChats}
              title="Chat history"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
        </div>

        {/* Center: brand */}
        <div className="flex items-center justify-center">
          <Link href="/match" className="flex items-center gap-2 select-none">
            <svg
              viewBox="0 0 64 64"
              className="w-6 h-6 text-white"
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
            <span className="text-lg font-semibold tracking-wide">Animatch</span>
          </Link>
        </div>

        {/* Right: profile icon */}
        <div className="flex items-center justify-end">
          <Link
            href="/profile"
            title="My Profile"
            className="p-0.5 rounded-full ring-2 ring-white/70 hover:ring-white transition"
          >
            <span className="block w-9 h-9 rounded-full bg-white text-[#286633] flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
