import ChatSession from '../models/ChatSession.js';

/**
 * Controller for US #7: Save Match
 * Handles a user's request to save a chat session.
 * Fulfills "Chat only saved if mutual".
 */
export const saveMatch = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id; 
        const chat = await ChatSession.findById(sessionId);

    if (!chat) {
        return res.status(404).json({ msg: 'Chat session not found' });
    }

    if (!chat.participants.some(p => p.equals(userId))) {
        return res.status(403).json({ msg: 'User not authorized for this chat' });
    }

    // --- Core Save Logic ---
    // Check if the user has *already* saved, to prevent duplicates
    if (!chat.savedBy.includes(userId)) {
        chat.savedBy.push(userId);
    }

    // Check for mutual save
    if (chat.savedBy.length === 2 && !chat.isSaved) {
        chat.isSaved = true;
    }

    await chat.save();

    res.json({ msg: 'Save status updated', chat });

    } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
    }
};

export const getChatHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find all sessions where:
        // 1. isSaved is true
        // 2. The user is a participant
        const savedChats = await ChatSession.find({
        isSaved: true,
        participants: { $in: [userId] }
        })
        .populate('participants', 'username profilePicture')
        .select('-messages')
        .sort({ endedAt: -1 });

        res.json(savedChats);

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

        // Acceptance Criteria Check
        if (!chatSession.isSaved) {
            return res.status(403).json({ msg: 'This chat has not been saved' });
        }

        res.json(chatSession);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

