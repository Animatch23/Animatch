import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema(
    {
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],
        // Merged: Using 'status' from us-6 as it's more descriptive than 'active' boolean
        status: {
            type: String,
            enum: ["active", "ended", "skipped"],
            default: "active",
            index: true,
        },
        startedAt: {
            type: Date,
            default: Date.now,
        },
        endedAt: {
            type: Date,
            default: null,
        },
        // From us-6: End details
        endedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        endReason: {
            type: String,
            enum: ["next_chat", "mutual_end", "timeout", null],
            default: null,
        },
        // From us-6: Embedded messages
        messages: [
            {
                senderId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },
                content: {
                    type: String,
                    default: "",
                    trim: true,
                },
                sentAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        // From sprint-2: Expiration logic
        expiresAt: {
            type: Date,
            default: function() {
                // Set expiry to 24 hours from creation
                return new Date(Date.now() + 24 * 60 * 60 * 1000);
            }
        },
        // From sprint-2: Save functionality
        savedByUsers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        isSaved: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true,
    }
);

// Indexes
// Merged: Index for finding active chats (using status instead of active boolean)
chatSessionSchema.index({ participants: 1, status: 1 });

// From sprint-2: Auto-expire chat sessions after 24 hours unless saved
chatSessionSchema.index({ expiresAt: 1 }, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { isSaved: false }
});

// Virtual field for backward compatibility with tests expecting 'active' field
chatSessionSchema.virtual('active').get(function() {
  return this.status === 'active';
});

chatSessionSchema.virtual('active').set(function(value) {
  this.status = value ? 'active' : 'ended';
});

// Ensure virtuals are included in JSON output
chatSessionSchema.set('toJSON', { virtuals: true });
chatSessionSchema.set('toObject', { virtuals: true });

export default mongoose.model("ChatSession", chatSessionSchema);