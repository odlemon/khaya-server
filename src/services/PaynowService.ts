// @ts-nocheck
import { Paynow } from "paynow";
import { Payment } from "../models/Payment";
import { paynowConfig } from "../config/paynowConfig";
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

      // Find payment by paynowReference
      const payment = await Payment.findOne({ paynowReference: reference });

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
        await this.processPostPayment(payment);

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
          transactionRef: payment.paynowReference || "",
          paidAt: new Date(),
          rawResponse: { polled: true },
        };
        await payment.save();

        await this.processPostPayment(payment);

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

  /**
   * Process post-payment actions based on the payment's metadata.
   * This is called after a payment is confirmed (via webhook or polling).
   * Each payment type has its own completion logic.
   */
  private async processPostPayment(payment: any): Promise<void> {
    try {
      const paymentMeta = payment.paynowMetadata;
      if (!paymentMeta || !paymentMeta.paymentPurpose) {
        LOG(`Post-payment: no paynowMetadata on payment ${payment._id}, skip`);
        return;
      }

      const purpose = paymentMeta.paymentPurpose;
      LOG(`Post-payment: purpose=${purpose} paymentId=${payment._id}`);

      switch (purpose) {
        case "rent": {
          await this.processRentPostPayment(payment, paymentMeta);
          break;
        }
        case "tenant_subscription": {
          await this.processTenantSubscriptionPostPayment(payment, paymentMeta);
          break;
        }
        case "landlord_premium_subscription": {
          await this.processLandlordPremiumPostPayment(payment, paymentMeta);
          break;
        }
        case "zero_deposit_protection": {
          await this.processZeroDepositPostPayment(payment, paymentMeta);
          break;
        }
        case "premium_boost": {
          await this.processBoostPostPayment(payment, paymentMeta);
          break;
        }
        case "agreement_fee": {
          await this.processAgreementFeePostPayment(payment, paymentMeta);
          break;
        }
        default:
          LOG_WARN(`Post-payment: unknown purpose=${purpose}`);
      }
    } catch (error: any) {
      LOG_ERR(`Post-payment error payment ${payment._id}: ${error.message}`);
    }
  }

  private async processRentPostPayment(payment: any, meta: any): Promise<void> {
    const { paymentCalculationService } = await import("./PaymentCalculationService");
    const { revenueSourceService } = await import("./RevenueSourceService");
    const { escrowService } = await import("./EscrowService");

    const rentalId = payment.rentalId?.toString();
    const userId = payment.tenantId?.toString();
    const landlordId = payment.landlordId?.toString();

    if (!rentalId || !userId || !landlordId) return;

    // Update invoice if linked
    if (payment.invoiceId) {
      try {
        const { Invoice } = await import("../models/Invoice");
        const invoice = await Invoice.findById(payment.invoiceId);
        if (invoice) {
          const newAmountPaid = (invoice.amountPaid || 0) + payment.amount;
          const invoiceTotal = invoice.total || invoice.amountDue || 0;
          const newAmountDue = Math.max(0, invoiceTotal - newAmountPaid);
          const newStatus = newAmountDue <= 0 ? "fully_paid" : newAmountPaid > 0 ? "partially_paid" : invoice.status;

          await Invoice.findByIdAndUpdate(payment.invoiceId, {
            $set: {
              amountPaid: newAmountPaid,
              amountDue: newAmountDue,
              status: newStatus,
              ...(newStatus === "fully_paid" && { paymentDate: new Date(), paymentMethod: "in_app" })
            }
          });
        }
      } catch (err: any) {
        LOG_ERR(`Failed to update invoice for payment ${payment._id}: ${err.message}`);
      }
    }

    // Calculate deductions and create escrow
    const deductions = await paymentCalculationService.calculateRentDeductions(
      payment.amount, userId, landlordId, rentalId
    );

    const revenueSourceIds: string[] = [];

    if (deductions.subscriptionFee > 0) {
      const rev = await revenueSourceService.createRevenueSource({
        sourceType: "subscription", amount: deductions.subscriptionFee,
        payerId: userId, recipientId: "khayalami",
        paymentId: payment._id.toString(), rentalId,
        description: "Monthly subscription fee"
      });
      revenueSourceIds.push(rev._id.toString());
    }

    if (deductions.processingFee > 0) {
      const rev = await revenueSourceService.createRevenueSource({
        sourceType: "processing_fee", amount: deductions.processingFee,
        payerId: userId, recipientId: "khayalami",
        paymentId: payment._id.toString(), rentalId,
        description: "Payment processing fee"
      });
      revenueSourceIds.push(rev._id.toString());
    }

    if (deductions.insurancePremium > 0) {
      const rev = await revenueSourceService.createRevenueSource({
        sourceType: "insurance_commission", amount: deductions.insurancePremium,
        payerId: userId, recipientId: "khayalami",
        paymentId: payment._id.toString(), rentalId,
        description: "Property insurance premium"
      });
      revenueSourceIds.push(rev._id.toString());
    }

    await escrowService.addToEscrow(payment, { deductions, revenueSourceIds });
    await escrowService.updateEscrowStatus(payment._id.toString(), "held");

    LOG(`Post-payment rent done: payment ${payment._id}`);
  }

  private async processTenantSubscriptionPostPayment(payment: any, meta: any): Promise<void> {
    const { subscriptionService } = await import("./SubscriptionService");
    const { revenueSourceService } = await import("./RevenueSourceService");
    const { escrowService } = await import("./EscrowService");

    const tenantId = payment.tenantId?.toString();
    if (!tenantId) return;

    const subscription = await subscriptionService.createSubscription({
      tenantId,
      planType: meta.planType || "premium",
      propertyValueBracket: meta.propertyValueBracket || "medium"
    });

    const revenueSource = await revenueSourceService.createRevenueSource({
      sourceType: "subscription", amount: payment.amount,
      payerId: tenantId, recipientId: "khayalami",
      paymentId: payment._id.toString(),
      description: `Tenant subscription - ${meta.planType || "premium"}`,
      status: "collected"
    });

    await escrowService.addToEscrow(payment, {
      deductions: { subscriptionFee: 0, processingFee: 0, insurancePremium: 0 },
      revenueSourceIds: [revenueSource._id.toString()]
    });
    await escrowService.updateEscrowStatus(payment._id.toString(), "held");

    LOG(`Post-payment tenant subscription done: payment ${payment._id}`);
  }

  private async processLandlordPremiumPostPayment(payment: any, meta: any): Promise<void> {
    const { LandlordPreferences } = await import("../models/LandlordPreferences");
    const { revenueSourceService } = await import("./RevenueSourceService");
    const { escrowService } = await import("./EscrowService");

    const landlordId = payment.landlordId?.toString() || payment.tenantId?.toString();
    if (!landlordId) return;

    let preferences = await LandlordPreferences.findOne({ landlordId });
    if (!preferences) {
      preferences = new LandlordPreferences({ landlordId, paymentReceptionMethod: "bank_transfer", subscriptionPaymentMethod: "no_subscription" });
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    if (!preferences.premiumFeatures) {
      preferences.premiumFeatures = { isSubscribed: false, autoRenew: true };
    }
    preferences.premiumFeatures.isSubscribed = true;
    preferences.premiumFeatures.startDate = now;
    preferences.premiumFeatures.endDate = endDate;
    preferences.premiumFeatures.autoRenew = meta.autoRenew !== false;
    preferences.premiumFeatures.planType = meta.planType || "premium";
    await preferences.save();

    const revenueSource = await revenueSourceService.createRevenueSource({
      sourceType: "subscription", amount: payment.amount,
      payerId: landlordId, recipientId: "khayalami",
      paymentId: payment._id.toString(),
      description: `Landlord Premium Features subscription`,
      status: "collected"
    });

    await escrowService.addToEscrow(payment, {
      deductions: { subscriptionFee: 0, processingFee: 0, insurancePremium: 0 },
      revenueSourceIds: [revenueSource._id.toString()]
    });
    await escrowService.updateEscrowStatus(payment._id.toString(), "held");

    LOG(`Post-payment landlord premium done: payment ${payment._id}`);
  }

  private async processZeroDepositPostPayment(payment: any, meta: any): Promise<void> {
    const { LandlordPreferences } = await import("../models/LandlordPreferences");
    const { revenueSourceService } = await import("./RevenueSourceService");
    const { escrowService } = await import("./EscrowService");

    const landlordId = payment.landlordId?.toString() || payment.tenantId?.toString();
    if (!landlordId) return;

    let preferences = await LandlordPreferences.findOne({ landlordId });
    if (!preferences) {
      preferences = new LandlordPreferences({ landlordId, paymentReceptionMethod: "bank_transfer", subscriptionPaymentMethod: "no_subscription" });
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);
    const nextBillingDate = new Date(endDate);

    if (!preferences.zeroDepositProtection) {
      preferences.zeroDepositProtection = { isSubscribed: false, autoRenew: true, price: 0, coverageAmount: 0 };
    }
    preferences.zeroDepositProtection.isSubscribed = true;
    preferences.zeroDepositProtection.startDate = now;
    preferences.zeroDepositProtection.endDate = endDate;
    preferences.zeroDepositProtection.nextBillingDate = nextBillingDate;
    preferences.zeroDepositProtection.autoRenew = meta.autoRenew !== false;
    preferences.zeroDepositProtection.price = payment.amount;
    preferences.zeroDepositProtection.coverageAmount = 500;
    await preferences.save();

    const revenueSource = await revenueSourceService.createRevenueSource({
      sourceType: "subscription", amount: payment.amount,
      payerId: landlordId, recipientId: "khayalami",
      paymentId: payment._id.toString(),
      description: `Zero Deposit Protection subscription`,
      status: "collected"
    });

    await escrowService.addToEscrow(payment, {
      deductions: { subscriptionFee: 0, processingFee: 0, insurancePremium: 0 },
      revenueSourceIds: [revenueSource._id.toString()]
    });
    await escrowService.updateEscrowStatus(payment._id.toString(), "held");

    LOG(`Post-payment zero deposit done: payment ${payment._id}`);
  }

  private async processBoostPostPayment(payment: any, meta: any): Promise<void> {
    const { revenueSourceService } = await import("./RevenueSourceService");
    const { escrowService } = await import("./EscrowService");

    const landlordId = payment.landlordId?.toString() || payment.tenantId?.toString();
    if (!landlordId) return;

    const revenueSource = await revenueSourceService.createRevenueSource({
      sourceType: "premium_boost", amount: payment.amount,
      payerId: landlordId, recipientId: "khayalami",
      paymentId: payment._id.toString(),
      propertyId: payment.propertyId?.toString(),
      description: `Premium boost for property`,
      status: "collected"
    });

    await escrowService.addToEscrow(payment, {
      deductions: { subscriptionFee: 0, processingFee: 0, insurancePremium: 0 },
      revenueSourceIds: [revenueSource._id.toString()]
    });
    await escrowService.updateEscrowStatus(payment._id.toString(), "held");

    LOG(`Post-payment boost done: payment ${payment._id}`);
  }

  private async processAgreementFeePostPayment(payment: any, meta: any): Promise<void> {
    const { revenueSourceService } = await import("./RevenueSourceService");
    const { escrowService } = await import("./EscrowService");
    const { Agreement } = await import("../models/Agreement");

    const tenantId = payment.tenantId?.toString();
    if (!tenantId) return;

    const revenueSource = await revenueSourceService.createRevenueSource({
      sourceType: "agreement_fee", amount: payment.amount,
      payerId: tenantId, recipientId: "khayalami",
      paymentId: payment._id.toString(),
      description: `Agreement fee`,
      status: "collected"
    });

    await escrowService.addToEscrow(payment, {
      deductions: { subscriptionFee: 0, processingFee: 0, insurancePremium: 0 },
      revenueSourceIds: [revenueSource._id.toString()]
    });
    await escrowService.updateEscrowStatus(payment._id.toString(), "held");

    // Update agreement payment status
    if (meta.agreementId) {
      await Agreement.findByIdAndUpdate(meta.agreementId, {
        "tenantSignature.paymentStatus": "paid",
        "tenantSignature.paymentId": payment._id
      });
    }

    LOG(`Post-payment agreement fee done: payment ${payment._id}`);
  }

  /**
   * Generate a unique reference for a payment.
   */
  generateReference(prefix: string, userId: string): string {
    return `${prefix}-${userId}-${Date.now()}`;
  }
}

export const paynowService = new PaynowService();
