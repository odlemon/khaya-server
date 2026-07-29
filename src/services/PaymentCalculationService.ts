// @ts-nocheck
import { Subscription } from "../models/Subscription";
import { Types } from "mongoose";
import { Rental } from "../models/Rental";
import { Property } from "../models/Property";
import { insuranceService } from "./InsuranceService";
import { PLATFORM_SERVICE_FEE, ServiceFeePayer } from "../utils/serviceFee";

export interface DeductionBreakdown {
  totalAmount: number;
  subscriptionFee: number;
  processingFee: number;
  insurancePremium: number;
  netRentAmount: number;
  khayalamiTotal: number;
  serviceFeePayer: ServiceFeePayer;
  breakdown: {
    rentAmount: number;
    subscriptionFee: number;
    processingFee: number;
    processingFeeRate: number;
    insurancePremium: number;
    deductionsTotal: number;
    landlordNet: number;
    khayalamiTotal: number;
    serviceFeePayer: ServiceFeePayer;
  };
}

export class PaymentCalculationService {
  private readonly INSURANCE_COMMISSION_RATE = 0.15; // 15% of premium

  /**
   * Fixed platform service fee (was previously 1.5–2% of rent).
   * Always USD 10 regardless of rent amount.
   */
  calculateProcessingFee(_rentAmount?: number): number {
    return PLATFORM_SERVICE_FEE;
  }

  /**
   * Resolve the service fee payer for a rental.
   * Falls back to "landlord" if the rental predates the field.
   */
  async resolveServiceFeePayer(rentalId: string): Promise<ServiceFeePayer> {
    try {
      const rental = await Rental.findById(rentalId).select("serviceFeePayer").lean();
      return (rental?.serviceFeePayer as ServiceFeePayer) || "landlord";
    } catch {
      return "landlord";
    }
  }

  /**
   * Calculate all deductions for a rent payment.
   *
   * When the landlord bears the fee the USD 10 is deducted from their payout.
   * When the tenant bears it the USD 10 was already added to the scheduled
   * payment amount, so it is still deducted here (it goes to Khayalami either way).
   */
  async calculateRentDeductions(
    rentAmount: number,
    tenantId: string,
    landlordId: string,
    rentalId: string
  ): Promise<DeductionBreakdown> {
    const subscriptionFee = await this.calculateSubscriptionFee(tenantId, rentalId);
    const processingFee = this.calculateProcessingFee();
    const insurancePremium = await this.calculateInsurancePremium(landlordId, rentalId);
    const feePayer = await this.resolveServiceFeePayer(rentalId);

    const totalDeductions = subscriptionFee + processingFee + insurancePremium;
    const netRentAmount = Math.max(0, rentAmount - totalDeductions);
    const khayalamiTotal = totalDeductions;

    return {
      totalAmount: rentAmount,
      subscriptionFee,
      processingFee,
      insurancePremium,
      netRentAmount,
      khayalamiTotal,
      serviceFeePayer: feePayer,
      breakdown: {
        rentAmount,
        subscriptionFee,
        processingFee,
        processingFeeRate: 0,
        insurancePremium,
        deductionsTotal: totalDeductions,
        landlordNet: netRentAmount,
        khayalamiTotal,
        serviceFeePayer: feePayer,
      }
    };
  }

  /**
   * Calculate subscription fee based on active subscription (account-level or rental-specific)
   */
  async calculateSubscriptionFee(tenantId: string, rentalId?: string): Promise<number> {
    try {
      let subscription = await Subscription.findOne({
        tenantId: new Types.ObjectId(tenantId),
        rentalId: null,
        status: "active",
        endDate: { $gte: new Date() }
      });

      if (!subscription && rentalId) {
        subscription = await Subscription.findOne({
          tenantId: new Types.ObjectId(tenantId),
          rentalId: new Types.ObjectId(rentalId),
          status: "active",
          endDate: { $gte: new Date() }
        });
      }

      if (!subscription) {
        return 0;
      }

      return subscription.price;
    } catch (error) {
      console.error("Error calculating subscription fee:", error);
      return 0;
    }
  }

  /**
   * Calculate insurance premium for a rental's property.
   */
  async calculateInsurancePremium(landlordId: string, rentalId: string): Promise<number> {
    return insuranceService.getRentalInsurancePremium(rentalId);
  }

  /**
   * Calculate agreement processing fee (one-time, USD 30-50)
   */
  calculateAgreementFee(propertyValue?: number): number {
    let fee = 30;
    if (propertyValue && propertyValue > 100000) {
      fee = 50;
    } else if (propertyValue && propertyValue > 50000) {
      fee = 40;
    }
    return fee;
  }
}

export const paymentCalculationService = new PaymentCalculationService();
