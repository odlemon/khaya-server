// @ts-nocheck
/**
 * ContiPay Payment Gateway Configuration — TEST credentials hardcoded for dev.
 * https://docs.contipay.co.zw
 */

export const contipayConfig = {
  /** ContiPay API User (HTTP Basic username) */
  apiUser: process.env.CONTIPAY_API_USER || "T09RdjB1RWZWc014cHIrMittZmxFdz09",
  /** ContiPay API Secret (HTTP Basic password) */
  apiSecret: process.env.CONTIPAY_API_SECRET || "b3acf9a3-f122-452e-9a2b-9164c49c90c1",
  merchantId: Number(process.env.CONTIPAY_MERCHANT_ID) || 871,

  /** dev | live — using ContiPay test/sandbox API */
  environment: (process.env.CONTIPAY_ENVIRONMENT || "dev") as "dev" | "live",

  /** Official UAT — https://docs.contipay.co.zw/docs/environments */
  devBaseUrl: process.env.CONTIPAY_DEV_BASE_URL || "https://api-uat.contipay.net",
  liveBaseUrl: process.env.CONTIPAY_LIVE_BASE_URL || "https://api-v2.contipay.co.zw",

  webhookUrl:
    process.env.CONTIPAY_WEBHOOK_URL ||
    "https://khayamanage.co.zw/api/backend/webhooks/contipay",
  successUrl:
    process.env.CONTIPAY_SUCCESS_URL || "https://khayamanage.co.zw/payment/success",
  cancelUrl:
    process.env.CONTIPAY_CANCEL_URL || "https://khayamanage.co.zw/payment/cancel",

  currency: process.env.CONTIPAY_CURRENCY || "USD",
  paymentExpiryMinutes: Number(process.env.CONTIPAY_PAYMENT_EXPIRY_MINUTES) || 15,
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

  /** EcoCash sandbox success number — https://docs.contipay.co.zw/docs/testing */
  sandboxEcoCashPhone: process.env.CONTIPAY_SANDBOX_ECOCASH_PHONE || "0771234567",

  isSandboxMode(): boolean {
    return !this.isLiveMode();
  },

  /**
   * In sandbox/UAT, always use the ContiPay test EcoCash number (ignore user input).
   * In live mode, user phone is required.
   */
  resolveEcoCashPhone(userPhone?: string): string {
    if (this.isSandboxMode()) {
      return this.sandboxEcoCashPhone;
    }
    if (!userPhone?.trim()) {
      throw new Error("Phone number is required for EcoCash payments");
    }
    return userPhone.trim();
  },
};
