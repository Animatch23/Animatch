import ChatSession from "../models/ChatSession.js";
import Queue from "../models/Queue.js";
import { io } from "../server.js";

export const nextChat = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find active chat session
        const activeSession = await ChatSession.findOne({
            participants: userId,
            status: "active"
        }).populate("participants", "email");

        if (!activeSession) {
            return res.status(404).json({ 
                success: false,
                message: "No active chat session found" 
            });
        }

        // Get the other participant
        const otherParticipant = activeSession.participants.find(
            p => p._id.toString() !== userId
        );

        // End the current session
        activeSession.status = "skipped";
        activeSession.endedAt = new Date();
        activeSession.endedBy = userId;
        activeSession.endReason = "next_chat";
        await activeSession.save();

        // Notify the other user via WebSocket
        if (otherParticipant) {
            io.to(otherParticipant._id.toString()).emit("chat_ended", {
                reason: "next_chat",
                message: "Your chat partner has moved to the next chat",
                sessionId: activeSession._id
            });
        }

        // Add both users back to queue
        const queuePromises = [userId, otherParticipant?._id].filter(Boolean).map(async (id) => {
            // Use updateOne with upsert to avoid duplicates
            return Queue.updateOne(
                { userId: id },
                { 
                    $setOnInsert: { userId: id },
                    $set: { status: "waiting", chatId: null }
                },
                { upsert: true }
            );
        });

        await Promise.all(queuePromises);

        // Notify both users they're back in queue
        io.to(userId.toString()).emit("returned_to_queue", {
            message: "You've been added back to the queue",
            matched: false
        });

        if (otherParticipant) {
            io.to(otherParticipant._id.toString()).emit("returned_to_queue", {
                message: "You've been added back to the queue",
                matched: false
            });
        }

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
        const userId = req.user.id;

        const activeSession = await ChatSession.findOne({
            participants: userId,
            status: "active"
        }).populate("participants", "email");

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
                startedAt: activeSession.startedAt
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