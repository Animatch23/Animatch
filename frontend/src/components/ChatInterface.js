"use client";

import { useState, useRef, useEffect } from "react";

export default function ChatInterface({ onDisconnect }) {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hey there! How's your day going?", sender: "other", timestamp: new Date() },
    { id: 2, text: "Hi! It's going well, thanks for asking! How about yours?", sender: "me", timestamp: new Date() }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("connected"); // connected, disconnected, finding
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: messages.length + 1,
      text: newMessage,
      sender: "me",
      timestamp: new Date()
    };

    setMessages([...messages, message]);
    setNewMessage("");

    // Simulate typing indicator and response (remove in production)
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const response = {
        id: messages.length + 2,
        text: "That's interesting! Tell me more about that.",
        sender: "other",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, response]);
    }, 2000);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusMessage = () => {
    switch (connectionStatus) {
      case "connected":
        return "Match Found...";
      case "disconnected":
        return "Disconnected.";
      case "finding":
        return "Finding another Match...";
      default:
        return "Connected";
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-600";
      case "disconnected":
        return "text-red-500";
      case "finding":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-700 p-4 text-white">
        <div className="flex items-center justify-between">
          {/* Chat History Button */}
          <button className="p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Title */}
          <h1 className="text-xl font-bold">AniMatch Chat</h1>
          
          {/* Profile/Settings */}
          <button className="p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}