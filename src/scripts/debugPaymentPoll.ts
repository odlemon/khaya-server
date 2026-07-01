// @ts-nocheck
import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import https from "https";
import { contipayConfig } from "../config/contipayConfig";

dotenv.config();

const PAYMENT_ID = "6a44c71b323fc7c3575432ca";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;
  const p = await db.collection("payments").findOne({ _id: new mongoose.Types.ObjectId(PAYMENT_ID) });
  console.log("DB payment status:", p?.status);
  console.log("gatewayReference:", p?.gatewayReference || p?.paynowReference);
  console.log("amount:", p?.amount, "totalAmount:", p?.totalAmount);
  console.log("createdAt:", p?.createdAt);

  const ref = p?.gatewayReference || p?.paynowReference;
  if (ref) {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const res = await axios.get(`${contipayConfig.getBaseUrl()}/acquire/payment`, {
      params: { merchantId: contipayConfig.merchantId, merchantRef: ref },
      auth: { username: contipayConfig.apiUser, password: contipayConfig.apiSecret },
      validateStatus: () => true,
      httpsAgent: agent,
    });
    console.log("\nContiPay:", JSON.stringify(res.data, null, 2));
  }

  const rentalId = p?.rentalId;
  const recent = await db
    .collection("payments")
    .find({ rentalId })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();
  console.log(
    "\nRecent rental payments:",
    recent.map((x) => ({
      id: x._id,
      status: x.status,
      amount: x.amount,
      ref: x.gatewayReference,
      createdAt: x.createdAt,
    }))
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
