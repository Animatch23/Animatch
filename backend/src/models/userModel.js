import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  // Existing user fields would be here
  email: {
    type: String,
    required: true,
    unique: true
  },
  // Add terms and conditions acceptance fields
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