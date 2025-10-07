import mongoose from "mongoose";

const QueueSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  preferences: {
    type: Object,
    default: {} // expandable for iterations implementing matching preferences
  }
});

export default mongoose.model("Queue", QueueSchema);