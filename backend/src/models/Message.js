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
    default: Date.now,
    index: true
  }
}, { 
  timestamps: true 
});

// Compound index for efficient message retrieval
messageSchema.index({ chatSessionId: 1, sentAt: 1 });

// Auto-delete messages when chat session expires (after 24 hours)
messageSchema.index({ sentAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model('Message', messageSchema);