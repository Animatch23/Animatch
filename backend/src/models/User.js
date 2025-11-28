import mongoose from "mongoose";

const profilePictureSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true
    },
    isBlurred: {
        type: Boolean,
        default: true
    }
}, { _id: false });

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true
    },
    profilePicture: {
        type: profilePictureSchema,
        default: null    
    },
    course: {
        type: String,
        default: ""
    },
    housing: {
        type: String,
        default: ""
    },
    organizations: {
        type: [String],
        default: []
    },
    interests: {
        type: [String],
        default: []
    },
    termsAccepted: {
        type: Boolean,
        default: false
    },
    termsAcceptedDate: {
        type: Date,
        default: null
    },
    termsAcceptedVersion: {
        type: String,
        default: null
    },
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // US-15: Gamification - Streaks and Badges
    currentStreak: {
        type: Number,
        default: 0
    },
    maxStreak: {
        type: Number,
        default: 0
    },
    lastActiveDate: {
        type: Date,
        default: null
    },
    totalMessages: {
        type: Number,
        default: 0
    },
    totalMatches: {
        type: Number,
        default: 0
    },
    uniqueMatchCount: {
        type: Number,
        default: 0
    },
    badges: [{
        type: String // Badge IDs like 'first_match', 'streak_7', etc.
    }],
    badgeEarnedDates: {
        type: Map,
        of: Date,
        default: {}
    },
    // US-19: Content moderation tracking
    flagCount: {
        type: Number,
        default: 0
    },
    warningCount: {
        type: Number,
        default: 0
    },
    isSuspended: {
        type: Boolean,
        default: false
    },
    suspendedUntil: {
        type: Date,
        default: null
    }
}, { 
    timestamps: true 
});

const User = mongoose.model("User", userSchema);
export default User;