import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: String, // email of the reporter
      required: true,
      index: true,
    },
    reporterUsername: {
      type: String,
      required: true,
    },
    reportedUserId: {
      type: String, // email of the reported user
      required: true,
      index: true,
    },
    reportedUsername: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      enum: [
        'spam',
        'harassment',
        'inappropriate_content',
        'fake_profile',
        'other',
      ],
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    chatSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatSession',
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending',
      index: true,
    },
    adminNotes: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: String, // admin email who reviewed this report
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Index for efficient querying
reportSchema.index({ createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);

export default Report;
