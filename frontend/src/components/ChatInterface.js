"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SavedChatsList from "./SavedChatsList";
import ProfileReveal from "./ProfileReveal";
import { io } from "socket.io-client";
import Image from "next/image";
import ReportModal from "./ReportModal";

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

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  const sizes = ["B", "KB", "MB", "GB"]; 
  const i = bytes === 0 ? 0 : Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

export default function ChatInterface({
  chatSessionId,
  partnerUsername,
  partnerId,
  token,
  currentUserId,
  onChatEnded,
  isReadOnly = false,
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [error, setError] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [saveStatus, setSaveStatus] = useState({ currentUserSaved: false, partnerSaved: false, bothSaved: false });
  const [partnerLeft, setPartnerLeft] = useState(false);
  const [partnerOffline, setPartnerOffline] = useState(false); // Track if partner explicitly logged out
  const [showSavedChats, setShowSavedChats] = useState(false);
  const [isUnmatched, setIsUnmatched] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [savedChats, setSavedChats] = useState([]);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [statusLog, setStatusLog] = useState([]);
  
  // US #14: Icebreaker Prompts
  const [icebreaker, setIcebreaker] = useState(null);
  const [icebreakerLoading, setIcebreakerLoading] = useState(false);

  const router = useRouter();

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const hasSentTypingRef = useRef(false);
  const currentUserIdRef = useRef(currentUserId ?? "");
  const fileInputRef = useRef(null);
  const menuCloseTimeoutRef = useRef(null);

  const socketUrl = useMemo(() => {
    if (!SOCKET_BASE) {
      return "";
    }
    return SOCKET_BASE.replace(/\/$/, "");
  }, []);

  useEffect(() => {
    // Reset state when chat session changes
    setSaveStatus({ currentUserSaved: false, partnerSaved: false, bothSaved: false });
    setFeedback(null);
    setPartnerLeft(false);
    setPartnerOffline(false);
    setIcebreaker(null); // Reset icebreaker when chat changes
    
    // Fetch current save status from backend to handle reloads (Design consideration #1)
    if (API_BASE && chatSessionId && token) {
      fetch(`${API_BASE}/api/chat/${chatSessionId}/save-status`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(res => res.json())
        .then(data => {
          if (data.currentUserSaved !== undefined) {
            const partnerSavedButNotBoth = data.savedByCount === 1 && !data.currentUserSaved;
            const currentUserSavedButNotBoth = data.currentUserSaved && !data.isSaved;
            
            setSaveStatus({
              currentUserSaved: data.currentUserSaved,
              partnerSaved: data.savedByCount === 2 || partnerSavedButNotBoth,
              bothSaved: data.isSaved
            });
            
            // Show persistent feedback messages based on saved state
            // Note: Don't show success message on reload - it should only appear once when saving
            if (partnerSavedButNotBoth) {
              // Partner saved but current user hasn't - show notification to prompt user to save
              setFeedback({
                type: "info",
                message: `💝 ${partnerUsername || "Your partner"} wants to save this chat! Click "Save Chat" to keep the conversation alive!`
              });
            } else if (currentUserSavedButNotBoth) {
              // Current user saved but partner hasn't
              setFeedback({ 
                type: "waiting", 
                message: "✓ You saved the chat. Waiting for your partner to save..." 
              });
            }
            // If bothSaved (data.isSaved), don't show any message on reload
          }
        })
        .catch(err => console.error("Failed to fetch save status:", err));
    }
  }, [chatSessionId, token, partnerUsername]);

  useEffect(() => {
    const toggleSavedChatsListener = () => {
      setShowSavedChats((v) => !v);
    };
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
              // Backend provides isOwnMessage which is authoritative
              isOwn: Boolean(item.isOwnMessage),
              senderId: item.senderId,
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

  // US #14: Fetch icebreaker prompt for new chats
  useEffect(() => {
    if (!API_BASE || !chatSessionId || !token || isReadOnly) {
      return;
    }

    const fetchIcebreaker = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/icebreaker/${chatSessionId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data.prompt && !data.dismissed) {
          setIcebreaker(data.prompt);
        } else if (data.dismissed) {
          setIcebreaker(null);
        }
      } catch (err) {
        console.error("Failed to fetch icebreaker:", err);
      }
    };

    fetchIcebreaker();
  }, [chatSessionId, token, isReadOnly]);

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

    socket.on("chat:joined", ({ userId }) => {
      setConnectionStatus("connected");
      // Store the user ID from the socket server for message ownership detection
      if (userId) {
        currentUserIdRef.current = userId;
      }
    });

    socket.on("chat:error", ({ message }) => {
      setConnectionStatus("error");
      setError(message || "A chat error occurred.");
    });

    socket.on("chat:message", (payload) => {
      const messageId = payload._id || `${payload.sentAt}-${Math.random()}`;
      const isOwnMessage = currentUserIdRef.current
        ? payload.senderId === currentUserIdRef.current
        : false;
      
      const message = {
        id: messageId,
        content: payload.content,
        sentAt: payload.sentAt,
        isOwn: isOwnMessage,
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
      } else {
        // Notify user B that user A wants to save the match
        setFeedback({
          type: "info",
          message: `💝 ${partnerUsername || "Your partner"} wants to save this chat! Click "Save Chat" to keep the conversation alive!`
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

    // US #6: Partner clicked "Next Chat" - handle notification
    socket.on("chat:partner-next", ({ message }) => {
      // If chat is saved, show info message but don't mark as ended
      if (saveStatus.bothSaved) {
        setFeedback({
          type: "info",
          message: message || "Your partner is looking for a new match. This saved chat remains available."
        });
      }
    });

    socket.on("chat:unmatched", ({ message }) => {
      setIsUnmatched(true);
      setPartnerLeft(true);
      
      // Show feedback notification
      setFeedback({
        type: "info",
        message: message || "Your partner has moved on to find a new match. This saved chat is preserved in your history."
      });
      
      // Add a system message to the chat
      setMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        content: "Your partner has left the chat",
        sentAt: new Date().toISOString(),
        isOwn: false,
        isSystem: true
      }]);
    });

    // Handle partner navigating away from chat (e.g., went to profile page)
    // We just clear typing indicator but don't change connection status display
    socket.on("chat:partner-away", () => {
      setPartnerTyping(false); // Clear typing indicator when partner navigates away
    });

    // Handle partner explicitly logging out
    socket.on("chat:partner-offline", () => {
      setPartnerOffline(true);
      setPartnerTyping(false);
    });

    // Handle partner joining/rejoining the chat room
    socket.on("chat:partner-joined", () => {
      // Partner is back - clear offline status
      setPartnerOffline(false);
    });

    // US #14: Handle icebreaker updates from partner
    socket.on("icebreaker:updated", ({ prompt, dismissed }) => {
      if (dismissed) {
        setIcebreaker(null);
      } else if (prompt) {
        setIcebreaker(prompt);
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatSessionId, socketUrl, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- UI Helpers from us-5-11 ---
  
  // Listen for global toggle from TopBar (menu icon)
  useEffect(() => {
    const handler = () => setShowSidebar((v) => !v);
    try {
      window.addEventListener("animatch:toggleSavedChats", handler);
    } catch (_) {}
    return () => {
      try { window.removeEventListener("animatch:toggleSavedChats", handler); } catch (_) {}
    };
  }, []);

  // Load saved chats from localStorage (seed with a demo item if empty)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("animatch:savedChats");
      if (raw) {
        setSavedChats(JSON.parse(raw));
      } else {
        // Seed with a demo chat to mirror the mockup
        const demoChat = {
          id: Date.now(),
          name: partnerUsername || "Juan Dela Cruz",
          messages: [
            { id: 1, content: "Hello!", isOwn: true, sentAt: new Date() },
            { id: 2, content: "Hi there!", isOwn: false, sentAt: new Date() }
          ],
        };
        setSavedChats([demoChat]);
      }
    } catch (_) {
      // ignore
    }
  }, [partnerUsername]);

  // Persist saved chats
  useEffect(() => {
    try {
      localStorage.setItem("animatch:savedChats", JSON.stringify(savedChats));
    } catch (_) {}
  }, [savedChats]);

  const chatDisplayName = (chat) => {
    if (!chat) return "Juan Dela Cruz";
    return chat.name && !chat.name.startsWith("Saved chat") ? chat.name : "Juan Dela Cruz";
  };

  const lastPreview = (chat) => {
    const last = [...(chat?.messages || [])].reverse().find((m) => m.content || m.type === "file");
    if (!last) return "";
    if (last.type === "file") {
      const who = last.isOwn ? "You" : chatDisplayName(chat);
      return `${who}: Attachment${last.fileName ? ` (${last.fileName})` : ""}`;
    }
    const who = last.isOwn ? "You" : chatDisplayName(chat);
    return `${who}: ${last.content}`;
  };

  const saveCurrentChat = () => {
    const id = Date.now();
    const name = partnerUsername || "Juan Dela Cruz";
    const snapshot = messages.map((m) => ({ ...m }));
    setSavedChats((prev) => [{ id, name, messages: snapshot }, ...prev]);
    setStatusLog((prev) => [...prev, "Chat saved to history (local)."]);
  };

  const loadChat = (chat) => {
    if (!chat) return;
    setMessages(chat.messages || []);
    setShowSidebar(false);
    setStatusLog((prev) => [...prev, `Loaded chat: ${chat.name}`]);
  };

  const statusLabel = useMemo(() => {
    // First check our own connection status
    switch (connectionStatus) {
      case "connected":
        // Our connection is good - check partner status
        if (partnerLeft) {
          return "Partner left";
        }
        if (partnerOffline) {
          return "Partner offline";
        }
        return "Connected";
      case "disconnected":
        return "Reconnecting...";
      case "error":
        return "Connection error";
      case "connecting":
      default:
        return "Connecting";
    }
  }, [connectionStatus, partnerLeft, partnerOffline]);

  const statusColor = useMemo(() => {
    switch (connectionStatus) {
      case "connected":
        if (partnerLeft) {
          return "text-rose-600";
        }
        if (partnerOffline) {
          return "text-yellow-600";
        }
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "disconnected":
        return "text-yellow-600";
      default:
        return "text-gray-500";
    }
  }, [connectionStatus, partnerLeft, partnerOffline]);

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

  // Detect whether current input contains contact info to prevent sending
  const inputContainsContactInfo = useMemo(() => {
    const text = (inputValue || "").trim();
    if (!text) return false;
    const hasEmail = /(?:^|\s)[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?:\s|$)/i.test(text);
    const hasPhone = /(?:(?:\+?\d{1,3}[\s-.]?)?(?:\(?\d{2,4}\)?[\s-.]?)?\d{3,4}[\s-.]?\d{3,4})(?!\d)/.test(text) && (text.replace(/\D/g, "").length >= 7);
    return hasEmail || hasPhone;
  }, [inputValue]);

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

    // Client-side policy: prevent sharing emails or phone numbers
    const containsEmail = /(?:^|\s)[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?:\s|$)/i.test(messageText);
    // Phone pattern: supports various formats, requires at least 7 digits
    const containsPhone = /(?:(?:\+?\d{1,3}[\s-.]?)?(?:\(?\d{2,4}\)?[\s-.]?)?\d{3,4}[\s-.]?\d{3,4})(?!\d)/.test(messageText) && (messageText.replace(/\D/g, "").length >= 7);
    if (containsEmail || containsPhone) {
      setFeedback({
        type: "error",
        message: "Sharing contact info (emails or phone numbers) is not allowed in chat.",
      });
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

  // --- US-5-11 UI Action Handlers ---
  
  const openFilePicker = () => fileInputRef.current?.click();
  
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setStatusLog((prev) => [...prev, `File too large: ${file.name}. Max 10MB.`]);
      e.target.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const isImage = file.type.startsWith("image/");

    const attachmentMessage = {
      id: `local-${Date.now()}`,
      type: "file",
      isOwn: true,
      sentAt: new Date(),
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileUrl: objectUrl,
      isLocalPreview: true,
      isImage,
    };

    setMessages((prev) => [...prev, attachmentMessage]);
    setStatusLog((prev) => [...prev, `Attached ${file.name} (preview only).`]);
    e.target.value = "";
  };

  const openMenu = () => {
    if (menuCloseTimeoutRef.current) {
      clearTimeout(menuCloseTimeoutRef.current);
      menuCloseTimeoutRef.current = null;
    }
    setShowActionMenu(true);
  };

  const scheduleCloseMenu = () => {
    if (menuCloseTimeoutRef.current) {
      clearTimeout(menuCloseTimeoutRef.current);
    }
    menuCloseTimeoutRef.current = setTimeout(() => {
      setShowActionMenu(false);
      menuCloseTimeoutRef.current = null;
    }, 200);
  };

  const blockUser = () => {
    setShowActionMenu(false);
    setConfirmBlockOpen(true);
  };
  
  const reportUser = () => {
    setShowActionMenu(false);
    setReportOpen(true);
  };

  const handleSubmitReport = () => {
    const reason = reportReason.trim();
    setReportOpen(false);
    setReportReason("");
    setStatusLog((prev) => [
      ...prev,
      reason ? `Report submitted: ${reason}` : "Report submitted.",
    ]);
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
      // Fallback to local save if no API
      saveCurrentChat();
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

      // Also save locally (us-5-11 style)
      saveCurrentChat();

      if (data.isSaved) {
        setFeedback({ 
          type: "success", 
          message: "🎉 Match saved! Both of you have saved this chat." 
        });
        // Auto-dismiss success message after 3 seconds
        setTimeout(() => {
          setFeedback(null);
        }, 3000);
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

  // US #14: Refresh icebreaker prompt
  const handleRefreshIcebreaker = async () => {
    if (!API_BASE || !chatSessionId || !token || icebreakerLoading) return;

    try {
      setIcebreakerLoading(true);
      const response = await fetch(`${API_BASE}/api/icebreaker/${chatSessionId}/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.prompt) {
        setIcebreaker(data.prompt);
      } else if (data.message?.includes("used all available")) {
        // All prompts used - dismiss the icebreaker
        setIcebreaker(null);
      }
    } catch (err) {
      console.error("Failed to refresh icebreaker:", err);
    } finally {
      setIcebreakerLoading(false);
    }
  };

  // US #14: Dismiss icebreaker prompt
  const handleDismissIcebreaker = async () => {
    if (!API_BASE || !chatSessionId || !token) return;

    try {
      await fetch(`${API_BASE}/api/icebreaker/${chatSessionId}/dismiss`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setIcebreaker(null);
    } catch (err) {
      console.error("Failed to dismiss icebreaker:", err);
      // Still dismiss locally even if API fails
      setIcebreaker(null);
    }
  };

  // US #14: Show/restore icebreaker prompt
  const handleShowIcebreaker = async () => {
    if (!API_BASE || !chatSessionId || !token || icebreakerLoading) return;

    try {
      setIcebreakerLoading(true);
      const response = await fetch(`${API_BASE}/api/icebreaker/${chatSessionId}/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.prompt) {
        setIcebreaker(data.prompt);
      }
    } catch (err) {
      console.error("Failed to show icebreaker:", err);
    } finally {
      setIcebreakerLoading(false);
    }
  };

  const handleReportUser = async ({ reason, description }) => {
    if (!API_BASE || !token) return;

    try {
      setIsReporting(true);
      const response = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatSessionId,
          reason,
          description,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit report");
      }

      setFeedback({
        type: "success",
        message: "Report submitted successfully. Admins will review it shortly.",
      });
      setIsReportModalOpen(false);
    } catch (err) {
      setFeedback({
        type: "error",
        message: "Failed to submit report. Please try again.",
      });
    } finally {
      setIsReporting(false);
    }
  };

  // US #6: Next Chat - Skip to another match
  const [isNexting, setIsNexting] = useState(false);
  
  const handleNextChat = async () => {
    if (!API_BASE || !token) {
      router.push("/match/queue");
      return;
    }

    try {
      setIsNexting(true);
      setError("");
      stopTypingNotification();
      
      const response = await fetch(`${API_BASE}/api/chat/${chatSessionId}/next`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to process next chat");
      }

      // Clear active chat session from storage
      sessionStorage.removeItem("activeChatSessionId");
      
      // Redirect to queue to find new match (AC3)
      router.push("/match/queue");
    } catch (err) {
      console.error("Failed to next chat", err);
      setError(err instanceof Error ? err.message : "Failed to process next chat request");
      setIsNexting(false);
    }
  };

  const handleBlockUser = async () => {
    if (!API_BASE || !token || !partnerId) return;

    try {
      setIsBlocking(true);
      const response = await fetch(`${API_BASE}/api/chat/block`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIdToBlock: partnerId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to block user");
      }

      setConfirmBlockOpen(false);

      // Blocking also ends the chat
      if (typeof onChatEnded === "function") {
        onChatEnded();
      }
    } catch (err) {
      console.error("Failed to block user", err);
      alert(err instanceof Error ? err.message : "Failed to block user");
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50">
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleReportUser}
        isSubmitting={isReporting}
      />
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
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
        </div>
        <div className="flex gap-2">
          {/* US #14: Show Icebreaker button */}
          {!icebreaker && !isReadOnly && (
            <button
              type="button"
              onClick={handleShowIcebreaker}
              disabled={icebreakerLoading || partnerLeft}
              className="h-9 px-3 rounded-md bg-purple-500 text-white text-sm font-medium shadow-sm hover:bg-purple-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              title="Show icebreaker prompt"
            >
              <span>💡</span>
              {icebreakerLoading ? "..." : "Icebreaker"}
            </button>
          )}
          {/* US #6: Next Chat button - to the left of Save Chat (AC1) */}
          <button
            type="button"
            onClick={handleNextChat}
            disabled={isNexting || partnerLeft || isReadOnly}
            className="h-9 px-4 rounded-md bg-blue-500 text-white text-sm font-medium shadow-sm hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isNexting ? "Finding..." : "Next Chat"}
          </button>
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
              ? "Partner Left"
              : saveStatus.bothSaved 
              ? "Saved by Both" 
              : saveStatus.currentUserSaved 
              ? "Waiting..." 
              : isSaving 
              ? "Saving..." 
              : "Save Chat"}
          </button>
          {/* US #11: Report User button */}
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            disabled={isReadOnly}
            className="h-9 px-4 rounded-md text-sm font-medium shadow-sm bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Report User
          </button>
          {/* US #10: Block button */}
          <button
            type="button"
            onClick={() => setConfirmBlockOpen(true)}
            disabled={isBlocking || partnerLeft || isReadOnly || !partnerId}
            className="h-9 px-4 rounded-md bg-orange-500 text-white text-sm font-medium shadow-sm hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isBlocking ? "Blocking..." : "Block"}
          </button>
          <button
            type="button"
            onClick={handleLeaveChat}
            disabled={isEnding || isReadOnly}
            className="h-9 px-4 rounded-md bg-rose-500 text-white text-sm font-medium shadow-sm hover:brightness-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isEnding ? "Leaving..." : "End Chat"}
          </button>
        </div>
      </header>

      {/* Feedback / Error Messages */}
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

      {/* i love stswenggggg */}
      
      {/* Profile Reveal Section - Gamification feature */}
      {!isReadOnly && (
        <div className="px-6 pt-4">
          <ProfileReveal
            chatSessionId={chatSessionId}
            token={token}
            currentUserId={currentUserId}
            socketRef={socketRef}
          />
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-6 py-6">
        {/* US #14: Icebreaker Prompt */}
        {icebreaker && !isReadOnly && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl border border-purple-200 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💡</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-purple-600">Icebreaker</span>
                </div>
                <p className="text-sm text-gray-800 font-medium">{icebreaker}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleRefreshIcebreaker}
                  disabled={icebreakerLoading}
                  className="p-2 rounded-lg bg-white/80 hover:bg-white text-purple-600 hover:text-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Get new prompt"
                >
                  <svg className={`w-4 h-4 ${icebreakerLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleDismissIcebreaker}
                  className="p-2 rounded-lg bg-white/80 hover:bg-white text-gray-500 hover:text-gray-700 transition-colors"
                  title="Dismiss"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-xl rounded-2xl px-4 py-3 text-sm shadow-sm ${
                message.isSystem
                  ? "self-center bg-gray-200 text-gray-700 text-center italic"
                  : message.isOwn
                  ? "self-end bg-[#286633] text-white"
                  : "self-start bg-white text-gray-900"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              {!message.isSystem && (
                <time className={`block text-xs mt-1 ${message.isOwn ? "text-white/70" : "text-gray-500"}`}>
                  {formatTimestamp(message.sentAt)}
                </time>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Confirm Block Modal */}
      {confirmBlockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmBlockOpen(false)} />
          <div className="relative bg-white w-[90%] max-w-md rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-[#286633] text-center mb-2">Block user?</h2>
            <p className="text-center text-gray-600 mb-6">You won&apos;t be matched with this user again.</p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setConfirmBlockOpen(false)}
                className="flex-1 bg-gray-300 text-white py-3 rounded-2xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBlockUser}
                disabled={isBlocking}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-2xl disabled:opacity-70"
              >
                {isBlocking ? "Blocking..." : "Block"}
              </button>
            </div>
          </div>
        </div>
      )}

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
          {inputContainsContactInfo && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2">
              Sharing contact info (emails or phone numbers) is not allowed.
            </div>
          )}
          <button
            type="submit"
            disabled={!inputValue.trim() || connectionStatus !== "connected" || inputContainsContactInfo}
            className="h-11 px-6 rounded-2xl bg-[#286633] text-white text-sm font-semibold shadow-sm hover:brightness-110 disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </form>

      {/* SavedChatsList Overlay */}
      <SavedChatsList
        visible={showSavedChats}
        onClose={() => setShowSavedChats(false)}
      />
    </div>
  );
}