import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
    user1: {
        userId: String,
        username: String
    },
    user2: {
        userId: String,
        username: String
    },
    status: {
        type: String,
        enum: ['active', 'ended'],
        default: 'active',
        index: true // Add index for better query performance
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for finding active matches by user
matchSchema.index({ 'user1.userId': 1, status: 1 });
matchSchema.index({ 'user2.userId': 1, status: 1 });

export default mongoose.model('Match', matchSchema);