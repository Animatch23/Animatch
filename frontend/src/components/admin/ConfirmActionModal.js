"use client";

import { useEffect, useRef, useCallback } from "react";

export default function ConfirmActionModal({ action, onCancel, onConfirm, username }) {
  const dialogRef = useRef(null);
  
  // Dynamic text based on action type
  const actionText = action === 'ban' ? 'Ban this User' 
    : action === 'reject' ? 'Reject this Report' 
    : 'Unban this User';
  
  const bgColor = action === 'ban' ? 'bg-green-700 hover:bg-green-800' 
    : action === 'unban' ? 'bg-green-700 hover:bg-green-800'
    : 'bg-red-600 hover:bg-red-700';

  const escHandler = useCallback((e) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  }, [onCancel]);

  useEffect(() => {
    document.addEventListener('keydown', escHandler);
    // Focus first button
    dialogRef.current?.querySelector('button')?.focus();
    return () => document.removeEventListener('keydown', escHandler);
  }, [escHandler]);

  const confirmLabel = action === 'ban' ? 'Confirm' 
    : action === 'reject' ? 'Confirm' 
    : 'Confirm';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      aria-modal="true"
      role="dialog"
      aria-labelledby="confirm-action-heading"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-md shadow-lg bg-[#D8EAD9] p-6 focus:outline-none"
      >
        <h2 id="confirm-action-heading" className="text-xl font-bold text-[#1E5A2F] text-center mb-6">
          Are you sure you want to {actionText}?
        </h2>
        {username && (
          <p className="text-sm text-center text-[#1E5A2F] mb-4">Affected account: <span className="font-semibold">{username}</span></p>
        )}
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 rounded-md bg-gray-300 text-gray-800 font-medium hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-6 py-2 rounded-md text-white font-medium transition-colors ${bgColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}