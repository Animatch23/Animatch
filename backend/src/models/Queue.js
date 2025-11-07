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
        default: Date.now,
        index: true
    }
});

// Auto-cleanup old queue entries after 30 minutes
queueSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1800 });

export default mongoose.model('Queue', queueSchema);