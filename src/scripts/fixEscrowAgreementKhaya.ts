// @ts-nocheck
import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../models/User";
import { Agreement } from "../models/Agreement";
import { EscrowTransaction } from "../models/Escrow";

dotenv.config();

const TENANT_EMAIL = "brookechimoto@gmail.com";

async function fixEscrowEntry() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable not provided");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  const tenant = await User.findOne({ email: TENANT_EMAIL });
  if (!tenant) {
    console.log("❌ Tenant not found");
    await mongoose.disconnect();
    return;
  }

  const agreement = await Agreement.findOne({ tenantId: tenant._id });
  if (!agreement) {
    console.log("❌ Agreement not found for tenant");
    await mongoose.disconnect();
    return;
  }

  const escrowTransaction = await EscrowTransaction.findOne({ agreementId: agreement._id });
  if (!escrowTransaction) {
    console.log("❌ No escrow transaction tied to agreement");
    await mongoose.disconnect();
    return;
  }

  const total = escrowTransaction.totalAmount || 0;
  escrowTransaction.landlordAmount = 0;
  escrowTransaction.khayalamiAmount = total;
  escrowTransaction.deductions = {
    subscriptionFee: 0,
    processingFee: total,
    insurancePremium: 0,
    totalDeductions: total
  };

  await escrowTransaction.save();
  console.log("✅ Escrow transaction corrected to Khayalami:", escrowTransaction._id);

  await mongoose.disconnect();
  console.log("✅ Disconnected from MongoDB");
}

fixEscrowEntry()
  .then(() => {
    console.log("✅ Script finished");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });


