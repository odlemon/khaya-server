/**
 * Test ContiPay using official Python SDK URLs + auth format.
 */
// @ts-nocheck
import axios from "axios";
import https from "https";

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const API_KEY = "T09RdjB1RWZWc014cHIrMittZmxFdz09";
const API_SECRET = "44536e06-9ff0-4734-a88c-b71a61ee069c";
const MERCHANT_ID = 871;

const bases = [
  ["api-uat.contipay.net (Python SDK dev)", "https://api-uat.contipay.net"],
  ["api.contipay.net (Python SDK live)", "https://api.contipay.net"],
  ["api2-test.contipay.co.zw (JS SDK dev)", "https://api2-test.contipay.co.zw"],
  ["api-v2.contipay.co.zw (JS SDK live)", "https://api-v2.contipay.co.zw"],
];

function basicHeader(key: string, secret: string) {
  const token = Buffer.from(`${key}:${secret}`).toString("base64");
  return { Authorization: `Basic ${token}`, "Content-Type": "application/json", Accept: "application/json" };
}

function payload(ref: string) {
  return {
    customer: {
      nationalId: "00000000",
      firstName: "Khayalami",
      middleName: "",
      surname: "Test",
      email: "test@khayalami.co.zw",
      cell: "0771234567",
      countryCode: "ZW",
    },
    transaction: {
      providerCode: "EC",
      providerName: "EcoCash",
      currencyCode: "USD",
      merchantId: MERCHANT_ID,
      reference: ref,
      description: "Khayalami test",
      amount: 1,
      webhookUrl: "https://khayamanage.co.zw/api/backend/webhooks/contipay",
      successUrl: "https://khayamanage.co.zw/payment/success",
      cancelUrl: "https://khayamanage.co.zw/payment/cancel",
    },
    accountDetails: { accountNumber: "0771234567", accountName: "Khayalami Test" },
  };
}

async function main() {
  for (const [label, base] of bases) {
    const ref = `TEST-${Date.now()}`;
    try {
      const res = await axios.post(`${base}/acquire/payment`, payload(ref), {
        headers: basicHeader(API_KEY, API_SECRET),
        timeout: 60000,
        validateStatus: () => true,
        httpsAgent,
      });
      console.log(`\n[${label}]`);
      console.log("HTTP", res.status);
      console.log(JSON.stringify(res.data, null, 2));
    } catch (e: any) {
      console.log(`\n[${label}] ERROR:`, e.message);
    }
  }
}

main();
