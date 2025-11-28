// @ts-nocheck
import dotenv from "dotenv";
import mongoose from "mongoose";
import { EscrowTransaction, EscrowAccount } from "../models/Escrow";
import { Subscription } from "../models/Subscription";
import { RevenueSource } from "../models/RevenueSource";
import { LandlordBalance } from "../models/LandlordBalance";
import { Payment } from "../models/Payment";

dotenv.config();

async function clearEscrowAndSubscriptions() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI not defined");
  }

  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB");

  const escrowDeleted = await EscrowTransaction.deleteMany({});
  console.log(`🗑️  Deleted ${escrowDeleted.deletedCount} escrow transaction(s)`);

  const escrowAccount = await EscrowAccount.findOne({ accountType: "main" });
  if (escrowAccount) {
    escrowAccount.totalHeld = 0;
    escrowAccount.totalDistributed = 0;
    escrowAccount.totalLandlordPayouts = 0;
    escrowAccount.totalKhayalamiPayouts = 0;
    escrowAccount.totalTransactions = 0;
    escrowAccount.pendingTransactions = 0;
    escrowAccount.distributedTransactions = 0;
    escrowAccount.monthlyHeld = [];
    await escrowAccount.save();
    console.log("♻️  Reset escrow account totals");
  } else {
    console.log("ℹ️  No escrow account found to reset");
  }

  const subscriptionsDeleted = await Subscription.deleteMany({});
  console.log(`🗑️  Deleted ${subscriptionsDeleted.deletedCount} subscriptions`);

  const revenueDeleted = await RevenueSource.deleteMany({});
  console.log(`🗑️  Deleted ${revenueDeleted.deletedCount} revenue sources`);

  const paymentsDeleted = await Payment.deleteMany({ paymentType: { $in: ["service", "rent", "deposit", "utility", "other"] } });
  console.log(`🗑️  Deleted ${paymentsDeleted.deletedCount} payments`);

  const balances = await LandlordBalance.updateMany(
    {},
    {
      $set: {
        availableBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
        transactions: [],
        stats: {
          totalPaymentsReceived: 0,
          totalRentCollected: 0,
          totalDepositsCollected: 0,
          averageMonthlyIncome: 0
        }
      }
    }
  );
  console.log(`♻️  Reset ${balances.matchedCount} landlord balances`);

  await mongoose.disconnect();
  console.log("✅ Disconnected from MongoDB");
}

clearEscrowAndSubscriptions()
  .then(() => {
    console.log("✅ Script completed");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });


