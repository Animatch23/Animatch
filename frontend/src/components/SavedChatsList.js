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

  if (!visible) return null;

  return (
    <div className="fixed right-0 top-16 bottom-0 w-80 bg-white border-l shadow-lg z-50 overflow-y-auto">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Saved Chats</h3>
          <button
            className="text-sm px-2 py-1 rounded-md hover:bg-gray-100"
            onClick={() => typeof onClose === "function" && onClose()}
          >
            Close
          </button>
        </div>
      </div>
      <div className="p-2">
        {loading && <p className="text-sm p-2">Loading...</p>}
        {error && <p className="text-sm text-red-600 p-2">{error}</p>}
        {chats.length === 0 && !loading && (
          <p className="text-sm text-gray-500 p-2">No saved chats found</p>
        )}
        <ul className="divide-y">
          {chats.map((chat) => (
            <li key={chat._id}>
              <button
                className="text-left w-full p-3 hover:bg-gray-50 flex items-center gap-3"
                onClick={() => handleOpen(chat._id)}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{
                    (chat.participants || [])
                      .filter(p => p.username)
                      .map(p => p.username)
                      .join(" & ")
                  }</div>
                  <div className="text-xs text-gray-500">Ended: {chat.endedAt ? new Date(chat.endedAt).toLocaleString() : "Recent"}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
