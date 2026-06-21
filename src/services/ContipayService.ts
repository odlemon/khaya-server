// @ts-nocheck
import axios from "axios";
import https from "https";
import { Payment } from "../models/Payment";
import { contipayConfig } from "../config/contipayConfig";
import { paymentCompletionService } from "./PaymentCompletionService";
import { getPaymentGatewayReference } from "../utils/paymentGatewayFields";
import { logger } from "../utils/logger";

const LOG = (msg: string, ...args: any[]) => logger.info(`[ContiPay] ${msg}`, ...args);
const LOG_WARN = (msg: string, ...args: any[]) => logger.warn(`[ContiPay] ${msg}`, ...args);
const LOG_ERR = (msg: string, ...args: any[]) => logger.error(`[ContiPay] ${msg}`, ...args);

export interface ContipayInitResult {
  success: boolean;
  gatewayReference?: string;
  instructions?: string;
  rawResponse?: any;
  error?: string;
}

export interface ContipayStatusResult {
  success: boolean;
  paid: boolean;
  status: "pending" | "completed" | "failed" | "cancelled" | "expired";
  error?: string;
}

/** Normalize Zimbabwe mobile numbers for EcoCash (local 07... or 2637...) */
export function normalizeEcoCashPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("263") && digits.length >= 11) {
    return "0" + digits.slice(3);
  }
  if (digits.startsWith("7") && digits.length === 9) {
    return "0" + digits;
  }
  if (digits.startsWith("07") && digits.length === 10) {
    return digits;
  }
  return phone.trim();
}

function extractReferenceFromWebhook(body: any): string | null {
  return (
    body?.reference ||
    body?.transaction?.reference ||
    body?.transactionReference ||
    body?.merchantReference ||
    null
  );
}

function extractStatusFromWebhook(body: any): string {
  const raw =
    body?.status ||
    body?.transactionStatus ||
    body?.paymentStatus ||
    body?.transaction?.status ||
    body?.result ||
    "";
  return String(raw).toLowerCase();
}

function extractTransactionIdFromWebhook(body: any): string {
  return (
    body?.transactionId ||
    body?.transaction?.id ||
    body?.id ||
    body?.contipayReference ||
    ""
  ).toString();
}

function isPaidStatus(status: string): boolean {
  return ["paid", "success", "successful", "completed", "complete", "approved", "ok"].includes(status);
}

function isFailedStatus(status: string): boolean {
  return ["failed", "cancelled", "canceled", "declined", "error", "rejected", "expired"].includes(status);
}

class ContipayService {
  private httpsAgent = new https.Agent({ rejectUnauthorized: false });

  private ensureConfigured(): void {
    if (!contipayConfig.isConfigured()) {
      throw new Error(
        "ContiPay is not configured. Set CONTIPAY_API_USER, CONTIPAY_API_SECRET, and CONTIPAY_MERCHANT_ID."
      );
    }
  }

  generateReference(prefix: string, userId: string): string {
    return `${prefix}-${userId}-${Date.now()}`;
  }

