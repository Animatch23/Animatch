import ChatSession from '../models/ChatSession.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

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
      partnerId: partner?._id,
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

    // Use atomic update to handle concurrent saves properly
    // $addToSet ensures no duplicates and is atomic
    const updatedSession = await ChatSession.findOneAndUpdate(
      {
        _id: chatSessionId,
        participants: userId
      },
      {
        $addToSet: { savedByUsers: userId }
      },
      { new: true } // Return the updated document
    );

    if (!updatedSession) {
      return res.status(404).json({ message: 'Chat session not found' });
    }

    // Check if this user was already in savedByUsers before this update
    // We can't know for sure atomically, so we'll emit the event regardless
    const savedByCount = updatedSession.savedByUsers.length;

    // If both users have saved, mark as permanently saved
    if (savedByCount === 2 && !updatedSession.isSaved) {
      updatedSession.isSaved = true;
      await updatedSession.save();
    }

    const finalIsSaved = updatedSession.isSaved || savedByCount === 2;

    // Emit socket event to notify partner
    const io = req.app.get('io');
    if (io) {
      io.to(chatSessionId.toString()).emit('chat:partner-saved', {
        savedByCount: savedByCount,
        isSaved: finalIsSaved
      });
    }

    res.json({ 
      message: 'Chat session saved successfully',
      isSaved: finalIsSaved,
      savedByCount: savedByCount,
      chat: {
        savedByUsers: updatedSession.savedByUsers,
        isSaved: finalIsSaved
      }
    });
  } catch (error) {
    console.error('Error saving chat session:', error);
    res.status(500).json({ message: 'Failed to save chat session' });
  }
};

/**
 * Get saved chats for user (US #8: Saved Chats List)
 * Only returns ACTIVE saved chats (inactive saved chats are hidden)
 */
export const getSavedChats = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Find all ACTIVE saved chats for this user (inactive saved chats are hidden)
    // Exclude unmatched chats (they should not appear in saved list)
    const savedChats = await ChatSession.find({
      participants: userId,
      isSaved: true,
      active: true, // Only show ACTIVE saved chats
      unmatchedBy: { $exists: false } // Exclude unmatched chats
    })
    .populate('participants', 'username email')
    .sort({ endedAt: -1, startedAt: -1 })
    .lean();

    // For each chat, get the last message
    const chatsWithLastMessage = await Promise.all(
      savedChats.map(async (chat) => {
        const lastMessage = await Message.findOne({ chatSessionId: chat._id })
          .sort({ sentAt: -1 })
          .lean();

        // Get sender's username for the last message
        let lastMessageData = null;
        if (lastMessage) {
          const sender = await User.findById(lastMessage.senderId).select('username').lean();
          const isOwn = lastMessage.senderId.toString() === userId.toString();
          
          // Determine if it's an attachment (simple check for file paths or URLs)
          const isAttachment = lastMessage.content.startsWith('/uploads/') || 
                              lastMessage.content.startsWith('http://') || 
                              lastMessage.content.startsWith('https://');
          
          lastMessageData = {
            content: lastMessage.content,
            sentAt: lastMessage.sentAt,
            senderUsername: sender?.username || 'Unknown',
            isOwn: isOwn,
            type: isAttachment ? 'attachment' : 'text'
          };
        }

        return {
          ...chat,
          lastMessage: lastMessageData
        };
      })
    );

    res.json(chatsWithLastMessage);
  } catch (error) {
    console.error('Error fetching saved chats:', error);
    res.status(500).json({ message: 'Failed to fetch saved chats' });
  }
};

/**
 * Get specific chat session details
 */
export const getChatSession = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const chatSession = await ChatSession.findById(sessionId)
      .populate('participants', 'username email');

    if (!chatSession) {
      return res.status(404).json({ msg: 'Chat session not found' });
    }

    // Check if user is a participant
    const isParticipant = chatSession.participants.some(
      p => p._id.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ msg: 'User not authorized for this chat' });
    }

    // Block access if chat was unmatched
    if (chatSession.unmatchedBy) {
      return res.status(403).json({ msg: 'This chat has been removed' });
    }

    res.json(chatSession);
  } catch (error) {
    console.error('Error fetching chat session:', error);
    res.status(500).json({ message: 'Failed to fetch chat session' });
  }
};

