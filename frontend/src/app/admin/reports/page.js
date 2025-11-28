"use client";

import { useState, useCallback, useEffect } from "react";
import ConfirmActionModal from "@/components/admin/ConfirmActionModal";

export default function AdminReportsPage() {
  // Mock data (replace with fetch to /api/admin/reports later)
  const [reports, setReports] = useState([
    { id: 1, username: "juan_d", date: "2025-11-24", reason: "Inappropriate Content", status: "pending" },
    { id: 2, username: "sample_user", date: "2025-11-23", reason: "Harassment", status: "pending" },
    { id: 3, username: "test_student", date: "2025-11-22", reason: "Spam", status: "pending" },
  ]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionType, setActionType] = useState(null); // 'ban' | 'reject'
  const [lastModified, setLastModified] = useState(new Date());

  // Update last modified display when a report changes
  useEffect(() => {
    setLastModified(new Date());
  }, [reports]);

  const openModal = useCallback((report, type) => {
    setSelectedReport(report);
    setActionType(type);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedReport(null);
    setActionType(null);
  }, []);

  const confirmAction = useCallback(() => {
    if (!selectedReport || !actionType) return;

    setReports(prev => prev.map(r => {
      if (r.id === selectedReport.id) {
        return { ...r, status: actionType === 'ban' ? 'banned' : 'rejected' };
      }
      return r;
    }));
    closeModal();
  }, [selectedReport, actionType, closeModal]);

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
          <h1 className="text-3xl font-bold text-[#1E5A2F] tracking-tight">REPORT LIST</h1>
          <p className="text-xs text-gray-600 mt-1">Last Modified: {lastModified.toLocaleDateString()} {lastModified.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </header>

        {/* Table Header (actions column left blank for alignment) */}
        <div className="bg-gray-200 rounded-md grid grid-cols-[1fr_1fr_2fr_auto] font-semibold text-[#1E5A2F] text-sm px-6 py-4">
          <div>USERNAME</div>
          <div>REPORT DATE</div>
          <div>REPORT REASON</div>
          <div />
        </div>

        {/* Rows */}
        <div className="space-y-3 mt-3">
          {reports.map(report => (
            <div key={report.id} className="bg-gray-100 rounded-md px-6 py-4 grid grid-cols-[1fr_1fr_2fr_auto] items-center text-sm">
              <div className="truncate">{report.username}</div>
              <div>{report.date}</div>
              <div className="truncate">“{report.reason}”</div>
              <div className="flex justify-end gap-6">
                <button
                  disabled={report.status !== 'pending'}
                  onClick={() => openModal(report, 'ban')}
                  className={`px-5 py-2 rounded-md text-white font-semibold transition-colors text-sm ${report.status === 'banned' ? 'bg-[#1E5A2F] opacity-60 cursor-not-allowed' : report.status === 'rejected' ? 'bg-gray-400 opacity-40 cursor-not-allowed' : 'bg-[#1E5A2F] hover:bg-green-700'}`}
                >
                  Ban
                </button>
                <button
                  disabled={report.status !== 'pending'}
                  onClick={() => openModal(report, 'reject')}
                  className={`px-5 py-2 rounded-md text-white font-semibold transition-colors text-sm ${report.status === 'rejected' ? 'bg-[#B94742] opacity-60 cursor-not-allowed' : report.status === 'banned' ? 'bg-gray-400 opacity-40 cursor-not-allowed' : 'bg-[#B94742] hover:bg-red-700'}`}
                >
                  Reject
                </button>
              </div>
              {/* Status line below row */}
              {report.status !== 'pending' && (
                <div className="col-span-4 mt-3 text-right pr-2 italic text-sm text-gray-600">
                  {report.status === 'banned' ? 'Banned' : 'Rejected'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedReport && actionType && (
        <ConfirmActionModal
          action={actionType}
          onCancel={closeModal}
          onConfirm={confirmAction}
          username={selectedReport.username}
        />
      )}
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchReports = async () => {
      try {
        // In a real app, we'd get the token from a context or storage
        // For this demo, we assume the user might have a token in localStorage
        // or we just try to fetch. If 401, we redirect to login.
        const token = localStorage.getItem("token");
        
        if (!token) {
          router.push("/login");
          return;
        }

        const response = await fetch(`${API_BASE}/api/reports`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch reports");
        }

        const data = await response.json();
        setReports(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading reports...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Admin Dashboard - User Reports</h1>
        
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reporter</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reported User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                    No reports found.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {report.reporterId?.username || "Unknown"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.reportedUserId?.username || "Unknown"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex rounded-full bg-red-100 px-2 text-xs font-semibold leading-5 text-red-800">
                        {report.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {report.description || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
