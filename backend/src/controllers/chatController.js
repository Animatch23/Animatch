import mongoose from "mongoose";
import ChatSession from "../models/ChatSession.js";
import Message from "../models/Message.js";
import Queue from "../models/Queue.js";
import User from "../models/User.js";

const normalizeObjectId = (value) => {
    if (!value) return null;
    if (value instanceof mongoose.Types.ObjectId) {
        return value;
    }
    if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
        return new mongoose.Types.ObjectId(value);
    }
    return null;
};

const upsertQueueEntry = async (userId) => {
    const normalized = normalizeObjectId(userId);
    if (!normalized) {
        return null;
    }

    return Queue.findOneAndUpdate(
        { userId: normalized },
        {
            $set: {
                status: "waiting",
                chatId: null,
            },
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        }
    );
};

const emitEventSafely = (io, recipientId, event, payload) => {
    if (!recipientId || !io) {
        return;
    }
    try {
        io.to(recipientId.toString()).emit(event, payload);
    } catch (err) {
        console.error(`Failed to emit ${event} to ${recipientId}:`, err);
    }
};

export const nextChat = async (req, res) => {
    try {
        const requesterId = normalizeObjectId(req.user?.id);

        if (!requesterId) {
            return res.status(401).json({
                success: false,
                message: "User authentication required to end chat",
            });
        }

        // Get Socket.IO instance from app (may be null in tests)
        const io = req.app.get('io');

        // Find active chat session
        const activeSession = await ChatSession.findOne({
            participants: requesterId,
            status: "active",
        }).populate("participants", "email _id");

        if (!activeSession) {
            return res.status(404).json({ 
                success: false,
                message: "No active chat session found" 
            });
        }

        // Get the other participant
        const requesterIdStr = requesterId.toString();
        const otherParticipant = activeSession.participants.find(
            (participant) => participant._id.toString() !== requesterIdStr
        );
        const partnerId = normalizeObjectId(otherParticipant?._id);

        // End the current session
        activeSession.status = "skipped";
        activeSession.endedAt = new Date();
        activeSession.endedBy = requesterId;
        activeSession.endReason = "next_chat";
        activeSession.messages = [];
        await activeSession.save();

        // Notify the other user via WebSocket
        emitEventSafely(io, partnerId, "chat_ended", {
            reason: "next_chat",
            message: "Your chat partner has moved to the next chat",
            sessionId: activeSession._id,
        });

        // Add both users back to queue
        await Promise.all([
            upsertQueueEntry(requesterId),
            upsertQueueEntry(partnerId),
        ]);

        // Notify both users they're back in queue
        emitEventSafely(io, requesterId, "returned_to_queue", {
            message: "You've been added back to the queue",
            matched: false,
        });

        emitEventSafely(io, partnerId, "returned_to_queue", {
            message: "You've been added back to the queue",
            matched: false,
        });

        res.status(200).json({
            success: true,
            message: "Chat ended successfully. You've been added back to the queue.",
            data: {
                sessionId: activeSession._id,
                returnedToQueue: true
            }
        });

    } catch (error) {
        console.error("Error in nextChat:", error);
        res.status(500).json({
            success: false,
            message: "Failed to end chat",
            error: error.message
        });
    }
};

export const getActiveChat = async (req, res) => {
    try {
        const requesterId = normalizeObjectId(req.user?.id);

        if (!requesterId) {
            return res.status(401).json({
                success: false,
                message: "User authentication required to lookup chat",
            });
        }

        const activeSession = await ChatSession.findOne({
            participants: requesterId,
            status: "active",
        }).populate("participants", "email _id");

        if (!activeSession) {
            return res.status(404).json({
                success: false,
                message: "No active chat session found"
            });
        }

        res.status(200).json({
            success: true,
            data: {
                sessionId: activeSession._id,
                participants: activeSession.participants,
                startedAt: activeSession.startedAt,
                status: activeSession.status,
            }
        });

    } catch (error) {
        console.error("Error in getActiveChat:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get active chat",
            error: error.message
        });
    }
};

export const joinQueue = async (req, res) => {
    try {
        const { userId } = req.body;

        const user = await User.findById(userId).select("username email");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const username = user.username || (user.email ? user.email.split("@")[0] : String(user._id));

        let queueEntry = await Queue.findOne({ user: userId });
        if (!queueEntry) {
            queueEntry = await Queue.create({
                user: userId,
                username,
                status: "waiting",
            });
        } else if (!queueEntry.username) {
            queueEntry.username = username;
            await queueEntry.save();
        }

        res.status(200).json({
            success: true,
            message: "Joined queue successfully",
            data: queueEntry,
        });
    } catch (error) {
        console.error("Error in joinQueue:", error);
        res.status(500).json({
            success: false,
            message: "Failed to join queue",
            error: error.message,
        });
    }
};

export const endChatSession = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    const session = await ChatSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    session.status = "ended";
    session.endedAt = new Date();
    await session.save();

    res.status(200).json({ success: true, message: "Chat session ended" });
  } catch (error) {
    console.error("Error ending chat session:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    // Handle both :sessionId and :id parameter naming conventions
    const sessionId = req.params.sessionId || req.params.id;
    const userId = req.user?.id || req.userId;

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Chat session not found" });
    }

    // Check if user is a participant
    const isParticipant = session.participants.some(
      (p) => p.toString() === userId?.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: "Not authorized to view this chat history" });
    }

    const messages = await Message.find({ chatSessionId: sessionId }).sort({ sentAt: 1 });

    res.status(200).json({ messages });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const saveChat = async (req, res) => {
  try {
    const userId = normalizeObjectId(req.user?._id || req.user?.id);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { sessionId } = req.params;
    const chatSession = await ChatSession.findById(sessionId);

    if (!chatSession) {
      return res.status(404).json({
        success: false,
        message: "Chat session not found",
      });
    }

    if (!Array.isArray(chatSession.savedByUsers)) {
      chatSession.savedByUsers = [];
    }

    const isParticipant = chatSession.participants.some(
      (participantId) => participantId?.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(404).json({
        success: false,
        message: "Chat session not found",
      });
    }

    const alreadySaved = chatSession.savedByUsers.some(
      (savedId) => savedId?.toString() === userId.toString()
    );

    if (!alreadySaved) {
      chatSession.savedByUsers.push(userId);
    }

    const requiredSaves = chatSession.participants.length;
    const isSaved = chatSession.savedByUsers.length >= requiredSaves;

    if (isSaved) {
      chatSession.isSaved = true;
    }

    await chatSession.save();
    const responseChat = chatSession.toObject();

    return res.status(200).json({
      success: true,
      chat: responseChat,
      isSaved,
    });
  } catch (error) {
    console.error("Error saving chat:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};