/**
 * Get save status for a chat session
 */
export const getChatSaveStatus = async (req, res) => {
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

    const currentUserSaved = chatSession.savedByUsers.some(
      id => id.toString() === userId.toString()
    );

    res.json({
      currentUserSaved,
      savedByCount: chatSession.savedByUsers.length,
      isSaved: chatSession.isSaved,
      active: chatSession.active
    });
  } catch (error) {
    console.error('Error fetching save status:', error);
    res.status(500).json({ message: 'Failed to fetch save status' });
  }
};

/**
 * Unmatch from a chat session (US #9)
 * Immediately ends the chat and hides it from both users
 */
export const unmatchUser = async (req, res) => {
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
      return res.status(403).json({ error: 'Not authorized to unmatch this chat' });
    }

    // Mark as unmatched and end the session
    chatSession.unmatchedBy = userId;
    chatSession.active = false;
    chatSession.endedAt = new Date();
    await chatSession.save();

    console.log(`[UNMATCH] User ${userId} unmatched from chat ${chatSessionId}`);

    // Emit socket event to notify partner
    const io = req.app.get('io');
    if (io) {
      io.to(chatSessionId.toString()).emit('chat:unmatched', {
        message: 'Your partner has unmatched from this chat'
      });
    }

    res.json({
      message: 'Successfully unmatched from chat',
      chatSessionId: chatSessionId.toString()
    });
  } catch (error) {
    console.error('Error unmatching:', error);
    res.status(500).json({ message: 'Failed to unmatch' });
  }
};

/**
 * US #6: Next Chat - Skip to another match
 * If chat is saved, keep it active (users can continue chatting in saved chats)
 * If chat is unsaved, end it and delete messages
 */
export const nextChat = async (req, res) => {
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

    const wasSaved = chatSession.isSaved;

    // If chat is NOT saved, end it and delete messages (AC6)
    if (!wasSaved) {
      chatSession.active = false;
      chatSession.endedAt = new Date();
      await chatSession.save();

      // Delete all messages from this chat
      await Message.deleteMany({ chatSessionId: chatSession._id });

      console.log(`[NEXT CHAT] User ${userId} skipped unsaved chat ${chatSessionId} - messages deleted`);
    } else {
      // For saved chats, keep them ACTIVE so users can continue chatting
      // Just notify the partner that this user is looking for a new match
      console.log(`[NEXT CHAT] User ${userId} looking for new match, saved chat ${chatSessionId} remains ACTIVE`);
    }

    // Notify partner
    const io = req.app.get('io');
    if (io) {
      if (!wasSaved) {
        io.to(chatSessionId.toString()).emit('chat:partner-left', {
          message: 'Your partner is looking for a new match'
        });
      } else {
        io.to(chatSessionId.toString()).emit('chat:partner-next', {
          message: 'Your partner is looking for a new match. This saved chat remains available.'
        });
      }
    }

    res.json({
      message: wasSaved ? 'Looking for new match (saved chat preserved)' : 'Chat ended, looking for new match',
      redirectToQueue: true,
      chatPreserved: wasSaved,
      isSaved: wasSaved
    });
  } catch (error) {
    console.error('Error processing next chat:', error);
    res.status(500).json({ message: 'Failed to process next chat' });
  }
};

/**
 * Block a user - prevents future matching with this user
 */
export const blockUser = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { userIdToBlock } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!userIdToBlock) {
      return res.status(400).json({ message: 'User ID to block is required' });
    }

    // Add to blocked users list
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { blockedUsers: userIdToBlock } }
    );

    // End any active chat between these users
    const activeChat = await ChatSession.findOne({
      participants: { $all: [userId, userIdToBlock] },
      active: true
    });

    if (activeChat) {
      activeChat.active = false;
      activeChat.endedAt = new Date();
      await activeChat.save();

      // Notify the blocked user
      const io = req.app.get('io');
      if (io) {
        io.to(activeChat._id.toString()).emit('chat:partner-left', {
          message: 'The chat has ended'
        });
      }
    }

    console.log(`[BLOCK] User ${userId} blocked user ${userIdToBlock}`);

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ message: 'Failed to block user' });
  }
};