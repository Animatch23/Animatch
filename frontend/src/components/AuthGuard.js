"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Client-side auth guard to protect routes.
 * Checks for sessionToken in localStorage to verify authentication.
 * Redirects to /login if not authenticated.
 */
export default function AuthGuard({ children }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Check if user has a valid session token
    const sessionToken = typeof window !== 'undefined' && localStorage.getItem("sessionToken");
    
    if (!sessionToken) {
      // No token found, redirect to login
      router.replace("/login");
    } else {
      // Token exists, allow access
      setAllowed(true);
    }
  }, [router]);

  if (!allowed) {
    return null; // or loading spinner
  }

  return children;
}
