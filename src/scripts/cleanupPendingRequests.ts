// @ts-nocheck
import dotenv from "dotenv";
import mongoose from "mongoose";
import { PaymentRequest } from "../models/PaymentRequest";
import { Payment } from "../models/Payment";
import { EscrowTransaction } from "../models/Escrow";
import { RevenueSource } from "../models/RevenueSource";

dotenv.config();

async function cleanupPending() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI not set");
  }

  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB");

  const pendingRequests = await PaymentRequest.find({
    status: "pending_admin_approval"
  });

  if (pendingRequests.length === 0) {
    console.log("ℹ️  No pending payment requests to remove");
  } else {
    for (const request of pendingRequests) {
      if (request.paymentId) {
        await Payment.deleteOne({ _id: request.paymentId });
        await EscrowTransaction.deleteMany({ paymentId: request.paymentId });
        await RevenueSource.deleteMany({
          paymentId: request.paymentId.toString()
        });
      }
      await request.deleteOne();
      console.log(`🗑️  Removed payment request ${request._id}`);
    }
  }

  await mongoose.disconnect();
  console.log("✅ Disconnected from MongoDB");
}

cleanupPending()
  .then(() => {
    console.log("✅ Finished cleanup");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Cleanup failed", error);
    process.exit(1);
  });


