/**
 * Hard delete a user and all related records by email.
 *
 * Usage:
 *   npx ts-node src/scripts/hardDeleteUserByEmail.ts user@example.com
 *
 * Requires MONGODB_URI in environment (.env)
 */

// @ts-nocheck

import mongoose from "mongoose";
import dotenv from "dotenv";
import { userHardDeleteService } from "../services/UserHardDeleteService";

dotenv.config();

async function main() {
  const inputEmail = process.argv[2];
  if (!inputEmail) {
    console.error("❌ Please provide an email address.");
    console.error("   Example: npx ts-node src/scripts/hardDeleteUserByEmail.ts user@example.com");
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("❌ MONGODB_URI environment variable is not set");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  try {
    const result = await userHardDeleteService.hardDeleteByEmail(inputEmail);

    if (!result.deleted) {
      console.log(`✅ No user found for ${inputEmail.trim().toLowerCase()} (nothing to delete).`);
      return;
    }

    console.log(`\n🗑️  Hard-deleted user: ${result.user.email}`);
    console.log(`   ID: ${result.user.id} | Role: ${result.user.role} | Name: ${result.user.firstName} ${result.user.lastName}\n`);
    console.log("Deleted records:");
    for (const [label, count] of Object.entries(result.deletedCounts)) {
      console.log(`  - ${label}: ${count}`);
    }
    console.log(`\n✅ Fully deleted account and related data for ${result.user.email}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("❌ Hard delete failed:", err);
  process.exitCode = 1;
});
