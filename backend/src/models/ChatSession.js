import mongoose from "mongoose";

const ChatSessionSchema = new mongoose.Schema({
  participants: [{
    type: String, // Store email addresses directly (consistent with Match model)
    required: true
  }],
  active: {
    type: Boolean,
    default: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  },
  unmatched: {
    type: Boolean,
    default: false
  },
  unmatchedBy: {
    type: String, // userId who initiated unmatch
    default: null
  },
  unmatchedAt: {
    type: Date,
    default: null
  }
});

export default mongoose.model("ChatSession", ChatSessionSchema);