import mongoose from "mongoose";

let connected = false;

const connectDB = async () => {
  if (connected) return;
  // Skip real connection in Jest to prevent failures
  if (process.env.JEST_WORKER_ID) {
    console.log("Skipping MongoDB connect in test environment");
    connected = true;
    return;
  }
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.warn("MongoDB URI missing. Set MONGODB_URI or MONGO_URI. (Non-fatal)");
    connected = true;
    return;
  }
  try {
    await mongoose.connect(uri, { autoIndex: true, maxPoolSize: 10 });
    console.log("MongoDB connected");
    connected = true;
  } catch (e) {
    console.error("MongoDB connection error:", e.message);
    // Do not exit during tests
    if (!process.env.JEST_WORKER_ID) process.exit(1);
  }
};

export default connectDB;