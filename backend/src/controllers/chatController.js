import mongoose from "mongoose";
import ChatSession from "../models/ChatSession.js";
import Queue from "../models/Queue.js";
import { io } from "../server.js";

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

const emitEventSafely = (recipientId, event, payload) => {
    if (!recipientId) {
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
        emitEventSafely(partnerId, "chat_ended", {
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
        emitEventSafely(requesterId, "returned_to_queue", {
            message: "You've been added back to the queue",
            matched: false,
        });

        emitEventSafely(partnerId, "returned_to_queue", {
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