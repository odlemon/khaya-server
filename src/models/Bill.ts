// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IExpense extends Document {
  description: string;
  amount: number;
  category: string;
  date: Date;
  receipt?: string; // URL to receipt image
  isReimbursable: boolean;
  status: "pending" | "approved" | "rejected";
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  notes?: string;
}

export interface IBill extends Document {
  matterId: string; // The matter/case ID this bill belongs to
  billNumber: string; // Unique bill number
  title: string;
  description?: string;
  
  // Bill details
  totalAmount: number;
  currency: string;
  billDate: Date;
  dueDate: Date;
  
  // Status and workflow
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  paymentStatus: "pending" | "partial" | "paid" | "overdue";
  
  // Expenses breakdown
  expenses: IExpense[];
  
  // Client information
  clientId: mongoose.Types.ObjectId; // Reference to User (landlord/tenant)
  propertyId?: mongoose.Types.ObjectId; // Reference to Property
  
  // Billing information
  billingAddress: {
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  
  // Payment information
  paymentMethod?: string;
  paymentReference?: string;
  paidAt?: Date;
  
  // Metadata
  createdBy: mongoose.Types.ObjectId; // Who created the bill
  lastModifiedBy: mongoose.Types.ObjectId;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>({
  description: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  receipt: { type: String },
  isReimbursable: { type: Boolean, default: true },
  status: { 
    type: String, 
    enum: ["pending", "approved", "rejected"], 
    default: "pending" 
  },
  approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  approvedAt: { type: Date },
  notes: { type: String }
}, { timestamps: true });

const billSchema = new Schema<IBill>({
  matterId: { type: String, required: true, trim: true, index: true },
  billNumber: { type: String, required: true, unique: true, trim: true }, // unique: true creates index automatically
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  
  // Bill details
  totalAmount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, default: "ZAR" },
  billDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  
  // Status
  status: { 
    type: String, 
    enum: ["draft", "sent", "paid", "overdue", "cancelled"], 
    default: "draft" 
  },
  paymentStatus: { 
    type: String, 
    enum: ["pending", "partial", "paid", "overdue"], 
    default: "pending" 
  },
  
  // Expenses
  expenses: [expenseSchema],
  
  // References
  clientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  propertyId: { type: Schema.Types.ObjectId, ref: "Property" },
  
  // Billing address
  billingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String, required: true, default: "South Africa" }
  },
  
  // Payment information
  paymentMethod: { type: String },
  paymentReference: { type: String },
  paidAt: { type: Date },
  
  // Metadata
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  lastModifiedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

// Indexes for better performance
billSchema.index({ matterId: 1, status: 1 });
billSchema.index({ clientId: 1, status: 1 });
// billNumber already has unique: true, so no need for separate index
billSchema.index({ billDate: -1 });
billSchema.index({ dueDate: 1 });

export const Bill: Model<IBill> = mongoose.model<IBill>("Bill", billSchema);
export const Expense: Model<IExpense> = mongoose.model<IExpense>("Expense", expenseSchema);




