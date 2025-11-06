"use client";

import TermsModal from "../../components/TermsModal";

export default function LoginPage() {
  return (
    <div className="flex h-screen">
      {/* Left Side Background */}
      <div
        className="hidden lg:block w-1/2 bg-cover bg-center"
        style={{ backgroundImage: "url('background.jpg')" }}
      ></div>

      {/* Right Side Content */}
      <div className="flex w-full lg:w-1/2 justify-center items-center bg-white">
        <div className="w-full max-w-md px-8">
          {/* Logo */}
          <div className="flex items-center mb-6">
            <img src="dlsu logo.png" alt="AniMatch Logo" className="w-10 h-10 mr-2" />
            <h1 className="text-2xl font-bold">
              <span className="text-green-800">Ani</span>
              <span className="text-red-600">Match</span>
            </h1>
          </div>

          {/* Heading */}
          <h2 className="text-3xl font-bold text-green-800 mb-2">Hello!</h2>
          <p className="text-sm text-gray-600 mb-6">
            Log in and start matching using AniMatch.
          </p>

          {/* Google Login Button */}
          <button
            className="w-full flex items-center justify-center gap-2 bg-green-100 hover:bg-green-200 text-green-900 font-medium p-3 rounded-md shadow-sm transition-colors"
          >
            {/* Envelope Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 12H8m8-4H8m8 8H8m12 0a2 2 0 002-2V6a2 
                2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 
                2h12z"
              />
            </svg>
            Login with your DLSU Google Account
          </button>

          {/* Terms and Conditions Modal */}
          <TermsModal />
        </div>
      </div>
    </div>
  );
}