"use client";

import AuthGuard from "../../components/AuthGuard";
import TermsModal from "../../components/TermsModal";
import { useRouter } from "next/navigation";

export default function TermsPage() {
  const router = useRouter();
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          {/* Render modal content opened by default without trigger. Navigate back to /match when accepted */}
          <TermsModal
            defaultOpen={true}
            showTrigger={false}
            onAccept={() => router.push("/match")}
          />
        </div>
      </div>
    </AuthGuard>
  );
}
