// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IInvoice extends Document {
  invoiceNumber: string;
  paymentId: mongoose.Types.ObjectId;
  rentalId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  landlordId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  
  // Dates
  invoiceDate: Date;
  dueDate: Date | null;
  paymentDate: Date | null;
  
  // Status
  status: "pending" | "partially_paid" | "fully_paid" | "overdue" | "cancelled";
  
  // Payment tracking
  amountPaid: number; // Total amount paid so far
  amountDue: number; // Remaining amount due
  
  // Property details
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
  
  // Landlord details
  landlord: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  
  // Tenant details
  tenant: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  
  // Rental period details
  rentalPeriod?: {
    startDate: Date;
    endDate: Date;
    monthlyRent: number;
  };
  
  // Line items
  lineItems: Array<{
    description: string;
    amount: number;
    quantity?: number;
  }>;
  
  // Totals
  subtotal: number;
  lateFee: number;
  total: number;
  
  // Payment info
  paymentMethod: string;
  receiptNumber: string | null;
  
  // Deductions breakdown (optional)
  deductions?: {
    subscriptionFee: number;
    processingFee: number;
    insurancePremium: number;
    totalDeductions: number;
    netRentAmount: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      unique: true // One invoice per payment
    },
    rentalId: {
      type: Schema.Types.ObjectId,
      ref: "Rental",
      required: true
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    landlordId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true
    },
    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    dueDate: {
      type: Date,
      default: null
    },
    paymentDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ["pending", "partially_paid", "fully_paid", "overdue", "cancelled"],
      default: "pending",
      required: true
    },
    amountPaid: {
      type: Number,
      default: 0
    },
    amountDue: {
      type: Number,
      required: true
    },
    property: {
      title: { type: String, required: true },
      address: { type: String, required: true },
      fullAddress: {
        street: { type: String },
        city: { type: String },
        province: { type: String },
        postalCode: { type: String },
        country: { type: String }
      },
      propertyType: { type: String },
      bedrooms: { type: Number },
      bathrooms: { type: Number }
    },
    landlord: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String },
      address: { type: String }
    },
    tenant: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String },
      address: { type: String }
    },
    rentalPeriod: {
      startDate: { type: Date },
      endDate: { type: Date },
      monthlyRent: { type: Number }
    },
    lineItems: [{
      description: { type: String, required: true },
      amount: { type: Number, required: true },
      quantity: { type: Number }
    }],
    subtotal: {
      type: Number,
      required: true
    },
    lateFee: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    },
    paymentMethod: {
      type: String,
      required: true
    },
    receiptNumber: {
      type: String,
      default: null
    },
    deductions: {
      subscriptionFee: { type: Number, default: 0 },
      processingFee: { type: Number, default: 0 },
      insurancePremium: { type: Number, default: 0 },
      totalDeductions: { type: Number, default: 0 },
      netRentAmount: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient queries
invoiceSchema.index({ rentalId: 1 });
invoiceSchema.index({ tenantId: 1 });
invoiceSchema.index({ paymentId: 1 });
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ createdAt: -1 });

export const Invoice: Model<IInvoice> = mongoose.model<IInvoice>(
  "Invoice",
  invoiceSchema
);

