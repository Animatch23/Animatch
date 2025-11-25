"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function ProfileSetup() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [image, setImage] = useState(null);
  const [email, setEmail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if user has pending auth from terms acceptance
    const pendingEmail = sessionStorage.getItem("pendingEmail");
    const pendingToken = sessionStorage.getItem("pendingToken");
    const termsAccepted = sessionStorage.getItem("termsAccepted");

    if (!pendingEmail || !pendingToken || !termsAccepted) {
      // If no pending auth or terms not accepted, redirect to login
      router.push("/login");
      return;
    }

    setEmail(pendingEmail);
  }, [router]);

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleContinue = async () => {
    if (!username) {
      setError("Username is required.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const pendingEmail = sessionStorage.getItem("pendingEmail");
      const pendingToken = sessionStorage.getItem("pendingToken");

      if (!pendingEmail || !pendingToken) {
        setError("Session expired. Please log in again.");
        setIsLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("email", pendingEmail);
      formData.append("username", username);
      formData.append("acceptTerms", "true"); // Mark terms as accepted
      
      if (image) {
        formData.append("profilePhoto", image);
      }

      const response = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Profile setup error:", errorData);
        setError(errorData.message || "Failed to set up profile.");
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      console.log("Profile setup successful:", data);

      // NOW move token and email to localStorage (user is fully registered)
      localStorage.setItem("sessionToken", pendingToken);
      localStorage.setItem("userEmail", pendingEmail);

      // Clear sessionStorage
      sessionStorage.removeItem("pendingToken");
      sessionStorage.removeItem("pendingEmail");
      sessionStorage.removeItem("termsAccepted");

      // Redirect to match page
      router.push("/match");
    } catch (err) {
      console.error("Error during profile setup:", err);
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex items-center mb-4">
          <img src="/dlsu logo.png" alt="AniMatch Logo" className="w-10 h-10 mr-2" />
          <h1 className="text-2xl font-bold">
            <span className="text-green-800">Ani</span>
            <span className="text-red-600">Match</span>
          </h1>
        </div>
        
        <h2 className="text-3xl font-bold text-green-800 mb-2">Profile Setup</h2>
        <p className="text-sm text-gray-600 mb-8">
          Let&apos;s set up your AniMatch profile to get started
        </p>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Username */}
        <label className="block mb-4">
          <span className="text-gray-700 font-medium">Username <span className="text-red-500">*</span></span>
          <input
            type="text"
            className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-green-500 focus:border-green-500"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
          />
        </label>

        {/* Image Upload */}
        <label className="block mb-6">
          <span className="text-gray-700 font-medium">Profile Picture (Optional)</span>
          <input
            type="file"
            accept="image/*"
            className="mt-1 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-green-50 file:text-green-700
              hover:file:bg-green-100"
            onChange={handleImageChange}
          />
        </label>

        <button
          onClick={handleContinue}
          disabled={isLoading}
          className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? "Creating Profile..." : "Create Profile"}
        </button>
      </div>
    </div>
  );
}
