import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }],
    startedAt: {
        type: Date,
        default: Date.now
    },
    endedAt: {
        type: Date
    },
    status: {
        type: String,
        enum: ["active", "ended", "skipped"],
        default: "active"
    },
    endedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    endReason: {
        type: String,
        enum: ["next_chat", "mutual_end", "timeout"],
        default: null
    }
});

chatSessionSchema.index({ participants: 1, status: 1 });

export default mongoose.model("ChatSession", chatSessionSchema);