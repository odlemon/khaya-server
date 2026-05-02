/**
 * Hard delete a user and directly-related records by email.
 *
 * Usage:
 *   npx ts-node src/scripts/hardDeleteUserByEmail.ts chipochimoto@gmail.com
 *
 * Requires:
 *   MONGODB_URI in environment (.env)
 */

// @ts-nocheck

import mongoose from "mongoose";
import dotenv from "dotenv";

import { User } from "../models/User";
import { EmailVerification } from "../models/EmailVerification";
import { TwoFactorAuth } from "../models/TwoFactorAuth";
import { Favorite } from "../models/Favorite";
import { LandlordOnboarding, TenantOnboarding } from "../models/Onboarding";
import { LandlordPreferences } from "../models/LandlordPreferences";
import { Subscription } from "../models/Subscription";
import { RentalReminder } from "../models/RentalReminder";
import { ServiceReminder } from "../models/ServiceReminder";

dotenv.config();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function main() {
  const inputEmail = process.argv[2];
  if (!inputEmail) {
    console.error("❌ Please provide an email address.");
    console.error("   Example: npx ts-node src/scripts/hardDeleteUserByEmail.ts user@example.com");
    process.exit(1);
  }

  const email = normalizeEmail(inputEmail);

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("❌ MONGODB_URI environment variable is not set");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`✅ No user found for ${email} (nothing to delete).`);
      return;
    }

    const userId = user._id;

    // Delete auth/verification artifacts keyed by email and/or userId
    const deletions = await Promise.all([
      EmailVerification.deleteMany({ email }),
      TwoFactorAuth.deleteMany({ $or: [{ email }, { userId }] }),

      // User-linked supporting collections
      Favorite.deleteMany({ userId }),
      LandlordOnboarding.deleteMany({ userId }),
      TenantOnboarding.deleteMany({ userId }),
      LandlordPreferences.deleteMany({ landlordId: userId }),
      Subscription.deleteMany({ tenantId: userId }),
      RentalReminder.deleteMany({ tenantId: userId }),
      ServiceReminder.deleteMany({ $or: [{ tenantId: userId }, { landlordId: userId }] }),
    ]);

    // Finally delete the user record
    await User.deleteOne({ _id: userId });

    const labels = [
      "EmailVerification",
      "TwoFactorAuth",
      "Favorite",
      "LandlordOnboarding",
      "TenantOnboarding",
      "LandlordPreferences",
      "Subscription",
      "RentalReminder",
      "ServiceReminder",
    ];

    console.log(`✅ Hard-deleted user: ${email} (${userId.toString()})`);
    labels.forEach((label, idx) => {
      console.log(`  - ${label}: deleted ${deletions[idx].deletedCount ?? 0}`);
    });
    console.log("  - User: deleted 1");

    console.log(
      "\n⚠️ Note: Other documents may still reference this userId (e.g. Agreements, Rentals, Chats). " +
        "Those are not automatically removed by this script."
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("❌ Hard delete failed:", err);
  process.exitCode = 1;
});

