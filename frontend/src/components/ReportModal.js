"use client";

import { useState } from "react";

export default function ReportModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const [reason, setReason] = useState("Spam");
  const [description, setDescription] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ reason, description });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Report User</h2>
        <p className="mb-4 text-sm text-gray-600">
          Please select a reason for reporting this user. This will be reviewed by admins.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md bg-black border border-black p-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black"
              aria-label="Report reason"
            >
              <option value="Spam">Spam</option>
              <option value="Harassment">Harassment</option>
              <option value="Inappropriate Content">Inappropriate Content</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md bg-black border border-black p-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="Provide more details..."
              aria-label="Report description (optional)"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
