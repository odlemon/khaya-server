// @ts-nocheck

export type ServiceFeePayer = "landlord" | "tenant";

export const PLATFORM_SERVICE_FEE = 10;

export interface ServiceFeeInfo {
  payer: ServiceFeePayer;
  amount: number;
}

export interface PropertyPricingEnrichment {
  serviceFee: ServiceFeeInfo;
  tenantPayableRent: number;
  landlordRentBeforeOtherDeductions: number;
}

export function resolveServiceFeePayer(raw: unknown): ServiceFeePayer {
  if (raw === "tenant") return "tenant";
  return "landlord";
}

export function enrichPropertyPricing(
  baseRent: number,
  payer: ServiceFeePayer
): PropertyPricingEnrichment {
  const fee = PLATFORM_SERVICE_FEE;
  return {
    serviceFee: { payer, amount: fee },
    tenantPayableRent:
      payer === "tenant" ? baseRent + fee : baseRent,
    landlordRentBeforeOtherDeductions:
      payer === "landlord" ? Math.max(0, baseRent - fee) : baseRent,
  };
}

/**
 * Apply pricing enrichment fields onto a property plain object (mutates).
 */
export function applyServiceFeeFields(propertyObj: Record<string, any>): void {
  const payer = resolveServiceFeePayer(propertyObj.serviceFeePayer);
  const pricing = enrichPropertyPricing(propertyObj.price ?? 0, payer);
  propertyObj.serviceFee = pricing.serviceFee;
  propertyObj.tenantPayableRent = pricing.tenantPayableRent;
  propertyObj.landlordRentBeforeOtherDeductions =
    pricing.landlordRentBeforeOtherDeductions;
}
