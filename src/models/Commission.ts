import mongoose, { Document, Schema } from "mongoose";

export interface ICommission extends Document {
  transactionId: string;
  rentalId: string;
  landlordId: string;
  tenantId: string;
  paymentId: string;
  
  // Transaction details
  totalAmount: number;
  commissionRate: number; // 0.05 (5%)
  commissionAmount: number; // calculated
  
  // Payment method
  paymentMethod: "in_app" | "cash";
  
  // Commission status
  commissionStatus: "collected" | "owed" | "pending";
  
  // For cash payments - debt tracking
  isDebt: boolean;
  debtAmount: number;
  debtPaid: boolean;
  debtPaidAt?: Date;
  
  // For online payments - immediate collection
  collectedAt?: Date;
  collectedFromPaymentId?: string;
  
  // Additional tracking
  createdAt: Date;
  updatedAt: Date;
}

const CommissionSchema = new Schema<ICommission>({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  rentalId: {
    type: String,
    required: true
  },
  landlordId: {
    type: String,
    required: true
  },
  tenantId: {
    type: String,
    required: true
  },
  paymentId: {
    type: String,
    required: true
  },
  
  // Transaction details
  totalAmount: {
    type: Number,
    required: true
  },
  commissionRate: {
    type: Number,
    default: 0.05, // 5%
    required: true
  },
  commissionAmount: {
    type: Number,
    required: true
  },
  
  // Payment method
  paymentMethod: {
    type: String,
    enum: ["in_app", "cash"],
    required: true
  },
  
  // Commission status
  commissionStatus: {
    type: String,
    enum: ["collected", "owed", "pending"],
    default: "pending",
    required: true
  },
  
  // For cash payments - debt tracking
  isDebt: {
    type: Boolean,
    default: false
  },
  debtAmount: {
    type: Number,
    default: 0
  },
  debtPaid: {
    type: Boolean,
    default: false
  },
  debtPaidAt: {
    type: Date
  },
  
  // For online payments - immediate collection
  collectedAt: {
    type: Date
  },
  collectedFromPaymentId: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
CommissionSchema.index({ landlordId: 1, commissionStatus: 1 });
CommissionSchema.index({ paymentMethod: 1, commissionStatus: 1 });
CommissionSchema.index({ createdAt: -1 });
CommissionSchema.index({ isDebt: 1, debtPaid: 1 });

export default mongoose.model<ICommission>("Commission", CommissionSchema);
