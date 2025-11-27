import ChatSession from '../models/ChatSession.js';
import Message from '../models/Message.js';

/**
 * Get active chat session for current user
 */
export const getActiveChat = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const chatSession = await ChatSession.findOne({
      participants: userId,
      active: true,
      expiresAt: { $gt: new Date() }
    }).populate('participants', 'username');

    if (!chatSession) {
      return res.status(404).json({ message: 'No active chat session found' });
    }

    // Get partner's username (anonymized)
    const partner = chatSession.participants.find(
      p => p._id.toString() !== userId.toString()
    );

    res.json({
      chatSessionId: chatSession._id,
      partnerUsername: partner?.username || 'Anonymous',
      startedAt: chatSession.startedAt,
      expiresAt: chatSession.expiresAt,
      active: chatSession.active,
      currentUserId: userId // Add this so frontend knows which messages are theirs
    });
  } catch (error) {
    console.error('Error fetching active chat:', error);
    res.status(500).json({ message: 'Failed to fetch chat session' });
  }
};

/**
 * Get chat message history
 */
export const getChatHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { chatSessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Verify user is participant in this chat
    const chatSession = await ChatSession.findOne({
      _id: chatSessionId,
      participants: userId
    });

    if (!chatSession) {
      return res.status(403).json({ message: 'Access denied to this chat session' });
    }

    // Block access if chat was unmatched (hidden from both users)
    if (chatSession.unmatchedBy) {
      return res.status(403).json({ message: 'This chat has been removed' });
    }

    // Fetch messages
    const messages = await Message.find({ chatSessionId })
      .sort({ sentAt: 1 })
      .limit(500) // Increased limit to 500 messages for better history retention
      .lean();

    // Anonymize sender info
    const anonymizedMessages = messages.map(msg => ({
      _id: msg._id,
      content: msg.content,
      sentAt: msg.sentAt,
      isOwnMessage: msg.senderId.toString() === userId.toString()
    }));

    res.json({ messages: anonymizedMessages });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ message: 'Failed to fetch chat history' });
  }
};

/**
 * End chat session
 * If chat is not saved by both users, it will be marked for expiry
 */
export const endChatSession = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { chatSessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const chatSession = await ChatSession.findOne({
      _id: chatSessionId,
      participants: userId,
      active: true
    });

    if (!chatSession) {
      return res.status(404).json({ message: 'Active chat session not found' });
    }

    // End the session
    chatSession.active = false;
    chatSession.endedAt = new Date();
    
    // If not saved by both users, it will auto-delete due to TTL index
    // The TTL index will clean it up after expiresAt timestamp
    await chatSession.save();

    console.log(`[CHAT END] User ${userId} ended chat ${chatSessionId} (saved: ${chatSession.isSaved})`);

    // Emit socket event to notify partner
    const io = req.app.get('io');
    if (io) {
      io.to(chatSessionId.toString()).emit('chat:partner-left', {
        message: 'Your partner has left the chat'
      });
    }

    res.json({ 
      message: 'Chat session ended successfully',
      willExpire: !chatSession.isSaved
    });
  } catch (error) {
    console.error('Error ending chat session:', error);
    res.status(500).json({ message: 'Failed to end chat session' });
  }
};

/**
 * Leave chat session (for unsaved chats)
 * If user leaves an unsaved chat, it expires immediately
 */
export const leaveChatSession = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { chatSessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const chatSession = await ChatSession.findOne({
      _id: chatSessionId,
      participants: userId,
      active: true
    });

    if (!chatSession) {
      return res.status(404).json({ message: 'Active chat session not found' });
    }

    // If chat is not saved, leaving = expiring
    if (!chatSession.isSaved) {
      chatSession.active = false;
      chatSession.endedAt = new Date();
      await chatSession.save();
      
      console.log(`[CHAT LEAVE] User ${userId} left unsaved chat ${chatSessionId} - marked for expiry`);
      
      res.json({ 
        message: 'Chat session ended (unsaved chat expired)',
        expired: true
      });
    } else {
      // For saved chats, just end it normally
      chatSession.active = false;
      chatSession.endedAt = new Date();
      await chatSession.save();
      
      console.log(`[CHAT LEAVE] User ${userId} left saved chat ${chatSessionId}`);
      
      res.json({ 
        message: 'Left chat session',
        expired: false
      });
    }
  } catch (error) {
    console.error('Error leaving chat session:', error);
    res.status(500).json({ message: 'Failed to leave chat session' });
  }
};

