/**
 * FlaggedContent Model - US-19
 * Tracks automatically flagged messages for admin review
 */

import mongoose from 'mongoose';

const flaggedContentSchema = new mongoose.Schema({
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  chatSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatSession',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  flagReason: {
    type: String,
    enum: ['offensive_language', 'harassment', 'threat', 'spam', 'other'],
    required: true
  },
  severity: {
    type: Number,
    required: true,
    min: 1,
    max: 3 // 1=low, 2=medium, 3=high
  },
  matchedPatterns: [{
    type: String // Patterns that triggered the flag
  }],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'dismissed'],
    default: 'pending',
    index: true
  },
  flaggedAt: {
    type: Date,
    default: Date.now
  },
  // Review fields
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Admin user who reviewed
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewNotes: {
    type: String,
    default: ''
  },
  actionTaken: {
    type: String,
    enum: ['none', 'warning_issued', 'message_removed', 'user_suspended', 'user_banned'],
    default: 'none'
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
flaggedContentSchema.index({ status: 1, severity: -1, flaggedAt: -1 });
flaggedContentSchema.index({ userId: 1, flaggedAt: -1 });

// Static method to get pending flags for admin review
flaggedContentSchema.statics.getPendingFlags = async function(limit = 50) {
  return this.find({ status: 'pending' })
    .sort({ severity: -1, flaggedAt: -1 })
    .limit(limit)
    .populate('userId', 'username email flagCount')
    .populate('chatSessionId', 'participants startedAt');
};

// Static method to get flags for a specific user
flaggedContentSchema.statics.getUserFlags = async function(userId, limit = 20) {
  return this.find({ userId })
    .sort({ flaggedAt: -1 })
    .limit(limit);
};

// Static method to count pending flags
flaggedContentSchema.statics.getPendingCount = async function() {
  return this.countDocuments({ status: 'pending' });
};

// Static method to get flag statistics
flaggedContentSchema.statics.getStatistics = async function() {
  const [pending, confirmed, dismissed, bySeverity] = await Promise.all([
    this.countDocuments({ status: 'pending' }),
    this.countDocuments({ status: 'confirmed' }),
    this.countDocuments({ status: 'dismissed' }),
    this.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ])
  ]);

  return {
    pending,
    confirmed,
    dismissed,
    total: pending + confirmed + dismissed,
    bySeverity: bySeverity.reduce((acc, item) => {
      acc[`severity_${item._id}`] = item.count;
      return acc;
    }, {})
  };
};

const FlaggedContent = mongoose.model('FlaggedContent', flaggedContentSchema);
export default FlaggedContent;
