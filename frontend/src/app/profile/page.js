"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [profile, setProfile] = useState({ username: "", hasPhoto: false });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("animatch:profile");
      if (raw) setProfile(JSON.parse(raw));
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-green-800 mb-6">My Profile</h1>
        <div className="bg-white rounded-lg shadow p-6 flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-green-100 border border-green-200 flex items-center justify-center overflow-hidden">
            {/* Placeholder avatar */}
            <svg className="w-12 h-12 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-xl font-semibold text-gray-800">{profile.username || "Anonymous"}</div>
            <div className="text-sm text-gray-500">Photo: {profile.hasPhoto ? "Uploaded" : "Not set"}</div>
            <div className="mt-4 flex gap-3">
              <Link href="/profile/edit" className="px-4 py-2 rounded-md bg-green-700 text-white hover:bg-green-800">Edit Profile</Link>
              <Link href="/profile/interests" className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800">Edit Interests</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
