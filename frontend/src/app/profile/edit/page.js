"use client";

import Link from "next/link";

export default function ProfileEditPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-green-800 mb-6">Edit Profile</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-700">This page will let you edit your username and photo. Coming soon.</p>
          <div className="mt-6">
            <Link href="/profile" className="px-4 py-2 rounded-md bg-green-700 text-white hover:bg-green-800">Back to Profile</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
