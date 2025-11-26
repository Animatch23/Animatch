"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SavedChatsList from "./SavedChatsList";
import { io } from "socket.io-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const SOCKET_BASE = process.env.NEXT_PUBLIC_SOCKET_URL || API_BASE;

const formatTimestamp = (value) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export default function ChatInterface({
  chatSessionId,
  partnerUsername,
  token,
  currentUserId,
  onChatEnded,
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [error, setError] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [saveStatus, setSaveStatus] = useState({ currentUserSaved: false, partnerSaved: false, bothSaved: false });
  const [partnerLeft, setPartnerLeft] = useState(false);
  const [showSavedChats, setShowSavedChats] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const hasSentTypingRef = useRef(false);
  const currentUserIdRef = useRef(currentUserId ?? "");

  const socketUrl = useMemo(() => {
    if (!SOCKET_BASE) {
      return "";
    }
    return SOCKET_BASE.replace(/\/$/, "");
  }, []);

  useEffect(() => {
    currentUserIdRef.current = currentUserId ?? "";
  }, [currentUserId]);

  useEffect(() => {
    const toggleSavedChatsListener = () => setShowSavedChats((v) => !v);
    window.addEventListener("animatch:toggleSavedChats", toggleSavedChatsListener);
    return () => window.removeEventListener("animatch:toggleSavedChats", toggleSavedChatsListener);
  }, []);

  useEffect(() => {
    if (!API_BASE || !chatSessionId || !token) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const loadHistory = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/chat/${chatSessionId}/history`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Failed to load chat history");
        }

        if (cancelled) {
          return;
        }

        const history = Array.isArray(data.messages)
          ? data.messages.map((item) => ({
              id: item._id || `${item.sentAt}-${Math.random()}`,
              content: item.content,
              sentAt: item.sentAt,
              isOwn: currentUserIdRef.current
                ? item.senderId === currentUserIdRef.current
                : Boolean(item.isOwnMessage),
            }))
          : [];

        setMessages(history);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load chat history");
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [chatSessionId, token]);

  useEffect(() => {
    if (!socketUrl || !chatSessionId || !token) {
      return;
    }

    setConnectionStatus("connecting");
    setPartnerTyping(false);

    const socket = io(socketUrl, {
      transports: ["websocket"],
      auth: { token },
    });

    socketRef.current = socket;

    const handleConnect = () => {
      setConnectionStatus("connected");
      setError("");
      socket.emit("chat:join", { chatSessionId });
    };

    socket.on("connect", handleConnect);

    socket.on("connect_error", (err) => {
      setConnectionStatus("error");
      setError(err?.message || "Unable to connect to chat service.");
    });

    socket.on("chat:joined", () => {
      setConnectionStatus("connected");
    });

    socket.on("chat:error", ({ message }) => {
      setConnectionStatus("error");
      setError(message || "A chat error occurred.");
    });

    socket.on("chat:message", (payload) => {
      const messageId = payload._id || `${payload.sentAt}-${Math.random()}`;
      const message = {
        id: messageId,
        content: payload.content,
        sentAt: payload.sentAt,
        isOwn: currentUserIdRef.current
          ? payload.senderId === currentUserIdRef.current
          : false,
      };

      setMessages((prev) => {
        if (prev.some((item) => item.id === messageId)) {
          return prev;
        }
        return [...prev, message];
      });
    });

    socket.on("chat:typing", ({ isTyping }) => {
      setPartnerTyping(Boolean(isTyping));
    });

    socket.on("chat:partner-saved", ({ savedByCount, isSaved }) => {
      setSaveStatus(prev => ({
        ...prev,
        partnerSaved: true,
        bothSaved: isSaved
      }));
      
      if (isSaved) {
        setFeedback({ 
          type: "success", 
          message: "🎉 Match saved! Both of you have saved this chat." 
        });
      }
    });

    socket.on("chat:partner-left", () => {
      setPartnerLeft(true);
      
      // Update feedback message based on save status
      if (saveStatus.currentUserSaved && !saveStatus.bothSaved) {
        setFeedback({
          type: "info",
          message: "Your partner left before saving the match. The chat will expire in 24 hours."
        });
      } else {
        setFeedback({
          type: "info",
          message: "Your partner has left the chat. You can start a new match anytime."
        });
      }
      
      // Add a system message to the chat
      setMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        content: "Your partner has left the chat",
        sentAt: new Date().toISOString(),
        isOwn: false,
        isSystem: true
      }]);
    });

    socket.on("disconnect", () => {
      setConnectionStatus("disconnected");
    });

    return () => {
      stopTypingNotification();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [chatSessionId, socketUrl, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const statusLabel = useMemo(() => {
    switch (connectionStatus) {
      case "connected":
        return "Connected";
      case "disconnected":
        return "Reconnecting...";
      case "error":
        return "Connection error";
      case "connecting":
      default:
        return "Connecting";
    }
  }, [connectionStatus]);

  const statusColor = useMemo(() => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "disconnected":
        return "text-yellow-600";
      default:
        return "text-gray-500";
    }
  }, [connectionStatus]);

  function stopTypingNotification() {
    if (socketRef.current && hasSentTypingRef.current) {
      socketRef.current.emit("chat:typing", { isTyping: false });
    }
    hasSentTypingRef.current = false;
  }

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInputValue(value);

    if (!socketRef.current || connectionStatus !== "connected") {
      return;
    }

    if (!hasSentTypingRef.current) {
      socketRef.current.emit("chat:typing", { isTyping: true });
      hasSentTypingRef.current = true;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      stopTypingNotification();
      typingTimeoutRef.current = null;
    }, 1200);
  };

  const handleInputBlur = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    stopTypingNotification();
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const messageText = inputValue.trim();
    if (!messageText || !socketRef.current) {
      return;
    }

    if (connectionStatus !== "connected") {
      setError("You are not connected to the chat.");
      return;
    }

    socketRef.current.emit("chat:send-message", {
      chatSessionId,
      content: messageText,
    });

    setInputValue("");
    stopTypingNotification();
    setError("");
  };

  const handleLeaveChat = async () => {
    if (!API_BASE || !token) {
      if (typeof onChatEnded === "function") {
        onChatEnded();
      }
      return;
    }

    try {
      setIsEnding(true);
      stopTypingNotification();
      await fetch(`${API_BASE}/api/chat/${chatSessionId}/end`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error("Failed to end chat", err);
      setError("We could not end the chat cleanly, but you can start a new match.");
    } finally {
      setIsEnding(false);
      if (typeof onChatEnded === "function") {
        onChatEnded();
      }
    }
  };

  const handleSaveChat = async () => {
    if (!API_BASE || !token) {
      return;
    }

    try {
      setIsSaving(true);
      setFeedback(null);
      const response = await fetch(`${API_BASE}/api/chat/${chatSessionId}/save`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to save chat");
      }

      // Update save status
      setSaveStatus({
        currentUserSaved: true,
        partnerSaved: data.savedByCount === 2,
        bothSaved: data.isSaved
      });

      if (data.isSaved) {
        setFeedback({ 
          type: "success", 
          message: "🎉 Match saved! Both of you have saved this chat." 
        });
      } else {
        setFeedback({ 
          type: "waiting", 
          message: "✓ You saved the chat. Waiting for your partner to save..." 
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save chat",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50">
      <SavedChatsList visible={showSavedChats} onClose={() => setShowSavedChats(false)} />
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {partnerUsername || "Anonymous Match"}
          </h1>
          <p className={`text-sm ${statusColor}`}>{statusLabel}</p>
          {partnerTyping && connectionStatus === "connected" && !partnerLeft && (
            <p className="text-xs text-gray-500 mt-1">{partnerUsername || "Partner"} is typing...</p>
          )}
          {partnerLeft && (
            <p className="text-xs text-rose-600 mt-1 font-medium">⚠️ Partner has left the chat</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSaveChat}
            disabled={isSaving || saveStatus.bothSaved || partnerLeft}
            className={`h-9 px-4 rounded-md text-sm font-medium shadow-sm transition-all ${
              partnerLeft
                ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                : saveStatus.bothSaved
                ? "bg-green-100 text-green-700 cursor-not-allowed"
                : saveStatus.currentUserSaved
                ? "bg-blue-100 text-blue-700 cursor-wait"
                : "bg-yellow-300 text-[#286633] hover:brightness-95"
            } disabled:opacity-60`}
          >
            {partnerLeft
              ? "⚠️ Partner Left"
              : saveStatus.bothSaved 
              ? "✓ Saved by Both" 
              : saveStatus.currentUserSaved 
              ? "⏳ Waiting for Partner..." 
              : isSaving 
              ? "Saving..." 
              : "Save Chat"}
          </button>
          <button
            type="button"
            onClick={handleLeaveChat}
            disabled={isEnding || partnerLeft}
            className="h-9 px-4 rounded-md bg-rose-500 text-white text-sm font-medium shadow-sm hover:brightness-95 disabled:opacity-70"
          >
            {partnerLeft ? "Partner Left" : isEnding ? "Leaving..." : "End Chat"}
          </button>
        </div>
      </header>

      {(error || feedback) && (
        <div className="px-6 pt-4 space-y-3">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {feedback && (
            <div
              className={`rounded-md border px-4 py-3 text-sm flex items-start gap-2 ${
                feedback.type === "success"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : feedback.type === "waiting"
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : feedback.type === "info"
                  ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {feedback.type === "waiting" && (
                <svg className="w-5 h-5 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-xl rounded-2xl px-4 py-3 text-base leading-relaxed shadow-sm ${
                message.isSystem
                  ? "self-center bg-gray-100 text-gray-700 text-center italic"
                  : message.isOwn
                  ? "self-end bg-[#1e6a3f] text-white border border-[#14492b] shadow-md"
                  : "self-start bg-gray-100 text-gray-900 border border-gray-200"
              }`}
            >
              <p className="whitespace-pre-wrap break-words text-base tracking-tight">{message.content}</p>
              {!message.isSystem && (
                <time className={`block text-xs mt-1 ${message.isOwn ? "text-white/90" : "text-gray-600"}`}>
                  {formatTimestamp(message.sentAt)}
                </time>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <form onSubmit={handleSubmit} className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-end gap-3">
          <textarea
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            rows={2}
            placeholder={connectionStatus === "connected" ? "Say hello..." : "Waiting for connection"}
            disabled={connectionStatus !== "connected"}
            className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#286633]/60 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || connectionStatus !== "connected"}
            className="h-11 px-6 rounded-2xl bg-[#286633] text-white text-sm font-semibold shadow-sm hover:brightness-110 disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}