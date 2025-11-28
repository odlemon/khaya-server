// @ts-nocheck
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Payout } from "../models/Escrow";
import { LandlordBalance } from "../models/LandlordBalance";
import { EscrowAccount } from "../models/Escrow";

dotenv.config();

async function resetPayouts() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected");

  const payoutResult = await Payout.deleteMany({});
  console.log(`🗑️ Deleted ${payoutResult.deletedCount} payout(s)`);

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
  console.log(`♻️ Reset ${balances.matchedCount} landlord balance(s)`);

  const account = await EscrowAccount.findOne({ accountType: "main" });
  if (account) {
    account.totalLandlordPayouts = 0;
    account.totalKhayalamiPayouts = 0;
    await account.save();
    console.log("♻️ Reset escrow account payout totals");
  }

  await mongoose.disconnect();
  console.log("✅ Disconnected");
}

resetPayouts()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });


