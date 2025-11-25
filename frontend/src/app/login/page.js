"use client";

import { useCallback, useEffect, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import TermsModal from "../../components/TermsModal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("sessionToken");
    if (token) {
      router.replace("/match");
    }
  }, [router]);

  const exchangeAuthCode = useCallback(
    async (code) => {
      if (!API_BASE) {
        setError("API URL is not configured");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        // 1. Exchange Google Code for Token
        const response = await fetch(`${API_BASE}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Authentication failed");
        }

        const { token, email } = data;

        if (!token || !email) {
          throw new Error("Invalid authentication response");
        }

        // 2. Save Session
        localStorage.setItem("sessionToken", token);
        localStorage.setItem("userEmail", email);

        // Clean the URL (remove ?code=...)
        window.history.replaceState({}, document.title, "/login");

        // 3. Check if User Exists in DB
        console.log("Checking if user exists...");
        const existResponse = await fetch(`${API_BASE}/api/exist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const existData = await existResponse.json();
        const exists = existData.exists;
        console.log("User exists:", exists);

        // 4. Handle Redirection
        if (exists) {
          // Existing user -> Go to match
          // Using window.location for a hard refresh/reliable redirect often helps with auth state
          window.location.href = "/match"; 
        } else {
          // New user -> Go to profile setup
          // (Or /terms if that was your intended flow, but /profile-setup is standard)
          router.push("/profile-setup");
        }

      } catch (err) {
        console.error("Login error:", err);
        setError(err instanceof Error ? err.message : "Login failed. Please try again.");
        // Clean URL on error too so user can try again cleanly
        window.history.replaceState({}, document.title, "/login");
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  // Listen for Google Callback Code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      exchangeAuthCode(code);
    }
  }, [exchangeAuthCode]);

  const startGoogleLogin = useGoogleLogin({
    flow: "auth-code",
    ux_mode: "redirect",
    redirect_uri: typeof window !== 'undefined' ? window.location.origin + '/login' : undefined,
    onSuccess: async ({ code }) => {
      if (code) {
        await exchangeAuthCode(code);
      }
    },
    onError: () => {
      setError("Google authentication was cancelled or failed.");
    },
  });

  return (
    <div className="flex h-screen">
      <div
        className="hidden lg:block w-1/2 bg-cover bg-center"
        style={{ backgroundImage: "url('/background.jpg')" }}
      ></div>

      <div className="flex w-full lg:w-1/2 justify-center items-center bg-white">
        <div className="w-full max-w-md px-8">
          <div className="flex items-center mb-6">
            <img src="/dlsu logo.png" alt="AniMatch Logo" className="w-10 h-10 mr-2" />
            <h1 className="text-2xl font-bold">
              <span className="text-green-800">Ani</span>
              <span className="text-red-600">Match</span>
            </h1>
          </div>

          <h2 className="text-3xl font-bold text-green-800 mb-2">Hello!</h2>
          <p className="text-sm text-gray-600 mb-6">Log in and start matching using AniMatch.</p>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => startGoogleLogin()}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-green-100 hover:bg-green-200 text-green-900 font-medium p-3 rounded-md shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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
                d="M16 12H8m8-4H8m8 8H8m12 0a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h12z"
              />
            </svg>
            {isLoading ? "Signing in..." : "Login with your DLSU Google Account"}
          </button>

          <TermsModal />
        </div>
      </div>
    </div>
  );
}