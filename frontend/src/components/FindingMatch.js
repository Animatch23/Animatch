"use client";

import { useState, useEffect } from "react";

export default function FindingMatch({ onMatchFound }) {
  const [dots, setDots] = useState("");
  const [statusText, setStatusText] = useState("Finding a match");

  useEffect(() => {
    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);

    // Simulate different status messages
    const statusMessages = [
      "Finding a match",
      "Looking for available users",
      "Connecting you with someone",
      "Almost there"
    ];

    let messageIndex = 0;
    const statusInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % statusMessages.length;
      setStatusText(statusMessages[messageIndex]);
    }, 3000);

    // Simulate finding a match (remove this in production)
    const matchTimer = setTimeout(() => {
      if (onMatchFound) onMatchFound();
    }, 10000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(statusInterval);
      clearTimeout(matchTimer);
    };
  }, [onMatchFound]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8">
        {/* AniMatch Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <img src="dlsu logo.png" alt="DLSU Logo" className="w-12 h-12 mr-3 object-contain" />
            <h1 className="text-3xl font-bold">
              <span className="text-green-800">Ani</span>
              <span className="text-red-600">Match</span>
            </h1>
          </div>
        </div>

        {/* Animated Loading Circle */}
        <div className="mb-8">
          <div className="relative w-32 h-32 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-green-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-green-600 border-t-transparent animate-spin"></div>
            <div className="absolute inset-4 rounded-full bg-green-50 flex items-center justify-center">
              <svg 
                className="w-12 h-12 text-green-600"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" 
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Status Text */}
        <h2 className="text-2xl font-bold text-green-800 mb-2">
          {statusText}{dots}
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          We're looking for another DLSU student to chat with. 
          This usually takes just a few seconds!
        </p>

        {/* Stats */}
        <div className="bg-white rounded-lg p-6 shadow-md max-w-sm mx-auto mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-800">420</div>
              <div className="text-sm text-gray-600">Students Online</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-800">69</div>
              <div className="text-sm text-gray-600">Active Chats</div>
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        <button className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}