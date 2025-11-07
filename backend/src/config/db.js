import mongoose from "mongoose";

let connected = false;

const connectDB = async () => {
  if (connected) return;
  if (process.env.JEST_WORKER_ID) {
    connected = true;
    return;
  }
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.warn("MongoDB URI missing (tests may mock DB).");
    connected = true;
    return;
  }
  await mongoose.connect(uri);
  connected = true;
  console.log("MongoDB Connected");
};

export default connectDB;