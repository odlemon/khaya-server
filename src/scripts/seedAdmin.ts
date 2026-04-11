/**
 * Seed Script - Create Admin User
 * 
 * Run this script to create an admin account:
 * npx ts-node src/scripts/seedAdmin.ts
 */

import mongoose from "mongoose";
import { User } from "../models/User";
import dotenv from "dotenv";

dotenv.config();

const ADMIN_CREDENTIALS = {
  email: "admin@khaya.com",
  password: "Admin@123456",
  firstName: "System",
  lastName: "Admin",
  role: "admin"
};

async function seedAdmin() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error("❌ MONGODB_URI environment variable is not set");
      console.log("💡 Make sure you have a .env file with MONGODB_URI");
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: ADMIN_CREDENTIALS.email });
    if (existingAdmin) {
      console.log("⚠️  Admin user already exists:");
      console.log("   Email:", ADMIN_CREDENTIALS.email);
      console.log("   You can use this account to login.");
      return;
    }

    // Plain password — User model pre-save hook hashes it once
    const admin = await User.create({
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
      firstName: ADMIN_CREDENTIALS.firstName,
      lastName: ADMIN_CREDENTIALS.lastName,
      role: ADMIN_CREDENTIALS.role,
      isVerified: true,
      isActive: true
    });

    console.log("\n✅ Admin user created successfully!");
    console.log("\n📧 Login Credentials:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Email:    ", ADMIN_CREDENTIALS.email);
    console.log("Password: ", ADMIN_CREDENTIALS.password);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n💡 Use these credentials to login to the admin portal");
    console.log("\n🔐 IMPORTANT: Change the password after first login!");

  } catch (error) {
    console.error("❌ Error seeding admin:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

// Run the seed function
seedAdmin();

