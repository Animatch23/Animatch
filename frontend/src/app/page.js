"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const sessionToken = localStorage.getItem("sessionToken");
    
    if (sessionToken) {
      // User is logged in, redirect to match page
      router.replace("/match");
    } else {
      // User is not logged in, redirect to login page
      router.replace("/login");
    }
  }, [router]);

  // Show loading or nothing while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-green-800 mb-2">
          <span className="text-green-800">Ani</span>
          <span className="text-red-600">Match</span>
        </h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
