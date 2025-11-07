"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MatchIntroPage() {
  const router = useRouter();
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    // Check authentication on mount
    const token = localStorage.getItem("sessionToken");
    if (!token) {
      router.push("/login");
      return;
    }

    // Check for existing active match
    checkExistingMatch();
  }, [router]);

  const checkExistingMatch = async () => {
    try {
      const token = localStorage.getItem("sessionToken");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/match/active`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Redirect to chat if active match exists
        router.push(`/match/chat?matchId=${data.matchId}`);
      }
    } catch (error) {
      console.error("Error checking existing match:", error);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#286633] text-white relative overflow-hidden">

      {/* Content */}
  <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-6">
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

        {/* Post-login access to Terms & Conditions */}
        <div className="mt-10">
          <button 
            onClick={() => setShowTermsModal(true)}
            className="text-sm underline text-white/80 hover:text-white"
          >
            View Terms & Conditions
          </button>
        </div>
      </div>

      {/* Terms & Conditions Modal (Read-only for existing users) */}
      {showTermsModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          onClick={() => setShowTermsModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-lg w-11/12 md:w-2/3 lg:w-1/2 max-w-2xl p-6 relative max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowTermsModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Title */}
            <h2 className="text-2xl font-bold text-green-800 mb-4 pr-8">
              Terms and Conditions
            </h2>

            {/* Scrollable content */}
            <div className="bg-green-50 p-4 rounded-md flex-1 overflow-y-auto mb-6">
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <h3 className="font-semibold text-green-800 mb-2">1. Acceptance of Terms</h3>
                  <p>
                    By accessing and using AniMatch, you accept and agree to be bound by the terms 
                    and provision of this agreement. If you do not agree to abide by the above, 
                    please do not use this service.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-green-800 mb-2">2. DLSU Student Handbook Compliance</h3>
                  <p>
                    All users must comply with the De La Salle University Student Handbook. 
                    Any violation of university policies through this platform may result in 
                    account suspension and reporting to university authorities.
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
                    with our Privacy Policy. By using AniMatch, you consent to the collection 
                    and use of information as outlined in our privacy practices.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-green-800 mb-2">5. Intellectual Property</h3>
                  <p>
                    All content on AniMatch is protected by intellectual property laws. 
                    Users may not reproduce, distribute, or create derivative works without permission.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-green-800 mb-2">6. Limitation of Liability</h3>
                  <p>
                    AniMatch is provided &quot;as is&quot; without warranties. We are not liable for any 
                    damages arising from the use of this service.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-green-800 mb-2">7. Changes to Terms</h3>
                  <p>
                    These terms may be updated periodically. Continued use of the service 
                    constitutes acceptance of revised terms.
                  </p>
                </div>

                <div className="pt-2 border-t border-green-200">
                  <p className="text-xs text-gray-500">
                    Last updated: November 7, 2024
                  </p>
                </div>
              </div>
            </div>

            {/* Close instruction */}
            <p className="text-xs text-gray-500 text-center">
              Click anywhere outside this box to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}