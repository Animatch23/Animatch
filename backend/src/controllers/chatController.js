import ChatSession from '../models/ChatSession.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

/**
 * Calculate reveal percentage based on message count
 * 0-9 messages = 0% (fully blurred)
 * 10-19 = 20%, 20-29 = 40%, 30-39 = 60%, 40-49 = 80%, 50+ = 100% (fully revealed)
 * @param {number} messageCount - Number of messages sent by user
 * @returns {number} Reveal percentage (0-100)
 */
const calculateRevealPercentage = (messageCount) => {
  if (messageCount < 10) return 0;
  if (messageCount >= 50) return 100;
  // Each 10 messages = 20% reveal
  return Math.floor(messageCount / 10) * 20;
};

/**
 * Calculate blur level from reveal percentage
 * @param {number} revealPercentage - 0 to 100
 * @returns {number} Blur in pixels (20 = fully blurred, 0 = clear)
 */
const calculateBlurLevel = (revealPercentage) => {
  // At 0% reveal, blur is 20px. At 100%, blur is 0.
  return Math.round(20 * (1 - revealPercentage / 100));
};

/**
 * Get active chat session for current user
 */
export const getActiveChat = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Prioritize UNSAVED active chats over saved ones
    // This ensures "Return to Active Match" goes to the unsaved chat first
    const chatSession = await ChatSession.findOne({
      participants: userId,
      active: true,
      expiresAt: { $gt: new Date() }
    })
    .sort({ isSaved: 1 }) // unsaved (false/undefined) comes before saved (true)
    .populate('participants', 'username');

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

    // Block access if chat was unmatched, UNLESS it was saved by both users
    // If both users saved the chat (isSaved: true), they can still view history
    if (chatSession.unmatchedBy && !chatSession.isSaved) {
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

    // Find all saved chats for this user where both users saved (isSaved: true)
    // Saved chats remain visible even if unmatched or inactive
    // This preserves chat history for mutually saved matches
    const savedChats = await ChatSession.find({
      participants: userId,
      isSaved: true
      // Note: We show saved chats regardless of active status or unmatchedBy
      // because both users agreed to save this connection
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

    // Block access if chat was unmatched, UNLESS it was saved by both users
    // If both users saved the chat (isSaved: true), they can still view it
    if (chatSession.unmatchedBy && !chatSession.isSaved) {
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
 * If chat is saved, unmatch it (set unmatchedBy, deactivate) but preserve messages
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

    // For BOTH saved and unsaved chats, end the session
    chatSession.active = false;
    chatSession.endedAt = new Date();

    if (!wasSaved) {
      // If chat is NOT saved, delete messages (AC6)
      await Message.deleteMany({ chatSessionId: chatSession._id });
      console.log(`[NEXT CHAT] User ${userId} skipped unsaved chat ${chatSessionId} - messages deleted`);
    } else {
      // For saved chats, mark as unmatched so it behaves like unmatch
      // This allows both users to rematch with others while preserving the chat history
      chatSession.unmatchedBy = userId;
      console.log(`[NEXT CHAT] User ${userId} unmatched from saved chat ${chatSessionId} - chat preserved for history`);
    }

    await chatSession.save();

    // Notify partner
    const io = req.app.get('io');
    if (io) {
      if (wasSaved) {
        // For saved chats, emit unmatched event
        io.to(chatSessionId.toString()).emit('chat:unmatched', {
          message: 'Your partner has moved on to find a new match. This saved chat is preserved in your history.'
        });
      } else {
        io.to(chatSessionId.toString()).emit('chat:partner-left', {
          message: 'Your partner is looking for a new match'
        });
      }
    }

    res.json({
      message: wasSaved ? 'Unmatched from saved chat, looking for new match' : 'Chat ended, looking for new match',
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

    // Don't let users block themselves
    if (userId.toString() === userIdToBlock.toString()) {
      return res.status(400).json({ message: 'Cannot block yourself' });
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

/**
 * Notify active chat partner that user is logging out
 * This allows the partner to see "Partner offline" status
 */
export const notifyLogout = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Find any active chat sessions for this user
    const activeChats = await ChatSession.find({
      participants: userId,
      active: true,
      expiresAt: { $gt: new Date() }
    });

    const io = req.app.get('io');
    
    if (io && activeChats.length > 0) {
      for (const chat of activeChats) {
        io.to(chat._id.toString()).emit('chat:partner-offline', {
          message: 'Your partner has logged out'
        });
        console.log(`[LOGOUT] Notified chat ${chat._id} that user ${userId} logged out`);
      }
    }

    res.json({ message: 'Logout notification sent', chatsNotified: activeChats.length });
  } catch (error) {
    console.error('Error notifying logout:', error);
    res.status(500).json({ message: 'Failed to notify logout' });
  }
};

/**
 * Get profile reveal status for a chat session
 * Returns profile picture URLs and reveal percentages for both users
 * Based on message counts: 10 msgs = 20%, 20 = 40%, 30 = 60%, 40 = 80%, 50+ = 100%
 */
export const getProfileRevealStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { chatSessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const chatSession = await ChatSession.findOne({
      _id: chatSessionId,
      participants: userId
    }).populate('participants', 'username profilePicture');

    if (!chatSession) {
      return res.status(404).json({ message: 'Chat session not found' });
    }

    // Get current user and partner
    const currentUser = chatSession.participants.find(
      p => p._id.toString() === userId.toString()
    );
    const partner = chatSession.participants.find(
      p => p._id.toString() !== userId.toString()
    );

    if (!currentUser || !partner) {
      return res.status(404).json({ message: 'Participants not found' });
    }

    // Get message counts from the map (or default to 0)
    const messageCounts = chatSession.messageCounts || new Map();
    const currentUserMessageCount = messageCounts.get(userId.toString()) || 0;
    const partnerMessageCount = messageCounts.get(partner._id.toString()) || 0;

    // Calculate reveal percentages
    const currentUserReveal = calculateRevealPercentage(currentUserMessageCount);
    const partnerReveal = calculateRevealPercentage(partnerMessageCount);

    res.json({
      currentUser: {
        id: currentUser._id,
        username: currentUser.username,
        profilePicture: currentUser.profilePicture?.url || null,
        hasProfilePicture: !!currentUser.profilePicture?.url,
        messageCount: currentUserMessageCount,
        revealPercentage: currentUserReveal,
        blurLevel: calculateBlurLevel(currentUserReveal)
      },
      partner: {
        id: partner._id,
        username: partner.username,
        profilePicture: partner.profilePicture?.url || null,
        hasProfilePicture: !!partner.profilePicture?.url,
        messageCount: partnerMessageCount,
        revealPercentage: partnerReveal,
        blurLevel: calculateBlurLevel(partnerReveal)
      },
      // Show reveal section only if BOTH users have profile pictures
      showRevealSection: !!(currentUser.profilePicture?.url && partner.profilePicture?.url)
    });
  } catch (error) {
    console.error('Error fetching profile reveal status:', error);
    res.status(500).json({ message: 'Failed to fetch profile reveal status' });
  }
};

/**
 * Increment message count for a user in a chat session
 * Called by socket handler when a message is sent
 * @param {string} chatSessionId - The chat session ID
 * @param {string} senderId - The ID of the user who sent the message
 * @returns {Object} Updated reveal status
 */
export const incrementMessageCount = async (chatSessionId, senderId) => {
  try {
    const chatSession = await ChatSession.findById(chatSessionId);
    if (!chatSession) {
      return null;
    }

    // Initialize messageCounts if it doesn't exist
    if (!chatSession.messageCounts) {
      chatSession.messageCounts = new Map();
    }

    // Increment the sender's message count
    const currentCount = chatSession.messageCounts.get(senderId.toString()) || 0;
    const newCount = currentCount + 1;
    chatSession.messageCounts.set(senderId.toString(), newCount);

    await chatSession.save();

    // Calculate new reveal percentage
    const newRevealPercentage = calculateRevealPercentage(newCount);
    const previousRevealPercentage = calculateRevealPercentage(currentCount);

    // Return reveal update info
    return {
      senderId,
      messageCount: newCount,
      revealPercentage: newRevealPercentage,
      blurLevel: calculateBlurLevel(newRevealPercentage),
      milestoneReached: newRevealPercentage > previousRevealPercentage
    };
  } catch (error) {
    console.error('Error incrementing message count:', error);
    return null;
  }
};