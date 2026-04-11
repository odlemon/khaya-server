// @ts-nocheck
import { Property } from "../models/Property";
import { Rental } from "../models/Rental";
import { logger } from "../utils/logger";

/**
 * Premium lookup table: coverageType × riskCategory → monthly premium (USD)
 * These rates can be adjusted based on the insurance partner's underwriting rules.
 */
const PREMIUM_TABLE: Record<string, Record<string, number>> = {
  basic:    { low: 8,  medium: 12, high: 18 },
  standard: { low: 12, medium: 18, high: 25 },
  premium:  { low: 18, medium: 25, high: 35 },
};

export class InsuranceService {
  /**
   * Calculate the monthly insurance premium for a property based on
   * coverageType, riskCategory, and optionally propertyType / propertyValue.
   */
  calculatePremium(params: {
    coverageType: "basic" | "standard" | "premium";
    riskCategory: "low" | "medium" | "high";
    propertyType?: string;
    propertyValue?: number;
  }): number {
    const { coverageType, riskCategory, propertyType, propertyValue } = params;

    const basePremium = PREMIUM_TABLE[coverageType]?.[riskCategory] ?? PREMIUM_TABLE.basic.medium;

    let multiplier = 1.0;

    // Adjust for property type
    if (propertyType === "house" || propertyType === "townhouse") {
      multiplier += 0.1; // 10% surcharge for standalone houses
    } else if (propertyType === "room" || propertyType === "studio") {
      multiplier -= 0.1; // 10% discount for smaller units
    }

    // Adjust for high-value properties
    if (propertyValue && propertyValue > 200000) {
      multiplier += 0.15;
    } else if (propertyValue && propertyValue > 100000) {
      multiplier += 0.05;
    }

    return Math.round(basePremium * multiplier * 100) / 100;
  }

  /**
   * Get the insurance premium for a property by its ID.
   * Returns 0 if insurance is not enabled on the property.
   */
  async getPropertyInsurancePremium(propertyId: string): Promise<number> {
    try {
      const property = await Property.findById(propertyId).select("insurance").lean();
      if (!property?.insurance?.enabled) return 0;
      return property.insurance.monthlyPremium || 0;
    } catch (error: any) {
      logger.error(`InsuranceService: error fetching premium for property ${propertyId}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get insurance premium for a rental (looks up the property).
   * This is the method called by PaymentCalculationService.
   */
  async getRentalInsurancePremium(rentalId: string): Promise<number> {
    try {
      const rental = await Rental.findById(rentalId).select("propertyId").lean();
      if (!rental?.propertyId) return 0;
      return this.getPropertyInsurancePremium(rental.propertyId.toString());
    } catch (error: any) {
      logger.error(`InsuranceService: error fetching premium for rental ${rentalId}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get the pricing breakdown for a property listing.
   * Used by the landlord during listing creation to preview the numbers.
   */
  getListingBreakdown(params: {
    desiredRent: number;
    coverageType: "basic" | "standard" | "premium";
    riskCategory: "low" | "medium" | "high";
    pricingModel: "included_in_rent" | "added_to_rent";
    propertyType?: string;
    propertyValue?: number;
  }): {
    desiredRent: number;
    insurancePremium: number;
    pricingModel: string;
    landlordReceives: number;
    tenantPays: number;
  } {
    const premium = this.calculatePremium({
      coverageType: params.coverageType,
      riskCategory: params.riskCategory,
      propertyType: params.propertyType,
      propertyValue: params.propertyValue,
    });

    if (params.pricingModel === "included_in_rent") {
      return {
        desiredRent: params.desiredRent,
        insurancePremium: premium,
        pricingModel: "included_in_rent",
        landlordReceives: Math.round((params.desiredRent - premium) * 100) / 100,
        tenantPays: params.desiredRent,
      };
    }

    // added_to_rent
    return {
      desiredRent: params.desiredRent,
      insurancePremium: premium,
      pricingModel: "added_to_rent",
      landlordReceives: params.desiredRent,
      tenantPays: Math.round((params.desiredRent + premium) * 100) / 100,
    };
  }

  /**
   * Return the full premium table (for frontend display / documentation).
   */
  getPremiumTable(): Record<string, Record<string, number>> {
    return PREMIUM_TABLE;
  }
}

export const insuranceService = new InsuranceService();
