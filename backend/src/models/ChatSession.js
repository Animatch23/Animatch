import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema(
    {
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],
        startedAt: {
            type: Date,
            default: Date.now,
        },
        endedAt: {
            type: Date,
            default: null,
        },
        status: {
            type: String,
            enum: ["active", "ended", "skipped"],
            default: "active",
            index: true,
        },
        endedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        endReason: {
            type: String,
            enum: ["next_chat", "mutual_end", "timeout", null],
            default: null,
        },
        messages: [
            {
                senderId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },
                content: {
                    type: String,
                    default: "",
                    trim: true,
                },
                sentAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

chatSessionSchema.index({ participants: 1, status: 1 });

export default mongoose.model("ChatSession", chatSessionSchema);