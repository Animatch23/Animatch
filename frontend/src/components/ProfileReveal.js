"use client";

import { useEffect, useState, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

/**
 * ProfileReveal Component
 * Displays both users' profile pictures with a blur effect that gradually reveals
 * as they send more messages. Each user's picture unblurs based on THEIR message count.
 * 
 * Milestones:
 * - 10 messages: 20% revealed (blur: 16px)
 * - 20 messages: 40% revealed (blur: 12px)
 * - 30 messages: 60% revealed (blur: 8px)
 * - 40 messages: 80% revealed (blur: 4px)
 * - 50 messages: 100% revealed (blur: 0px)
 */
export default function ProfileReveal({ 
  chatSessionId, 
  token, 
  currentUserId,
  socketRef 
}) {
  const [revealData, setRevealData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [milestoneMessage, setMilestoneMessage] = useState(null);

  // Fetch initial reveal status
  const fetchRevealStatus = useCallback(async () => {
    if (!API_BASE || !chatSessionId || !token) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/chat/${chatSessionId}/profile-reveal`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch reveal status");
      }

      const data = await response.json();
      setRevealData(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching reveal status:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [chatSessionId, token]);

  useEffect(() => {
    fetchRevealStatus();
  }, [fetchRevealStatus]);

  // Listen for reveal updates via socket
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    const handleRevealUpdate = (update) => {
      console.log("[ProfileReveal] Received reveal update:", update);
      
      setRevealData((prev) => {
        if (!prev) return prev;

        const isCurrentUser = update.senderId === currentUserId;
        
        if (isCurrentUser) {
          return {
            ...prev,
            currentUser: {
              ...prev.currentUser,
              messageCount: update.messageCount,
              revealPercentage: update.revealPercentage,
              blurLevel: update.blurLevel,
            },
          };
        } else {
          return {
            ...prev,
            partner: {
              ...prev.partner,
              messageCount: update.messageCount,
              revealPercentage: update.revealPercentage,
              blurLevel: update.blurLevel,
            },
          };
        }
      });
    };

    const handleMilestone = (data) => {
      console.log("[ProfileReveal] Milestone reached:", data);
      
      const isOwn = data.userId === currentUserId;
      const message = isOwn 
        ? `🎉 Your profile is now ${data.newPercentage}% revealed!`
        : `🎉 Your partner's profile is now ${data.newPercentage}% revealed!`;
      
      setMilestoneMessage(message);
      
      // Auto-dismiss after 3 seconds
      setTimeout(() => setMilestoneMessage(null), 3000);
    };

    socket.on("chat:reveal-update", handleRevealUpdate);
    socket.on("chat:reveal-milestone", handleMilestone);

    return () => {
      socket.off("chat:reveal-update", handleRevealUpdate);
      socket.off("chat:reveal-milestone", handleMilestone);
    };
  }, [socketRef, currentUserId]);

  // Don't render if there's no data or neither user has a profile picture
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-8 py-4 px-6 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-100">
        <div className="text-sm text-gray-500">Loading profiles...</div>
      </div>
    );
  }

  if (error || !revealData || !revealData.showRevealSection) {
    return null;
  }

  const { currentUser, partner } = revealData;

  return (
    <div className="relative">
      {/* Milestone notification */}
      {milestoneMessage && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
          <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
            {milestoneMessage}
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-4 sm:gap-8 py-4 px-4 sm:px-6 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-100">
        {/* Current User's Profile */}
        <ProfileCard
          user={currentUser}
          label="You"
          isCurrentUser={true}
        />

        {/* VS / Heart divider */}
        <div className="flex flex-col items-center">
          <div className="text-2xl">💕</div>
          <div className="text-xs text-gray-400 font-medium mt-1">MATCH</div>
        </div>

        {/* Partner's Profile */}
        <ProfileCard
          user={partner}
          label={partner.username || "Partner"}
          isCurrentUser={false}
        />
      </div>

      {/* Progress hint */}
      <div className="text-center mt-2">
        <p className="text-xs text-gray-500">
          💬 Send messages to reveal each other&apos;s photos! (10 msgs = 20% reveal)
        </p>
      </div>
    </div>
  );
}

/**
 * Individual profile card with blur effect
 */
function ProfileCard({ user, label, isCurrentUser }) {
  const hasProfilePicture = user?.hasProfilePicture;
  const revealPercentage = user?.revealPercentage || 0;
  const blurLevel = user?.blurLevel ?? 20;
  const messageCount = user?.messageCount || 0;

  // Generate progress stages (5 stages)
  const stages = [10, 20, 30, 40, 50];
  const currentStage = Math.floor(messageCount / 10);

  return (
    <div className="flex flex-col items-center">
      {/* Profile picture container */}
      <div className="relative">
        <div 
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-white shadow-lg transition-all duration-500 ease-out"
          style={{
            filter: hasProfilePicture ? `blur(${blurLevel}px)` : 'none',
          }}
        >
          {hasProfilePicture ? (
            <img
              src={`${process.env.NEXT_PUBLIC_API_URL}/api${user.profilePicture}`}
              alt={`${label}'s profile`}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <span className="text-3xl">👤</span>
            </div>
          )}
        </div>

        {/* Reveal percentage badge */}
        {hasProfilePicture && (
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full px-2 py-0.5 text-xs font-bold shadow border border-pink-200">
            <span className={revealPercentage === 100 ? "text-green-600" : "text-pink-600"}>
              {revealPercentage}%
            </span>
          </div>
        )}
      </div>

      {/* Label */}
      <div className="mt-2 text-sm font-medium text-gray-700 truncate max-w-[80px] sm:max-w-[96px]">
        {label}
      </div>

      {/* Message count */}
      <div className="text-xs text-gray-500">
        {messageCount} msgs
      </div>

      {/* Progress dots */}
      {hasProfilePicture && (
        <div className="flex gap-1 mt-1.5">
          {stages.map((stage, idx) => (
            <div
              key={stage}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx < currentStage
                  ? "bg-pink-500"
                  : idx === currentStage && messageCount > 0
                  ? "bg-pink-300"
                  : "bg-gray-200"
              }`}
              title={`${stage} messages = ${(idx + 1) * 20}% revealed`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
