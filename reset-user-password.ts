/**
 * Reset User Password Script
 * 
 * Run this script to reset a user's password:
 * npx ts-node reset-user-password.ts
 */

import mongoose from "mongoose";
import { User } from "./src/models/User";
import dotenv from "dotenv";

dotenv.config();

const USER_EMAIL = "nyashakarata1@gmail.com";
const NEW_PASSWORD = "nyasha123";

async function resetUserPassword() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error("❌ MONGODB_URI environment variable is not set");
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Find user
    const user = await User.findOne({ email: USER_EMAIL });
    
    if (!user) {
      console.error(`❌ User with email ${USER_EMAIL} not found!`);
      return;
    }

    // Update password (will be hashed by the pre-save hook)
    user.password = NEW_PASSWORD;
    await user.save();

    console.log("\n✅ User password reset successfully!");
    console.log("\n📧 Updated Credentials:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Email:    ", USER_EMAIL);
    console.log("Password: ", NEW_PASSWORD);
    console.log("Name:     ", `${user.firstName} ${user.lastName}`);
    console.log("Role:     ", user.role);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n💡 The user can now log in with these credentials");

  } catch (error) {
    console.error("❌ Error resetting password:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

// Run the reset function
resetUserPassword();



