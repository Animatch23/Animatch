"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfileSetup() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState(null);
  const [email, setEmail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedEmail =
      typeof window !== "undefined"
        ? localStorage.getItem("userEmail")
        : null;

    setEmail(storedEmail);
  }, []);

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleContinue = async () => {
    if (!displayName || !bio || !image) {
      alert("Please complete all fields.");
      return;
    }

    setIsLoading(true);

    try {
      const storedEmail =
        typeof window !== "undefined"
          ? localStorage.getItem("userEmail")
          : null;

      if (!storedEmail) {
        alert("Missing email. Please log in again.");
        setIsLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("email", storedEmail);
      formData.append("displayName", displayName);
      formData.append("bio", bio);
      formData.append("image", image);

      const response = await fetch(
        "https://animatch-api.vercel.app/api/profile/setup",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Profile setup error:", errorData);
        alert(errorData.error || "Failed to set up profile.");
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      console.log("Profile setup successful:", data);

      localStorage.setItem("userEmail", storedEmail);

      router.push("/preferences");
    } catch (error) {
      console.error("Error during fetch:", error);
      alert("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Profile Setup
        </h1>
        <p className="text-sm text-gray-600 mb-8">
          Let&apos;s set up your AniMatch profile to get started
        </p>

        {/* Display Name */}
        <label className="block mb-4">
          <span className="text-gray-700">Display Name</span>
          <input
            type="text"
            className="mt-1 block w-full border rounded-md p-2"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>

        {/* Bio */}
        <label className="block mb-4">
          <span className="text-gray-700">Bio</span>
          <textarea
            className="mt-1 block w-full border rounded-md p-2"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us something about yourself"
          />
        </label>

        {/* Image Upload */}
        <label className="block mb-6">
          <span className="text-gray-700">Profile Picture</span>
          <input
            type="file"
            accept="image/*"
            className="mt-1 block w-full"
            onChange={handleImageChange}
          />
        </label>

        <button
          onClick={handleContinue}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
        >
          {isLoading ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}
