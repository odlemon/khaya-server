// @ts-nocheck
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Subscription } from "../models/Subscription";
import { LandlordPreferences } from "../models/LandlordPreferences";
import { Agreement } from "../models/Agreement";

dotenv.config();

async function resetAll() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  const subs = await Subscription.deleteMany({});
  console.log(`🗑️  Deleted ${subs.deletedCount} subscription(s)`);

  const preferences = await LandlordPreferences.find({});
  for (const pref of preferences) {
    pref.subscriptionPaymentMethod = "no_subscription";
    pref.premiumFeatures = {
      isSubscribed: false,
      planType: "basic",
      autoRenew: false
    };
    pref.zeroDepositProtection = {
      isSubscribed: false,
      autoRenew: false,
      price: 0,
      coverageAmount: 0
    };
    pref.subscriptionDetails = undefined;
    await pref.save();
  }
  console.log(`♻️  Reset ${preferences.length} landlord preference(s)`);

  const agreements = await Agreement.find({});
  for (const agreement of agreements) {
    if (!agreement.tenantSignature) {
      agreement.tenantSignature = { paymentStatus: "no_payment" } as any;
    } else {
      agreement.tenantSignature.paymentStatus = "no_payment";
    }
    await agreement.save();
  }
  console.log(`♻️  Reset payment status for ${agreements.length} agreement(s)`);

  await mongoose.disconnect();
  console.log("✅ Disconnected from MongoDB");
}

resetAll()
  .then(() => {
    console.log("✅ Script complete");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });


