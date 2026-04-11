/**
 * Seed insurance and bank portal admin users (same login as Khayalami admin).
 *
 * npx ts-node src/scripts/seedPortalAdmins.ts
 */

import mongoose from "mongoose";
import { User } from "../models/User";
import dotenv from "dotenv";

dotenv.config();

const SHARED_PASSWORD = "Admin@123";

const PORTAL_ADMINS = [
  {
    email: "admin@insurance.com",
    password: SHARED_PASSWORD,
    firstName: "Insurance",
    lastName: "Admin",
    role: "insurance_admin" as const,
  },
  {
    email: "admin@metbank",
    password: SHARED_PASSWORD,
    firstName: "Bank",
    lastName: "Admin",
    role: "bank_admin" as const,
  },
];

async function seedPortalAdmins() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("❌ MONGODB_URI environment variable is not set");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    for (const cred of PORTAL_ADMINS) {
      const email = cred.email.trim().toLowerCase();
      const existing = await User.findOne({ email });
      if (existing) {
        console.log(`⚠️  Already exists (skipped): ${email} (role: ${existing.role})`);
        continue;
      }

      await User.create({
        email,
        password: cred.password,
        firstName: cred.firstName,
        lastName: cred.lastName,
        role: cred.role,
        isVerified: true,
        isActive: true,
      });

      console.log(`✅ Created ${cred.role}: ${email}`);
    }

    console.log("\n📧 Portal admin login (POST /api/auth/login):");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    PORTAL_ADMINS.forEach((c) => {
      console.log(`  ${c.email.trim().toLowerCase()} / ${SHARED_PASSWORD} → role: ${c.role}`);
    });
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("❌ Error seeding portal admins:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

seedPortalAdmins();
