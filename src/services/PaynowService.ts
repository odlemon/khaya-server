// @ts-nocheck
import { Paynow } from "paynow";
import { Payment } from "../models/Payment";
import { paynowConfig } from "../config/paynowConfig";
import { paymentCompletionService } from "./PaymentCompletionService";
import { getPaymentGatewayReference } from "../utils/paymentGatewayFields";
import { logger } from "../utils/logger";

const LOG = (msg: string, ...args: any[]) => logger.info(`[Paynow] ${msg}`, ...args);
const LOG_WARN = (msg: string, ...args: any[]) => logger.warn(`[Paynow] ${msg}`, ...args);
const LOG_ERR = (msg: string, ...args: any[]) => logger.error(`[Paynow] ${msg}`, ...args);

export interface PaynowInitResult {
  success: boolean;
  paymentId?: string;
  pollUrl?: string;
  paynowReference?: string;
  instructions?: string;
  redirectUrl?: string;
  error?: string;
}

export interface PaynowStatusResult {
  success: boolean;
  paid: boolean;
  status: "pending" | "completed" | "failed" | "cancelled";
  error?: string;
}

type MobileMethod = "ecocash" | "onemoney";

class PaynowService {
  private paynow: any;

  constructor() {
    if (paynowConfig.isConfigured()) {
      this.paynow = new Paynow(
        paynowConfig.integrationId,
        paynowConfig.integrationKey
      );
      this.paynow.resultUrl = paynowConfig.resultUrl;
      this.paynow.returnUrl = paynowConfig.returnUrl;
      const mode = paynowConfig.isTestMode() ? "TEST" : "LIVE";
      LOG(`Gateway initialized (${mode} mode). resultUrl=${paynowConfig.resultUrl}`);
    } else {
      LOG_WARN("Not configured - set PAYNOW_INTEGRATION_ID, PAYNOW_INTEGRATION_KEY, PAYNOW_MERCHANT_EMAIL.");
    }
  }

  private ensureConfigured(): void {
    if (!this.paynow) {
      throw new Error("Paynow is not configured. Set PAYNOW_INTEGRATION_ID, PAYNOW_INTEGRATION_KEY, and PAYNOW_MERCHANT_EMAIL in your environment.");
    }
  }

  /**
   * Initiate a mobile money payment (EcoCash / OneMoney).
   * This sends a USSD push to the user's phone.
   */
  async initiateMobilePayment(params: {
    reference: string;
    description: string;
    amount: number;
    phone: string;
    method: MobileMethod;
    email?: string;
  }): Promise<PaynowInitResult> {
    this.ensureConfigured();

    try {
      const { reference, description, amount, phone, method, email } = params;

      const payment = this.paynow.createPayment(
        reference,
        email || paynowConfig.merchantEmail
      );
      payment.add(description, amount);

      LOG(`Initiate mobile: ref=${reference} amount=${amount} phone=${phone} method=${method}`);

      const response = await this.paynow.sendMobile(payment, phone, method);

      if (response.success) {
        LOG(`Initiate mobile OK: ref=${reference} pollUrl=${response.pollUrl || "(none)"}`);
        return {
          success: true,
          pollUrl: response.pollUrl,
          paynowReference: reference,
          instructions: response.instructions || "Please check your phone for payment instructions and enter your PIN to confirm.",
        };
      } else {
        LOG_ERR(`Initiate mobile failed: ref=${reference} error=${response.error}`);
        return {
          success: false,
          error: response.error || "Payment initiation failed",
        };
      }
    } catch (error: any) {
      LOG_ERR(`Initiate mobile exception: ${error.message}`);
      return {
        success: false,
        error: error.message || "Payment gateway error",
      };
    }
  }

