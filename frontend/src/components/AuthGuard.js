"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthGuard({ children }) {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("sessionToken") : null;

    if (!token) {
      router.replace("/login");
      return;
    }

    setIsAllowed(true);
  }, [router]);

  if (!isAllowed) {
    return null;
  }

  return children;
}
