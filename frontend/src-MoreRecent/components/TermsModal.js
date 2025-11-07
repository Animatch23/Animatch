"use client";

import { useState } from "react";

export default function TermsModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Trigger link */}
      <p className="text-xs text-gray-600 mt-4 text-center">
        By signing up, you are agreeing to follow the DLSU student handbook and our{" "}
        <button
          className="font-semibold underline text-green-800 hover:text-green-600 transition-colors"
          onClick={() => setIsOpen(true)}
        >
          Terms and Conditions
        </button>
        .
      </p>

      {/* Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          onClick={(e) => {
            // Close modal when clicking on backdrop
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-2/3 lg:w-1/2 max-w-2xl p-6 relative max-h-[80vh] flex flex-col">
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
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
                {/* Placeholder content - replace with actual terms */}
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
                    AniMatch is provided "as is" without warranties. We are not liable for any 
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
                    Last updated: October 1, 2025
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md transition-colors"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}