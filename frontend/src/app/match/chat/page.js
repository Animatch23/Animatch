"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import io from "socket.io-client";
import Navbar from "@/components/Navbar";

export default function ChatPage() {
    const router = useRouter();
    const [socket, setSocket] = useState(null);
    const [chatSession, setChatSession] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [showStartNewMatch, setShowStartNewMatch] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        // Initialize socket connection
        const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000", {
            withCredentials: true
        });
        socketRef.current = newSocket;
        setSocket(newSocket);

        // Get user ID from localStorage or cookie
        const userId = localStorage.getItem("userId");

        if (!userId) {
            router.push("/login");
            return;
        }

        // Join user's room for receiving notifications
        newSocket.emit("join_room", userId);

        // Fetch active chat session
        fetchActiveChat();

        // Listen for chat ended notification
        newSocket.on("chat_ended", (data) => {
            showNotification("info", data.message);
            setTimeout(() => {
                router.push("/match/queue");
            }, 2000);
        });

        // Listen for returned to queue notification
        newSocket.on("returned_to_queue", (data) => {
            showNotification("success", data.message);
            setTimeout(() => {
                router.push("/match/queue");
            }, 2000);
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, [router]);

    const fetchActiveChat = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/active`, {
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                }
            });

            if (response.ok) {
                const data = await response.json();
                setChatSession(data.data);
            }
        } catch (error) {
            console.error("Error fetching active chat:", error);
        }
    };

    const handleNextChat = async () => {
        if (!confirm("Are you sure you want to skip to the next chat? This will end the current conversation.")) {
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/next`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                }
            });

            const data = await response.json();

            if (response.ok) {
                showNotification("success", data.message);
                // Will be redirected by socket event
            } else {
                showNotification("error", data.message || "Failed to end chat");
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Error ending chat:", error);
            showNotification("error", "An error occurred while ending the chat");
            setIsLoading(false);
        }
    };

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />

            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-20 right-4 p-4 rounded-lg shadow-lg z-50 animate-slide-in ${
                    notification.type === "success" ? "bg-green-500" :
                    notification.type === "error" ? "bg-red-500" :
                    "bg-blue-500"
                } text-white max-w-md`}>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">
                            {notification.type === "success" ? "✓" : 
                             notification.type === "error" ? "✕" : "ℹ"}
                        </span>
                        <p className="text-sm">{notification.message}</p>
                    </div>
                </div>
            )}

            <div className="container mx-auto px-4 py-8 max-w-6xl">
                {/* Chat Header with Next Chat Button */}
                <div className="bg-white dark:bg-gray-800 rounded-t-lg shadow-md p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Chat Room
                            </h1>
                            {chatSession && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Started: {new Date(chatSession.startedAt).toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                        
                        {/* Next Chat Button */}
                        <button
                            onClick={handleNextChat}
                            disabled={isLoading}
                            className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                                isLoading
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-md hover:shadow-lg transform hover:scale-105"
                            }`}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Ending Chat...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                    </svg>
                                    <span>Next Chat</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Existing Chat Interface */}
                <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow-md">
                    {/* Your existing chat messages and input area */}
                    <div className="h-[500px] p-6 overflow-y-auto">
                        {/* Chat messages will appear here */}
                        <p className="text-center text-gray-500 dark:text-gray-400">
                            Chat interface content...
                        </p>
                    </div>

                    {/* Message Input Area */}
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Type a message..."
                                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                            <button className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-md">
                                Send
                            </button>
                        </div>
                    </div>
                </div>

                {/* Expandable "Start New Match" Section */}
                <div className="mt-6">
                    <button
                        onClick={() => setShowStartNewMatch(!showStartNewMatch)}
                        className="w-full p-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-lg shadow-md transition-all duration-200 flex items-center justify-between"
                    >
                        <span className="font-semibold">Start a New Match</span>
                        <svg
                            className={`w-5 h-5 transition-transform duration-200 ${showStartNewMatch ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {showStartNewMatch && (
                        <div className="mt-2 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border-2 border-purple-200 dark:border-purple-900">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                Want to find a different match?
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Click "Next Chat" to end this conversation and be matched with someone new. 
                                Both you and your current chat partner will be returned to the queue.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleNextChat}
                                    disabled={isLoading}
                                    className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                                        isLoading
                                            ? "bg-gray-400 cursor-not-allowed text-white"
                                            : "bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg"
                                    }`}
                                >
                                    {isLoading ? "Processing..." : "Yes, Next Chat"}
                                </button>
                                <button
                                    onClick={() => setShowStartNewMatch(false)}
                                    className="flex-1 py-2.5 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Box */}
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex gap-3">
                        <span className="text-2xl">💡</span>
                        <div>
                            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
                                Quick Tip
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Not feeling the conversation? Use the "Next Chat" button anytime to find a new match. 
                                Your chat history will be cleared and both users will return to the queue.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}