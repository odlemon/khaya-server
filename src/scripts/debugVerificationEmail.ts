/**
 * Debug verification email delivery for a user.
 *
 * Usage:
 *   npx ts-node src/scripts/debugVerificationEmail.ts nyashakarata1@gmail.com
 */

// @ts-nocheck
import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/User";
import { EmailVerification } from "../models/EmailVerification";
import { EmailVerificationService } from "../services/EmailVerificationService";
import { emailTransport, verifyEmailConnection, emailConfig } from "../config/emailConfig";

dotenv.config();

const email = (process.argv[2] || "").trim().toLowerCase();

async function main() {
  if (!email) {
    console.error("Usage: npx ts-node src/scripts/debugVerificationEmail.ts user@example.com");
    process.exit(1);
  }

  console.log("=== EMAIL DEBUG ===\n");
  console.log("Target:", email);
  console.log("SMTP host:", emailConfig.smtp.host);
  console.log("From:", emailConfig.fromAddress);
  console.log("NODE_ENV:", process.env.NODE_ENV || "(not set)");
  console.log("");

  // Step 1: SMTP connection
  console.log("Step 1: Testing SMTP connection...");
  const smtpOk = await verifyEmailConnection();
  if (!smtpOk) {
    console.error("\n❌ SMTP connection failed — emails cannot be sent until this is fixed.");
    process.exit(1);
  }
  console.log("");

  // Step 2: User lookup
  console.log("Step 2: Looking up user in database...");
  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI not set");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  const user = await User.findOne({ email }).lean();
  if (!user) {
    console.error(`❌ No user found for ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log("✅ User found:");
  console.log(`   Name: ${user.firstName} ${user.lastName}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   isVerified: ${user.isVerified}`);
  console.log(`   isActive: ${user.isActive}`);
  console.log(`   Created: ${user.createdAt}`);
  console.log("");

  const existingVerifs = await EmailVerification.find({ email })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
  console.log(`Existing verification records (last 5): ${existingVerifs.length}`);
  for (const v of existingVerifs) {
    const expired = new Date(v.expiresAt) < new Date();
    console.log(
      `   - pin=${v.pin} used=${v.isUsed} expired=${expired} created=${v.createdAt} expires=${v.expiresAt}`
    );
  }
  console.log("");

  // Step 3: Send verification email
  console.log("Step 3: Attempting to send verification email...");
  try {
    const result = await EmailVerificationService.sendVerificationEmail({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });

    console.log("\n✅ Verification email send reported SUCCESS");
    console.log(`   PIN (for testing): ${result.pin}`);
    console.log(`   Expires at: ${result.expiresAt.toISOString()}`);
    console.log("\nIf the user still does not receive it, check:");
    console.log("  - Spam/junk folder");
    console.log("  - ZeptoMail dashboard for delivery/bounce logs");
    console.log("  - That noreply@khayalami.co.zw is verified in ZeptoMail");
  } catch (err: any) {
    console.error("\n❌ Verification email send FAILED");
    console.error("   Message:", err?.message);
    console.error("   Code:", err?.code);
    console.error("   Response:", err?.response);
    console.error("   ResponseCode:", err?.responseCode);
    if (err?.stack) console.error("\nStack:", err.stack);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
