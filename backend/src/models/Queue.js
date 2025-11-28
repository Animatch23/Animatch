import mongoose from 'mongoose';

const queueSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['waiting', 'matched'],
        default: 'waiting'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-cleanup old queue entries after 5 minutes (300 seconds)
// This handles ghost users who close their browser without canceling
queueSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

export default mongoose.model('Queue', queueSchema);