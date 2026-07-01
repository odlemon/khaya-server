// @ts-nocheck
/** One-off: re-poll ContiPay and verify a stuck gateway payment */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { contipayService } from "../services/ContipayService";

dotenv.config();

const PAYMENT_ID = process.argv[2] || "6a44c71b323fc7c3575432ca";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;
  const p = await db.collection("payments").findOne({
    _id: new mongoose.Types.ObjectId(PAYMENT_ID),
  });
  if (!p) {
    console.error("Payment not found");
    process.exit(1);
  }

  console.log("Before:", { status: p.status, ref: p.gatewayReference || p.paynowReference });
  const result = await contipayService.pollAndConfirmPayment(
    PAYMENT_ID,
    p.tenantId.toString()
  );
  console.log("Poll result:", JSON.stringify(result, null, 2));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
