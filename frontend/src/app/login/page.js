"use client";

import { useEffect, useState } from "react";
import { useGoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import TermsModal from "@/components/TermsModal";

export default function LoginPage() {
  const router = useRouter();
  const [showTerms, setShowTerms] = useState(false);
  const [pendingUserData, setPendingUserData] = useState(null);

  useEffect(() => {
    const handleRedirectCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code }),
          });

          if (!response.ok) {
            console.error("Authentication failed");
            window.history.replaceState({}, document.title, "/login");
            return;
          }

          const data = await response.json();

          if (!data.token) {
            console.error("No token received");
            window.history.replaceState({}, document.title, "/login");
            return; 
          }

          const sessionToken = data.token;
          const email = data.email;

          // Clean up URL
          window.history.replaceState({}, document.title, "/login");

          // Check if user exists
          const checkEmailResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/exist`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const existData = await checkEmailResponse.json();
          const exists = existData.exists;

          if (exists) {
            // Existing user - store token and go to match
            localStorage.setItem("sessionToken", sessionToken);
            router.push('/match');
          } else {
            setPendingUserData({ email, sessionToken });
            setShowTerms(true);
          }
        } catch (error) {
          console.error("Error during authentication:", error);
          window.history.replaceState({}, document.title, "/login");
        }
      }
    };
    handleRedirectCallback();
  }, [router]);

  const handleTermsAccept = () => {
    sessionStorage.setItem("pendingEmail", pendingUserData.email);
    sessionStorage.setItem("pendingToken", pendingUserData.sessionToken);
    
    // Redirect to profile setup
    router.push('/profile-setup');
  };

  const handleTermsCancel = () => {
    // Clear pending data and stay on login
    setShowTerms(false);
    setPendingUserData(null);
  };

  const login = useGoogleLogin({
    flow: "auth-code",
    ux_mode: "redirect",
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
  });

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
          <button onClick={() => login()}
            className="w-full flex items-center justify-center gap-2 bg-green-100 hover:bg-green-200 text-green-900 font-medium p-3 rounded-md shadow-sm transition-colors"
          >
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

          <p className="text-[11px] text-gray-400 mt-4 text-center">
            By continuing you confirm you&apos;re a DLSU student. Terms & Conditions will be available after login.
          </p>
        </div>
      </div>

      {/* Terms Modal for new users */}
      {showTerms && (
        <TermsModal
          defaultOpen={true}
          showTrigger={false}
          onAccept={handleTermsAccept}
          onCancel={handleTermsCancel}
        />
      )}
    </div>
  );
}