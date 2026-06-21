/**
 * Try multiple ContiPay auth variants against acquire/payment.
 * npx ts-node src/scripts/testContipayAuthVariants.ts
 */
// @ts-nocheck
import axios from "axios";
import https from "https";

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const API_USER = "T09RdjB1RWZWc014cHIrMittZmxFdz09";
const API_SECRET = "44536e06-9ff0-4734-a88c-b71a61ee069c";
const MERCHANT_ID = 871;

const bases = [
  "https://api2-test.contipay.co.zw",
  "https://api-v2.contipay.co.zw",
];

function minimalPayload(ref: string) {
  return {
    customer: {
      nationalId: "00000000",
      firstName: "Test",
      middleName: "",
      surname: "User",
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
      description: "Auth test",
      amount: 1,
      webhookUrl: "https://khayamanage.co.zw/api/backend/webhooks/contipay",
      successUrl: "https://khayamanage.co.zw/payment/success",
      cancelUrl: "https://khayamanage.co.zw/payment/cancel",
    },
    accountDetails: { accountNumber: "0771234567", accountName: "Test User" },
  };
}

async function tryRequest(label: string, base: string, config: any) {
  const ref = `AUTH-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  try {
    const res = await axios.post(`${base}/acquire/payment`, minimalPayload(ref), {
      ...config,
      timeout: 60000,
      validateStatus: () => true,
      httpsAgent,
    });
    const msg = res.data?.message || res.data?.status || JSON.stringify(res.data).slice(0, 120);
    const ok = res.status >= 200 && res.status < 300 && res.data?.status !== "Error";
    console.log(`${ok ? "✅" : "❌"} [${label}] @ ${base} → HTTP ${res.status} | ${msg}`);
    if (ok) console.log("   full:", JSON.stringify(res.data));
    return ok;
  } catch (e: any) {
    console.log(`❌ [${label}] @ ${base} → ${e.message}`);
    return false;
  }
}

async function main() {
  const variants = [
    ["basic user=API_USER secret=API_SECRET", { auth: { username: API_USER, password: API_SECRET } }],
    ["basic SWAPPED", { auth: { username: API_SECRET, password: API_USER } }],
    ["Bearer API_USER", { headers: { Authorization: `Bearer ${API_USER}` } }],
    ["Bearer API_SECRET", { headers: { Authorization: `Bearer ${API_SECRET}` } }],
    ["header X-API-KEY user + X-API-SECRET", { headers: { "X-API-KEY": API_USER, "X-API-SECRET": API_SECRET } }],
    ["header Authorization Token user", { headers: { Authorization: `Token ${API_USER}` } }],
  ];

  for (const base of bases) {
    console.log(`\n--- ${base} ---`);
    for (const [label, cfg] of variants) {
      await tryRequest(label, base, {
        headers: { Accept: "application/json", "Content-Type": "application/json", ...(cfg.headers || {}) },
        auth: cfg.auth,
      });
    }
  }
}

main();
