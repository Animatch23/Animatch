"use client";

import { useState, useCallback, useEffect } from "react";
import ConfirmActionModal from "@/components/admin/ConfirmActionModal";

export default function AdminBansPage() {
  // Mock data (replace with fetch to /api/admin/bans later)
  const [bannedUsers, setBannedUsers] = useState([
    { id: 1, username: "juan_d", banDate: "11/20/2025" },
    { id: 2, username: "test_user", banDate: "11/18/2025" },
    { id: 3, username: "spam_account", banDate: "11/15/2025" },
  ]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [lastModified, setLastModified] = useState(new Date());

  // Update last modified display when list changes
  useEffect(() => {
    setLastModified(new Date());
  }, [bannedUsers]);

  const openUnbanModal = useCallback((user) => {
    setSelectedUser(user);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedUser(null);
  }, []);

  const confirmUnban = useCallback(() => {
    if (!selectedUser) return;

    // Remove user from banned list
    setBannedUsers(prev => prev.filter(u => u.id !== selectedUser.id));
    closeModal();
  }, [selectedUser, closeModal]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Top bar */}
      <div className="bg-[#1E5A2F] h-16 flex items-center px-6 text-white">
        <button
          type="button"
          aria-label="Open navigation"
          className="p-2 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          onClick={() => console.log("[TODO] Open admin sidebar")}
        >
          <div className="space-y-1.5">
            <span className="block w-8 h-0.5 bg-white rounded" />
            <span className="block w-8 h-0.5 bg-white rounded" />
            <span className="block w-8 h-0.5 bg-white rounded" />
          </div>
        </button>
      </div>

      <div className="p-7 max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-[#1E5A2F] tracking-tight">BAN LIST</h1>
          <p className="text-xs text-gray-600 mt-1">
            Last Modified: {lastModified.toLocaleDateString()} {lastModified.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </header>

        {/* Table Header */}
        <div className="bg-gray-200 rounded-md grid grid-cols-[1fr_1fr_auto] font-semibold text-[#1E5A2F] text-sm px-6 py-4">
          <div>USERNAME</div>
          <div>BAN DATE</div>
          <div />
        </div>

        {/* Rows */}
        <div className="space-y-3 mt-3">
          {bannedUsers.map(user => (
            <div key={user.id} className="bg-gray-100 rounded-md px-6 py-4 grid grid-cols-[1fr_1fr_auto] items-center text-sm">
              <div className="truncate">{user.username}</div>
              <div>{user.banDate}</div>
              <div className="flex justify-end">
                <button
                  onClick={() => openUnbanModal(user)}
                  className="px-6 py-2 rounded-md bg-[#B94742] hover:bg-red-700 text-white font-semibold transition-colors text-sm"
                >
                  Unban
                </button>
              </div>
            </div>
          ))}
        </div>

        {bannedUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No banned users at the moment.
          </div>
        )}
      </div>

      {/* Unban Confirmation Modal */}
      {selectedUser && (
        <ConfirmActionModal
          action="unban"
          onCancel={closeModal}
          onConfirm={confirmUnban}
          username={selectedUser.username}
        />
      )}
    </div>
  );
}
