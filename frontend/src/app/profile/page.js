"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState({ username: "", hasPhoto: false, profilePicture: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const email = localStorage.getItem("userEmail");
        if (!email) {
          setIsLoading(false);
          return;
        }

        // Fetch user profile from database
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/exist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setProfile({
              username: data.user.username || "",
              hasPhoto: !!data.user.profilePicture,
              profilePicture: data.user.profilePicture
            });
          }
        } else {
          // Fallback to localStorage
          const raw = localStorage.getItem("animatch:profile");
          if (raw) setProfile(JSON.parse(raw));
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        // Fallback to localStorage
        try {
          const raw = localStorage.getItem("animatch:profile");
          if (raw) setProfile(JSON.parse(raw));
        } catch {}
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleLogout = async () => {
    try {
      // Notify any active chat partners that we're logging out
      const token = localStorage.getItem("sessionToken");
      if (token && process.env.NEXT_PUBLIC_API_URL) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/notify-logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {}); // Ignore errors - logout should proceed regardless
      }
    } catch (err) {
      // Ignore errors - logout should proceed regardless
    }
    
    // Clear all auth-related localStorage items
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("animatch:profile");
    // Redirect to login page
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/match')}
              className="p-2 rounded-md hover:bg-gray-200 transition-colors"
              aria-label="Back to Match"
            >
              <svg className="w-6 h-6 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-green-800">My Profile</h1>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600">Loading profile...</p>
          </div>
        ) : (
        <div className="bg-white rounded-lg shadow p-6 flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-green-100 border border-green-200 flex items-center justify-center overflow-hidden">
            {profile.profilePicture?.url ? (
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL}/api${profile.profilePicture.url}`}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <svg className="w-12 h-12 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <div className="text-xl font-semibold text-gray-800">{profile.username || "Anonymous"}</div>
            <div className="text-sm text-gray-500">Photo: {profile.hasPhoto ? "Uploaded" : "Not set"}</div>
            <div className="mt-4 flex gap-3">
              <Link href="/profile/edit" className="px-4 py-2 rounded-md bg-green-700 text-white hover:bg-green-800">Edit Profile</Link>
              <Link href="/profile/interests?from=profile" className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800">Edit Interests</Link>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
