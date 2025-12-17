// @ts-nocheck
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

async function test() {
  try {
    console.log("🚀 Test script starting...");
    console.log("MONGODB_URI exists:", !!process.env.MONGODB_URI);
    
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI!);
      console.log("✅ Connected to MongoDB");
      await mongoose.disconnect();
      console.log("✅ Disconnected from MongoDB");
    } else {
      console.log("❌ MONGODB_URI not found");
    }
    
    console.log("✅ Test completed successfully!");
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

test();

