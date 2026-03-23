// @ts-nocheck
/**
 * Paynow Payment Gateway Configuration
 * All Paynow credentials and URLs are configured via environment variables.
 *
 * Test vs Live: Use PAYNOW_ENVIRONMENT=test for test mode. Test/live is also
 * determined by which integration keys you use (test keys from Paynow dashboard = test mode).
 */

export const paynowConfig = {
  integrationId: process.env.PAYNOW_INTEGRATION_ID || "",
  integrationKey: process.env.PAYNOW_INTEGRATION_KEY || "",
  resultUrl: process.env.PAYNOW_RESULT_URL || `http://localhost:${process.env.PORT || 3001}/api/webhooks/paynow`,
  returnUrl: process.env.PAYNOW_RETURN_URL || `http://localhost:${process.env.PORT || 3001}/payment/return`,
  merchantEmail: process.env.PAYNOW_MERCHANT_EMAIL || "",

  /**
   * Environment: "test" or "production".
   * Defaults to "test" so you must explicitly set production when going live.
   */
  environment: (process.env.PAYNOW_ENVIRONMENT || "test").toLowerCase() === "production" ? "production" : "test",

  isConfigured(): boolean {
    return !!(this.integrationId && this.integrationKey && this.merchantEmail);
  },

  isTestMode(): boolean {
    return this.environment === "test";
  },

  // Payment expiry in minutes (auto-fail pending payments after this)
  paymentExpiryMinutes: 15,

  // Supported mobile money methods
  supportedMethods: ["ecocash", "onemoney"] as const,
};
