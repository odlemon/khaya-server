// @ts-nocheck
import { Subscription } from "../models/Subscription";
import { Types } from "mongoose";
import { Rental } from "../models/Rental";
import { Property } from "../models/Property";

export interface DeductionBreakdown {
  totalAmount: number;
  subscriptionFee: number;
  processingFee: number;
  insurancePremium: number;
  netRentAmount: number;
  khayalamiTotal: number;
  breakdown: {
    rentAmount: number;
    subscriptionFee: number;
    processingFee: number;
    processingFeeRate: number;
    insurancePremium: number;
    deductionsTotal: number;
    landlordNet: number;
    khayalamiTotal: number;
  };
}

export class PaymentCalculationService {
  private readonly PROCESSING_FEE_RATE_LOW = 0.015; // 1.5%
  private readonly PROCESSING_FEE_RATE_HIGH = 0.02; // 2%
  private readonly INSURANCE_COMMISSION_RATE = 0.15; // 15% of premium

  /**
   * Calculate all deductions for a rent payment
   */
  async calculateRentDeductions(
    rentAmount: number,
    tenantId: string,
    landlordId: string,
    rentalId: string
  ): Promise<DeductionBreakdown> {
    // Calculate subscription fee
    const subscriptionFee = await this.calculateSubscriptionFee(tenantId, rentalId);
    
    // Calculate processing fee (1.5-2% of rent)
    const processingFee = this.calculateProcessingFee(rentAmount);
    
    // Calculate insurance premium (if applicable)
    const insurancePremium = await this.calculateInsurancePremium(landlordId, rentalId);
    
    // Calculate totals
    const totalDeductions = subscriptionFee + processingFee + insurancePremium;
    const netRentAmount = rentAmount - totalDeductions;
    const khayalamiTotal = totalDeductions;
    
    return {
      totalAmount: rentAmount,
      subscriptionFee,
      processingFee,
      insurancePremium,
      netRentAmount,
      khayalamiTotal,
      breakdown: {
        rentAmount,
        subscriptionFee,
        processingFee,
        processingFeeRate: this.PROCESSING_FEE_RATE_HIGH, // Using 2% for now
        insurancePremium,
        deductionsTotal: totalDeductions,
        landlordNet: netRentAmount,
        khayalamiTotal
      }
    };
  }

  /**
   * Calculate subscription fee based on active subscription (account-level or rental-specific)
   */
  async calculateSubscriptionFee(tenantId: string, rentalId?: string): Promise<number> {
    try {
      // First check for account-level subscription (no rentalId)
      let subscription = await Subscription.findOne({
        tenantId: new Types.ObjectId(tenantId),
        rentalId: null,
        status: "active",
        endDate: { $gte: new Date() }
      });

      // If no account-level subscription and rentalId provided, check for rental-specific
      if (!subscription && rentalId) {
        subscription = await Subscription.findOne({
          tenantId: new Types.ObjectId(tenantId),
          rentalId: new Types.ObjectId(rentalId),
          status: "active",
          endDate: { $gte: new Date() }
        });
      }
      
      if (!subscription) {
        return 0; // No active subscription, no fee
      }
      
      return subscription.price;
    } catch (error) {
      console.error("Error calculating subscription fee:", error);
      return 0;
    }
  }

  /**
   * Calculate processing fee (1.5-2% of rent amount)
   */
  calculateProcessingFee(rentAmount: number, useHighRate: boolean = true): number {
    const rate = useHighRate ? this.PROCESSING_FEE_RATE_HIGH : this.PROCESSING_FEE_RATE_LOW;
    return Math.round(rentAmount * rate * 100) / 100; // Round to 2 decimals
  }

  /**
   * Calculate insurance premium commission (if landlord has insurance)
   */
  async calculateInsurancePremium(landlordId: string, rentalId: string): Promise<number> {
    // TODO: Implement insurance premium calculation
    // For now, return 0
    // This will be implemented when insurance system is added
    return 0;
  }

  /**
   * Calculate agreement processing fee (one-time, USD 30-50)
   */
  calculateAgreementFee(propertyValue?: number): number {
    // Base fee
    let fee = 30;
    
    // If property value is high, charge more
    if (propertyValue && propertyValue > 100000) {
      fee = 50;
    } else if (propertyValue && propertyValue > 50000) {
      fee = 40;
    }
    
    return fee;
  }
}

export const paymentCalculationService = new PaymentCalculationService();

