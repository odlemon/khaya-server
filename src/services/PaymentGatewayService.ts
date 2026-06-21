// @ts-nocheck
import { paymentGatewayConfig } from "../config/paymentGatewayConfig";
import { paynowService } from "./PaynowService";
import { contipayService } from "./ContipayService";

export interface GatewayInitResult {
  success: boolean;
  gatewayReference?: string;
  pollUrl?: string;
  instructions?: string;
  redirectUrl?: string;
  rawResponse?: any;
  error?: string;
}

type MobileMethod = "ecocash" | "onemoney";

/**
 * Unified payment gateway facade — ContiPay (default) or PayNow (legacy rollback).
 */
class PaymentGatewayService {
  get provider() {
    return paymentGatewayConfig.provider;
  }

  generateReference(prefix: string, userId: string): string {
    if (paymentGatewayConfig.isPaynow()) {
      return paynowService.generateReference(prefix, userId);
    }
    return contipayService.generateReference(prefix, userId);
  }

  async initiateMobilePayment(params: {
    reference: string;
    description: string;
    amount: number;
    phone: string;
    method?: MobileMethod;
    email?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<GatewayInitResult> {
    if (paymentGatewayConfig.isPaynow()) {
      const result = await paynowService.initiateMobilePayment({
        reference: params.reference,
        description: params.description,
        amount: params.amount,
        phone: params.phone,
        method: params.method || "ecocash",
        email: params.email,
      });
      return {
        success: result.success,
        gatewayReference: result.paynowReference || params.reference,
        pollUrl: result.pollUrl,
        instructions: result.instructions,
        redirectUrl: result.redirectUrl,
        error: result.error,
      };
    }

    if (params.method && params.method !== "ecocash") {
      return {
        success: false,
        error: "ContiPay integration currently supports EcoCash only. Set PAYMENT_GATEWAY=paynow for OneMoney.",
      };
    }

    const result = await contipayService.initiateEcoCashPayment({
      reference: params.reference,
      description: params.description,
      amount: params.amount,
      phone: params.phone,
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
    });

    return {
      success: result.success,
      gatewayReference: result.gatewayReference || params.reference,
      instructions: result.instructions,
      rawResponse: result.rawResponse,
      error: result.error,
    };
  }

  async processWebhook(webhookData: any, source: "contipay" | "paynow") {
    if (source === "paynow") {
      return paynowService.processWebhook(webhookData);
    }
    return contipayService.processWebhook(webhookData);
  }

  async pollAndConfirmPayment(paymentId: string, userId: string) {
    if (paymentGatewayConfig.isPaynow()) {
      return paynowService.pollAndConfirmPayment(paymentId, userId);
    }
    return contipayService.pollAndConfirmPayment(paymentId, userId);
  }
}

export const paymentGatewayService = new PaymentGatewayService();
