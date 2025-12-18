// @ts-nocheck
import { Payment } from "../models/Payment";
import { Rental } from "../models/Rental";
import { Property } from "../models/Property";
import { User } from "../models/User";
import { Agreement } from "../models/Agreement";
import { Invoice } from "../models/Invoice";
import { paymentCalculationService } from "./PaymentCalculationService";
import { Types } from "mongoose";
import { logger } from "../utils/logger";

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date | null;
  paymentDate: Date | null;
  status: "pending" | "partially_paid" | "fully_paid" | "overdue" | "cancelled";
  amountPaid: number;
  amountDue: number;
  property: {
    title: string;
    address: string;
    fullAddress?: {
      street?: string;
      city?: string;
      province?: string;
      postalCode?: string;
      country?: string;
    };
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
  };
  landlord: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  tenant: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  rentalPeriod?: {
    startDate: Date;
    endDate: Date;
    monthlyRent: number;
  };
  lineItems: Array<{
    description: string;
    amount: number;
    quantity?: number;
  }>;
  subtotal: number;
  lateFee: number;
  total: number;
  paymentMethod: string;
  receiptNumber: string | null;
  deductions?: {
    subscriptionFee: number;
    processingFee: number;
    insurancePremium: number;
    totalDeductions: number;
    netRentAmount: number;
  };
}