  /**
   * Initiate a web-based payment (redirect user to Paynow checkout).
   */
  async initiateWebPayment(params: {
    reference: string;
    description: string;
    amount: number;
    email?: string;
  }): Promise<PaynowInitResult> {
    this.ensureConfigured();

    try {
      const { reference, description, amount, email } = params;

      const payment = this.paynow.createPayment(
        reference,
        email || paynowConfig.merchantEmail
      );
      payment.add(description, amount);

      LOG(`Initiate web: ref=${reference} amount=${amount}`);

      const response = await this.paynow.send(payment);

      if (response.success) {
        LOG(`Initiate web OK: ref=${reference} redirectUrl=${response.redirectUrl || "(none)"}`);
        return {
          success: true,
          pollUrl: response.pollUrl,
          paynowReference: reference,
          redirectUrl: response.redirectUrl,
          instructions: "You will be redirected to Paynow to complete payment.",
        };
      } else {
        LOG_ERR(`Initiate web failed: ref=${reference} error=${response.error}`);
        return {
          success: false,
          error: response.error || "Payment initiation failed",
        };
      }
    } catch (error: any) {
      LOG_ERR(`Initiate web exception: ${error.message}`);
      return {
        success: false,
        error: error.message || "Payment gateway error",
      };
    }
  }

  /**
   * Poll Paynow to check if a payment has been completed.
   */
  async checkPaymentStatus(pollUrl: string): Promise<PaynowStatusResult> {
    this.ensureConfigured();

    try {
      LOG(`Poll status: url=${pollUrl?.substring?.(0, 60) || pollUrl}...`);
      const status = await this.paynow.pollTransaction(pollUrl);
      // SDK returns InitResponse: .success (true when status==="ok"), .status (string from Paynow). No .paid() in InitResponse.
      const statusStr = (status?.status != null ? String(status.status) : "").toLowerCase();
      const paidBySuccess = status?.success === true;
      const paidByStatus = statusStr === "paid" || statusStr === "ok" || statusStr === "completed";
      const paid = paidBySuccess || paidByStatus;
      LOG(`Poll raw: success=${status?.success} status=${statusStr || status?.status} → paid=${paid}`);

      if (paid) {
        LOG(`Poll result: paid=true`);
        return { success: true, paid: true, status: "completed" };
      }

      LOG(`Poll result: paid=false (pending)`);
      return { success: true, paid: false, status: "pending" };
    } catch (error: any) {
      LOG_ERR(`Poll error: ${error.message}`);
      return {
        success: false,
        paid: false,
        status: "pending",
        error: error.message,
      };
    }
  }

