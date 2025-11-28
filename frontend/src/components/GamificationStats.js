"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

/**
 * US-15: Gamification Stats Component
 * Displays user's streaks, badges, and activity statistics
 */
export default function GamificationStats({ token }) {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("badges"); // "badges" | "streak" | "leaderboard"
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardType, setLeaderboardType] = useState("streak");

  useEffect(() => {
    if (!token) return;

    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE}/api/gamification/stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setStats(data.stats);
          }
        }
      } catch (err) {
        console.error("Failed to fetch gamification stats:", err);
        setError("Failed to load stats");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  const fetchLeaderboard = async (type) => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/gamification/leaderboard/${type}?limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLeaderboard(data.leaderboard);
        }
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "leaderboard") {
      fetchLeaderboard(leaderboardType);
    }
  }, [activeTab, leaderboardType, token]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const rarityColors = {
    common: "bg-gray-100 border-gray-300 text-gray-700",
    uncommon: "bg-green-50 border-green-300 text-green-700",
    rare: "bg-blue-50 border-blue-300 text-blue-700",
    epic: "bg-purple-50 border-purple-300 text-purple-700",
    legendary: "bg-yellow-50 border-yellow-300 text-yellow-700"
  };

  const earnedBadges = stats.badges?.filter(b => b.earned) || [];
  const unearnedBadges = stats.badges?.filter(b => !b.earned) || [];

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header with Stats Summary */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
        <h2 className="text-xl font-bold mb-4">🎮 Gamification</h2>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          {/* Streak Display */}
          <div className="bg-white/20 rounded-lg p-3">
            <div className="text-3xl font-bold">{stats.currentStreak}</div>
            <div className="text-xs opacity-80">Current Streak</div>
            {stats.currentStreak > 0 && <span className="text-lg">🔥</span>}
          </div>
          
          {/* Max Streak */}
          <div className="bg-white/20 rounded-lg p-3">
            <div className="text-3xl font-bold">{stats.maxStreak}</div>
            <div className="text-xs opacity-80">Best Streak</div>
            <span className="text-lg">⭐</span>
          </div>
          
          {/* Badges Earned */}
          <div className="bg-white/20 rounded-lg p-3">
            <div className="text-3xl font-bold">{stats.earnedBadgesCount}</div>
            <div className="text-xs opacity-80">Badges</div>
            <span className="text-lg">🏆</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            onClick={() => setActiveTab("badges")}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "badges"
                ? "border-green-600 text-green-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            🏅 Badges
          </button>
          <button
            onClick={() => setActiveTab("streak")}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "streak"
                ? "border-green-600 text-green-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            📊 Activity
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "leaderboard"
                ? "border-green-600 text-green-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            🏆 Leaderboard
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {/* Badges Tab */}
        {activeTab === "badges" && (
          <div className="space-y-6">
            {/* Earned Badges */}
            {earnedBadges.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Earned ({earnedBadges.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {earnedBadges.map((badge) => (
                    <div
                      key={badge.badgeId}
                      className={`border-2 rounded-xl p-3 text-center ${rarityColors[badge.rarity]}`}
                    >
                      <span className="text-3xl block mb-1">{badge.icon}</span>
                      <span className="text-sm font-medium block">{badge.name}</span>
                      <span className="text-xs opacity-75 block">{badge.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unearned Badges */}
            {unearnedBadges.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Locked ({unearnedBadges.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {unearnedBadges.map((badge) => (
                    <div
                      key={badge.badgeId}
                      className="border-2 border-gray-200 rounded-xl p-3 text-center bg-gray-50 opacity-60"
                    >
                      <span className="text-3xl block mb-1 grayscale">🔒</span>
                      <span className="text-sm font-medium block text-gray-500">{badge.name}</span>
                      <span className="text-xs text-gray-400 block">{badge.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === "streak" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-800">{stats.totalMessages}</div>
                <div className="text-sm text-gray-500">Messages Sent</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-800">{stats.totalMatches}</div>
                <div className="text-sm text-gray-500">Total Matches</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-800">{stats.uniqueMatchCount}</div>
                <div className="text-sm text-gray-500">Unique People</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-800">
                  {stats.lastActiveDate 
                    ? new Date(stats.lastActiveDate).toLocaleDateString() 
                    : "Never"}
                </div>
                <div className="text-sm text-gray-500">Last Active</div>
              </div>
            </div>

            {/* Streak Progress */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Streak Progress</h3>
              <div className="flex items-center gap-2">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      i < stats.currentStreak
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {i < stats.currentStreak ? "🔥" : i + 1}
                  </div>
                ))}
                {stats.currentStreak >= 7 && (
                  <span className="text-sm text-green-600 font-medium">+{stats.currentStreak - 7} more!</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === "leaderboard" && (
          <div>
            {/* Leaderboard Type Selector */}
            <div className="flex gap-2 mb-4">
              {["streak", "messages", "matches"].map((type) => (
                <button
                  key={type}
                  onClick={() => setLeaderboardType(type)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    leaderboardType === type
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {type === "streak" ? "🔥 Streaks" : type === "messages" ? "💬 Messages" : "🤝 Matches"}
                </button>
              ))}
            </div>

            {/* Leaderboard List */}
            <div className="space-y-2">
              {leaderboard.length > 0 ? (
                leaderboard.map((user, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      index === 0 ? "bg-yellow-50" : index === 1 ? "bg-gray-100" : index === 2 ? "bg-orange-50" : "bg-white"
                    }`}
                  >
                    <span className="text-xl w-8 text-center">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                    </span>
                    <div className="flex-1">
                      <span className="font-medium text-gray-800">{user.username}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-800">
                        {leaderboardType === "streak" 
                          ? user.maxStreak 
                          : leaderboardType === "messages" 
                          ? user.totalMessages 
                          : user.totalMatches}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">
                        {leaderboardType === "streak" ? "days" : ""}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">No data yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