export class InvoiceService {
  /**
   * Generate and store invoice for a specific payment
   * Creates invoice if it doesn't exist, otherwise returns existing one
   */
  async generateInvoiceForPayment(paymentId: string, tenantId?: string): Promise<InvoiceData> {
    try {
      // Check if invoice already exists
      const existingInvoice = await Invoice.findOne({ paymentId: new Types.ObjectId(paymentId) });
      if (existingInvoice) {
        return this.convertInvoiceToData(existingInvoice);
      }

      // Fetch payment with all related data
      const payment = await Payment.findById(paymentId)
        .populate("rentalId", "propertyId landlordId tenantId monthlyRent startDate endDate")
        .populate("propertyId", "title address propertyType bedrooms bathrooms")
        .populate("landlordId", "firstName lastName email phone address")
        .populate("tenantId", "firstName lastName email phone address")
        .populate("agreementId", "rentAmount depositAmount startDate endDate");
      
      logger.info(`📄 Fetched payment ${paymentId} for invoice creation`);
      logger.info(`📄 Payment has rentalId: ${payment?.rentalId ? 'YES' : 'NO'}`);
      logger.info(`📄 Payment has propertyId: ${payment?.propertyId ? 'YES' : 'NO'}`);
      logger.info(`📄 Payment has landlordId: ${payment?.landlordId ? 'YES' : 'NO'}`);
      logger.info(`📄 Payment has tenantId: ${payment?.tenantId ? 'YES' : 'NO'}`);

      if (!payment) {
        logger.error(`❌ Payment ${paymentId} not found in database`);
        throw new Error("Payment not found");
      }

      // Extract related objects
      const property = payment.propertyId as any;
      const landlord = payment.landlordId as any;
      const tenant = payment.tenantId as any;
      const rental = payment.rentalId as any;

      // Get tenant ID from payment (handle both populated and unpopulated cases)
      const paymentTenantId = payment.tenantId?._id?.toString() || payment.tenantId?.toString() || payment.tenantId;
      
      // If rental is populated, try to get tenantId from rental as fallback
      const rentalTenantId = rental?.tenantId?._id?.toString() || rental?.tenantId?.toString() || rental?.tenantId;
      const actualTenantId = paymentTenantId || rentalTenantId;
      
      logger.info(`📄 Payment tenantId: ${paymentTenantId}`);
      logger.info(`📄 Rental tenantId: ${rentalTenantId}`);
      logger.info(`📄 Using tenantId: ${actualTenantId}`);
      
      if (!actualTenantId) {
        logger.error(`❌ No tenantId found in payment or rental`);
        throw new Error("Tenant ID not found in payment or rental");
      }

      // Get property address
      const propertyAddress = property?.address
        ? typeof property.address === 'string' 
          ? property.address
          : `${property.address.street || ""}, ${property.address.city || ""}`.trim()
        : property?.title || "Property";

      // Get full property address details
      const propertyFullAddress = property?.address && typeof property.address === 'object'
        ? {
            street: property.address.street || "",
            city: property.address.city || "",
            province: property.address.province || "",
            postalCode: property.address.postalCode || "",
            country: property.address.country || "Zambia"
          }
        : undefined;

      // Calculate deductions if payment is verified/paid
      let deductions = null;
      if (rental && (payment.status === "verified" || payment.status === "paid")) {
        try {
          deductions = await paymentCalculationService.calculateRentDeductions(
            payment.amount,
            tenantId,
            payment.landlordId.toString(),
            rental._id.toString()
          );
        } catch (error) {
          logger.warn("Could not calculate deductions for invoice:", error);
          // Continue without deductions if calculation fails
        }
      }

      // Build line items
      const lineItems: Array<{ description: string; amount: number; quantity?: number }> = [];

      // Base rent amount
      lineItems.push({
        description: "Monthly Rent",
        amount: payment.amount,
        quantity: 1
      });

      // Add deductions as line items (if applicable)
      if (deductions) {
        if (deductions.subscriptionFee > 0) {
          lineItems.push({
            description: "Subscription Fee",
            amount: deductions.subscriptionFee
          });
        }
        if (deductions.processingFee > 0) {
          lineItems.push({
            description: `Processing Fee (${(deductions.breakdown.processingFeeRate * 100).toFixed(1)}%)`,
            amount: deductions.processingFee
          });
        }
        if (deductions.insurancePremium > 0) {
          lineItems.push({
            description: "Insurance Premium",
            amount: deductions.insurancePremium
          });
        }
      }

      // Calculate totals
      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const lateFee = payment.lateFee || 0;
      const total = subtotal + lateFee;

      // Generate invoice number (use receiptNumber if exists, otherwise generate)
      const invoiceNumber = payment.receiptNumber 
        ? payment.receiptNumber.replace("REC-", "INV-")
        : this.generateInvoiceNumber(payment._id.toString());

      // Calculate amount due (total - lateFee, since lateFee is added separately)
      const amountDue = total;

      // Create and save invoice in database
      logger.info(`📄 Creating invoice document in database...`);
      logger.info(`📄 Invoice data: invoiceNumber=${invoiceNumber}, rentalId=${rental?._id || payment.rentalId}, tenantId=${payment.tenantId}`);
      
      const invoice = await Invoice.create({
        invoiceNumber,
        paymentId: payment._id, // Link to the payment record (for reference)
        rentalId: rental?._id || payment.rentalId,
        tenantId: actualTenantId,
        landlordId: payment.landlordId,
        propertyId: payment.propertyId,
        invoiceDate: payment.createdAt || new Date(),
        dueDate: payment.dueDate || null,
        paymentDate: null, // Will be set when payment is made
        status: "pending", // Invoice starts as pending
        amountPaid: 0, // No payment yet
        amountDue: amountDue,
        property: {
          title: property?.title || "Property",
          address: propertyAddress,
          fullAddress: propertyFullAddress,
          propertyType: property?.propertyType || undefined,
          bedrooms: property?.bedrooms || undefined,
          bathrooms: property?.bathrooms || undefined
        },
        landlord: {
          name: landlord ? `${landlord.firstName} ${landlord.lastName}` : "Landlord",
          email: landlord?.email || "",
          phone: landlord?.phone || undefined,
          address: landlord?.address || undefined
        },
        tenant: {
          name: tenant ? `${tenant.firstName} ${tenant.lastName}` : "Tenant",
          email: tenant?.email || "",
          phone: tenant?.phone || undefined,
          address: tenant?.address || undefined
        },
        rentalPeriod: rental ? {
          startDate: rental.startDate || new Date(),
          endDate: rental.endDate || new Date(),
          monthlyRent: rental.monthlyRent || payment.amount
        } : undefined,
        lineItems,
        subtotal,
        lateFee,
        total,
        paymentMethod: "pending", // Will be updated when payment is made
        receiptNumber: null, // Will be set when payment is made
        deductions: deductions ? {
          subscriptionFee: deductions.subscriptionFee,
          processingFee: deductions.processingFee,
          insurancePremium: deductions.insurancePremium,
          totalDeductions: deductions.khayalamiTotal,
          netRentAmount: deductions.netRentAmount
        } : undefined
      });

      logger.info(`✅ Invoice created and stored: ${invoiceNumber} for payment ${paymentId}`);
      logger.info(`✅ Invoice ID: ${invoice._id}`);
      logger.info(`✅ Invoice status: ${invoice.status}`);

      return this.convertInvoiceToData(invoice);
    } catch (error: any) {
      logger.error("❌ Error generating invoice:", error);
      throw error;
    }
  }

