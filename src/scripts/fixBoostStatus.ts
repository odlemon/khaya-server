// @ts-nocheck
import mongoose from "mongoose";
import { RevenueSource } from "../models/RevenueSource";
import { Payment } from "../models/Payment";
import { dbConnection } from "../utils/database";

async function fixBoostStatus() {
  try {
    await dbConnection.connect();
    
    // Find the specific boost
    const boost = await RevenueSource.findById("6921cc118809adbf0a38cb10");
    
    if (!boost) {
      console.log("Boost not found");
      return;
    }

    // Check if payment was in-app
    if (boost.paymentId) {
      const payment = await Payment.findById(boost.paymentId);
      if (payment && payment.paymentMethod === "in_app" && payment.status === "verified") {
        boost.status = "collected";
        await boost.save();
        console.log("✅ Boost status updated to 'collected'");
      } else {
        console.log("⚠️ Payment is not in-app or not verified");
      }
    } else {
      console.log("⚠️ No payment linked to boost");
    }

    // Also fix any other pending boosts that are from in-app payments
    const pendingBoosts = await RevenueSource.find({
      sourceType: "premium_boost",
      status: "pending"
    }).populate("paymentId");

    let fixedCount = 0;
    for (const pendingBoost of pendingBoosts) {
      if (pendingBoost.paymentId) {
        const payment = pendingBoost.paymentId as any;
        if (payment.paymentMethod === "in_app" && payment.status === "verified") {
          pendingBoost.status = "collected";
          await pendingBoost.save();
          fixedCount++;
        }
      }
    }

    if (fixedCount > 0) {
      console.log(`✅ Fixed ${fixedCount} additional pending boosts from in-app payments`);
    }

    await dbConnection.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

fixBoostStatus();







