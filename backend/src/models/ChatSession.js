import mongoose from "mongoose";

const ChatSessionSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  active: {
    type: Boolean,
    default: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  },
  // Metadata for interest-based matchmaking tracking
  metadata: {
    matchingStrategy: { 
      type: String, 
      enum: ['similarity-based', 'random-fallback', 'legacy'],
      default: 'legacy' 
    },
    similarityScore: { 
      type: Number, 
      default: 0 
    },
    matchedAt: { 
      type: Date, 
      default: Date.now 
    }
  }
});

export default mongoose.model("ChatSession", ChatSessionSchema);