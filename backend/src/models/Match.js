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
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Match', matchSchema);