"use client";

import { useState, useRef, useEffect } from "react";

export default function ChatInterface({ onDisconnect }) {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hey there! How's your day going?", sender: "other", timestamp: new Date() },
    { id: 2, text: "Hi! It's going well, thanks for asking! How about yours?", sender: "me", timestamp: new Date() }
  ]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [savedChats, setSavedChats] = useState([]); // {id, name, messages}
  const [newMessage, setNewMessage] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("connected"); // connected, disconnected, finding
  const [isTyping, setIsTyping] = useState(false);
  const [statusLog, setStatusLog] = useState([]); // system log lines
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  // Feedback modal state
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState(0); // 0..5
  const [hoverRating, setHoverRating] = useState(0);
  const [filterQuery, setFilterQuery] = useState("");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const menuCloseTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: messages.length + 1,
      text: newMessage,
      sender: "me",
      timestamp: new Date()
    };

    setMessages([...messages, message]);
    setNewMessage("");

    // Simulate typing indicator and response (remove in production)
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const response = {
        id: messages.length + 2,
        text: "That's interesting! Tell me more about that.",
        sender: "other",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, response]);
    }, 2000);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

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

  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    const sizes = ["B", "KB", "MB", "GB"]; 
    const i = bytes === 0 ? 0 : Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simple size cap for demo (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setStatusLog((prev) => [...prev, `File too large: ${file.name} (${formatBytes(file.size)}). Max 10MB for demo.`]);
      e.target.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const isImage = file.type.startsWith("image/");

    const attachmentMessage = {
      id: messages.length + 1,
      type: "file",
      sender: "me",
      timestamp: new Date(),
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileUrl: objectUrl,
      isLocalPreview: true,
      isImage,
    };

    setMessages((prev) => [...prev, attachmentMessage]);
    setStatusLog((prev) => [...prev, `Attached ${file.name} (${formatBytes(file.size)}) — preview only, not uploaded.`]);

    // Optional: simulate a counterpart acknowledgment
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (prev[prev.length - 1]?.id || 0) + 1,
          text: "Nice attachment! (simulated)",
          sender: "other",
          timestamp: new Date(),
        },
      ]);
    }, 1500);

    // Reset the input so selecting the same file again still triggers change
    e.target.value = "";
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusMessage = () => {
    switch (connectionStatus) {
      case "connected":
        return "Match Found...";
      case "disconnected":
        return "Disconnected.";
      case "finding":
        return "Finding another Match...";
      default:
        return "Connected";
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-600";
      case "disconnected":
        return "text-red-500";
      case "finding":
        return "text-yellow-600";
      default:
        return "text-gray-600";
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

  const handleLeaveChat = () => {
    // Open feedback modal instead of leaving immediately
    setShowFeedback(true);
  };

  const blockUser = () => {
    // Open confirm modal
    setShowActionMenu(false);
    setConfirmBlockOpen(true);
  };

  const reportUser = () => {
    // Open report modal
    setShowActionMenu(false);
    setReportOpen(true);
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

  const handleConfirmBlock = () => {
    setConfirmBlockOpen(false);
    setStatusLog((prev) => [...prev, "User blocked (UI-only)."]);
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
        {/* Save Chat (UI only) */}
        <button
          type="button"
          onClick={saveCurrentChat}
          title="Save Chat (UI only)"
          className="h-9 px-3 rounded-md bg-yellow-300 text-brand-600 flex items-center justify-center hover:brightness-95"
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a7 7 0 00-7 7h7" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7v6m3-3h-6" />
            </svg>
            Save chat
          </span>
        </button>

        {/* Report/Block with hover menu (UI only) */}
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
            title="Report / Block (UI only)"
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

      {/* Content area: sidebar + chat, split-screen (no overlay) */}
  <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar (saved chats) */}
        <aside
          aria-label="Saved chats"
          className={`relative flex-shrink-0 bg-gray-100 border-r border-gray-200 overflow-hidden transition-[width,opacity] duration-200 ${showSidebar ? "w-80 sm:w-96 opacity-100" : "w-0 opacity-0"}`}
        >
          <div className="h-full overflow-y-auto p-4 space-y-4">
            {/* Temporarily hide new match action in sidebar */}
            {/**
            <button
              type="button"
              onClick={() => { setShowSidebar(false); simulateRequeue(); }}
              className="w-full text-left rounded-md bg-green-600 hover:bg-green-700 text-white px-4 py-3 shadow-sm flex items-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Start a New Match
            </button>
            */}

            {/* Filter search bar */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Search chats..."
                className="flex-1 h-9 px-3 rounded-md bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600/40"
              />
              <button
                type="button"
                title="Apply filter"
                className="h-9 px-3 rounded-md bg-brand-50 text-brand-700 border border-brand-700/20"
              >
                Filter
              </button>
            </div>

            {savedChats.length === 0 && (
              <p className="text-sm text-gray-500">No saved chats yet. Use the yellow button to save one.</p>
            )}
            {savedChats.length > 0 && visibleChats.length === 0 && (
              <p className="text-sm text-gray-500">No chats match your filter.</p>
            )}
            {visibleChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => { loadChat(chat); setShowSidebar(false); }}
                className="w-full text-left bg-white hover:bg-gray-50 rounded-xl shadow-sm border border-gray-200 p-3"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar placeholder */}
                  <span className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 text-gray-600 ring-2 ring-gray-300 shrink-0">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-gray-800">{chatDisplayName(chat)}</div>
                    <div className="text-sm text-gray-500 italic text-pretty break-words leading-snug max-h-12 overflow-hidden">{lastPreview(chat)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Right pane: chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => {
              const isMe = message.sender === "me";
              const bubbleBase = isMe ? "bg-green-600 text-white" : "bg-gray-300 text-gray-800";
              return (
                <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${bubbleBase}`}>
                    {message.type === "file" ? (
                      <div>
                        {message.isImage ? (
                          <img
                            src={message.fileUrl}
                            alt={message.fileName}
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
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
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
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex items-center space-x-2">
              {/* Leave Chat Button */}
              <button 
                onClick={handleLeaveChat}
                className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-lg transition-colors"
                title="Leave Chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>

              {/* Attachment Button */}
              <button 
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
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-black placeholder-gray-400"
                  rows="1"
                  style={{ minHeight: "48px", maxHeight: "120px" }}
                />
              </div>

              {/* Send Button */}
              <button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className={`p-3 rounded-lg transition-colors ${
                  newMessage.trim() 
                    ? "bg-green-600 hover:bg-green-700 text-white" 
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar overlay */}
      {/* removed old fixed overlay/aside (now handled in split layout above) */}

      {/* Confirm Block Modal */}
      {confirmBlockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmBlockOpen(false)} />
          <div className="relative bg-white w-[90%] max-w-md rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-brand-600 text-center mb-2">Block user?</h2>
            <p className="text-center text-gray-600 mb-6">You won't be matched with this user again.</p>
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
                onClick={handleConfirmBlock}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-2xl"
              >
                Block
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
            <h2 className="text-3xl font-bold text-brand-600 text-center mb-4">Report Issue</h2>
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