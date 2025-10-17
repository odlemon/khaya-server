// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IFavorite extends Document {
  userId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  addedAt: Date;
  notes?: string;
  priority: "low" | "medium" | "high";
  reminderDate?: Date;
}

const favoriteSchema = new Schema<IFavorite>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true },
  addedAt: { type: Date, default: Date.now },
  notes: { type: String, trim: true },
  priority: { 
    type: String, 
    enum: ["low", "medium", "high"], 
    default: "medium" 
  },
  reminderDate: { type: Date }
}, { 
  timestamps: true 
});

// Ensure a user can only favorite a property once
favoriteSchema.index({ userId: 1, propertyId: 1 }, { unique: true });

// Indexes for better query performance
favoriteSchema.index({ userId: 1, addedAt: -1 });
favoriteSchema.index({ userId: 1, priority: 1 });

export const Favorite: Model<IFavorite> = mongoose.model<IFavorite>("Favorite", favoriteSchema); 