  /**
   * Convert Invoice document to InvoiceData format
   */
  private convertInvoiceToData(invoice: any): InvoiceData {
    return {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      paymentDate: invoice.paymentDate,
      status: invoice.status,
      amountPaid: invoice.amountPaid || 0,
      amountDue: invoice.amountDue || invoice.total,
      property: invoice.property || {
        title: "Property",
        address: ""
      },
      landlord: invoice.landlord || {
        name: "Landlord",
        email: ""
      },
      tenant: invoice.tenant || {
        name: "Tenant",
        email: ""
      },
      rentalPeriod: invoice.rentalPeriod,
      lineItems: invoice.lineItems || [],
      subtotal: invoice.subtotal,
      lateFee: invoice.lateFee || 0,
      total: invoice.total,
      paymentMethod: invoice.paymentMethod,
      receiptNumber: invoice.receiptNumber,
      deductions: invoice.deductions
    };
  }

  /**
   * Get all invoices for a tenant (all their payments)
   * rentalId is required
   * Fetches stored invoices from database
   */
  async getAllInvoicesForTenant(tenantId: string, rentalId: string): Promise<InvoiceData[]> {
    try {
      if (!rentalId || !Types.ObjectId.isValid(rentalId)) {
        throw new Error("Valid rentalId is required");
      }

      // Fetch stored invoices from database
      const invoices = await Invoice.find({
        tenantId: new Types.ObjectId(tenantId),
        rentalId: new Types.ObjectId(rentalId)
      })
        .sort({ createdAt: -1 })
        .limit(50); // Limit to last 50 invoices

      // Convert to InvoiceData format
      return invoices.map(invoice => this.convertInvoiceToData(invoice));
    } catch (error: any) {
      logger.error("❌ Error getting all invoices for tenant:", error);
      throw error;
    }
  }

  /**
   * Create invoice for a payment (called when payment is created/updated)
   * This ensures invoices are automatically created for all payments
   */
  async createInvoiceForPayment(paymentId: string): Promise<void> {
    try {
      // Check if invoice already exists
      const existingInvoice = await Invoice.findOne({ paymentId: new Types.ObjectId(paymentId) });
      if (existingInvoice) {
        logger.info(`Invoice already exists for payment ${paymentId}`);
        return;
      }

      const payment = await Payment.findById(paymentId)
        .populate("rentalId", "propertyId landlordId tenantId monthlyRent")
        .populate("propertyId", "title address")
        .populate("landlordId", "firstName lastName email")
        .populate("tenantId", "firstName lastName email");

      if (!payment || payment.paymentType !== "rent") {
        // Only create invoices for rent payments
        return;
      }

      // Generate invoice (this will create and store it)
      // tenantId will be extracted from payment/rental
      await this.generateInvoiceForPayment(paymentId);
    } catch (error: any) {
      logger.error(`❌ Error creating invoice for payment ${paymentId}:`, error);
      // Don't throw - invoice creation shouldn't break payment flow
    }
  }

  /**
   * Generate invoice number
   */
  private generateInvoiceNumber(paymentId: string): string {
    const timestamp = Date.now();
    const shortId = paymentId.slice(-6).toUpperCase();
    return `INV-${timestamp}-${shortId}`;
  }
}

export const invoiceService = new InvoiceService();

