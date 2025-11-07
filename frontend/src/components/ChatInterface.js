"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';

export default function ChatInterface() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatSession, setChatSession] = useState(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    if (!token) {
      router.push('/login');
      return;
    }

    let isMounted = true;
    const maxRetries = 10; // Increased from 5
    const retryDelay = 2000; // Increased from 1000ms

    const fetchChatSession = async () => {
      while (isMounted && retryCountRef.current < maxRetries) {
        try {
          console.log(`[ChatInterface] Fetching active chat (attempt ${retryCountRef.current + 1}/${maxRetries})`);
          
          const response = await fetch(`${apiBase}/api/chat/active`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!response.ok) {
            if (response.status === 401) {
              localStorage.removeItem('sessionToken');
              router.replace('/login');
              return;
            }
            
            if (response.status === 404) {
              // No active session found, retry with delay
              retryCountRef.current++;
              if (retryCountRef.current >= maxRetries) {
                console.log('[ChatInterface] Max retries reached, redirecting to match');
                setError('No active chat session found');
                setTimeout(() => router.replace('/match'), 2000);
                return;
              }
              console.log(`[ChatInterface] No active chat found, retrying in ${retryDelay}ms...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              continue;
            }

            throw new Error(`Failed to fetch chat session: ${response.status}`);
          }

          const data = await response.json();
          if (!isMounted) return;

          console.log('[ChatInterface] Active chat session found:', data.chatSessionId);
          setChatSession(data);

          // Connect Socket.IO
          const socket = io(apiBase || window.location.origin, {
            auth: { token },
            path: '/socket.io',
            transports: ['websocket', 'polling'],
          });
          socketRef.current = socket;

          // Store current user ID for message ownership check
          socket.currentUserId = data.currentUserId;

          // Load chat history
          const historyResponse = await fetch(
            `${apiBase}/api/chat/${data.chatSessionId}/history`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );

          if (historyResponse.ok) {
            const historyData = await historyResponse.json(); // Fixed: was .ok()
            if (isMounted) {
              setMessages(historyData.messages || []);
            }
          }

          // Socket listeners
          socket.on('connect', () => {
            console.log('[ChatInterface] Socket connected');
            socket.emit('chat:join', { chatSessionId: data.chatSessionId });
          });

          socket.on('chat:joined', (joinData) => {
            console.log('[ChatInterface] Successfully joined chat room:', joinData);
          });

          socket.on('chat:error', (error) => {
            console.error('[ChatInterface] Socket error:', error);
            setError(error.message || 'Chat error occurred');
          });

          socket.on('chat:message', (message) => {
            if (!isMounted) return;
            console.log('[ChatInterface] Received message:', message);
            // Determine if this is the current user's message
            const isOwnMessage = message.senderId === socket.currentUserId;
            setMessages(prev => [...prev, { ...message, isOwnMessage }]);
          });

          socket.on('chat:typing', ({ isTyping }) => {
            if (!isMounted) return;
            console.log('[ChatInterface] Partner typing:', isTyping);
            setPartnerTyping(isTyping);
          });

          socket.on('chat:partner-left', () => {
            if (!isMounted) return;
            console.log('[ChatInterface] Partner left the chat');
            setError('Your chat partner has left the session');
            setTimeout(() => router.replace('/match'), 2000);
          });

          socket.on('chat:ended', () => {
            if (!isMounted) return;
            console.log('[ChatInterface] Chat session ended');
            router.replace('/match');
          });

          socket.on('disconnect', () => {
            console.log('[ChatInterface] Socket disconnected');
          });

          if (isMounted) {
            setLoading(false);
          }
          
          // Successfully loaded, break the retry loop
          break;
          
        } catch (err) {
          console.error('[ChatInterface] Error:', err);
          retryCountRef.current++;
          
          if (retryCountRef.current >= maxRetries) {
            if (isMounted) {
              setError(err.message || 'Failed to load chat session');
              setLoading(false);
              // Redirect to match page after showing error
              setTimeout(() => router.replace('/match'), 2000);
            }
            return;
          }
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    };

    fetchChatSession();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [router, apiBase]);

  const handleTyping = () => {
    if (socketRef.current) {
      socketRef.current.emit('chat:typing', { isTyping: true });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('chat:typing', { isTyping: false });
        }
      }, 1000);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !socketRef.current || !chatSession) {
      console.warn('[ChatInterface] Cannot send message - missing data');
      return;
    }

    const messageData = {
      chatSessionId: chatSession.chatSessionId,
      content: inputMessage.trim()
    };

    console.log('[ChatInterface] Sending message:', messageData);
    socketRef.current.emit('chat:send-message', messageData);
    setInputMessage('');

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.emit('chat:typing', { isTyping: false });
    }
  };

  const handleEndChat = async () => {
    try {
      const token = localStorage.getItem('sessionToken');
      await fetch(`${apiBase}/api/chat/${chatSession.chatSessionId}/end`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      router.push('/match');
    } catch (error) {
      console.error('Error ending chat:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mb-4"></div>
        <p className="text-gray-600">Loading chat session...</p>
        {retryCountRef.current > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            Retry attempt {retryCountRef.current}/10
          </p>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <p className="text-red-600 mb-4">{error}</p>
        <p className="text-gray-600">Redirecting to match page...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-green-700 text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">
            Chatting with {chatSession?.partnerUsername || 'Anonymous'}
          </h2>
          <p className="text-xs">Chat expires: {new Date(chatSession?.expiresAt).toLocaleString()}</p>
        </div>
        <button
          onClick={handleEndChat}
          className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-sm"
        >
          End Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, idx) => (
          <div
            key={msg._id || idx}
            className={`flex ${msg.isOwnMessage ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.isOwnMessage ? 'bg-green-500 text-white' : 'bg-white text-gray-800'
              }`}
            >
              <p className="text-sm">{msg.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(msg.sentAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {partnerTyping && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 px-4 py-2 rounded-lg">
              <p className="text-sm italic">Typing...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => {
              setInputMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
          />
          <button
            onClick={handleSendMessage}
            className="bg-green-700 hover:bg-green-800 text-white px-6 py-2 rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}