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
  };
  
  // Landlord details
  landlord: {
    name: string;
    email: string;
  };
  
  // Tenant details
  tenant: {
    name: string;
    email: string;
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
      address: { type: String, required: true }
    },
    landlord: {
      name: { type: String, required: true },
      email: { type: String, required: true }
    },
    tenant: {
      name: { type: String, required: true },
      email: { type: String, required: true }
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

