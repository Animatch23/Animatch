"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ChatPage() {
  const params = useSearchParams();
  const router = useRouter();
  const chatId = params.get("chatId");

  useEffect(() => {
    if (!chatId) {
      router.replace("/match");
    }
  }, [chatId, router]);

  if (!chatId) return null;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-2">Chat</h1>
      <p className="text-gray-600 mb-4">ChatId: {chatId}</p>
      {/* Your chat UI goes here */}
    </div>
  );
}