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
    }
}, { 
    timestamps: true 
});

const User = mongoose.model("User", userSchema);
export default User;