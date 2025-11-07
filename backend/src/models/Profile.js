import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    pictureUrl: { type: String },
    isBlurred: { type: Boolean, default: true },
    // Interest-based matchmaking fields
    interests: {
        course: { type: String, default: null }, // e.g., "Computer Science", "Engineering"
        dorm: { type: String, default: null }, // e.g., "Dorm A", "Off-campus"
        organizations: { type: [String], default: [] } // e.g., ["Anime Club", "Gaming Society"]
    }
}, { timestamps: true });

export default mongoose.model("Profile", profileSchema);
