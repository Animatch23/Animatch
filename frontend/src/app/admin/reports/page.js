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
    </div>
  );
}
