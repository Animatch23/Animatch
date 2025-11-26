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
        default: Date.now
        // Index removed from here - defined at schema level below
    },
    status: {
        type: String,
        enum: ['waiting', 'matched'],
        default: 'waiting'
    },
    // Profile data for matchmaking - stored for quick access during matching
    profileData: {
        course: { type: String, default: "" },
        housing: { type: String, default: "" },
        organizations: { type: [String], default: [] },
        interests: { type: [String], default: [] }
    }
});

// Auto-cleanup old queue entries after 30 minutes
queueSchema.index({ joinedAt: 1 }, { expireAfterSeconds: 1800 });

export default mongoose.model('Queue', queueSchema);