/**
 * Save chat session (prevent expiry)
 */
export const saveChatSession = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { chatSessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const chatSession = await ChatSession.findOne({
      _id: chatSessionId,
      participants: userId
    });

    if (!chatSession) {
      return res.status(404).json({ message: 'Chat session not found' });
    }

    // Add user to savedByUsers if not already present
    const alreadySaved = chatSession.savedByUsers.includes(userId);
    if (!alreadySaved) {
      chatSession.savedByUsers.push(userId);
    }

    // If both users saved, mark as permanently saved
    if (chatSession.savedByUsers.length === 2) {
      chatSession.isSaved = true;
    }

    await chatSession.save();

    // Emit socket event to partner if available
    const io = req.app.get('io');
    if (io && !alreadySaved) {
      io.to(chatSessionId.toString()).emit('chat:partner-saved', {
        savedByCount: chatSession.savedByUsers.length,
        isSaved: chatSession.isSaved
      });
    }

    res.json({ 
      message: 'Chat session saved successfully',
      isSaved: chatSession.isSaved,
      savedByCount: chatSession.savedByUsers.length,
      chat: {
        savedByUsers: chatSession.savedByUsers,
        isSaved: chatSession.isSaved
      }
    });
  } catch (error) {
    console.error('Error saving chat session:', error);
    res.status(500).json({ message: 'Failed to save chat session' });
  }
};

export const getSavedChats = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find only ACTIVE SAVED chat sessions where user is a participant
        // - isSaved=true means both users have saved the chat
        // - active=true means the chat is still ongoing (inactive chats are hidden)
        // - Exclude unmatched chats - they should be hidden from the list
        const chats = await ChatSession.find({
          participants: { $in: [userId] },
          isSaved: true, // Only return saved chats
          active: true, // Only return ACTIVE chats (inactive/ended are hidden)
          unmatchedBy: { $exists: false } // Exclude unmatched chats
        })
        .populate('participants', 'username')
        .sort({ startedAt: -1 });

        // For each chat, get the last message
        const chatsWithLastMessage = await Promise.all(chats.map(async (chat) => {
            const lastMessage = await Message.findOne({ chatSessionId: chat._id })
                .sort({ sentAt: -1 })
                .populate('senderId', 'username')
                .lean();

            // Detect attachment type based on content
            let messageType = 'text';
            if (lastMessage && lastMessage.content) {
                const content = lastMessage.content;
                if (content.startsWith('/uploads/') || content.startsWith('http://') || content.startsWith('https://')) {
                    messageType = 'attachment';
                }
            }

            const lastMessageObj = lastMessage ? {
                content: lastMessage.content,
                senderUsername: lastMessage.senderId.username,
                sentAt: lastMessage.sentAt,
                isOwn: lastMessage.senderId._id.toString() === userId.toString(),
                type: lastMessage.type || messageType
            } : null;

            return {
                ...chat.toObject(),
                lastMessage: lastMessageObj,
                isSaved: chat.isSaved,
                currentUserSaved: chat.savedByUsers.some(id => id.toString() === userId.toString())
            };
        }));

        res.json(chatsWithLastMessage);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

export const getChatSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        const chatSession = await ChatSession.findById(sessionId)
        .populate('participants', 'username profilePicture');

        if (!chatSession) {
            return res.status(404).json({ msg: 'Chat not found' });
        }

        // Security Check
        if (!chatSession.participants.some(p => p._id.equals(userId))) {
            return res.status(403).json({ msg: 'User not authorized for this chat' });
        }

        // Block access if chat was unmatched (hidden from both users)
        if (chatSession.unmatchedBy) {
            return res.status(403).json({ msg: 'This chat has been removed' });
        }

        // Allow access to both active chats AND saved chats
        // Only block access if the chat has ended AND is not saved
        if (!chatSession.active && !chatSession.isSaved) {
            return res.status(403).json({ msg: 'This chat has ended and was not saved' });
        }

        res.json(chatSession);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

/**
 * Unmatch from a chat session
 * Sets active to false, endedAt, and unmatchedBy
 */
