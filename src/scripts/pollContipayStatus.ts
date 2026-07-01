// @ts-nocheck
import axios from "axios";
import https from "https";
import dotenv from "dotenv";
import { contipayConfig } from "../config/contipayConfig";

dotenv.config();

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function poll(reference: string) {
  const url = `${contipayConfig.getBaseUrl()}/acquire/payment`;
  console.log("Polling:", url, "ref:", reference);

  for (let i = 1; i <= 15; i++) {
    const res = await axios.get(url, {
      params: { merchantId: contipayConfig.merchantId, merchantRef: reference },
      auth: { username: contipayConfig.apiUser, password: contipayConfig.apiSecret },
      headers: { Accept: "application/json" },
      validateStatus: () => true,
      httpsAgent,
    });

    console.log(`\n--- Poll ${i} (HTTP ${res.status}) ---`);
    console.log(JSON.stringify(res.data, null, 2));

    const txStatus = res.data?.transaction?.status || res.data?.status;
    if (/paid|success/i.test(String(txStatus))) {
      console.log("\n✅ Payment completed");
      return;
    }
    if (/fail|cancel|reject|timeout/i.test(String(txStatus))) {
      console.log("\n❌ Payment failed");
      return;
    }

    await new Promise((r) => setTimeout(r, 5000));
  }

  console.log("\n⏳ Still pending after polls");
}

const ref = process.argv[2];
if (!ref) {
  console.error("Usage: npx ts-node src/scripts/pollContipayStatus.ts <merchantRef>");
  process.exit(1);
}

poll(ref).catch((e) => {
  console.error(e.message);
  process.exit(1);
});
