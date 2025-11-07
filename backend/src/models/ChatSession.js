import mongoose from "mongoose";

const ChatSessionSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Set expiry to 24 hours from creation
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    },
    index: true
  },
  savedByUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isSaved: {
    type: Boolean,
    default: false
  }
});

// Compound index for finding active chats by participant
ChatSessionSchema.index({ participants: 1, active: 1 });

// Auto-expire chat sessions after 24 hours unless saved
ChatSessionSchema.index({ expiresAt: 1 }, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { isSaved: false }
});

export default mongoose.model("ChatSession", ChatSessionSchema);