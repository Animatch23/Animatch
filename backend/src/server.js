import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import cron from 'node-cron';
import { expireChats } from './controllers/cronController.js';
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import connectDB from "./config/db.js";

// ... (routes imports)

// ... (middleware and routes setup)

// Cron job from sprint-2
cron.schedule('0 * * * *', () => {
  console.log('Running scheduled hourly check for chat expiry...');
  expireChats();
});

// Server startup function
export const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Database connected successfully!');
    
    const PORT = process.env.PORT || 5000;
    
    // Combined logging
    console.log('\n🌐 CORS CONFIGURATION:');
    console.log(`  Allowed Origins (${allowedOrigins.length}):`);
    allowedOrigins.forEach(origin => console.log(`    - ${origin}`));
    
    const server = httpServer.listen(PORT, '0.0.0.0', () => {
      console.log('\n');
      console.log('╔═══════════════════════════════════════════════════════════════════╗');
      console.log('║              🚀 ANIMATCH BACKEND STARTING 🚀                      ║');
      console.log('╚═══════════════════════════════════════════════════════════════════╝');
      console.log(`║  ✅ SERVER IS LIVE ON PORT ${PORT}                               ║`);
      console.log('║  🌐 Listening on 0.0.0.0 (accepting all connections)              ║');
      console.log(`║  🕐 Started at: ${new Date().toISOString()}                  ║`);
      console.log('╚═══════════════════════════════════════════════════════════════════╝');
      console.log('\n👀 Waiting for incoming requests...\n');
    });
    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Start server if not in test mode
if (process.env.NODE_ENV !== "test") {
  startServer();
}

export default app;
export { httpServer, io };