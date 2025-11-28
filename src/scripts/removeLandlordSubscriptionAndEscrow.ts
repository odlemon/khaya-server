// @ts-nocheck
import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../models/User";
import { Subscription } from "../models/Subscription";
import { EscrowTransaction } from "../models/Escrow";
import { Payment } from "../models/Payment";

dotenv.config();

const LANDLORD_EMAIL = "farainyariechimoto@gmail.com";

async function cleanupLandlordSubscription() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI must be set");
  }

  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB");

  const landlord = await User.findOne({ email: LANDLORD_EMAIL });
  if (!landlord) {
    console.log("⚠️  Landlord not found");
    await mongoose.disconnect();
    return;
  }

  const subscriptions = await Subscription.find({ tenantId: landlord._id });
  if (subscriptions.length === 0) {
    console.log("ℹ️  No subscriptions found for landlord");
  } else {
    const subIds = subscriptions.map(s => s._id);
    await Subscription.deleteMany({ _id: { $in: subIds } });
    console.log(`🗑️  Deleted ${subIds.length} subscription(s)`);
  }

  const payments = await Payment.find({
    landlordId: landlord._id,
    paymentType: "service"
  });
  if (payments.length > 0) {
    const paymentIds = payments.map(p => p._id);
    await Payment.deleteMany({ _id: { $in: paymentIds } });
    console.log(`🗑️  Deleted ${paymentIds.length} related payment(s)`);
  } else {
    console.log("ℹ️  No service payments found for landlord");
  }

  const escrowResult = await EscrowTransaction.deleteMany({
    landlordId: landlord._id,
    paymentId: { $in: payments.map(p => p._id) }
  });
  console.log(`🗑️  Deleted ${escrowResult.deletedCount} escrow transaction(s)`);

  await mongoose.disconnect();
  console.log("✅ Disconnected from MongoDB");
}

cleanupLandlordSubscription()
  .then(() => {
    console.log("✅ Cleanup script complete");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Cleanup script failed", error);
    process.exit(1);
  });


