// @ts-nocheck
/**
 * ContiPay Payment Gateway Configuration — TEST credentials hardcoded for dev.
 * https://docs.contipay.co.zw
 */

export const contipayConfig = {
  /** ContiPay API User (HTTP Basic username) */
  apiUser: "T09RdjB1RWZWc014cHIrMittZmxFdz09",
  /** ContiPay API Secret (HTTP Basic password) */
  apiSecret: "44536e06-9ff0-4734-a88c-b71a61ee069c",
  merchantId: 871,

  /** dev | live — using ContiPay test/sandbox API */
  environment: "dev" as "dev" | "live",

  /** Official UAT — https://docs.contipay.co.zw/docs/environments */
  devBaseUrl: "https://api-uat.contipay.net",
  liveBaseUrl: "https://api-v2.contipay.co.zw",

  webhookUrl: "https://khayamanage.co.zw/api/backend/webhooks/contipay",
  successUrl: "https://khayamanage.co.zw/payment/success",
  cancelUrl: "https://khayamanage.co.zw/payment/cancel",

  currency: "USD",
  paymentExpiryMinutes: 15,
  acquirePath: "/acquire/payment",

  isConfigured(): boolean {
    return !!(this.apiUser && this.apiSecret && this.merchantId);
  },

  isLiveMode(): boolean {
    return this.environment === "live";
  },

  getBaseUrl(): string {
    return this.isLiveMode() ? this.liveBaseUrl : this.devBaseUrl;
  },
};
