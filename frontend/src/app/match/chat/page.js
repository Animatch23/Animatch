"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChatInterface from "../../../components/ChatInterface";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const MAX_ACTIVE_CHAT_ATTEMPTS = 5;
const ACTIVE_CHAT_RETRY_DELAY_MS = 1000;

export default function MatchChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [chatInfo, setChatInfo] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("sessionToken");
    if (!storedToken) {
      router.replace("/login");
      return;
    }

    setToken(storedToken);

    if (!API_BASE) {
      setError("API URL is not configured.");
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    const delay = (ms) => new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

    const loadActiveChat = async () => {
      for (let attempt = 0; attempt < MAX_ACTIVE_CHAT_ATTEMPTS; attempt += 1) {
        try {
          const response = await fetch(`${API_BASE}/api/chat/active`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          });

          if (response.status === 404) {
            if (attempt === MAX_ACTIVE_CHAT_ATTEMPTS - 1) {
              sessionStorage.removeItem("activeChatSessionId");
              if (!isCancelled) {
                router.replace("/match");
              }
              return;
            }
          } else {
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(data.message || "Failed to load chat session");
            }

            sessionStorage.setItem("activeChatSessionId", data.chatSessionId);
            if (!isCancelled) {
              setChatInfo({
                chatSessionId: data.chatSessionId,
                partnerUsername: data.partnerUsername || "Match Partner",
                currentUserId: data.currentUserId || "",
              });
            }
            return;
          }
        } catch (err) {
          if (attempt === MAX_ACTIVE_CHAT_ATTEMPTS - 1 && !isCancelled) {
            setError(err instanceof Error ? err.message : "Failed to load chat session");
          }
        }

        await delay(ACTIVE_CHAT_RETRY_DELAY_MS);
      }
    };

    const initialise = async () => {
      await loadActiveChat();
      if (!isCancelled) {
        setIsLoading(false);
      }
    };

    initialise();

    return () => {
      isCancelled = true;
    };
  }, [router, searchParams]);

  const handleChatEnded = () => {
    sessionStorage.removeItem("activeChatSessionId");
    router.replace("/match");
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 text-gray-600">
        Connecting to your chat...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-gray-50 px-6 text-center gap-4">
        <h1 className="text-lg font-semibold text-gray-900">We could not open your chat.</h1>
        <p className="text-sm text-gray-600 max-w-md">{error}</p>
        <button
          type="button"
          onClick={() => router.replace("/match")}
          className="px-4 py-2 rounded-md bg-[#286633] text-white text-sm font-medium shadow-sm hover:brightness-110"
        >
          Back to matchmaking
        </button>
      </div>
    );
  }

  if (!chatInfo || !token) {
    return null;
  }

  return (
    <ChatInterface
      chatSessionId={chatInfo.chatSessionId}
      partnerUsername={chatInfo.partnerUsername}
      currentUserId={chatInfo.currentUserId}
      token={token}
      onChatEnded={handleChatEnded}
    />
  );
}
