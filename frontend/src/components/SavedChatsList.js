"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function SavedChatsList({ visible, onClose }) {
  const router = useRouter();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    const token = localStorage.getItem("sessionToken");
    if (!token) return;
    setLoading(true);
    fetch(`${API_BASE}/api/chat/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setChats(data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch saved chats");
        setLoading(false);
      });
  }, [visible]);

  const handleOpen = (id) => {
    sessionStorage.setItem("activeChatSessionId", id);
    router.replace(`/match/chat?session=${id}`);
    if (typeof onClose === "function") onClose();
  };

  // Helper to find a participant username by sender id or fallback to first participant
  const getSenderName = (chat, senderId) => {
    if (!chat || !chat.participants || !chat.participants.length) return 'Unknown';
    // Normalize senderId to string
    const sid = senderId ? senderId.toString() : null;
    const p = chat.participants.find(p => {
      if (!p) return false;
      if (p._id && sid) return p._id.toString() === sid;
      if (p.id && sid) return p.id.toString() === sid;
      return false;
    });
    return (p && p.username) || (chat.participants[0] && chat.participants[0].username) || 'Unknown';
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

  if (!visible) return null;

  return (
    <div className="fixed right-0 top-16 bottom-0 w-80 bg-white border-l shadow-2xl z-50 overflow-y-auto">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Saved Chats</h3>
          <button
            aria-label="Close Saved Chats"
            className="text-sm px-2 py-1 rounded-md text-gray-800 font-medium hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-200"
            onClick={() => typeof onClose === "function" && onClose()}
          >
            Close
          </button>
        </div>
      </div>
      <div className="p-2">
        {loading && <p className="text-sm text-gray-700 p-2">Loading...</p>}
        {error && <p className="text-sm text-red-600 p-2">{error}</p>}
        {chats.length === 0 && !loading && (
          <p className="text-sm text-gray-700 p-2">No saved chats found</p>
        )}
        <ul className="divide-y">
          {chats.map((chat) => (
            <li key={chat._id}>
              <button
                className="text-left w-full p-3 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                onClick={() => handleOpen(chat._id)}
                aria-label={`Open saved chat with ${((chat.participants || []).filter(p => p.username).map(p => p.username).join(' & '))}`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-semibold">
                    {((chat.participants || []).filter(p => p.username).map(p => p.username)[0] || "?")
                      .split(" ")[0]
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Top Row: Participant Name */}
                  <div className="text-base font-semibold text-gray-900 truncate">{
                    (chat.participants || [])
                      .filter(p => p.username)
                      .map(p => p.username)
                      .join(" & ")
                  }</div>

                  {/* Bottom Row: Message Preview + Separator + Relative Time */}
                  {chat.lastMessage ? (
                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                      {/* Message Preview */}
                      <span className="truncate">
                        {chat.lastMessage.type === 'attachment' ? (
                          // Attachment handling
                          chat.lastMessage.isOwn ? (
                            <span className="text-gray-600">You sent an attachment</span>
                          ) : (
                            <span className="text-gray-600">{chat.lastMessage.senderUsername} sent an attachment</span>
                          )
                        ) : (
                          // Text message handling
                          <>
                            <span className="font-medium text-gray-800">
                              {chat.lastMessage.isOwn ? 'You' : chat.lastMessage.senderUsername}:
                            </span>
                            <span className="ml-1 text-gray-700">
                              {chat.lastMessage.content.length > 30 
                                ? chat.lastMessage.content.substring(0, 30) + '...' 
                                : chat.lastMessage.content}
                            </span>
                          </>
                        )}
                      </span>
                      {/* Separator */}
                      <span className="text-gray-400 flex-shrink-0">·</span>
                      {/* Relative Time */}
                      <span className="text-gray-500 flex-shrink-0">
                        {formatTimeAgo(chat.lastMessage.sentAt)}
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 mt-1">No messages yet</div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
