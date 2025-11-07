import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    pictureUrl: { type: String },
    isBlurred: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("Profile", profileSchema);
