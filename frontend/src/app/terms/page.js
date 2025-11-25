"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';

export default function TermsPage() {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user has pending data from login
    const pendingEmail = sessionStorage.getItem("pendingEmail");
    const pendingToken = sessionStorage.getItem("pendingToken");
    
    if (!pendingEmail || !pendingToken) {
      // If no pending data, redirect to login
      router.push("/login");
    }
  }, [router]);

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);

    try {
      const pendingEmail = sessionStorage.getItem("pendingEmail");
      
      if (!pendingEmail) {
        throw new Error("Session expired. Please login again.");
      }

      // Mark that user accepted terms in sessionStorage
      // Actual terms will be saved when user is created in profile-setup
      sessionStorage.setItem("termsAccepted", "true");

      console.log("Terms accepted, redirecting to profile setup");
      
      // Redirect to profile setup
      router.push('/profile-setup');

    } catch (err) {
      console.error("Error accepting terms:", err);
      setError(err.message || "Failed to accept terms. Please try again.");
      setIsAccepting(false);
    }
  };

  const handleCancel = () => {
    // Clear pending data and redirect to login
    sessionStorage.removeItem("pendingEmail");
    sessionStorage.removeItem("pendingToken");
    router.push("/login");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/dlsu logo.png" alt="DLSU Logo" className="w-10 h-10 mr-2" />
            <h1 className="text-2xl font-bold">
              <span className="text-green-800">Ani</span>
              <span className="text-red-600">Match</span>
            </h1>
          </div>
          <h2 className="text-3xl font-bold text-green-800">
            Terms and Conditions
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            Please review and accept our terms to continue
          </p>
        </div>

        {/* Scrollable content */}
        <div className="bg-green-50 p-6 rounded-md flex-1 overflow-y-auto mb-6">
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

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleCancel}
            disabled={isAccepting}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={isAccepting}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-md transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isAccepting ? 'Accepting...' : 'Accept & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
