// @ts-nocheck
import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../models/User";
import { Subscription } from "../models/Subscription";
import { Payment } from "../models/Payment";
import { EscrowTransaction } from "../models/Escrow";
import { RevenueSource } from "../models/RevenueSource";
import { Agreement } from "../models/Agreement";
import { Rental } from "../models/Rental";
import { PaymentRequest } from "../models/PaymentRequest";

dotenv.config();

const TARGET_EMAILS = [
  "farainyariechimoto@gmail.com",
  "brookechimoto@gmail.com"
];

async function massCleanup() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }
  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");

  const users = await User.find({ email: { $in: TARGET_EMAILS } });
  if (users.length === 0) {
    console.log("ℹ️  No target users found");
    await mongoose.disconnect();
    return;
  }

  const userIds = users.map(u => u._id);

  const subscriptionsDeleted = await Subscription.deleteMany({
    $or: [{ tenantId: { $in: userIds } }, { landlordId: { $in: userIds } }]
  });
  console.log(`🗑️  Deleted ${subscriptionsDeleted.deletedCount} subscription(s)`);

  const payments = await Payment.find({
    $or: [{ tenantId: { $in: userIds } }, { landlordId: { $in: userIds } }]
  });
  const paymentIds = payments.map(p => p._id);
  if (paymentIds.length > 0) {
    await Payment.deleteMany({ _id: { $in: paymentIds } });
    console.log(`🗑️  Deleted ${paymentIds.length} payment(s)`);
  }

  const escrowDeleted = await EscrowTransaction.deleteMany({
    $or: [
      { paymentId: { $in: paymentIds } },
      { tenantId: { $in: userIds } },
      { landlordId: { $in: userIds } }
    ]
  });
  console.log(`🗑️  Deleted ${escrowDeleted.deletedCount} escrow transaction(s)`);

  const revenueDeleted = await RevenueSource.deleteMany({
    $or: [
      { payerId: { $in: userIds } },
      { recipientId: { $in: userIds } },
      { paymentId: { $in: paymentIds } }
    ]
  });
  console.log(`🗑️  Deleted ${revenueDeleted.deletedCount} revenue source(s)`);

  const paymentRequestsDeleted = await PaymentRequest.deleteMany({
    $or: [
      { tenantId: { $in: userIds } },
      { landlordId: { $in: userIds } }
    ]
  });
  console.log(`🗑️  Deleted ${paymentRequestsDeleted.deletedCount} payment request(s)`);

  const agreementsDeleted = await Agreement.deleteMany({
    $or: [
      { landlordId: { $in: userIds } },
      { tenantId: { $in: userIds } }
    ]
  });
  console.log(`🗑️  Deleted ${agreementsDeleted.deletedCount} agreement(s)`);

  const rentalsDeleted = await Rental.deleteMany({
    $or: [
      { landlordId: { $in: userIds } },
      { tenantId: { $in: userIds } }
    ]
  });
  console.log(`🗑️  Deleted ${rentalsDeleted.deletedCount} rental(s)`);

  await mongoose.disconnect();
  console.log("✅ Disconnected from MongoDB");
}

massCleanup()
  .then(() => {
    console.log("✅ Mass cleanup finished");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Mass cleanup failed", error);
    process.exit(1);
  });


