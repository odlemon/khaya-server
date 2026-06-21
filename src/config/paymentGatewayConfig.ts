// @ts-nocheck
/**
 * Active online payment gateway: contipay (default) or paynow (legacy rollback).
 */
export type PaymentGatewayProvider = "contipay" | "paynow";

export const paymentGatewayConfig = {
  provider: ((process.env.PAYMENT_GATEWAY || "contipay").toLowerCase() === "paynow"
    ? "paynow"
    : "contipay") as PaymentGatewayProvider,

  isContipay(): boolean {
    return this.provider === "contipay";
  },

  isPaynow(): boolean {
    return this.provider === "paynow";
  },
};
