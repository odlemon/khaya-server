// @ts-nocheck
import { IAgreement } from "../models/Agreement";
import { IUser } from "../models/User";
import { IProperty } from "../models/Property";

/**
 * Service to map database fields to Word template placeholders
 */
export class AgreementTemplateMappingService {
  
  /**
   * Convert number to words (for currency amounts)
   */
  private numberToWords(num: number, currency: string = "RM"): string {
    const ones = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
      "Seventeen", "Eighteen", "Nineteen"
    ];
    
    const tens = [
      "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    ];
    
    const scales = ["", "Thousand", "Million", "Billion"];
    
    if (num === 0) return "Zero";
    
    const convertHundreds = (n: number): string => {
      if (n === 0) return "";
      if (n < 20) return ones[n];
      if (n < 100) {
        const ten = Math.floor(n / 10);
        const one = n % 10;
        return tens[ten] + (one > 0 ? " " + ones[one] : "");
      }
      const hundred = Math.floor(n / 100);
      const remainder = n % 100;
      return ones[hundred] + " Hundred" + (remainder > 0 ? " " + convertHundreds(remainder) : "");
    };
    
    const convert = (n: number, scaleIndex: number): string => {
      if (n === 0) return "";
      const scale = scales[scaleIndex];
      const remainder = n % 1000;
      const quotient = Math.floor(n / 1000);
      const part = convertHundreds(remainder);
      const scalePart = scale ? " " + scale : "";
      const nextPart = convert(quotient, scaleIndex + 1);
      return nextPart + (nextPart && part ? " " : "") + part + scalePart;
    };
    
    const currencyName = currency === "RM" ? "Malaysian Ringgit" : "Dollars";
    const words = convert(num, 0).trim();
    return `${currencyName} ${words} Only`;
  }
  
  /**
   * Format date to DD/MM/YYYY
   */
  private formatDate(date: Date | string): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  /**
   * Format address object to string
   */
  private formatAddress(address: any): string {
    if (typeof address === 'string') return address;
    if (!address) return "";
    
    const parts = [
      address.street,
      address.city,
      address.state,
      address.postalCode,
      address.country
    ].filter(Boolean);
    
    return parts.join(", ");
  }
  
  /**
   * Calculate tenancy duration in words
   */
  private calculateTenancyDuration(startDate: Date, endDate: Date): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    const years = Math.floor(months / 12);
    
