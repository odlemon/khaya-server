/**
 * Manually mark users as email-verified so they can log in.
 *
 * Usage:
 *   npx ts-node src/scripts/manualVerifyUsers.ts email1@example.com email2@example.com
 */

// @ts-nocheck
import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../models/User";

dotenv.config();

const emails = process.argv.slice(2).map((e) => e.trim().toLowerCase());

async function main() {
  if (!emails.length) {
    console.error("Usage: npx ts-node src/scripts/manualVerifyUsers.ts user@example.com ...");
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set");
  }

  await mongoose.connect(mongoUri);
  const dbName = mongoose.connection.db?.databaseName;
  console.log(`✅ Connected to MongoDB (database: ${dbName})\n`);

  for (const email of emails) {
    const before = await User.findOne({ email }).lean();
    if (!before) {
      console.log(`⚠️  Not found: ${email}`);
      continue;
    }

    console.log(`--- ${email} ---`);
    console.log(`   Before: isVerified=${before.isVerified}, isActive=${before.isActive}`);

    const result = await User.updateOne(
      { email },
      { $set: { isVerified: true, isActive: true } }
    );

    const after = await User.findOne({ email }).lean();
    console.log(`   Updated: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
    console.log(`   After:  isVerified=${after?.isVerified}, isActive=${after?.isActive}`);

    if (after?.isVerified && after?.isActive) {
      console.log(`   ✅ Ready to log in (${before.firstName} ${before.lastName}, ${before.role})\n`);
    } else {
      console.log(`   ❌ Update may have failed — check manually\n`);
    }
  }

  await mongoose.disconnect();
  console.log("✅ Done");
}

main().catch((err) => {
  console.error("❌ Failed:", err.message || err);
  process.exit(1);
});
