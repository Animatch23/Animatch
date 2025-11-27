"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const SOCKET_BASE = process.env.NEXT_PUBLIC_SOCKET_URL || API_BASE;

export default function SavedChatsList({ visible, onClose }) {
  const router = useRouter();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasActiveChat, setHasActiveChat] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const socketRef = useRef(null);

  const fetchChatsData = useCallback(async () => {
    const token = localStorage.getItem("sessionToken");
    if (!token) return;
    
    try {
      const [chatRes, activeRes] = await Promise.all([
        fetch(`${API_BASE}/api/chat/history`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/chat/active`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null)
      ]);
      
      const chatData = await chatRes.json();
      const activeData = activeRes?.ok ? await activeRes.json() : null;
      
      setChats(chatData || []);
      setHasActiveChat(!!activeData?.chatSessionId);
    } catch (err) {
      setError(err.message || "Failed to fetch saved chats");
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    fetchChatsData().finally(() => setLoading(false));
  }, [visible, fetchChatsData]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!visible) return;
    const token = localStorage.getItem("sessionToken");
    if (!token || !SOCKET_BASE) return;

    const socketUrl = SOCKET_BASE.replace(/\/$/, "");
    const socket = io(socketUrl, {
      transports: ["websocket"],
      auth: { token },
    });
    socketRef.current = socket;

    // Join all saved chat rooms to receive real-time messages
    socket.on("connect", () => {
      // Join each saved chat room to receive their messages
      chats.forEach(chat => {
        socket.emit("chat:join", { chatSessionId: chat._id });
      });
    });

    // Listen for new messages to update the chat list
    socket.on("chat:message", () => {
      // Refetch to get updated lastMessage
      fetchChatsData();
    });

    // Listen for partner save notifications
    socket.on("chat:partner-saved", () => {
      fetchChatsData();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [visible, fetchChatsData, chats]);

  const handleOpen = (id) => {
    router.push(`/match/chat?session=${id}`);
    if (typeof onClose === "function") onClose();
  };

  const formatTimeAgo = (time) => {
    if (!time) return '';
    let t = time;
    if (typeof t === 'string' || typeof t === 'number') t = new Date(t);
    const diff = Date.now() - new Date(t).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 10) return 'now';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const handleGoToActiveChat = () => {
    router.push('/match/chat');
    if (typeof onClose === "function") onClose();
  };

  if (!visible) return null;

  const isOverlay = typeof onClose === "function";

  // Collapsed state for sidebar mode (non-overlay)
  if (!isOverlay && isCollapsed) {
    return (
      <div className="h-full bg-gradient-to-b from-green-800 to-green-900 flex flex-col items-center py-4 w-16 transition-all duration-300">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Expand saved chats"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
        <div className="mt-4 text-white/70 text-xs writing-mode-vertical rotate-180" style={{ writingMode: 'vertical-rl' }}>
          Saved Chats ({chats.length})
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop for overlay mode on mobile */}
      {isOverlay && (
        <div 
          className="fixed inset-0 bg-black/40 z-[55] lg:hidden"
          onClick={() => typeof onClose === "function" && onClose()}
        />
      )}
      
      <div className={`
        ${isOverlay 
          ? 'fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl z-[60] transform transition-transform duration-300' 
          : 'h-full bg-gradient-to-b from-green-800 to-green-900 w-72 transition-all duration-300'
        } 
        overflow-hidden flex flex-col
      `}>
        {/* Header */}
        <div className={`p-4 ${isOverlay ? 'bg-white border-b border-gray-200' : 'bg-black/10'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isOverlay && (
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Collapse saved chats"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div>
                <h3 className={`text-lg font-bold ${isOverlay ? 'text-gray-900' : 'text-white'}`}>
                  💬 Saved Chats
                </h3>
                <p className={`text-xs ${isOverlay ? 'text-gray-500' : 'text-white/60'}`}>
                  {chats.length} conversation{chats.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {isOverlay && (
              <button
                aria-label="Close Saved Chats"
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                onClick={() => typeof onClose === "function" && onClose()}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Return to Active Match button */}
          {hasActiveChat && (
            <button
              onClick={handleGoToActiveChat}
              className={`mt-3 w-full px-4 py-2.5 text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 ${
                isOverlay 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-white text-green-800 hover:bg-green-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Return to Active Match
            </button>
          )}
        </div>
        
        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className={`p-6 text-center ${isOverlay ? 'text-gray-500' : 'text-white/70'}`}>
              <div className="animate-spin w-6 h-6 border-2 border-current border-t-transparent rounded-full mx-auto mb-2"></div>
              Loading chats...
            </div>
          )}
          {error && (
            <div className="p-4 m-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          {chats.length === 0 && !loading && (
            <div className={`p-6 text-center ${isOverlay ? 'text-gray-500' : 'text-white/60'}`}>
              <div className="text-4xl mb-2">📭</div>
              <p className="font-medium">No saved chats yet</p>
              <p className="text-xs mt-1">Save a chat to keep the conversation!</p>
            </div>
          )}
          <ul className={isOverlay ? 'divide-y divide-gray-100' : ''}>
            {chats.map((chat) => {
              const partnerName = (chat.participants || [])
                .filter(p => p.username)
                .map(p => p.username)
                .join(" & ") || "Unknown";
              const initials = partnerName.split(" ")[0].slice(0, 2).toUpperCase();
              const isActive = chat.active;
              
              return (
                <li key={chat._id}>
                  <button
                    className={`text-left w-full p-4 flex items-center gap-3 transition-all ${
                      isOverlay 
                        ? 'hover:bg-gray-50' 
                        : 'hover:bg-white/10 border-b border-white/10'
                    }`}
                    onClick={() => handleOpen(chat._id)}
                    aria-label={`Open saved chat with ${partnerName}`}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0 relative">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${
                        isOverlay 
                          ? 'bg-gradient-to-br from-green-400 to-green-600 text-white' 
                          : 'bg-white/20 text-white'
                      }`}>
                        {initials}
                      </div>
                      {isActive && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full" title="Active chat"></div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Top Row: Name + Time */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-semibold truncate ${
                          isOverlay ? 'text-gray-900' : 'text-white'
                        }`}>
                          {partnerName}
                        </span>
                        {chat.lastMessage?.sentAt && (
                          <span className={`text-xs flex-shrink-0 ${
                            isOverlay ? 'text-gray-400' : 'text-white/50'
                          }`}>
                            {formatTimeAgo(chat.lastMessage.sentAt)}
                          </span>
                        )}
                      </div>

                      {/* Bottom Row: Message Preview */}
                      <div className={`text-sm mt-0.5 truncate ${
                        isOverlay ? 'text-gray-500' : 'text-white/70'
                      }`}>
                        {chat.lastMessage ? (
                          chat.lastMessage.type === 'attachment' ? (
                            <span>📎 {chat.lastMessage.isOwn ? 'You' : chat.lastMessage.senderUsername} sent an attachment</span>
                          ) : (
                            <span>
                              <span className="font-medium">{chat.lastMessage.isOwn ? 'You' : chat.lastMessage.senderUsername}:</span>
                              {' '}{chat.lastMessage.content?.length > 25 
                                ? chat.lastMessage.content.substring(0, 25) + '...' 
                                : chat.lastMessage.content}
                            </span>
                          )
                        ) : (
                          <span className="italic">No messages yet</span>
                        )}
                      </div>
                      
                      {/* Status badge */}
                      {!isActive && (
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                          isOverlay 
                            ? 'bg-gray-100 text-gray-600' 
                            : 'bg-white/10 text-white/70'
                        }`}>
                          Ended
                        </span>
                      )}
                    </div>
                    
                    {/* Chevron */}
                    <svg className={`w-5 h-5 flex-shrink-0 ${isOverlay ? 'text-gray-300' : 'text-white/40'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
