// @ts-nocheck
import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../models/User";
import { Agreement } from "../models/Agreement";

dotenv.config();

const TARGET_EMAIL = "brookechimoto@gmail.com";

async function resetAgreementPaymentStatus() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined");
  }

  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB");

  const tenant = await User.findOne({ email: TARGET_EMAIL });
  if (!tenant) {
    console.log("⚠️  Tenant not found:", TARGET_EMAIL);
    await mongoose.disconnect();
    return;
  }

  const agreements = await Agreement.find({ tenantId: tenant._id });
  if (agreements.length === 0) {
    console.log("ℹ️  No agreements found for tenant");
    await mongoose.disconnect();
    return;
  }

  for (const agreement of agreements) {
    if (!agreement.tenantSignature) {
      agreement.tenantSignature = {
        paymentStatus: "no_payment"
      } as any;
    } else {
      agreement.tenantSignature.paymentStatus = "no_payment";
    }
    await agreement.save();
    console.log(`♻️  Reset paymentStatus for agreement ${agreement._id}`);
  }

  await mongoose.disconnect();
  console.log("✅ Disconnected from MongoDB");
}

resetAgreementPaymentStatus()
  .then(() => {
    console.log("✅ Script completed");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Script failed", error);
    process.exit(1);
  });


