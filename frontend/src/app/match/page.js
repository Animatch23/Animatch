"use client";

import { useState } from "react";
import FindingMatch from "../../components/FindingMatch";
import ChatInterface from "../../components/ChatInterface";

export default function MatchmakingPage() {
  const [currentView, setCurrentView] = useState("finding"); // finding, chatting, disconnected

  const handleMatchFound = () => {
    setCurrentView("chatting");
  };

  const handleDisconnect = () => {
    setCurrentView("finding");
    // TODO: Implement proper disconnect logic
    console.log("Chat disconnected, finding new match...");
  };

  const handleStartMatching = () => {
    setCurrentView("finding");
  };

  if (currentView === "finding") {
    return <FindingMatch onMatchFound={handleMatchFound} />;
  }

  if (currentView === "chatting") {
    return <ChatInterface onDisconnect={handleDisconnect} />;
  }

  // Default view with start button
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8">
        {/* AniMatch Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 bg-green-800 rounded-full flex items-center justify-center mr-3">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <h1 className="text-3xl font-bold">
            <span className="text-green-800">Ani</span>
            <span className="text-red-600">Match</span>
          </h1>
        </div>

        <h2 className="text-2xl font-bold text-green-800 mb-4">Ready to meet someone new?</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Connect with fellow DLSU students in anonymous 24-hour chats. 
          Start conversations that could lead to lasting friendships!
        </p>

        <button
          onClick={handleStartMatching}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors shadow-md"
        >
          Start Matching
        </button>
      </div>
    </div>
  );
}