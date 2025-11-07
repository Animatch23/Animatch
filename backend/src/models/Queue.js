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
    },
    status: {
        type: String,
        enum: ['waiting', 'matched'],
        default: 'waiting'
    }
});

export default mongoose.model('Queue', queueSchema);