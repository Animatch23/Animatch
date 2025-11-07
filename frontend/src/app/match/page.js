"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MatchIntroPage() {
  const router = useRouter();
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("sessionToken");
    if (!token) {
      router.push("/login");
      return;
    }
    // Remove active match check from here - let user manually choose to go to chat
    // This prevents the ping-pong effect
  }, [router]);

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
            className="text-center bg-transparent border-2 border-white text-white font-semibold rounded-lg py-3 hover:bg-white/10 transition-colors"
          >
            Set Up Profile
          </Link>
          <button
            onClick={() => setShowTermsModal(true)}
            className="text-center text-sm underline hover:text-white/80"
          >
            View Terms and Conditions
          </button>
        </div>
      </div>

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-green-800">Terms and Conditions</h2>
              <button
                onClick={() => setShowTermsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="text-gray-700 space-y-4">
              <div>
                <h3 className="font-semibold text-green-800 mb-2">1. Acceptance of Terms</h3>
                <p>
                  By accessing and using AniMatch, you accept and agree to be bound by the terms 
                  and provision of this agreement.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-green-800 mb-2">2. Use License</h3>
                <p>
                  Permission is granted to temporarily use AniMatch for personal, 
                  non-commercial transitory viewing only.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-green-800 mb-2">3. User Conduct</h3>
                <p>
                  Users are expected to maintain respectful and appropriate behavior. 
                  Harassment, inappropriate content, or misuse of the platform is strictly prohibited.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-green-800 mb-2">4. Privacy and Data</h3>
                <p>
                  Your privacy is important to us. We collect and use information in accordance 
                  with our Privacy Policy.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-green-800 mb-2">5. Modifications</h3>
                <p>
                  AniMatch reserves the right to revise these terms at any time without notice.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowTermsModal(false)}
                className="w-full bg-green-700 text-white py-2 rounded-lg hover:bg-green-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}