    if (years === 1) return "ONE (1) YEAR";
    if (years > 1) return `${this.numberToWords(years).toUpperCase().replace("MALAYSIAN RINGGIT", "").replace("ONLY", "").trim()} (${years}) YEARS`;
    if (months === 1) return "ONE (1) MONTH";
    if (months > 1) return `${this.numberToWords(months).toUpperCase().replace("MALAYSIAN RINGGIT", "").replace("ONLY", "").trim()} (${months}) MONTHS`;
    return "ONE (1) YEAR"; // Default
  }
  
  /**
   * Map all fields from database to template placeholders
   */
  mapAgreementToTemplate(
    agreement: IAgreement,
    landlord: IUser,
    tenant: IUser,
    property: IProperty
  ): Record<string, any> {
    // Get landlord bank details (from settings or preferences - to be added)
    const landlordBankAccount = (landlord as any).bankAccount || "";
    const landlordBankName = (landlord as any).bankName || "";
    const landlordAddress = this.formatAddress((landlord as any).address || landlord.profile?.location || "");
    
    // Get tenant address
    const tenantAddress = this.formatAddress((tenant as any).address || tenant.profile?.location || "");
    
    // Get property details
    const propertyPostcode = property.address?.postalCode || "";
    const propertyType = property.propertyType || "";
    const parkingAllocation = (property as any).parkingAllocation || "";
    const propertyAccessCode = (property as any).accessCode || "";
    
    // Get agreement extended fields
    const agreementDate = (agreement as any).agreementDate || agreement.createdAt;
    const earlyPaymentRentalAmount = (agreement as any).earlyPaymentRentalAmount || null;
    const utilityDepositAmount = (agreement as any).utilityDepositAmount || 0;
    const securityDepositMonths = (agreement as any).securityDepositMonths || 2;
    const renewalOptionPeriod = (agreement as any).renewalOptionPeriod || "One year only";
    const renewalNoticePeriod = (agreement as any).renewalNoticePeriod || "Two (2) months";
    const propertyUsePurpose = (agreement as any).propertyUsePurpose || "Residential Purpose Only";
    const minorRepairsLimit = (agreement as any).minorRepairsLimit || 20.00;
    const cleaningFee = (agreement as any).cleaningFee || null;
    const latePaymentInterestRate = (agreement as any).latePaymentInterestRate || 10;
    const landlordTerminationNotice = (agreement as any).landlordTerminationNotice || "1 month";
    const inventoryAddress = (agreement as any).inventoryAddress || this.formatAddress(property.address);
    const inventoryItems = (agreement as any).inventoryItems || [];
    const witnessName = (agreement as any).witnessName || "";
    const witnessId = (agreement as any).witnessId || "";
    const specialConditions = agreement.specialConditions?.join("\n") || "";
    
    // Calculate rental due date text
    const rentalDueDate = agreement.paymentSchedule?.dueDay 
      ? `Due and payable before the ${this.getOrdinal(agreement.paymentSchedule.dueDay)} day of each month`
      : "Due and payable before the 1st day of each month";
    
    // Payment method
    const rentalPaymentMethod = agreement.paymentSchedule?.frequency === "monthly"
      ? "Bank deposit with proof of payment"
      : "Bank deposit with proof of payment";
    
    // Map all fields - using exact field IDs from template JSON
    return {
      // Agreement header
      agreement_date: this.formatDate(agreementDate),
      
      // Landlord information (7 fields)
      landlord_name: `${landlord.firstName} ${landlord.lastName}`,
      landlord_nric: landlord.profile?.idNumber || "",
      landlord_phone: landlord.phone || "",
      landlord_address: landlordAddress,
      landlord_bank_account: landlordBankAccount,
      landlord_bank_name: landlordBankName,
      landlord_signature: agreement.landlordSignature?.signatureUrl || "[Signature]",
      
      // Tenant information (6 fields)
      tenant_name: `${tenant.firstName} ${tenant.lastName}`,
      tenant_id: tenant.profile?.idNumber || "",
      tenant_phone: tenant.phone || "",
      tenant_address: tenantAddress,
      tenant_email: tenant.email || "",
      tenant_signature: agreement.tenantSignature?.signatureUrl || "[Signature]",
      
      // Property information (8 fields)
      property_address: this.formatAddress(property.address),
      property_description: property.description || "",
      property_type: propertyType,
      property_postcode: propertyPostcode,
      parking_allocation: parkingAllocation,
      property_access_code: propertyAccessCode,
      inventory_address: inventoryAddress, // Also used in inventory section
      
      // Tenancy terms (3 fields)
      tenancy_term_duration: this.calculateTenancyDuration(agreement.startDate, agreement.endDate),
      tenancy_start_date: this.formatDate(agreement.startDate),
      tenancy_end_date: this.formatDate(agreement.endDate),
      
      // Financial terms (14 fields)
      monthly_rental_amount: agreement.rentAmount.toFixed(2),
      monthly_rental_text: this.numberToWords(agreement.rentAmount, "RM"),
      early_payment_rental_amount: earlyPaymentRentalAmount ? earlyPaymentRentalAmount.toFixed(2) : "",
      early_payment_rental_text: earlyPaymentRentalAmount ? this.numberToWords(earlyPaymentRentalAmount, "RM") : "",
      rental_due_date: rentalDueDate,
      rental_payment_method: rentalPaymentMethod,
      security_deposit_amount: agreement.depositAmount.toFixed(2),
      security_deposit_text: this.numberToWords(agreement.depositAmount, "RM"),
      security_deposit_months: securityDepositMonths.toString(),
      utility_deposit_amount: utilityDepositAmount.toFixed(2),
      utility_deposit_text: this.numberToWords(utilityDepositAmount, "RM"),
      minor_repairs_limit: minorRepairsLimit.toFixed(2),
      cleaning_fee: cleaningFee ? cleaningFee.toFixed(2) : "",
      late_payment_interest_rate: latePaymentInterestRate.toString(),
      
      // Agreement terms (9 fields)
      property_use_purpose: propertyUsePurpose,
      renewal_option_period: renewalOptionPeriod,
      renewal_notice_period: renewalNoticePeriod,
      landlord_termination_notice: landlordTerminationNotice,
      special_conditions: specialConditions,
      
      // Inventory (2 fields)
      inventory_items: inventoryItems.map((item: any) => {
        if (typeof item === 'string') return item;
        return `${item.item || item.name || ""}: ${item.quantity || ""}`;
      }).join("\n"),
      
      // Witness (3 fields - optional)
      witness_name: witnessName,
      witness_signature: (agreement as any).witnessSignature || "",
      witness_id: witnessId
    };
  }
  
  /**
   * Get ordinal number (1st, 2nd, 3rd, etc.)
   */
  private getOrdinal(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
}

export const agreementTemplateMappingService = new AgreementTemplateMappingService();

