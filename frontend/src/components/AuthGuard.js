"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Very lightweight client-side auth guard.
 * It checks a localStorage flag set on login (animatch_logged_in === 'true').
 * This is a FRONTEND-ONLY placeholder until real auth (e.g. next-auth) is wired.
 */
export default function AuthGuard({ children }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Defer to next tick so SSR hydration mismatch avoided
    const logged = typeof window !== 'undefined' && localStorage.getItem("animatch_logged_in") === "true";
    if (!logged) {
      router.replace("/login");
    } else {
      setAllowed(true);
    }
  }, [router]);

  if (!allowed) {
    return null; // or loading spinner
  }

  return children;
}
