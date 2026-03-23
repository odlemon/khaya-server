// @ts-nocheck
/**
 * Enable zero deposit subscription for the landlord who owns "Kundai's House".
 * Sets LandlordPreferences.zeroDepositProtection so zeroDepositSubscriptionActive is true.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Property } from "../models/Property";
import { LandlordPreferences } from "../models/LandlordPreferences";

dotenv.config();

const PROPERTY_TITLE = "Kundai's House";

async function enableZeroDepositForKundaiHouse() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }

  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB\n");

  const property = await Property.findOne({
    title: { $regex: new RegExp(PROPERTY_TITLE, "i") }
  });

  if (!property) {
    console.log(`❌ No property found with title matching "${PROPERTY_TITLE}"`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const landlordId = property.landlordId;
  console.log(`📍 Property: "${property.title}" (id: ${property._id})`);
  console.log(`👤 Landlord ID: ${landlordId}\n`);

  let preferences = await LandlordPreferences.findOne({ landlordId });

  if (!preferences) {
    preferences = new LandlordPreferences({
      landlordId,
      paymentReceptionMethod: "bank_transfer",
      subscriptionPaymentMethod: "no_subscription"
    });
    console.log("ℹ️  Created new LandlordPreferences for this landlord.");
  }

  const now = new Date();
  const startDate = new Date(now);
  const endDate = new Date(now);
  endDate.setFullYear(endDate.getFullYear() + 1);
  const nextBillingDate = new Date(now);
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  preferences.zeroDepositProtection = {
    isSubscribed: true,
    startDate,
    endDate,
    nextBillingDate,
    autoRenew: true,
    price: 10,
    coverageAmount: 500
  };

  await preferences.save();

  console.log("✅ Zero deposit protection enabled for this landlord:");
  console.log("   - isSubscribed: true");
  console.log("   - startDate:", startDate.toISOString());
  console.log("   - endDate:", endDate.toISOString());
  console.log("   - zeroDepositSubscriptionActive will now be true for this property.\n");

  await mongoose.disconnect();
  console.log("✅ Disconnected from MongoDB");
}

enableZeroDepositForKundaiHouse()
  .then(() => {
    console.log("✅ Script complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Script failed:", err);
    process.exit(1);
  });
