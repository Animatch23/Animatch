"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { io } from "socket.io-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const SOCKET_BASE = process.env.NEXT_PUBLIC_SOCKET_URL || API_BASE;

const formatTimestamp = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
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
  token,
  currentUserId,
  onChatEnded,
}) {
  // --- State from sprint-2 (Backend Logic) ---
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [error, setError] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // --- State from us-6 (UI Features) ---
  const [showSidebar, setShowSidebar] = useState(false);
  const [savedChats, setSavedChats] = useState([]);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [statusLog, setStatusLog] = useState([]); // system log lines

  // --- Refs ---
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const hasSentTypingRef = useRef(false);
  const currentUserIdRef = useRef(currentUserId ?? "");
  const fileInputRef = useRef(null);
  const menuCloseTimeoutRef = useRef(null);

  const socketUrl = useMemo(() => {
    if (!SOCKET_BASE) return "";
    return SOCKET_BASE.replace(/\/$/, "");
  }, []);

  // Update ref when prop changes
  useEffect(() => {
    currentUserIdRef.current = currentUserId ?? "";
  }, [currentUserId]);

  // --- 1. Load Chat History (sprint-2) ---
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
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) throw new Error(data.message || "Failed to load chat history");
        if (cancelled) return;

        const history = Array.isArray(data.messages)
          ? data.messages.map((item) => ({
              id: item._id || `${item.sentAt}-${Math.random()}`,
              content: item.content,
              sentAt: item.sentAt,
              isOwn: currentUserIdRef.current
                ? item.senderId === currentUserIdRef.current
                : Boolean(item.isOwnMessage),
              type: "text" // Default to text for history
            }))
          : [];

        setMessages(history);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load chat history");
      }
    };

    loadHistory();

    return () => { cancelled = true; };
  }, [chatSessionId, token]);

  // --- 2. Socket Connection (sprint-2) ---
  useEffect(() => {
    if (!socketUrl || !chatSessionId || !token) return;

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
        type: "text"
      };

      setMessages((prev) => {
        if (prev.some((item) => item.id === messageId)) return prev;
        return [...prev, message];
      });
    });

    socket.on("chat:typing", ({ isTyping }) => {
      setPartnerTyping(Boolean(isTyping));
    });

    socket.on("chat:partner-disconnected", () => {
      setConnectionStatus("partner-disconnected");
      setStatusLog(prev => [...prev, "Partner disconnected."]);
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

  // --- 3. Auto-scroll ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  // --- 4. UI Helpers ---
  const statusLabel = useMemo(() => {
    switch (connectionStatus) {
      case "connected": return "Connected";
      case "partner-disconnected": return "Partner disconnected";
      case "disconnected": return "Connection lost";
      case "error": return "Connection error";
      case "connecting": default: return "Connecting...";
    }
  }, [connectionStatus]);

  const statusColor = useMemo(() => {
    switch (connectionStatus) {
      case "connected": return "text-green-600";
      case "partner-disconnected": return "text-yellow-600";
      case "error": case "disconnected": return "text-red-600";
      default: return "text-gray-500";
    }
  }, [connectionStatus]);

  // --- 5. Handlers ---

  function stopTypingNotification() {
    if (socketRef.current && hasSentTypingRef.current) {
      socketRef.current.emit("chat:typing", { isTyping: false });
    }
    hasSentTypingRef.current = false;
  }

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInputValue(value);

    if (!socketRef.current || connectionStatus !== "connected") return;

    if (!hasSentTypingRef.current) {
      socketRef.current.emit("chat:typing", { isTyping: true });
      hasSentTypingRef.current = true;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = window.setTimeout(() => {
      stopTypingNotification();
      typingTimeoutRef.current = null;
    }, 1200);
  };

  const handleSendMessage = () => {
    const messageText = inputValue.trim();
    if (!messageText || !socketRef.current) return;

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

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Real API call to end chat
  const handleLeaveChat = async () => {
    if (!API_BASE || !token) {
      if (typeof onChatEnded === "function") onChatEnded();
      return;
    }

    try {
      setIsEnding(true);
      stopTypingNotification();
      await fetch(`${API_BASE}/api/chat/${chatSessionId}/end`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Failed to end chat", err);
    } finally {
      setIsEnding(false);
      if (typeof onChatEnded === "function") onChatEnded();
    }
  };

  // Real API call to save chat
  const handleSaveChat = async () => {
    if (!API_BASE || !token) return;

    try {
      setIsSaving(true);
      setFeedback(null);
      const response = await fetch(`${API_BASE}/api/chat/${chatSessionId}/save`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Failed to save chat");

      setFeedback({ type: "success", message: "Chat saved to your account." });
      
      // Also update local list for UI demo
      const id = Date.now();
      const snapshot = messages.map((m) => ({ ...m }));
      setSavedChats((prev) => [{ id, name: partnerUsername || "Saved Chat", messages: snapshot }, ...prev]);

    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save chat",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Real API call to next chat
  const handleNextChat = async () => {
    try {
      setStatusLog((prev) => [...prev, "Skipping to next chat..."]);
      
      await fetch(`${API_BASE}/api/chat/next`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // The backend will handle the queue logic. 
      // We should probably trigger the parent to re-check queue status or redirect.
      if (typeof onChatEnded === "function") {
        onChatEnded(); // This will likely redirect to queue page which handles matching
      }
    } catch (error) {
      console.error("Error skipping chat:", error);
      setStatusLog((prev) => [...prev, "Error skipping chat. Please try again."]);
    }
  };

  // --- UI Demo Features (File Attachments) ---
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

    // Add local preview message
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

  // --- Sidebar & Menu Logic ---
  const toggleSidebar = () => setShowSidebar((v) => !v);
  
  const openMenu = () => {
    if (menuCloseTimeoutRef.current) clearTimeout(menuCloseTimeoutRef.current);
    setShowActionMenu(true);
  };

  const scheduleCloseMenu = () => {
    if (menuCloseTimeoutRef.current) clearTimeout(menuCloseTimeoutRef.current);
    menuCloseTimeoutRef.current = setTimeout(() => {
      setShowActionMenu(false);
    }, 200);
  };

  const blockUser = () => { setShowActionMenu(false); setConfirmBlockOpen(true); };
  const reportUser = () => { setShowActionMenu(false); setReportOpen(true); };
  
  const handleConfirmBlock = () => {
    setConfirmBlockOpen(false);
    setStatusLog((prev) => [...prev, "User blocked (UI-only)."]);
  };

  const handleSubmitReport = () => {
    setReportOpen(false);
    setReportReason("");
    setStatusLog((prev) => [...prev, "Report submitted."]);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {partnerUsername || "Anonymous Match"}
          </h1>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            <p className={`text-xs ${statusColor}`}>{statusLabel}</p>
          </div>
          {partnerTyping && connectionStatus === "connected" && (
            <p className="text-xs text-gray-500 animate-pulse">Typing...</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Save Chat Button */}
          <button
            type="button"
            onClick={handleSaveChat}
            disabled={isSaving}
            className="hidden sm:flex h-9 px-3 rounded-md bg-yellow-100 text-yellow-800 items-center gap-2 hover:bg-yellow-200 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="text-sm font-medium">{isSaving ? "Saving..." : "Save"}</span>
          </button>

          {/* Report/Block Menu */}
          <div className="relative" onMouseEnter={openMenu} onMouseLeave={scheduleCloseMenu}>
            <button
              className="h-9 w-9 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            
            {showActionMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg ring-1 ring-black/5 z-50">
                <button onClick={blockUser} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Block User</button>
                <button onClick={reportUser} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Report User</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Feedback / Error Messages */}
      {(error || feedback) && (
        <div className="px-4 pt-2">
          {error && <div className="p-2 text-sm text-red-700 bg-red-50 rounded border border-red-200">{error}</div>}
          {feedback && (
            <div className={`p-2 text-sm rounded border ${feedback.type === 'success' ? 'text-green-700 bg-green-50 border-green-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
              {feedback.message}
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Sidebar (Saved Chats) */}
        <aside className={`absolute inset-y-0 left-0 z-20 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${showSidebar ? 'translate-x-0' : '-translate-x-full'} w-64 sm:relative sm:translate-x-0 sm:w-0 sm:hidden`}>
           {/* Sidebar content would go here if we enabled it for mobile, currently hidden to simplify merge */}
        </aside>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => {
              const isMe = message.isOwn;
              return (
                <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${isMe ? "bg-[#286633] text-white rounded-br-none" : "bg-white text-gray-900 rounded-bl-none"}`}>
                    
                    {/* File Attachment Display */}
                    {message.type === "file" ? (
                      <div className="space-y-2">
                        {message.isImage ? (
                          <img src={message.fileUrl} alt={message.fileName} className="rounded-lg max-h-48 object-cover" />
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-black/10 rounded">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <span className="text-sm truncate">{message.fileName}</span>
                          </div>
                        )}
                        <div className="text-xs opacity-70">{formatBytes(message.fileSize)} {message.isLocalPreview && "• Preview"}</div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                    )}
                    
                    <div className={`text-[10px] mt-1 text-right ${isMe ? "text-white/70" : "text-gray-400"}`}>
                      {formatTimestamp(message.sentAt)}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Typing Indicator Bubble */}
            {partnerTyping && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* System Logs */}
          {statusLog.length > 0 && (
            <div className="px-4 py-1">
              <div className="text-xs text-gray-400 text-center italic">
                {statusLog[statusLog.length - 1]}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="bg-white border-t border-gray-200 p-3 sm:p-4">
            <div className="flex items-end gap-2 max-w-4xl mx-auto">
              {/* Leave/Next Buttons */}
              <div className="flex gap-1">
                <button 
                  onClick={handleLeaveChat}
                  disabled={isEnding}
                  className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
                  title="End Chat"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <button 
                  onClick={handleNextChat}
                  className="p-2 text-gray-500 hover:bg-green-50 hover:text-green-600 rounded-full transition-colors"
                  title="Next Chat"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                </button>
              </div>

              {/* File Input (Hidden) */}
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
              <button 
                onClick={openFilePicker}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                title="Attach Image"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>

              {/* Text Input */}
              <div className="flex-1 bg-gray-100 rounded-2xl flex items-center px-4 py-2 focus-within:ring-2 focus-within:ring-[#286633]/50 focus-within:bg-white transition-all">
                <textarea
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder={connectionStatus === "connected" ? "Type a message..." : "Connecting..."}
                  disabled={connectionStatus !== "connected"}
                  rows={1}
                  className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-24 py-2 text-sm sm:text-base"
                  style={{ minHeight: '24px' }}
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || connectionStatus !== "connected"}
                className="p-3 bg-[#286633] text-white rounded-full shadow-md hover:bg-[#1e4d26] disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
              >
                <svg className="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      {confirmBlockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Block User?</h3>
            <p className="text-gray-600 mb-6">You won't be matched with this user again.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmBlockOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleConfirmBlock} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Block</button>
            </div>
          </div>
        </div>
      )}

      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Report User</h3>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Please describe the issue..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-[#286633] focus:border-transparent resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => setReportOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleSubmitReport} className="flex-1 px-4 py-2 bg-[#286633] text-white rounded-lg hover:bg-[#1e4d26]">Submit Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
// filepath: c:\Bon_AllGit\Animatch\frontend\src\components\ChatInterface.js
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { io } from "socket.io-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const SOCKET_BASE = process.env.NEXT_PUBLIC_SOCKET_URL || API_BASE;

const formatTimestamp = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
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
  token,
  currentUserId,
  onChatEnded,
}) {
  // --- State from sprint-2 (Backend Logic) ---
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [error, setError] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // --- State from us-6 (UI Features) ---
  const [showSidebar, setShowSidebar] = useState(false);
  const [savedChats, setSavedChats] = useState([]);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [statusLog, setStatusLog] = useState([]); // system log lines

  // --- Refs ---
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const hasSentTypingRef = useRef(false);
  const currentUserIdRef = useRef(currentUserId ?? "");
  const fileInputRef = useRef(null);
  const menuCloseTimeoutRef = useRef(null);

  const socketUrl = useMemo(() => {
    if (!SOCKET_BASE) return "";
    return SOCKET_BASE.replace(/\/$/, "");
  }, []);

  // Update ref when prop changes
  useEffect(() => {
    currentUserIdRef.current = currentUserId ?? "";
  }, [currentUserId]);

  // --- 1. Load Chat History (sprint-2) ---
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
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) throw new Error(data.message || "Failed to load chat history");
        if (cancelled) return;

        const history = Array.isArray(data.messages)
          ? data.messages.map((item) => ({
              id: item._id || `${item.sentAt}-${Math.random()}`,
              content: item.content,
              sentAt: item.sentAt,
              isOwn: currentUserIdRef.current
                ? item.senderId === currentUserIdRef.current
                : Boolean(item.isOwnMessage),
              type: "text" // Default to text for history
            }))
          : [];

        setMessages(history);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load chat history");
      }
    };

    loadHistory();

    return () => { cancelled = true; };
  }, [chatSessionId, token]);

  // --- 2. Socket Connection (sprint-2) ---
  useEffect(() => {
    if (!socketUrl || !chatSessionId || !token) return;

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
        type: "text"
      };

      setMessages((prev) => {
        if (prev.some((item) => item.id === messageId)) return prev;
        return [...prev, message];
      });
    });

    socket.on("chat:typing", ({ isTyping }) => {
      setPartnerTyping(Boolean(isTyping));
    });

    socket.on("chat:partner-disconnected", () => {
      setConnectionStatus("partner-disconnected");
      setStatusLog(prev => [...prev, "Partner disconnected."]);
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

  // --- 3. Auto-scroll ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  // --- 4. UI Helpers ---
  const statusLabel = useMemo(() => {
    switch (connectionStatus) {
      case "connected": return "Connected";
      case "partner-disconnected": return "Partner disconnected";
      case "disconnected": return "Connection lost";
      case "error": return "Connection error";
      case "connecting": default: return "Connecting...";
    }
  }, [connectionStatus]);

  const statusColor = useMemo(() => {
    switch (connectionStatus) {
      case "connected": return "text-green-600";
      case "partner-disconnected": return "text-yellow-600";
      case "error": case "disconnected": return "text-red-600";
      default: return "text-gray-500";
    }
  }, [connectionStatus]);

  // --- 5. Handlers ---

  function stopTypingNotification() {
    if (socketRef.current && hasSentTypingRef.current) {
      socketRef.current.emit("chat:typing", { isTyping: false });
    }
    hasSentTypingRef.current = false;
  }

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInputValue(value);

    if (!socketRef.current || connectionStatus !== "connected") return;

    if (!hasSentTypingRef.current) {
      socketRef.current.emit("chat:typing", { isTyping: true });
      hasSentTypingRef.current = true;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = window.setTimeout(() => {
      stopTypingNotification();
      typingTimeoutRef.current = null;
    }, 1200);
  };

  const handleSendMessage = () => {
    const messageText = inputValue.trim();
    if (!messageText || !socketRef.current) return;

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

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Real API call to end chat
  const handleLeaveChat = async () => {
    if (!API_BASE || !token) {
      if (typeof onChatEnded === "function") onChatEnded();
      return;
    }

    try {
      setIsEnding(true);
      stopTypingNotification();
      await fetch(`${API_BASE}/api/chat/${chatSessionId}/end`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Failed to end chat", err);
    } finally {
      setIsEnding(false);
      if (typeof onChatEnded === "function") onChatEnded();
    }
  };

  // Real API call to save chat
  const handleSaveChat = async () => {
    if (!API_BASE || !token) return;

    try {
      setIsSaving(true);
      setFeedback(null);
      const response = await fetch(`${API_BASE}/api/chat/${chatSessionId}/save`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Failed to save chat");

      setFeedback({ type: "success", message: "Chat saved to your account." });
      
      // Also update local list for UI demo
      const id = Date.now();
      const snapshot = messages.map((m) => ({ ...m }));
      setSavedChats((prev) => [{ id, name: partnerUsername || "Saved Chat", messages: snapshot }, ...prev]);

    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save chat",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Real API call to next chat
  const handleNextChat = async () => {
    try {
      setStatusLog((prev) => [...prev, "Skipping to next chat..."]);
      
      await fetch(`${API_BASE}/api/chat/next`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // The backend will handle the queue logic. 
      // We should probably trigger the parent to re-check queue status or redirect.
      if (typeof onChatEnded === "function") {
        onChatEnded(); // This will likely redirect to queue page which handles matching
      }
    } catch (error) {
      console.error("Error skipping chat:", error);
      setStatusLog((prev) => [...prev, "Error skipping chat. Please try again."]);
    }
  };

  // --- UI Demo Features (File Attachments) ---
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

    // Add local preview message
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

  // --- Sidebar & Menu Logic ---
  const toggleSidebar = () => setShowSidebar((v) => !v);
  
  const openMenu = () => {
    if (menuCloseTimeoutRef.current) clearTimeout(menuCloseTimeoutRef.current);
    setShowActionMenu(true);
  };

  const scheduleCloseMenu = () => {
    if (menuCloseTimeoutRef.current) clearTimeout(menuCloseTimeoutRef.current);
    menuCloseTimeoutRef.current = setTimeout(() => {
      setShowActionMenu(false);
    }, 200);
  };

  const blockUser = () => { setShowActionMenu(false); setConfirmBlockOpen(true); };
  const reportUser = () => { setShowActionMenu(false); setReportOpen(true); };
  
  const handleConfirmBlock = () => {
    setConfirmBlockOpen(false);
    setStatusLog((prev) => [...prev, "User blocked (UI-only)."]);
  };

  const handleSubmitReport = () => {
    setReportOpen(false);
    setReportReason("");
    setStatusLog((prev) => [...prev, "Report submitted."]);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {partnerUsername || "Anonymous Match"}
          </h1>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            <p className={`text-xs ${statusColor}`}>{statusLabel}</p>
          </div>
          {partnerTyping && connectionStatus === "connected" && (
            <p className="text-xs text-gray-500 animate-pulse">Typing...</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Save Chat Button */}
          <button
            type="button"
            onClick={handleSaveChat}
            disabled={isSaving}
            className="hidden sm:flex h-9 px-3 rounded-md bg-yellow-100 text-yellow-800 items-center gap-2 hover:bg-yellow-200 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="text-sm font-medium">{isSaving ? "Saving..." : "Save"}</span>
          </button>

          {/* Report/Block Menu */}
          <div className="relative" onMouseEnter={openMenu} onMouseLeave={scheduleCloseMenu}>
            <button
              className="h-9 w-9 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            
            {showActionMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg ring-1 ring-black/5 z-50">
                <button onClick={blockUser} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Block User</button>
                <button onClick={reportUser} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Report User</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Feedback / Error Messages */}
      {(error || feedback) && (
        <div className="px-4 pt-2">
          {error && <div className="p-2 text-sm text-red-700 bg-red-50 rounded border border-red-200">{error}</div>}
          {feedback && (
            <div className={`p-2 text-sm rounded border ${feedback.type === 'success' ? 'text-green-700 bg-green-50 border-green-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
              {feedback.message}
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Sidebar (Saved Chats) */}
        <aside className={`absolute inset-y-0 left-0 z-20 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${showSidebar ? 'translate-x-0' : '-translate-x-full'} w-64 sm:relative sm:translate-x-0 sm:w-0 sm:hidden`}>
           {/* Sidebar content would go here if we enabled it for mobile, currently hidden to simplify merge */}
        </aside>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => {
              const isMe = message.isOwn;
              return (
                <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${isMe ? "bg-[#286633] text-white rounded-br-none" : "bg-white text-gray-900 rounded-bl-none"}`}>
                    
                    {/* File Attachment Display */}
                    {message.type === "file" ? (
                      <div className="space-y-2">
                        {message.isImage ? (
                          <img src={message.fileUrl} alt={message.fileName} className="rounded-lg max-h-48 object-cover" />
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-black/10 rounded">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <span className="text-sm truncate">{message.fileName}</span>
                          </div>
                        )}
                        <div className="text-xs opacity-70">{formatBytes(message.fileSize)} {message.isLocalPreview && "• Preview"}</div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                    )}
                    
                    <div className={`text-[10px] mt-1 text-right ${isMe ? "text-white/70" : "text-gray-400"}`}>
                      {formatTimestamp(message.sentAt)}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Typing Indicator Bubble */}
            {partnerTyping && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* System Logs */}
          {statusLog.length > 0 && (
            <div className="px-4 py-1">
              <div className="text-xs text-gray-400 text-center italic">
                {statusLog[statusLog.length - 1]}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="bg-white border-t border-gray-200 p-3 sm:p-4">
            <div className="flex items-end gap-2 max-w-4xl mx-auto">
              {/* Leave/Next Buttons */}
              <div className="flex gap-1">
                <button 
                  onClick={handleLeaveChat}
                  disabled={isEnding}
                  className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
                  title="End Chat"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <button 
                  onClick={handleNextChat}
                  className="p-2 text-gray-500 hover:bg-green-50 hover:text-green-600 rounded-full transition-colors"
                  title="Next Chat"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                </button>
              </div>

              {/* File Input (Hidden) */}
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
              <button 
                onClick={openFilePicker}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                title="Attach Image"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>

              {/* Text Input */}
              <div className="flex-1 bg-gray-100 rounded-2xl flex items-center px-4 py-2 focus-within:ring-2 focus-within:ring-[#286633]/50 focus-within:bg-white transition-all">
                <textarea
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder={connectionStatus === "connected" ? "Type a message..." : "Connecting..."}
                  disabled={connectionStatus !== "connected"}
                  rows={1}
                  className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-24 py-2 text-sm sm:text-base"
                  style={{ minHeight: '24px' }}
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || connectionStatus !== "connected"}
                className="p-3 bg-[#286633] text-white rounded-full shadow-md hover:bg-[#1e4d26] disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
              >
                <svg className="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      {confirmBlockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Block User?</h3>
            <p className="text-gray-600 mb-6">You won't be matched with this user again.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmBlockOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleConfirmBlock} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Block</button>
            </div>
          </div>
        </div>
      )}

      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Report User</h3>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Please describe the issue..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-[#286633] focus:border-transparent resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => setReportOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleSubmitReport} className="flex-1 px-4 py-2 bg-[#286633] text-white rounded-lg hover:bg-[#1e4d26]">Submit Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}