import mongoose from "mongoose";

const ChatSessionSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  active: {
    type: Boolean,
    default: true
    // index: true - Removed to avoid duplicate index warning
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  },
  savedByUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isSaved: {
    type: Boolean,
    default: false
    // index: true - Removed to avoid duplicate index warning
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Set expiry to 24 hours from creation
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
    // index: true - Removed to avoid duplicate index warning
  }
});

// Compound index for finding active chats by participant
ChatSessionSchema.index({ participants: 1, active: 1 });

// Compound index for finding unique active chats between two users
ChatSessionSchema.index({ participants: 1, active: 1, expiresAt: 1 });

// TTL index: Auto-delete unsaved expired sessions
// Only applies to documents where isSaved=false AND active=false
ChatSessionSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: {
      isSaved: false,
      active: false
    }
  }
);

export default mongoose.model("ChatSession", ChatSessionSchema);