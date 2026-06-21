// @ts-nocheck
import { Agreement, IAgreement } from "../models/Agreement";
import { Payment, IPayment } from "../models/Payment";
import { IRental } from "../models/Rental";
import { PaymentRequest } from "../models/PaymentRequest";
import { RevenueSource } from "../models/RevenueSource";
import { paymentCalculationService } from "./PaymentCalculationService";
import { revenueSourceService } from "./RevenueSourceService";
import { Types } from "mongoose";

export type TenantFeePaymentStatus =
  | "no_payment"
  | "pending_payment"
  | "payment_approved"
  | "verified"
  | "deferred";

class AgreementFeeService {
  /**
   * Fee amount for a new agreement (persist on create).
   */
  calculateFeeForProperty(property: { estimatedValue?: number } | null): number {
    return paymentCalculationService.calculateAgreementFee(property?.estimatedValue);
  }

  /**
   * Whether the one-time fee should be bundled into the first rent installment.
   */
  shouldDeferFeeToFirstRent(agreement: IAgreement | null): boolean {
    if (!agreement) return false;
    return agreement.agreementFeeStatus !== "charged" && (agreement.agreementFeeAmount || 0) > 0;
  }

  /**
   * Agreement fee portion to add to the first scheduled rent payment.
   */
  getFeePortionForFirstRent(agreement: IAgreement | null): number {
    if (!this.shouldDeferFeeToFirstRent(agreement)) return 0;
    return agreement!.agreementFeeAmount || 0;
  }

  /**
   * Resolve tenant signature payment status (signing does not require upfront fee).
   */
  async resolveTenantFeePaymentStatus(
    agreement: IAgreement,
    tenantIdStr: string
  ): Promise<TenantFeePaymentStatus> {
    if (agreement.agreementFeeStatus === "charged") {
      return "verified";
    }

    const [feePaymentRequest, pendingRequest, feePayment, revenueSource] = await Promise.all([
      PaymentRequest.findOne({
        agreementId: agreement._id,
        requestType: "agreement_fee",
        status: { $in: ["approved", "processed"] },
      }),
      PaymentRequest.findOne({
        agreementId: agreement._id,
        requestType: "agreement_fee",
        status: "pending_admin_approval",
      }),
      Payment.findOne({
        agreementId: agreement._id,
        tenantId: new Types.ObjectId(tenantIdStr),
        paymentType: "service",
        status: "verified",
      }),
      RevenueSource.findOne({
        sourceType: "agreement_fee",
        payerId: tenantIdStr,
        agreementId: agreement._id,
        status: "collected",
      }),
    ]);

    if (feePaymentRequest || feePayment || revenueSource) {
      return "verified";
    }
    if (pendingRequest) {
      return "pending_payment";
    }

    return "deferred";
  }

  /**
   * Rent portion of a payment (excludes bundled agreement fee for deduction math).
   */
  getRentPortionFromPayment(payment: IPayment): number {
    const feePortion = Number(payment.metadata?.agreementFeePortion || 0);
    if (feePortion > 0) {
      return Math.max(0, payment.amount - feePortion);
    }
    return payment.amount;
  }

  /**
   * True when no other verified/paid rent exists for this rental (excluding current payment).
   */
  async isFirstRentPaymentForRental(rentalId: string, excludePaymentId?: string): Promise<boolean> {
    const query: Record<string, unknown> = {
      rentalId,
      paymentType: "rent",
      status: { $in: ["verified", "paid"] },
    };
    if (excludePaymentId) {
      query._id = { $ne: excludePaymentId };
    }
    const count = await Payment.countDocuments(query);
    return count === 0;
  }

  /**
   * Attach fee breakdown metadata to first rent payment when missing (e.g. gateway-created payments).
   */
  async ensureFirstRentMetadata(payment: IPayment, rental: IRental): Promise<void> {
    if (payment.paymentType !== "rent") return;
    if (Number(payment.metadata?.agreementFeePortion || 0) > 0) return;

    const isFirst = await this.isFirstRentPaymentForRental(
      rental._id.toString(),
      payment._id.toString()
    );
    if (!isFirst) return;

    const agreement = rental.agreementId ? await Agreement.findById(rental.agreementId) : null;
    const agreementFeePortion = this.getFeePortionForFirstRent(agreement);
    if (!agreementFeePortion) return;

    const insurancePortion = Number(payment.metadata?.insurancePortion || 0);
    const rentPortion = Math.max(0, payment.amount - agreementFeePortion - insurancePortion);

    payment.metadata = {
      ...(payment.metadata || {}),
      rentPortion,
      agreementFeePortion,
      insurancePortion,
    };
    await payment.save();
  }

  /**
   * Ensure metadata + collect deferred fee before rent escrow/deductions.
   */
  async prepareRentPaymentForEscrow(
    payment: IPayment,
    rental: IRental
  ): Promise<{ rentAmountForDeductions: number; agreementFeeRevenueSourceId?: string }> {
    await this.ensureFirstRentMetadata(payment, rental);
    return this.applyAgreementFeeOnFirstRentPayment(payment, rental);
  }

  /**
   * When first rent is paid, collect deferred agreement fee and mark agreement charged.
   * Returns extra revenue source id(s) to include in escrow.
   */
  async applyAgreementFeeOnFirstRentPayment(
    payment: IPayment,
    rental: IRental
  ): Promise<{ agreementFeeRevenueSourceId?: string; rentAmountForDeductions: number }> {
    const rentAmountForDeductions = this.getRentPortionFromPayment(payment);
    const feePortion = Number(payment.metadata?.agreementFeePortion || 0);

    if (!feePortion || feePortion <= 0 || !rental.agreementId) {
      return { rentAmountForDeductions };
    }

    const agreement = await Agreement.findById(rental.agreementId);
    if (!agreement || agreement.agreementFeeStatus === "charged") {
      return { rentAmountForDeductions };
    }

    const tenantIdStr = payment.tenantId?.toString();
    const rev = await revenueSourceService.createRevenueSource({
      sourceType: "agreement_fee",
      amount: feePortion,
      payerId: tenantIdStr,
      recipientId: "khayalami",
      paymentId: payment._id.toString(),
      agreementId: agreement._id.toString(),
      rentalId: rental._id.toString(),
      description: "Agreement processing fee (first rent installment)",
      status: "collected",
    });

    agreement.agreementFeeStatus = "charged";
    agreement.agreementFeeChargedAt = new Date();
    if (agreement.tenantSignature) {
      agreement.tenantSignature.paymentStatus = "verified";
    }
    await agreement.save();

    return {
      agreementFeeRevenueSourceId: rev._id.toString(),
      rentAmountForDeductions,
    };
  }

  /**
   * Mark agreement fee as charged after legacy upfront payment.
   */
  async markFeeChargedFromUpfrontPayment(agreement: IAgreement, amount: number): Promise<void> {
    agreement.agreementFeeStatus = "charged";
    agreement.agreementFeeChargedAt = new Date();
    if (!agreement.agreementFeeAmount || agreement.agreementFeeAmount <= 0) {
      agreement.agreementFeeAmount = amount;
    }
    if (agreement.tenantSignature) {
      agreement.tenantSignature.paymentStatus = "verified";
    } else {
      agreement.tenantSignature = { paymentStatus: "verified" } as any;
    }
    await agreement.save();
  }
}

export const agreementFeeService = new AgreementFeeService();