export const unmatchUser = async (req, res) => {
    try {
        const userId = req.user.id;
        const { chatSessionId } = req.params;

        // Find the chat session and verify user is a participant
        const chatSession = await ChatSession.findOne({
            _id: chatSessionId,
            participants: { $in: [userId] }
        });

        if (!chatSession) {
            return res.status(403).json({ error: 'Not authorized to unmatch this chat' });
        }

        // Update the chat session
        chatSession.active = false;
        chatSession.endedAt = new Date();
        chatSession.unmatchedBy = userId;

        await chatSession.save();

        console.log(`[UNMATCH] User ${userId} unmatched from chat ${chatSessionId}`);

        // Emit socket event to notify partner (US-9 AC2)
        const io = req.app.get('io');
        if (io) {
            io.to(chatSessionId.toString()).emit('chat:unmatched', {
                message: 'Your partner has unmatched. This conversation is now closed.',
                unmatchedBy: userId
            });
        }

        res.status(200).json({
            message: 'Successfully unmatched from chat',
            chatSessionId: chatSession._id
        });

    } catch (err) {
        console.error('Error unmatching user:', err);
        res.status(500).json({ error: 'Failed to unmatch from chat' });
    }
};

/**
 * Get save status for a chat session
 * Returns whether current user has saved and overall save status
 */
export const getChatSaveStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { chatSessionId } = req.params;

        const chatSession = await ChatSession.findOne({
            _id: chatSessionId,
            participants: { $in: [userId] }
        });

        if (!chatSession) {
            return res.status(404).json({ message: 'Chat session not found' });
        }

        const currentUserSaved = chatSession.savedByUsers.some(
            id => id.toString() === userId.toString()
        );

        res.json({
            currentUserSaved,
            savedByCount: chatSession.savedByUsers.length,
            isSaved: chatSession.isSaved,
            active: chatSession.active
        });

    } catch (err) {
        console.error('Error getting save status:', err);
        res.status(500).json({ message: 'Failed to get save status' });
    }
};

/**
 * US #6: Next Chat - Skip to another match
 * 
 * Behavior:
 * - If chat is saved (isSaved=true): Chat stays ACTIVE, user can find new match while keeping saved chat
 * - If chat is NOT saved: End chat immediately, notify partner, delete history, user goes to queue
 */
export const nextChat = async (req, res) => {
    try {
        const userId = req.user.id;
        const { chatSessionId } = req.params;

        const chatSession = await ChatSession.findOne({
            _id: chatSessionId,
            participants: { $in: [userId] },
            active: true
        });

        if (!chatSession) {
            return res.status(404).json({ message: 'Active chat session not found' });
        }

        const io = req.app.get('io');

        // If chat is saved by both users: Keep chat ACTIVE, user can find new match
        // Saved chats don't block queue - only unsaved active chats do
        if (chatSession.isSaved) {
            // DO NOT set active=false - saved chats remain active so users can continue chatting
            // Queue controller will only block on active UNSAVED chats

            console.log(`[NEXT CHAT] User ${userId} finding new match while keeping saved chat ${chatSessionId} active`);
            
            // Notify partner that user is looking for new match (optional info)
            if (io) {
                io.to(chatSessionId.toString()).emit('chat:partner-next', {
                    message: 'Your partner is looking for a new match. You can continue chatting here.'
                });
            }

            return res.json({
                message: 'You can now find a new match. Your saved chat remains active.',
                chatPreserved: true,
                isSaved: true,
                redirectToQueue: true
            });
        }

        // AC2-6: Chat is NOT saved - end it immediately
        // AC4: Current chat is ended immediately
        chatSession.active = false;
        chatSession.endedAt = new Date();
        await chatSession.save();

        console.log(`[NEXT CHAT] User ${userId} ended unsaved chat ${chatSessionId} - partner will be notified`);

        // AC5: Notify partner that chat has ended
        if (io) {
            io.to(chatSessionId.toString()).emit('chat:partner-left', {
                message: 'Your partner has moved on to find a new match.'
            });
        }

        // AC6: Delete chat history from skipped chat
        await Message.deleteMany({ chatSessionId: chatSession._id });
        console.log(`[NEXT CHAT] Deleted messages for chat ${chatSessionId}`);

        // AC3: User will be redirected to queue by frontend
        return res.json({
            message: 'Chat ended. You can now find a new match.',
            chatPreserved: false,
            isSaved: false,
            redirectToQueue: true
        });

    } catch (err) {
        console.error('Error in nextChat:', err);
        res.status(500).json({ message: 'Failed to process next chat request' });
    }
};

