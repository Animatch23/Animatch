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
    },
    index: true // Add index for expiry queries
  },
  unmatchedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  hiddenFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // US #14: Icebreaker Prompts
  currentIcebreaker: {
    type: String,
    default: null
  },
  usedIcebreakers: [{
    type: String
  }],
  icebreakerDismissed: {
    type: Boolean,
    default: false
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

// Pre-remove hook: Clean up associated messages when a chat session is deleted
ChatSessionSchema.pre('deleteOne', { document: true, query: false }, async function() {
  try {
    const Message = mongoose.model('Message');
    await Message.deleteMany({ chatSessionId: this._id });
    console.log(`[CLEANUP] Deleted messages for chat session ${this._id}`);
  } catch (error) {
    console.error(`[CLEANUP] Error deleting messages for chat session ${this._id}:`, error);
  }
});

// Also handle findOneAndDelete
ChatSessionSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    try {
      const Message = mongoose.model('Message');
      await Message.deleteMany({ chatSessionId: doc._id });
      console.log(`[CLEANUP] Deleted messages for chat session ${doc._id}`);
    } catch (error) {
      console.error(`[CLEANUP] Error deleting messages for chat session ${doc._id}:`, error);
    }
  }
});

const ChatSession = mongoose.model('ChatSession', ChatSessionSchema);
export default ChatSession;
