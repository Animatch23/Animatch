"use client";

import { usePathname } from "next/navigation";
import TopBar from "./TopBar";

// Shows TopBar on all pages except /login and /profile-setup
export default function TopBarWrapper() {
  const pathname = usePathname();
  const hideOn = ["/login", "/profile-setup"];
  const shouldHide = hideOn.some((p) => pathname === p || pathname?.startsWith(p + "/"));

  if (shouldHide) return null;
  return (
    <>
      <TopBar />
      {/* Spacer for fixed top bar (h-16) */}
      <div className="h-16" />
    </>
  );
}
