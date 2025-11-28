// @ts-nocheck
import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../models/User";
import { LandlordPreferences } from "../models/LandlordPreferences";

dotenv.config();

const LANDLORD_EMAIL = "farainyariechimoto@gmail.com";

async function resetLandlordPreferences() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  const landlord = await User.findOne({ email: LANDLORD_EMAIL });
  if (!landlord) {
    console.log("⚠️  No landlord found");
    await mongoose.disconnect();
    return;
  }

  const preferences = await LandlordPreferences.findOne({ landlordId: landlord._id });
  if (!preferences) {
    console.log("ℹ️  No preferences record to reset");
    await mongoose.disconnect();
    return;
  }

  preferences.premiumFeatures = {
    isSubscribed: false,
    planType: "basic",
    autoRenew: false
  };
  preferences.subscriptionDetails = undefined;
  preferences.zeroDepositProtection = {
    isSubscribed: false,
    autoRenew: false
  };
  preferences.subscriptionPaymentMethod = "no_subscription";

  await preferences.save();
  console.log("♻️  Reset landlord preferences and removed subscription flags");

  await mongoose.disconnect();
  console.log("✅ Disconnected from MongoDB");
}

resetLandlordPreferences()
  .then(() => {
    console.log("✅ Script complete");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });


