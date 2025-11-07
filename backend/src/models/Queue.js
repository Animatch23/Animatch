import mongoose from 'mongoose';

const queueSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true
    },
    joinedAt: {
        type: Date,
        default: Date.now,
        index: true // Add index for better query performance
    },
    status: {
        type: String,
        enum: ['waiting', 'matched'],
        default: 'waiting'
    },
    // Interest-based matchmaking fields - stored for quick access during matching
    interests: {
        course: { type: String, default: null },
        dorm: { type: String, default: null },
        organizations: { type: [String], default: [] }
    }
});

// Auto-cleanup old queue entries after 30 minutes
queueSchema.index({ joinedAt: 1 }, { expireAfterSeconds: 1800 });

export default mongoose.model('Queue', queueSchema);