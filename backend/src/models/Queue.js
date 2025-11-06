import mongoose from "mongoose";

const QueueSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
    status: { type: String, enum: ["waiting", "locked", "matched"], default: "waiting", index: true },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatSession", default: null },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.Queue || mongoose.model("Queue", QueueSchema);