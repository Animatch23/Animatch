"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

/**
 * US-19: Admin Moderation Page
 * Review and manage automatically flagged content
 */
export default function ModerationPage() {
  const router = useRouter();
  const [flags, setFlags] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actionTaken, setActionTaken] = useState("none");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("sessionToken") : null;

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    
    fetchFlags();
    fetchStats();
  }, [filter, token]);

  const fetchFlags = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_BASE}/api/moderation/flags?status=${filter}&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFlags(data.flags);
        }
      }
    } catch (err) {
      console.error("Failed to fetch flags:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/moderation/stats`, {
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
      console.error("Failed to fetch stats:", err);
    }
  };

  const handleReview = async (flagId, status) => {
    try {
      setIsSubmitting(true);
      const response = await fetch(
        `${API_BASE}/api/moderation/flags/${flagId}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status,
            reviewNotes,
            actionTaken: status === "confirmed" ? actionTaken : "none",
          }),
        }
      );

      if (response.ok) {
        // Remove from list and refresh
        setFlags(flags.filter((f) => f._id !== flagId));
        setSelectedFlag(null);
        setReviewNotes("");
        setActionTaken("none");
        fetchStats();
      }
    } catch (err) {
      console.error("Failed to review flag:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const severityBadge = (severity) => {
    switch (severity) {
      case 3:
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">High</span>;
      case 2:
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Medium</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Low</span>;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Content Moderation</h1>
            <p className="text-gray-500">Review automatically flagged messages</p>
          </div>
          <Link
            href="/admin/reports"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            ← Back to Reports
          </Link>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-500">Pending Review</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-3xl font-bold text-red-600">{stats.confirmed}</div>
              <div className="text-sm text-gray-500">Confirmed</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-3xl font-bold text-green-600">{stats.dismissed}</div>
              <div className="text-sm text-gray-500">Dismissed</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-3xl font-bold text-gray-600">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Flags</div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {["pending", "confirmed", "dismissed", "all"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                    filter === status
                      ? "border-green-600 text-green-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          {/* Flags List */}
          <div className="divide-y divide-gray-200">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : flags.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No {filter === "all" ? "" : filter} flags found
              </div>
            ) : (
              flags.map((flag) => (
                <div
                  key={flag._id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${
                    selectedFlag?._id === flag._id ? "bg-green-50" : ""
                  }`}
                  onClick={() => setSelectedFlag(flag)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {severityBadge(flag.severity)}
                        <span className="text-sm font-medium text-gray-700">
                          {flag.flagReason?.replace("_", " ")}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(flag.flaggedAt)}
                        </span>
                      </div>
                      <p className="text-gray-800 bg-gray-100 rounded p-2 mt-2 font-mono text-sm">
                        &quot;{flag.content}&quot;
                      </p>
                      <div className="mt-2 text-xs text-gray-500">
                        User: {flag.userId?.username || "Unknown"} ({flag.userId?.email || "N/A"})
                        {flag.userId?.flagCount > 1 && (
                          <span className="ml-2 text-red-500">
                            ⚠️ {flag.userId.flagCount} total flags
                          </span>
                        )}
                      </div>
                    </div>
                    {flag.status === "pending" && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReview(flag._id, "dismissed");
                          }}
                          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFlag(flag);
                          }}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Take Action
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Modal */}
        {selectedFlag && selectedFlag.status === "pending" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setSelectedFlag(null)}
            />
            <div className="relative bg-white w-[90%] max-w-lg rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Review Flagged Content</h2>
              
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  {severityBadge(selectedFlag.severity)}
                  <span className="text-sm font-medium">{selectedFlag.flagReason?.replace("_", " ")}</span>
                </div>
                <p className="bg-gray-100 rounded p-3 font-mono text-sm">
                  &quot;{selectedFlag.content}&quot;
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action to Take
                </label>
                <select
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="none">No action (just confirm)</option>
                  <option value="warning_issued">Issue warning to user</option>
                  <option value="message_removed">Remove message</option>
                  <option value="user_suspended">Suspend user (24 hours)</option>
                  <option value="user_banned">Ban user</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Review Notes (optional)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Add notes about this review..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedFlag(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReview(selectedFlag._id, "dismissed")}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => handleReview(selectedFlag._id, "confirmed")}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
