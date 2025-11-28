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

    // Fetch messages
    const messages = await Message.find({ chatSessionId })
      .sort({ sentAt: 1 })
      .limit(100) // Limit to last 100 messages
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

/**
 * Block a user
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

    if (userId.toString() === userIdToBlock.toString()) {
        return res.status(400).json({ message: 'Cannot block yourself' });
    }

    // Add to blocked list
    await User.findByIdAndUpdate(userId, {
      $addToSet: { blockedUsers: userIdToBlock }
    });

    // End any active chat with this user
    const chatSession = await ChatSession.findOne({
      participants: { $all: [userId, userIdToBlock] },
      active: true
    });

    if (chatSession) {
      chatSession.active = false;
      chatSession.endedAt = new Date();
      await chatSession.save();
      
      // Notify partner they were blocked/chat ended
      const io = req.app.get('io');
      if (io) {
        io.to(chatSession._id.toString()).emit('chat:partner-left', {
          message: 'User has left the chat'
        });
      }
    }

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ message: 'Failed to block user' });
  }
};

export const getSavedMatches = async (req, res) => {
  try {
    const userId = req.user.id;
    const { course, housing, orgs } = req.query;

    // 1. Get current user to compare their attributes
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 2. Find sessions saved by this user
    const savedSessions = await ChatSession.find({
      savedByUsers: userId
    })
    .populate('participants', 'username profilePicture course housing organizations interests')
    .sort({ updatedAt: -1 });

    // 3. Process and Filter
    const results = [];

    for (const session of savedSessions) {
      // Find the partner (not the current user)
      const partner = session.participants.find(
        p => p._id.toString() !== userId.toString()
      );

      // If partner deleted account, skip
      if (!partner) continue;

      let isMatch = true;

      // -- FILTER LOGIC --
      
      // Filter: Same Course
      if (course === 'true') {
        const uVal = (currentUser.course || "").toLowerCase().trim();
        const pVal = (partner.course || "").toLowerCase().trim();
        // Match only if both exist and are equal
        if (!uVal || !pVal || uVal !== pVal) isMatch = false;
      }

      // Filter: Same Housing
      if (isMatch && housing === 'true') {
        const uVal = (currentUser.housing || "").toLowerCase().trim();
        const pVal = (partner.housing || "").toLowerCase().trim();
        if (!uVal || !pVal || uVal !== pVal) isMatch = false;
      }

      // Filter: Shared Organizations
      if (isMatch && orgs === 'true') {
        const uOrgs = (currentUser.organizations || []).map(o => o.toLowerCase().trim());
        const pOrgs = (partner.organizations || []).map(o => o.toLowerCase().trim());
        // Check intersection
        const hasShared = uOrgs.some(org => pOrgs.includes(org));
        if (!hasShared) isMatch = false;
      }

      if (isMatch) {
        results.push({
          chatSessionId: session._id,
          name: partner.username,
          profilePicture: partner.profilePicture,
          partnerData: {
            course: partner.course,
            housing: partner.housing,
            organizations: partner.organizations
          },
          // Calculate streak or other metadata here if needed
          updatedAt: session.updatedAt
        });
      }
    }

    res.json(results);

  } catch (error) {
    console.error('Error fetching saved matches:', error);
    res.status(500).json({ message: 'Failed to fetch saved matches' });
  }
};