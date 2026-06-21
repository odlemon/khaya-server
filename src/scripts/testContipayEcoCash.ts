/**
 * Test ContiPay EcoCash acquire/payment (direct USSD push).
 *
 * Usage:
 *   npx ts-node src/scripts/testContipayEcoCash.ts [phone] [amount]
 *
 * Example:
 *   npx ts-node src/scripts/testContipayEcoCash.ts 0771234567 1
 */

// @ts-nocheck

import axios from "axios";
import https from "https";
import { contipayConfig } from "../config/contipayConfig";
import { normalizeEcoCashPhone } from "../services/ContipayService";

/** ContiPay test host sometimes has chain issues — allow for sandbox testing only */
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function main() {
  const phoneArg = process.argv[2] || "0771234567";
  const amount = parseFloat(process.argv[3] || "1");
  const cell = normalizeEcoCashPhone(phoneArg);
  const reference = `TEST-${Date.now()}`;

  const payload = {
    customer: {
      nationalId: "00000000",
      firstName: "Khayalami",
      middleName: "",
      surname: "Test",
      email: "test@khayalami.co.zw",
      cell,
      countryCode: "ZW",
    },
    transaction: {
      providerCode: "EC",
      providerName: "EcoCash",
      currencyCode: contipayConfig.currency,
      merchantId: contipayConfig.merchantId,
      reference,
      description: `Khayalami test payment ${reference}`,
      amount,
      webhookUrl: contipayConfig.webhookUrl,
      successUrl: contipayConfig.successUrl,
      cancelUrl: contipayConfig.cancelUrl,
    },
    accountDetails: {
      accountNumber: cell,
      accountName: "Khayalami Test",
    },
  };

  const url = `${contipayConfig.getBaseUrl()}${contipayConfig.acquirePath}`;

  console.log("\n=== ContiPay EcoCash Test ===");
  console.log("Environment:", contipayConfig.environment);
  console.log("Base URL:", contipayConfig.getBaseUrl());
  console.log("Endpoint:", url);
  console.log("Merchant ID:", contipayConfig.merchantId);
  console.log("Reference:", reference);
  console.log("Phone:", cell);
  console.log("Amount:", amount, contipayConfig.currency);
  console.log("API User:", contipayConfig.apiUser.slice(0, 8) + "...");
  console.log("\nPayload:", JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(url, payload, {
      auth: {
        username: contipayConfig.apiUser,
        password: contipayConfig.apiSecret,
      },
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: 90000,
      validateStatus: () => true,
      httpsAgent,
    });

    console.log("\n=== Response ===");
    console.log("HTTP Status:", response.status);
    console.log("Body:", JSON.stringify(response.data, null, 2));

    if (response.status >= 200 && response.status < 300) {
      const data = response.data;
      const failed =
        data?.status === "Error" ||
        data?.success === false ||
        (typeof data?.message === "string" &&
          /fail|error|invalid|denied/i.test(data.message) &&
          !/check your phone|ussd|prompt|initiated|pending|success/i.test(data.message));

      if (failed) {
        console.error("\n❌ Gateway returned error in body");
        process.exitCode = 1;
      } else {
        console.log("\n✅ Payment initiation accepted — check phone for EcoCash USSD prompt");
      }
    } else {
      console.error("\n❌ HTTP error from ContiPay");
      process.exitCode = 1;
    }
  } catch (err: any) {
    console.error("\n❌ Request failed:", err.message);
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Body:", JSON.stringify(err.response.data, null, 2));
    }
    process.exitCode = 1;
  }
}

main();
