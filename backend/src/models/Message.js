import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  chatSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatSession',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  sentAt: {
    type: Date,
    default: Date.now
    // index: true - Removed to avoid duplicate index warning
  },
  // US-19: Content moderation fields
  isFlagged: {
    type: Boolean,
    default: false
  },
  flaggedAt: {
    type: Date,
    default: null
  },
  flagSeverity: {
    type: Number,
    default: 0 // 0=none, 1=low, 2=medium, 3=high
  },
  moderationStatus: {
    type: String,
    enum: ['clean', 'pending', 'reviewed', 'removed'],
    default: 'clean'
  }
}, { 
  timestamps: true 
});

// Compound index for efficient message retrieval
messageSchema.index({ chatSessionId: 1, sentAt: 1 });

// TTL index: Auto-delete messages ONLY for unsaved/expired chat sessions
// Messages should persist if the chat session is saved
// Note: We handle this by not having a TTL on messages directly
// Instead, messages will be deleted when their parent ChatSession is deleted

export default mongoose.model('Message', messageSchema);