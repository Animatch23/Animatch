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
          {/* Menu Button */}
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

      {/* Status Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <p className={`text-sm ${getStatusColor()}`}>
          {getStatusMessage()}
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender === "me"
                  ? "bg-green-600 text-white"
                  : "bg-gray-300 text-gray-800"
              }`}
            >
              <p className="text-sm">{message.text}</p>
            </div>
          </div>
        ))}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-300 text-gray-800 max-w-xs px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          {/* Leave Chat Button */}
          <button 
            onClick={onDisconnect}
            className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-lg transition-colors"
            title="Leave Chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>

          {/* Attachment Button */}
          <button className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-black placeholder-gray-400"
              rows="1"
              style={{ minHeight: "48px", maxHeight: "120px" }}
            />
          </div>

          {/* Send Button */}
          <button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className={`p-3 rounded-lg transition-colors ${
              newMessage.trim() 
                ? "bg-green-600 hover:bg-green-700 text-white" 
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}