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
    username: {
        type: String,
        required: true
    },
    profilePicture: {
        type: profilePictureSchema,
        default: null    
    }
});

const User = mongoose.model("User", userSchema);
export default User;