  /**
   * Process a Paynow webhook callback.
   * Validates the data and updates the corresponding Payment record.
   * Returns the updated payment if found and processed.
   */
  async processWebhook(webhookData: any): Promise<{
    success: boolean;
    message: string;
    payment?: any;
  }> {
    try {
      const { reference, paynowreference, amount, status, pollurl, hash } = webhookData;

      LOG(`Webhook received: reference=${reference} status=${status} amount=${amount} paynowreference=${paynowreference || "(none)"}`);

      if (!reference) {
        return { success: false, message: "Missing reference in webhook data" };
      }

      // Find payment by gateway reference
      const payment = await Payment.findOne({
        $or: [{ paynowReference: reference }, { gatewayReference: reference }],
      });

      if (!payment) {
        LOG_WARN(`Webhook: no payment for reference=${reference}`);
        return { success: false, message: `Payment not found for reference: ${reference}` };
      }

      // Already processed
      if (payment.status === "verified" || payment.status === "paid") {
        LOG(`Webhook: payment ${payment._id} already completed, skip`);
        return { success: true, message: "Payment already processed", payment };
      }

      const normalizedStatus = (status || "").toLowerCase();
      const isPaid = normalizedStatus === "paid" || normalizedStatus === "complete" || normalizedStatus === "completed";
      const isFailed = normalizedStatus === "failed" || normalizedStatus === "cancelled";

      if (isPaid && payment.status === "pending") {
        payment.status = "verified";
        payment.verifiedAt = new Date();
        payment.paymentDate = new Date();
        payment.gatewayResponse = {
          provider: "paynow",
          transactionId: paynowreference || "",
          transactionRef: reference,
          paidAt: new Date(),
          rawResponse: webhookData,
        };
        await payment.save();

        LOG(`Webhook: payment ${payment._id} marked verified, running post-payment`);

        // Process post-payment logic based on payment metadata
        await paymentCompletionService.processPostPayment(payment);

        return { success: true, message: "Payment confirmed and processed", payment };
      }

      if (isFailed) {
        payment.status = "cancelled";
        payment.rejectionReason = `Payment ${normalizedStatus} via Paynow`;
        payment.gatewayResponse = {
          provider: "paynow",
          transactionId: paynowreference || "",
          transactionRef: reference,
          paidAt: null,
          rawResponse: webhookData,
        };
        await payment.save();

        LOG(`Webhook: payment ${payment._id} marked ${normalizedStatus}`);
        return { success: true, message: `Payment ${normalizedStatus}`, payment };
      }

      LOG(`Webhook: payment ${payment._id} status unchanged (current=${payment.status} webhook=${normalizedStatus})`);
      return { success: true, message: "No status change", payment };
    } catch (error: any) {
      LOG_ERR(`Webhook processing error: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Poll and confirm a payment by its DB id.
   * Used by the status-check endpoint that the frontend calls.
   */
  async pollAndConfirmPayment(paymentId: string, userId: string): Promise<{
    success: boolean;
    paid: boolean;
    status: string;
    payment?: any;
    error?: string;
  }> {
    try {
      LOG(`Status poll: paymentId=${paymentId} userId=${userId}`);
      const payment = await Payment.findById(paymentId);

      if (!payment) {
        LOG_WARN(`Status poll: payment not found id=${paymentId}`);
        return { success: false, paid: false, status: "not_found", error: "Payment not found" };
      }

      // Verify ownership
      if (payment.tenantId.toString() !== userId && payment.landlordId.toString() !== userId) {
        return { success: false, paid: false, status: "forbidden", error: "Access denied" };
      }

      // Already completed
      if (payment.status === "verified" || payment.status === "paid") {
        return { success: true, paid: true, status: "completed", payment };
      }

      // Already failed
      if (payment.status === "cancelled" || payment.status === "rejected") {
        return { success: true, paid: false, status: payment.status, payment };
      }

      // Not a Paynow payment or no pollUrl
      if (!payment.pollUrl) {
        LOG(`Status poll: payment ${paymentId} has no pollUrl, status=${payment.status}`);
        return { success: true, paid: false, status: payment.status, payment };
      }

      // Poll Paynow
      const result = await this.checkPaymentStatus(payment.pollUrl);

      if (result.paid && payment.status === "pending") {
        LOG(`Status poll: payment ${paymentId} confirmed paid, running post-payment`);
        payment.status = "verified";
        payment.verifiedAt = new Date();
        payment.paymentDate = new Date();
        payment.gatewayResponse = {
          provider: "paynow",
          transactionId: "",
          transactionRef: getPaymentGatewayReference(payment) || "",
          paidAt: new Date(),
          rawResponse: { polled: true },
        };
        await payment.save();

        await paymentCompletionService.processPostPayment(payment);

        return { success: true, paid: true, status: "completed", payment };
      }

      // Auto-expire if past the time limit
      const expiryMs = paynowConfig.paymentExpiryMinutes * 60 * 1000;
      if (payment.createdAt && (Date.now() - new Date(payment.createdAt).getTime()) > expiryMs) {
        if (payment.status === "pending") {
          LOG(`Status poll: payment ${paymentId} expired`);
          payment.status = "cancelled";
          payment.rejectionReason = "Payment expired - no confirmation received within time limit";
          await payment.save();
          return { success: true, paid: false, status: "expired", payment };
        }
      }

      return { success: true, paid: false, status: "pending", payment };
    } catch (error: any) {
      LOG_ERR(`Poll and confirm error: ${error.message}`);
      return { success: false, paid: false, status: "error", error: error.message };
    }
  }

  generateReference(prefix: string, userId: string): string {
    return `${prefix}-${userId}-${Date.now()}`;
  }
}

export const paynowService = new PaynowService();
