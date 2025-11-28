"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import Image from "next/image";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const SOCKET_BASE = process.env.NEXT_PUBLIC_SOCKET_URL || API_BASE;

export default function SavedChatsList({ visible, onClose }) {
  const router = useRouter();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasActiveChat, setHasActiveChat] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    course: false,
    housing: false,
    orgs: false
  });

  const socketRef = useRef(null);

  const toggleFilter = (key) => setActiveFilters(prev => ({ ...prev, [key]: !prev[key] }));
  const clearFilters = () => {
    setActiveFilters({ course: false, housing: false, orgs: false });
    setShowFilterMenu(false);
  };
  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

  const fetchChatsData = useCallback(async () => {
    const token = localStorage.getItem("sessionToken");
    if (!token) return;
    
    try {
      // Build query string for filters
      const queryParams = new URLSearchParams();
      if (activeFilters.course) queryParams.append('course', 'true');
      if (activeFilters.housing) queryParams.append('housing', 'true');
      if (activeFilters.orgs) queryParams.append('orgs', 'true');

      // Fetch saved chats with filters AND check active chat status
      const [savedRes, activeRes] = await Promise.all([
        fetch(`${API_BASE}/api/chat/saved?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/chat/active`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null)
      ]);
      
      const savedData = await savedRes.json();
      const activeData = activeRes?.ok ? await activeRes.json() : null;
      
      // Handle the data
      if (savedRes.ok) {
        setChats(savedData || []);
      } else {
        throw new Error(savedData.message || "Failed to fetch chats");
      }

      setHasActiveChat(!!activeData?.chatSessionId);
    } catch (err) {
      console.error(err);
      setError("Failed to load saved matches");
    }
  }, [activeFilters]); // Re-fetch when filters change

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
      chats.forEach(chat => {
        // Handle both ID formats (new endpoint uses chatSessionId, old used _id)
        const roomId = chat.chatSessionId || chat._id;
        if (roomId) socket.emit("chat:join", { chatSessionId: roomId });
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

  const displayChats = chats.filter(chat => 
    (chat.name || "Anonymous").toLowerCase().includes(filterQuery.toLowerCase().trim())
  );

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
          : 'h-full bg-gradient-to-b from-green-800 to-green-900 w-80 transition-all duration-300'
        } 
        overflow-hidden flex flex-col
      `}>
        {/* Header */}
        <div className={`p-4 ${isOverlay ? 'bg-white border-b border-gray-200' : 'bg-black/10'}`}>
          <div className="flex items-center justify-between mb-3">
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
                  Saved Matches
                </h3>
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

          {/* Filter & Search Section */}
          <div className="space-y-2">
            {/* Search Input */}
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search by name..."
              className={`w-full h-9 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                isOverlay 
                  ? 'bg-gray-50 border-gray-300 text-black' 
                  : 'bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20'
              }`}
            />

            {/* Filter Buttons */}
            <div className="flex gap-2 relative">
              <button 
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`flex-1 h-8 px-3 rounded-md border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                  isOverlay 
                    ? (activeFilterCount > 0 ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-300 text-gray-600')
                    : (activeFilterCount > 0 ? 'bg-white text-green-800' : 'bg-white/10 border-white/20 text-white hover:bg-white/20')
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
              </button>
              
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className={`text-xs px-2 font-medium ${isOverlay ? 'text-gray-500 hover:text-red-600' : 'text-white/70 hover:text-white'}`}>
                  Clear
                </button>
              )}

              {/* Filter Dropdown Menu */}
              {showFilterMenu && (
                <div className="absolute top-9 left-0 w-full bg-white shadow-xl rounded-lg border border-gray-200 p-3 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Filter by shared:</h3>
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
                    <span className="text-sm text-gray-800">Shared Orgs</span>
                  </label>
                  <div className="mt-2 pt-2 border-t flex justify-end">
                    <button 
                      onClick={() => setShowFilterMenu(false)}
                      className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Return to Active Match button */}
          {hasActiveChat && (
            <button
              onClick={handleGoToActiveChat}
              className={`mt-3 w-full px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 ${
                isOverlay 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-yellow-400 text-green-900 hover:bg-yellow-300'
              }`}
            >
              Return to Active Match
            </button>
          )}
        </div>
        
        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className={`p-6 text-center ${isOverlay ? 'text-gray-500' : 'text-white/70'}`}>
              <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full mx-auto mb-2"></div>
              Loading...
            </div>
          )}
          {error && (
            <div className="p-3 m-3 bg-red-50/10 border border-red-200/20 rounded-lg text-center">
               <p className={`text-xs ${isOverlay ? 'text-red-600' : 'text-white'}`}>Failed to load matches</p>
            </div>
          )}
          
          {chats.length === 0 && !loading && (
            <div className={`p-6 text-center ${isOverlay ? 'text-gray-500' : 'text-white/60'}`}>
              <p className="font-medium text-sm">No saved matches found</p>
              {activeFilterCount > 0 ? (
                <p className="text-xs mt-1">Try clearing your filters</p>
              ) : (
                <p className="text-xs mt-1">Chat and save a match to see them here!</p>
              )}
            </div>
          )}

          <ul className={isOverlay ? 'divide-y divide-gray-100' : ''}>
            {displayChats.map((chat) => {
              // The new API endpoint structure is flatter: { chatSessionId, name, profilePicture, partnerData }
              // But we also support the old structure for robustness
              const partnerName = chat.name || 
                (chat.participants || []).filter(p => p.username).map(p => p.username).join(" & ") || 
                "Unknown";
              
              const initials = partnerName.split(" ")[0].slice(0, 2).toUpperCase();
              const profilePicUrl = chat.profilePicture?.url;
              const sessionId = chat.chatSessionId || chat._id;
              
              // Metadata badges from partnerData
              const courseBadge = chat.partnerData?.course;

              return (
                <li key={sessionId}>
                  <button
                    className={`text-left w-full p-3 flex items-center gap-3 transition-all ${
                      isOverlay 
                        ? 'hover:bg-gray-50' 
                        : 'hover:bg-white/10 border-b border-white/5'
                    }`}
                    onClick={() => handleOpen(sessionId)}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0 relative">
                      <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold text-xs border ${
                        isOverlay 
                          ? 'bg-gray-100 border-gray-200 text-gray-500' 
                          : 'bg-white/10 border-white/10 text-white'
                      }`}>
                        {profilePicUrl ? (
                          <Image 
                            src={`${API_BASE}/api${profilePicUrl}`} 
                            alt={partnerName} 
                            width={40} 
                            height={40} 
                            className="object-cover w-full h-full" 
                          />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold text-sm truncate ${
                          isOverlay ? 'text-gray-900' : 'text-white'
                        }`}>
                          {partnerName}
                        </span>
                      </div>

                      {/* Subtext / Badges */}
                      <div className={`text-xs mt-0.5 truncate flex items-center gap-2 ${
                        isOverlay ? 'text-gray-500' : 'text-white/60'
                      }`}>
                        {courseBadge ? (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            isOverlay 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'bg-white/20 text-white'
                          }`}>
                            {courseBadge}
                          </span>
                        ) : (
                          <span>Click to chat</span>
                        )}
                      </div>
                    </div>
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
