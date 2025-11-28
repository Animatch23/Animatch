"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
}) {
  const router = useRouter();
  
  // --- State from sprint-2 (Backend Logic) ---
  const [messages, setMessages] = useState([
      { id: 1, text: "Hey there! How's your day going?", sender: "other", timestamp: new Date() },
    { id: 2, text: "Hi! It's going well, thanks for asking! How about yours?", sender: "me", timestamp: new Date() }
  ]);
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

  // --- State from us-5-11 (UI Features) ---
  const [showSidebar, setShowSidebar] = useState(false);
  const [savedChats, setSavedChats] = useState([]);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [statusLog, setStatusLog] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState(0); // 0..5
  const [hoverRating, setHoverRating] = useState(0);
  const [filterQuery, setFilterQuery] = useState("");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    course: false,
    housing: false,
    orgs: false
  });
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const menuCloseTimeoutRef = useRef(null);
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

  const fetchSavedMatches = async () => {
    if (!API_BASE || !token) return;
    
    setIsLoadingSaved(true);
    try {
      const queryParams = new URLSearchParams();
      if (activeFilters.course) queryParams.append('course', 'true');
      if (activeFilters.housing) queryParams.append('housing', 'true');
      if (activeFilters.orgs) queryParams.append('orgs', 'true');

      const response = await fetch(`${API_BASE}/api/chat/saved?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSavedChats(data);
      } else {
        console.error("Failed to fetch saved matches");
      }
    } catch (err) {
      console.error("Error fetching saved matches:", err);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchSavedMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters, token]);

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
        fetchSavedMatches();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatSessionId, socketUrl, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Icebreaker prompt state
  const [icePrompt, setIcePrompt] = useState(null); // {id, text}
  const [iceExcluded, setIceExcluded] = useState([]);
  const [iceVisible, setIceVisible] = useState(false);

  const fetchIcebreaker = async (excludeIds = []) => {
    try {
      const sessionId = "demo-session"; // replace with real session id when available
      const res = await fetch("/api/prompts/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, excludeIds })
      });
      if (!res.ok) throw new Error("Failed to fetch prompt");
      const data = await res.json();
      setIcePrompt(data);
      setIceExcluded((prev) => [data.id, ...prev]);
      setIceVisible(true);
    } catch (e) {
      // Dev fallback: show a sample prompt so UI can be previewed
      const sample = { id: 0, text: "What’s your favorite spot on campus?" };
      setIcePrompt(sample);
      setIceVisible(true);
      setStatusLog((prev) => [...prev, "Icebreaker shown using fallback sample (backend unavailable)."]);
    }
  };

  // When chat connects, show icebreaker
  useEffect(() => {
    if (connectionStatus === "connected") {
      fetchIcebreaker(iceExcluded);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionStatus]);


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
          name: "Juan Dela Cruz",
          messages: [
            { id: 1, text: "Hello!", sender: "me", timestamp: new Date() },
            { id: 2, text: "Hi there!", sender: "other", timestamp: new Date() }
          ],
          streakDays: 3,
        };
        setSavedChats([demoChat]);
      }
    } catch (_) {
      // ignore
    }
  }, []);

  // Persist saved chats
  useEffect(() => {
    try {
      localStorage.setItem("animatch:savedChats", JSON.stringify(savedChats));
    } catch (_) {}
  }, [savedChats]);


  const toggleSidebar = () => setShowSidebar((v) => !v);

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

  const chatDisplayName = (chat) => {
    if (!chat) return "Juan Dela Cruz";
    return chat.name && !chat.name.startsWith("Saved chat") ? chat.name : "Juan Dela Cruz";
  };

  // Compute consecutive day streak ending on most recent message day.
  const computeStreakDays = (messages = []) => {
    if (!messages.length) return 0;
    const daySet = new Set();
    for (const m of messages) {
      const d = new Date(m.timestamp);
      // Normalize to YYYY-MM-DD
      const key = d.getFullYear() + "-" + (String(d.getMonth() + 1).padStart(2, "0")) + "-" + String(d.getDate()).padStart(2, "0");
      daySet.add(key);
    }
    // Find latest message date
    const latest = new Date(Math.max(...messages.map(m => new Date(m.timestamp).getTime())));
    let streak = 0;
    let cursor = new Date(latest);
    // Walk backward day by day while a day exists in set
    while (true) {
      const key = cursor.getFullYear() + "-" + (String(cursor.getMonth() + 1).padStart(2, "0")) + "-" + String(cursor.getDate()).padStart(2, "0");
      if (!daySet.has(key)) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  };

  const lastPreview = (chat) => {
    const last = [...(chat?.messages || [])].reverse().find((m) => m.text || m.type === "file");
    if (!last) return "";
    if (last.type === "file") {
      const who = last.sender === "me" ? "You" : chatDisplayName(chat);
      return `${who}: Attachment${last.fileName ? ` (${last.fileName})` : ""}`;
    }
    const who = last.sender === "me" ? "You" : chatDisplayName(chat);
    return `${who}: ${last.text}`;
  };

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
  };

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

const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;
  const clearFilters = () => {
    setActiveFilters({ course: false, housing: false, orgs: false });
    setShowFilterMenu(false);
  };

  const toggleFilter = (key) => setActiveFilters(p => ({ ...p, [key]: !p[key] }));

  const displayChats = savedChats.filter(chat => 
    (chat.name || "Anonymous").toLowerCase().includes(filterQuery.toLowerCase().trim())
  );

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

  const handleNextChat = () => {
    router.push("/match");
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

  // Simulate queue-reconnect entirely within chat via system logs
  const simulateRequeue = () => {
    // Append log entries with short delays
    setConnectionStatus("disconnected");
    setStatusLog((prev) => [...prev, "Disconnected."]);

    setTimeout(() => {
      setConnectionStatus("finding");
      setStatusLog((prev) => [...prev, "Finding another Match..."]);
    }, 600);

    setTimeout(() => {
      setConnectionStatus("connected");
      setStatusLog((prev) => [...prev, "Match Found..."]);
    }, 2600);
  };

  const handleConfirmBlock = () => {
    setConfirmBlockOpen(false);
    setStatusLog((prev) => [...prev, "User blocked (UI-only)."]);
  };

  // Save current chat to history
  const saveCurrentChat = () => {
    const id = Date.now();
    const name = "Juan Dela Cruz"; // temporary placeholder name for mockup
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

  const visibleChats = savedChats.filter((chat) =>
    chatDisplayName(chat).toLowerCase().includes(filterQuery.trim().toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50">
      {/* Chat actions below TopBar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-end gap-2">
        {/* Save Chat */}
        <button
          type="button"
          onClick={handleSaveChat}
          disabled={isSaving || saveStatus.bothSaved || partnerLeft}
          title="Save Chat"
          className={`h-9 px-3 rounded-md flex items-center justify-center text-sm font-medium transition-all ${
            partnerLeft
              ? "bg-gray-200 text-gray-600 cursor-not-allowed"
              : saveStatus.bothSaved
              ? "bg-green-100 text-green-700 cursor-not-allowed"
              : saveStatus.currentUserSaved
              ? "bg-blue-100 text-blue-700 cursor-wait"
              : "bg-yellow-300 text-[#286633] hover:brightness-95"
          } disabled:opacity-60`}
        >
          <span className="inline-flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a7 7 0 00-7 7h7" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7v6m3-3h-6" />
            </svg>
            {partnerLeft
              ? "Partner Left"
              : saveStatus.bothSaved 
              ? "Saved by Both" 
              : saveStatus.currentUserSaved 
              ? "Waiting..." 
              : isSaving 
              ? "Saving..." 
              : "Save chat"}
          </span>
        </button>

        {/* Report/Block with hover menu */}
        <div
          className="relative"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleCloseMenu}
        >
          <button
            type="button"
            aria-haspopup="true"
            aria-expanded={showActionMenu}
            onClick={() => setShowActionMenu((v) => !v)}
            title="Report / Block"
            className="h-9 px-3 rounded-md bg-rose-500 text-white flex items-center justify-center hover:brightness-95"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6v14M4 6h10l-1.5 3H20l-1.5 3H10L8.5 15H4" />
              </svg>
              Report / Block
            </span>
          </button>

          {showActionMenu && (
            <div
              className="absolute right-0 mt-2 w-44 bg-white text-black rounded-md shadow-lg z-20 ring-1 ring-black/5"
              onMouseEnter={openMenu}
              onMouseLeave={scheduleCloseMenu}
            >
              <button
                type="button"
                onClick={blockUser}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 transition"
              >
                Block user
              </button>
              <button
                type="button"
                onClick={reportUser}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 border-t transition"
              >
                Report user
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Feedback / Error Messages */}
      {(error || feedback) && (
        <div className="px-4 pt-2">
          {error && <div className="p-2 text-sm text-red-700 bg-red-50 rounded border border-red-200">{error}</div>}
          {feedback && (
            <div
              className={`p-2 text-sm rounded border flex items-start gap-2 ${
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

      {/* Content area: sidebar + chat, split-screen (no overlay) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar (saved chats) */}
        <aside className={`bg-gray-100 border-r border-gray-200 flex flex-col w-80 sm:w-96`}>
          <div className="p-4 border-b border-gray-200 bg-white">
            <h2 className="font-bold text-gray-700 mb-2">Saved Matches</h2>
            
            {/* Filter UI */}
            <div className="flex gap-2 relative mb-2">
              <button 
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`flex-1 h-9 px-3 rounded-md border text-sm font-medium flex items-center justify-center gap-2 ${activeFilterCount > 0 ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-300 text-gray-700'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                Filter {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
              </button>
              
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-red-500 px-2">Clear</button>
              )}

              {/* Filter Dropdown */}
              {showFilterMenu && (
                <div className="absolute top-10 left-0 w-full bg-white shadow-xl rounded-lg border border-gray-200 p-3 z-30">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Show matches with:</h3>
                  <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input type="checkbox" checked={activeFilters.course} onChange={() => toggleFilter('course')} className="rounded text-green-600 focus:ring-green-500" />
                    <span className="text-sm text-gray-800">Same Course</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input type="checkbox" checked={activeFilters.housing} onChange={() => toggleFilter('housing')} className="rounded text-green-600 focus:ring-green-500" />
                    <span className="text-sm text-gray-800">Same Housing</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input type="checkbox" checked={activeFilters.orgs} onChange={() => toggleFilter('orgs')} className="rounded text-green-600 focus:ring-green-500" />
                    <span className="text-sm text-gray-800">Shared Organizations</span>
                  </label>
                  <div className="mt-2 pt-2 border-t flex justify-end">
                    <button 
                      onClick={() => setShowFilterMenu(false)}
                      className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Text Search */}
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search by name..."
              className="w-full h-9 px-3 rounded-md bg-gray-50 border border-gray-300 text-sm focus:ring-2 focus:ring-green-500 outline-none text-black"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {isLoadingSaved ? (
              <p className="text-center text-gray-500 text-sm py-4">Loading matches...</p>
            ) : displayChats.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-gray-500 text-sm">
                  {activeFilterCount > 0 || filterQuery ? "No matches found." : "No saved matches yet."}
                </p>
              </div>
            ) : (
              displayChats.map((chat) => (
                <button
                  key={chat.chatSessionId}
                  onClick={() => router.push(`/match/chat?session=${chat.chatSessionId}`)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${chat.chatSessionId === chatSessionId ? "bg-green-50 border-green-300" : "bg-white border-gray-200 hover:bg-gray-50"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden relative flex-shrink-0">
                      {chat.profilePicture?.url ? (
                        <Image src={`${API_BASE}/api${chat.profilePicture.url}`} alt={chat.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">{chat.name?.[0]}</div>
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-semibold text-gray-800 text-sm truncate">{chat.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {chat.partnerData?.course ? chat.partnerData.course : "Student"}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => router.push("/match")}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md text-sm font-medium"
            >
              Start New Match
            </button>
          </div>
        </aside>

        {/* Right pane: chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Icebreaker Card */}
            {iceVisible && icePrompt && (
              <div className="max-w-xl mx-auto border-2 border-brand-700/20 rounded-2xl p-4 bg-brand-50/40">
                <p className="text-gray-800 text-base mb-2 font-semibold">Icebreaker prompt:</p>
                <p className="text-gray-800 text-base mb-4">{icePrompt.text}</p>
                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full bg-brand-700 hover:bg-brand-600 text-white"
                    onClick={() => {
                      // Send prompt as a message
                      const message = {
                        id: messages.length + 1,
                        text: icePrompt.text,
                        sender: "me",
                        timestamp: new Date()
                      };
                      setMessages((prev) => [...prev, message]);
                      setIceVisible(false);
                    }}
                  >
                    Send
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full bg-danger-600/90 hover:bg-danger-600 text-white"
                    onClick={() => fetchIcebreaker(iceExcluded)}
                  >
                    Generate Another
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full bg-gray-300 text-white"
                    onClick={() => setIceVisible(false)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            {messages.map((message) => {
              const isMe = message.isOwn;
              const bubbleBase = isMe ? "bg-green-600 text-white" : "bg-gray-300 text-gray-800";
              return (
                <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${bubbleBase}`}>
                    {message.type === "file" ? (
                      <div>
                        {message.isImage ? (
                          <Image
                            src={message.fileUrl}
                            alt={message.fileName}
                            width={256}
                            height={256}
                            className="rounded-md mb-2 max-h-64 object-contain bg-white/10"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-sm break-all">{message.fileName}</span>
                          </div>
                        )}
                        <div className={`text-xs mt-1 ${isMe ? "text-white/80" : "text-gray-700"}`}>
                          {message.fileName} • {formatBytes(message.fileSize)}
                          {message.isLocalPreview ? " • preview only" : ""}
                        </div>
                      </div>
                    ) : message.isSystem ? (
                      <p className="text-sm whitespace-pre-wrap italic text-center">{message.content}</p>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {partnerTyping && !partnerLeft && (
              <div className="flex justify-start">
                <div className="bg-gray-300 text-gray-800 max-w-xs px-4 py-2 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* System logs just above the input, bottom-left aligned */}
          <div className="px-4 pb-1 text-xs text-gray-500 space-y-1 select-none">
            {statusLog.map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="bg-white border-t border-gray-200 p-4">
            <div className="flex items-center space-x-2">
              {/* Leave Chat Button */}
              <button 
                type="button"
                onClick={handleLeaveChat}
                disabled={isEnding || partnerLeft}
                className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-lg transition-colors disabled:opacity-50"
                title="Leave Chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>

              {/* Attachment Button */}
              <button 
                type="button"
                onClick={openFilePicker}
                className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg transition-colors"
                title="Attach a file (UI demo)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept="image/*,application/pdf,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              />

              {/* Message Input */}
              <div className="flex-1 relative">
                <textarea
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  placeholder={connectionStatus === "connected" ? "Type your message..." : "Connecting..."}
                  disabled={connectionStatus !== "connected"}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-black placeholder-gray-400"
                  rows="1"
                  style={{ minHeight: "48px", maxHeight: "120px" }}
                />
              </div>

              {/* Send Button */}
              <button 
                type="submit"
                disabled={!inputValue.trim() || connectionStatus !== "connected"}
                className={`p-3 rounded-lg transition-colors ${
                  inputValue.trim() && connectionStatus === "connected"
                    ? "bg-green-600 hover:bg-green-700 text-white" 
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>

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
                onClick={handleBlockUser} // <--- NEW (Correct)
                disabled={isBlocking}     // <--- Add disabled state so they can't spam click
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-2xl disabled:opacity-70"
              >
                {isBlocking ? "Blocking..." : "Block"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReportOpen(false)} />
          <div className="relative bg-white w-[92%] max-w-xl rounded-2xl p-6 shadow-xl">
            <h2 className="text-3xl font-bold text-[#286633] text-center mb-4">Report Issue</h2>
            <label className="block mb-6">
              <span className="sr-only">Describe the issue</span>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Describe the issue or reason for reporting..."
                className="w-full min-h-[200px] rounded-xl bg-green-100/70 border-2 border-transparent focus:border-blue-500 outline-none p-4 text-gray-800"
              />
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="flex-1 bg-gray-300 text-white py-3 rounded-2xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReport}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-2xl"
              >
                Report
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Feedback Modal (on exit) */}
      {showFeedback && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFeedback(false)} />
          <div className="relative bg-white w-[92%] max-w-xl rounded-3xl p-6 shadow-2xl">
            <h2 className="text-3xl font-extrabold text-brand-700 text-center mb-4">Enjoying the App?</h2>
            <div className="mb-6">
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Tell us what you think..."
                className="w-full min-h-[180px] rounded-2xl bg-brand-50/80 border border-brand-700/10 outline-none p-4 text-gray-800 placeholder:text-gray-500 focus:ring-2 focus:ring-brand-600/30"
              />
            </div>
            {/* Stars */}
            <div className="flex items-center justify-between max-w-sm mx-auto mb-6">
              {[1,2,3,4,5].map((i) => {
                const active = (hoverRating || rating) >= i;
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={`${i} star${i>1?'s':''}`}
                    onMouseEnter={() => setHoverRating(i)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(i)}
                    className="p-1"
                  >
                    <svg
                      className={`w-10 h-10 drop-shadow-sm ${active ? 'text-yellow-300' : 'text-yellow-200'} ${active ? '' : 'opacity-70'}`}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2">
              <button
                type="button"
                className="flex-1 bg-gray-300 text-white py-4 rounded-2xl"
                onClick={() => setShowFeedback(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 bg-brand-700 hover:bg-brand-600 text-white py-4 rounded-2xl"
                onClick={() => {
                  setShowFeedback(false);
                  setStatusLog((prev) => [...prev, `Feedback submitted (rating: ${rating || 0})${feedbackText ? ` - ${feedbackText}` : ''}`]);
                  // Continue with previous leave behavior
                  simulateRequeue();
                  if (typeof onDisconnect === 'function') {
                    try { onDisconnect(); } catch (_) {}
                  }
                  // reset inputs
                  setRating(0);
                  setHoverRating(0);
                  setFeedbackText('');
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}