  /**
   * Initiate EcoCash direct payment (USSD push to customer phone).
   * POST /acquire/payment with HTTP Basic Auth.
   */
  async initiateEcoCashPayment(params: {
    reference: string;
    description: string;
    amount: number;
    phone: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<ContipayInitResult> {
    this.ensureConfigured();

    const { reference, description, amount, email, firstName, lastName } = params;
    const cell = normalizeEcoCashPhone(params.phone);
    const customerFirst = firstName || "Customer";
    const customerLast = lastName || "-";

    const payload = {
      customer: {
        nationalId: "00000000",
        firstName: customerFirst,
        middleName: "",
        surname: customerLast,
        email: email || `${cell.replace(/\D/g, "")}@khayalami.co.zw`,
        cell,
        countryCode: "ZW",
      },
      transaction: {
        providerCode: "EC",
        providerName: "EcoCash",
        currencyCode: contipayConfig.currency,
        merchantId: contipayConfig.merchantId,
        reference,
        description,
        amount: Number(amount),
        webhookUrl: contipayConfig.webhookUrl,
        successUrl: contipayConfig.successUrl,
        cancelUrl: contipayConfig.cancelUrl,
      },
      accountDetails: {
        accountNumber: cell,
        accountName: `${customerFirst} ${customerLast}`.trim(),
      },
    };

    try {
      LOG(`Initiate EcoCash: ref=${reference} amount=${amount} phone=${cell} env=${contipayConfig.environment}`);

      const response = await axios.post(`${contipayConfig.getBaseUrl()}${contipayConfig.acquirePath}`, payload, {
        auth: {
          username: contipayConfig.apiUser,
          password: contipayConfig.apiSecret,
        },
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 60000,
        httpsAgent: this.httpsAgent,
        validateStatus: () => true,
      });

      const data = response.data;
      LOG(`Initiate EcoCash: ref=${reference} http=${response.status} body=${JSON.stringify(data)?.slice(0, 500)}`);

      if (response.status < 200 || response.status >= 300) {
        const errMsg = data?.message || data?.error || `ContiPay HTTP ${response.status}`;
        LOG_ERR(`Initiate EcoCash HTTP error: ref=${reference} error=${errMsg}`);
        return { success: false, error: errMsg, rawResponse: data };
      }

      const gatewayError =
        data?.status === "Error" ||
        data?.success === false ||
        (typeof data?.message === "string" && isFailedStatus(data.message.toLowerCase()));

      if (gatewayError) {
        const errMsg = data?.message || data?.error || "ContiPay payment initiation failed";
        LOG_ERR(`Initiate EcoCash failed: ref=${reference} error=${errMsg}`);
        return { success: false, error: errMsg, rawResponse: data };
      }

      return {
        success: true,
        gatewayReference: reference,
        instructions:
          data?.message ||
          "Please check your phone for the EcoCash payment prompt and enter your PIN to confirm.",
        rawResponse: data,
      };
    } catch (error: any) {
      const errMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "ContiPay payment gateway error";
      LOG_ERR(`Initiate EcoCash exception: ref=${reference} error=${errMsg}`);
      return { success: false, error: errMsg, rawResponse: error.response?.data };
    }
  }

  /**
   * Process ContiPay webhook callback.
   */
  async processWebhook(webhookData: any): Promise<{
    success: boolean;
    message: string;
    payment?: any;
  }> {
    try {
      const reference = extractReferenceFromWebhook(webhookData);
      const status = extractStatusFromWebhook(webhookData);
      const transactionId = extractTransactionIdFromWebhook(webhookData);

      LOG(`Webhook received: reference=${reference || "(none)"} status=${status}`);

      if (!reference) {
        return { success: false, message: "Missing reference in webhook data" };
      }

      const payment = await Payment.findOne({
        $or: [{ gatewayReference: reference }, { paynowReference: reference }],
      });

      if (!payment) {
        LOG_WARN(`Webhook: no payment for reference=${reference}`);
        return { success: false, message: `Payment not found for reference: ${reference}` };
      }

      if (payment.status === "verified" || payment.status === "paid") {
        LOG(`Webhook: payment ${payment._id} already completed, skip`);
        return { success: true, message: "Payment already processed", payment };
      }

      if (isPaidStatus(status) && payment.status === "pending") {
        payment.status = "verified";
        payment.verifiedAt = new Date();
        payment.paymentDate = new Date();
        payment.gatewayResponse = {
          provider: "contipay",
          transactionId,
          transactionRef: reference,
          paidAt: new Date(),
          rawResponse: webhookData,
        };
        await payment.save();

        LOG(`Webhook: payment ${payment._id} marked verified, running post-payment`);
        await paymentCompletionService.processPostPayment(payment);

        return { success: true, message: "Payment confirmed and processed", payment };
      }

      if (isFailedStatus(status)) {
        payment.status = "cancelled";
        payment.rejectionReason = `Payment ${status} via ContiPay`;
        payment.gatewayResponse = {
          provider: "contipay",
          transactionId,
          transactionRef: reference,
          paidAt: null,
          rawResponse: webhookData,
        };
        await payment.save();

        LOG(`Webhook: payment ${payment._id} marked ${status}`);
        return { success: true, message: `Payment ${status}`, payment };
      }

      LOG(`Webhook: payment ${payment._id} status unchanged (current=${payment.status} webhook=${status})`);
      return { success: true, message: "No status change", payment };
    } catch (error: any) {
      LOG_ERR(`Webhook processing error: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Poll payment status from DB (ContiPay confirms via webhook; no external poll URL).
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

      if (payment.tenantId.toString() !== userId && payment.landlordId.toString() !== userId) {
        return { success: false, paid: false, status: "forbidden", error: "Access denied" };
      }

      if (payment.status === "verified" || payment.status === "paid") {
        return { success: true, paid: true, status: "completed", payment };
      }

      if (payment.status === "cancelled" || payment.status === "rejected") {
        return { success: true, paid: false, status: payment.status, payment };
      }

      const expiryMs = contipayConfig.paymentExpiryMinutes * 60 * 1000;
      if (payment.createdAt && Date.now() - new Date(payment.createdAt).getTime() > expiryMs) {
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

  /** Mark payment verified when webhook already processed elsewhere (internal use) */
  async markPaymentVerified(payment: any, rawResponse: any = { polled: true }): Promise<void> {
    if (payment.status !== "pending") return;

    payment.status = "verified";
    payment.verifiedAt = new Date();
    payment.paymentDate = new Date();
    payment.gatewayResponse = {
      provider: "contipay",
      transactionId: "",
      transactionRef: getPaymentGatewayReference(payment) || "",
      paidAt: new Date(),
      rawResponse,
    };
    await payment.save();
    await paymentCompletionService.processPostPayment(payment);
  }
}

export const contipayService = new ContipayService();
