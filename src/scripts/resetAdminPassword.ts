/**
 * Reset Admin Password Script
 * 
 * Run this script to reset the admin password:
 * npx ts-node src/scripts/resetAdminPassword.ts
 */

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { User } from "../models/User";
import dotenv from "dotenv";

dotenv.config();

const ADMIN_EMAIL = "admin@khaya.com";
const NEW_PASSWORD = "Admin@123456";

async function resetAdminPassword() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error("❌ MONGODB_URI environment variable is not set");
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Find admin user
    const admin = await User.findOne({ email: ADMIN_EMAIL });
    
    if (!admin) {
      console.error("❌ Admin user not found!");
      console.log("💡 Run 'npm run seed:admin' first to create the admin account");
      return;
    }

    // Update password (will be hashed by the pre-save hook)
    admin.password = NEW_PASSWORD;
    admin.role = "admin"; // Ensure role is admin
    admin.isVerified = true; // Ensure verified
    admin.isActive = true; // Ensure active
    await admin.save();

    console.log("\n✅ Admin password reset successfully!");
    console.log("\n📧 Updated Credentials:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Email:    ", ADMIN_EMAIL);
    console.log("Password: ", NEW_PASSWORD);
    console.log("Role:     ", admin.role);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n💡 Try logging in again with these credentials");

    // Test the password
    const isMatch = await bcrypt.compare(NEW_PASSWORD, admin.password);
    console.log("\n🔐 Password verification:", isMatch ? "✅ VALID" : "❌ INVALID");

  } catch (error) {
    console.error("❌ Error resetting password:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

// Run the reset function
resetAdminPassword();

