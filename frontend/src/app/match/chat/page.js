"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChatInterface from "../../../components/ChatInterface";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const MAX_ACTIVE_CHAT_ATTEMPTS = 5;
const ACTIVE_CHAT_RETRY_DELAY_MS = 1000;

// 1. Extract the Loading UI into a reusable component
function LoadingView() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 text-gray-600">
      Connecting to your chat...
    </div>
  );
}

// 2. Move your original logic into this inner component
function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [chatInfo, setChatInfo] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [active, setActive] = useState(false);

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

    // Check if we're opening a specific saved session
    const sessionParam = searchParams.get('session');

    const loadSavedSession = async (sessionId) => {
      try {
        const response = await fetch(`${API_BASE}/api/chat/${sessionId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.msg || data.message || "Failed to load saved chat");
        }

        // Get current user's email to identify which participant is the partner
        const currentUserEmail = localStorage.getItem("userEmail");
        
        // Try to get current user info to filter participants correctly
        let currentUserId = "";
        try {
          const userResponse = await fetch(`${API_BASE}/api/exist`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: currentUserEmail }),
          });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            currentUserId = userData.user?._id || "";
          }
        } catch (err) {
          console.warn("Could not fetch current user info:", err);
        }

        // Get partner info (filter out current user from participants)
        let partner = null;
        if (currentUserId && data.participants?.length > 0) {
          partner = data.participants.find(p => p._id !== currentUserId);
        }
        // Fallback: if we couldn't identify partner, try to use the second participant
        // or the first one if there's only one (edge case)
        if (!partner && data.participants?.length > 0) {
          partner = data.participants.length > 1 ? data.participants[1] : data.participants[0];
        }

        // Do NOT set activeChatSessionId in sessionStorage for history view
        if (!isCancelled) {
          setChatInfo({
            chatSessionId: sessionId,
            partnerUsername: partner?.username || "Match Partner",
            partnerId: partner?._id,
            currentUserId: currentUserId,
            isSavedSession: true
          });
          // Set active based on chat session status (Design consideration #6)
          // If the chat is still active, user can continue chatting
          setActive(data.active === true);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Failed to load saved chat");
        }
      }
    };

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
            
            // Update URL to include session ID for QA visibility
            window.history.replaceState(null, '', `/match/chat?session=${data.chatSessionId}`);
            
            if (!isCancelled) {
              setChatInfo({
                chatSessionId: data.chatSessionId,
                partnerUsername: data.partnerUsername || "Match Partner",
                partnerId: data.partnerId,
                currentUserId: data.currentUserId || "",
              });
              setActive(true);
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
      // If session parameter exists, load that specific saved session
      if (sessionParam) {
        await loadSavedSession(sessionParam);
      } else {
        // Otherwise, try to load active chat
        await loadActiveChat();
      }
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
    return <LoadingView />;
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

  const activeChatSessionId = sessionStorage.getItem("activeChatSessionId");
  const showReturnToActive = activeChatSessionId && activeChatSessionId !== chatInfo.chatSessionId;

  return (
    <div className="relative">
      {/* Back to matchmaking (top-left) */}
      <button
        type="button"
        onClick={() => router.replace('/match')}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-2 text-sm font-medium text-white"
        aria-label="Back to matchmaking"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="hidden sm:inline">Back</span>
      </button>
      {showReturnToActive && (
        <button
          type="button"
          onClick={() => router.push('/match/chat')}
          className="fixed top-20 right-4 z-50 px-4 py-2 bg-[#286633] text-white text-sm font-medium rounded-md shadow-lg hover:brightness-110"
        >
          Return to Active Match
        </button>
      )}
      <ChatInterface
        chatSessionId={chatInfo.chatSessionId}
        partnerUsername={chatInfo.partnerUsername}
        partnerId={chatInfo.partnerId}
        currentUserId={chatInfo.currentUserId}
        token={token}
        onChatEnded={handleChatEnded}
        isReadOnly={!active}
      />
    </div>
  );
}

// 3. Export the Page component that wraps the content in Suspense
export default function MatchChatPage() {
  return (
    <Suspense fallback={<LoadingView />}>
      <ChatContent />
    </Suspense>
  );
}