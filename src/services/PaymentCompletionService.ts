// @ts-nocheck
import { logger } from "../utils/logger";
import { getPaymentGatewayMetadata } from "../utils/paymentGatewayFields";

const LOG = (msg: string, ...args: any[]) => logger.info(`[PaymentCompletion] ${msg}`, ...args);
const LOG_WARN = (msg: string, ...args: any[]) => logger.warn(`[PaymentCompletion] ${msg}`, ...args);
const LOG_ERR = (msg: string, ...args: any[]) => logger.error(`[PaymentCompletion] ${msg}`, ...args);

class PaymentCompletionService {
  /**
   * Process post-payment actions based on the payment's metadata.
   * Called after a payment is confirmed (via webhook or polling).
   */
  async processPostPayment(payment: any): Promise<void> {
    try {
      const paymentMeta = getPaymentGatewayMetadata(payment);
      if (!paymentMeta || !paymentMeta.paymentPurpose) {
        LOG(`Post-payment: no gateway metadata on payment ${payment._id}, skip`);
        return;
      }

      const purpose = paymentMeta.paymentPurpose;
      LOG(`Post-payment: purpose=${purpose} paymentId=${payment._id}`);

      switch (purpose) {
        case "rent":
          await this.processRentPostPayment(payment, paymentMeta);
          break;
        case "tenant_subscription":
          await this.processTenantSubscriptionPostPayment(payment, paymentMeta);
          break;
        case "landlord_premium_subscription":
          await this.processLandlordPremiumPostPayment(payment, paymentMeta);
          break;
        case "zero_deposit_protection":
          await this.processZeroDepositPostPayment(payment, paymentMeta);
          break;
        case "premium_boost":
          await this.processBoostPostPayment(payment, paymentMeta);
          break;
        case "agreement_fee":
          await this.processAgreementFeePostPayment(payment, paymentMeta);
          break;
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
    const { agreementFeeService } = await import("./AgreementFeeService");
    const { Rental } = await import("../models/Rental");

    const rentalId = payment.rentalId?.toString();
    const userId = payment.tenantId?.toString();
    const landlordId = payment.landlordId?.toString();

    if (!rentalId || !userId || !landlordId) return;

    const rental = await Rental.findById(rentalId);
    if (!rental) return;

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
              ...(newStatus === "fully_paid" && { paymentDate: new Date(), paymentMethod: "in_app" }),
            },
          });
        }
      } catch (err: any) {
        LOG_ERR(`Failed to update invoice for payment ${payment._id}: ${err.message}`);
      }
    }

    let rentAmountForDeductions = payment.amount;
    const revenueSourceIds: string[] = [];

    const feeResult = await agreementFeeService.prepareRentPaymentForEscrow(payment, rental);
    rentAmountForDeductions = feeResult.rentAmountForDeductions;
    if (feeResult.agreementFeeRevenueSourceId) {
      revenueSourceIds.push(feeResult.agreementFeeRevenueSourceId);
    }

    const deductions = await paymentCalculationService.calculateRentDeductions(
      rentAmountForDeductions,
      userId,
      landlordId,
      rentalId
    );

    if (deductions.subscriptionFee > 0) {
      const rev = await revenueSourceService.createRevenueSource({
        sourceType: "subscription",
        amount: deductions.subscriptionFee,
        payerId: userId,
        recipientId: "khayalami",
        paymentId: payment._id.toString(),
        rentalId,
        description: "Monthly subscription fee",
      });
      revenueSourceIds.push(rev._id.toString());
    }

    if (deductions.processingFee > 0) {
      const rev = await revenueSourceService.createRevenueSource({
        sourceType: "processing_fee",
        amount: deductions.processingFee,
        payerId: userId,
        recipientId: "khayalami",
        paymentId: payment._id.toString(),
        rentalId,
        description: "Payment processing fee",
      });
      revenueSourceIds.push(rev._id.toString());
    }

    if (deductions.insurancePremium > 0) {
      const rev = await revenueSourceService.createRevenueSource({
        sourceType: "insurance_commission",
        amount: deductions.insurancePremium,
        payerId: userId,
        recipientId: "khayalami",
        paymentId: payment._id.toString(),
        rentalId,
        description: "Property insurance premium",
      });
      revenueSourceIds.push(rev._id.toString());
    }

    await escrowService.addToEscrow(payment, { deductions, revenueSourceIds });
    await escrowService.updateEscrowStatus(payment._id.toString(), "held");

    await this.applyPaymentToScheduledInstallment(payment);

    LOG(`Post-payment rent done: payment ${payment._id}`);
  }

  /**
   * After a partial gateway payment, reduce the linked scheduled installment balance.
   */
  private async applyPaymentToScheduledInstallment(payment: any): Promise<void> {
    const scheduledId = payment.metadata?.scheduledPaymentId;
    if (!scheduledId || scheduledId === payment._id?.toString()) return;

    const { Payment } = await import("../models/Payment");
    const scheduled = await Payment.findById(scheduledId);
    if (!scheduled || ["verified", "paid", "cancelled"].includes(scheduled.status)) {
      return;
    }

    const balanceBefore =
      Number(payment.metadata?.installmentBalanceBefore) ||
      scheduled.totalAmount ||
      scheduled.amount ||
      0;
    const remaining = Math.max(0, balanceBefore - payment.amount);

    if (remaining <= 0) {
      scheduled.status = "cancelled";
      scheduled.rejectionReason = `Installment fulfilled via online payment ${payment._id}`;
      await scheduled.save();
      return;
    }

    scheduled.amount = remaining;
    scheduled.totalAmount = remaining;
    scheduled.lateFee = 0;
    scheduled.status = "pending";
    await scheduled.save();
  }

  private async processTenantSubscriptionPostPayment(payment: any, meta: any): Promise<void> {
    const { subscriptionService } = await import("./SubscriptionService");
    const { revenueSourceService } = await import("./RevenueSourceService");
    const { escrowService } = await import("./EscrowService");

    const tenantId = payment.tenantId?.toString();
    if (!tenantId) return;

    await subscriptionService.createSubscription({
      tenantId,
      planType: meta.planType || "premium",
      propertyValueBracket: meta.propertyValueBracket || "medium",
    });

    const revenueSource = await revenueSourceService.createRevenueSource({
      sourceType: "subscription",
      amount: payment.amount,
      payerId: tenantId,
      recipientId: "khayalami",
      paymentId: payment._id.toString(),
      description: `Tenant subscription - ${meta.planType || "premium"}`,
      status: "collected",
    });

    await escrowService.addToEscrow(payment, {
      deductions: { subscriptionFee: 0, processingFee: 0, insurancePremium: 0 },
      revenueSourceIds: [revenueSource._id.toString()],
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
      preferences = new LandlordPreferences({
        landlordId,
        paymentReceptionMethod: "bank_transfer",
        subscriptionPaymentMethod: "no_subscription",
      });
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
      sourceType: "subscription",
      amount: payment.amount,
      payerId: landlordId,
      recipientId: "khayalami",
      paymentId: payment._id.toString(),
      description: "Landlord Premium Features subscription",
      status: "collected",
    });

    await escrowService.addToEscrow(payment, {
      deductions: { subscriptionFee: 0, processingFee: 0, insurancePremium: 0 },
      revenueSourceIds: [revenueSource._id.toString()],
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
      preferences = new LandlordPreferences({
        landlordId,
        paymentReceptionMethod: "bank_transfer",
        subscriptionPaymentMethod: "no_subscription",
      });
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
      sourceType: "subscription",
      amount: payment.amount,
      payerId: landlordId,
      recipientId: "khayalami",
      paymentId: payment._id.toString(),
      description: "Zero Deposit Protection subscription",
      status: "collected",
    });

    await escrowService.addToEscrow(payment, {
      deductions: { subscriptionFee: 0, processingFee: 0, insurancePremium: 0 },
      revenueSourceIds: [revenueSource._id.toString()],
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
      sourceType: "premium_boost",
      amount: payment.amount,
      payerId: landlordId,
      recipientId: "khayalami",
      paymentId: payment._id.toString(),
      propertyId: payment.propertyId?.toString(),
      description: "Premium boost for property",
      status: "collected",
    });

    await escrowService.addToEscrow(payment, {
      deductions: { subscriptionFee: 0, processingFee: 0, insurancePremium: 0 },
      revenueSourceIds: [revenueSource._id.toString()],
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
      sourceType: "agreement_fee",
      amount: payment.amount,
      payerId: tenantId,
      recipientId: "khayalami",
      paymentId: payment._id.toString(),
      description: "Agreement fee",
      status: "collected",
    });

    await escrowService.addToEscrow(payment, {
      deductions: { subscriptionFee: 0, processingFee: 0, insurancePremium: 0 },
      revenueSourceIds: [revenueSource._id.toString()],
    });
    await escrowService.updateEscrowStatus(payment._id.toString(), "held");

    if (meta.agreementId) {
      await Agreement.findByIdAndUpdate(meta.agreementId, {
        "tenantSignature.paymentStatus": "paid",
        "tenantSignature.paymentId": payment._id,
      });
    }

    LOG(`Post-payment agreement fee done: payment ${payment._id}`);
  }
}

export const paymentCompletionService = new PaymentCompletionService();
