// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IProperty extends Document {
  landlordId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  propertyType: "apartment" | "house" | "room" | "studio" | "townhouse";
  listingType: "rent" | "sale";
  
  // Location
  address: {
    street: string;
    city: string;
    area?: string; // Neighborhood/district/area name
    state?: string;
    postalCode?: string;
    country: string;
    coordinates: {
      latitude?: number;
      longitude?: number;
    };
  };
  
  // Pricing
  price: number;
  deposit: number;
  zeroDepositAvailable: boolean;
  utilitiesIncluded: boolean;
  utilitiesCost?: number;
  serviceFeePayer: "landlord" | "tenant";
  
  // Property Details
  bedrooms: number;
  bathrooms: number;
  area: number; // in square meters
  floor: number;
  totalFloors: number;
  furnishingLevel: "unfurnished" | "semi_furnished" | "fully_furnished";
  
  // Amenities & Features
  amenities: string[];
  petFriendly: boolean;
  petOwnershipAllowed: boolean;
  proximityToTransport: {
    busStop: number; // distance in meters
    trainStation: number;
    taxiRank: number;
  };
  
  // Infrastructure
  boreholeAvailable: boolean;
  solarAvailable: boolean;
  backupPower: boolean;
  internetAvailable: boolean;
  parkingAvailable: boolean;
  parkingSpaces: number;
  parkingAllocation?: string; // e.g., "2 parking bays: B-05-01, B-05-02"
  accessCode?: string; // e.g., "Building code: 1234#"
  
  // Landlord Settings
  khayalamiAgentAssistance: boolean;
  viewingSchedule: {
    available: boolean;
    preferredTimes: string[];
    contactPhone: string;
  };
  
  // Media - Enhanced for better image management
  images: {
    mainImage: string; // Primary image for listing
    gallery: string[]; // Additional property images
    floorPlan?: string; // Floor plan image
    virtualTour?: string; // 360° tour URL
  };
  // Per-listing property ownership proof documents
  // e.g. ["https://.../ownership-deed.pdf"]
  propertyProofDocuments?: string[] | null;
 
  // Status
  status: "draft" | "published" | "rented" | "inactive";
  isVerified: boolean;
  isFeatured: boolean;
  
  // Insurance configuration (set by landlord during listing)
  insurance?: {
    enabled: boolean;
    coverageType: "basic" | "standard" | "premium";
    pricingModel: "included_in_rent" | "added_to_rent";
    monthlyPremium: number;
    propertyValue?: number;
    riskCategory?: "low" | "medium" | "high";
  };

  // Verification tracking
  verificationRejectionReason?: string;
  verifiedBy?: mongoose.Types.ObjectId;
  rejectedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  rejectedAt?: Date;
  adminFeedback?: string;
  
  // Timestamps
  availableFrom: Date;
  createdAt: Date;
  updatedAt: Date;
}

const propertySchema = new Schema<IProperty>(
  {
    landlordId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 2000 },
    propertyType: { 
      type: String, 
      enum: ["apartment", "house", "room", "studio", "townhouse"], 
      required: true 
    },
    listingType: { 
      type: String, 
      enum: ["rent", "sale"], 
      default: "rent" 
    },
    
    // Location
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      area: { type: String, required: false }, // Neighborhood/district/area name
      state: { type: String, required: false },
      postalCode: { type: String, required: false },
      country: { type: String, required: true, default: "South Africa" },
      coordinates: {
        latitude: { type: Number, required: false },
        longitude: { type: Number, required: false }
      }
    },
    
    // Pricing
    price: { type: Number, required: true, min: 0 },
    deposit: { type: Number, required: true, min: 0 },
    zeroDepositAvailable: { type: Boolean, default: false },
    utilitiesIncluded: { type: Boolean, default: false },
    utilitiesCost: { type: Number, min: 0 },
    serviceFeePayer: {
      type: String,
      enum: ["landlord", "tenant"],
      default: "landlord",
    },
    
    // Property Details
    bedrooms: { type: Number, required: true, min: 0 },
    bathrooms: { type: Number, required: true, min: 0 },
    area: { type: Number, required: true, min: 0 },
    // Negative values represent basement / lower-ground levels
    floor: { type: Number, min: -10 },
    totalFloors: { type: Number, min: 1 },
    furnishingLevel: { 
      type: String, 
      enum: ["unfurnished", "semi_furnished", "fully_furnished"], 
      required: true 
    },
    
    // Amenities & Features
    amenities: [{ type: String }],
    petFriendly: { type: Boolean, default: false },
    petOwnershipAllowed: { type: Boolean, default: false },
    proximityToTransport: {
      busStop: { type: Number, default: 0 },
      trainStation: { type: Number, default: 0 },
      taxiRank: { type: Number, default: 0 }
    },
    
    // Infrastructure
    boreholeAvailable: { type: Boolean, default: false },
    solarAvailable: { type: Boolean, default: false },
    backupPower: { type: Boolean, default: false },
    internetAvailable: { type: Boolean, default: false },
    parkingAvailable: { type: Boolean, default: false },
    parkingSpaces: { type: Number, default: 0 },
    parkingAllocation: { type: String },
    accessCode: { type: String },
    
    // Landlord Settings
    khayalamiAgentAssistance: { type: Boolean, default: false },
    viewingSchedule: {
      available: { type: Boolean, default: true },
      preferredTimes: [{ type: String }],
      contactPhone: { type: String }
    },
    
    // Media - Enhanced structure
    images: {
      mainImage: { type: String, required: true }, // Primary image is required
      gallery: [{ type: String }], // Additional images
      floorPlan: { type: String }, // Optional floor plan
      virtualTour: { type: String } // Optional virtual tour URL
    },
    // Per-listing property ownership proof documents
    // Existing properties will have this as null until updated
    propertyProofDocuments: {
      type: [String],
      default: null
    },
    
    // Status
    status: { 
      type: String, 
      enum: ["draft", "published", "rented", "inactive"], 
      default: "draft" 
    },
    isVerified: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    
    // Insurance configuration
    insurance: {
      enabled: { type: Boolean, default: false },
      coverageType: { type: String, enum: ["basic", "standard", "premium"], default: "basic" },
      pricingModel: { type: String, enum: ["included_in_rent", "added_to_rent"], default: "included_in_rent" },
      monthlyPremium: { type: Number, default: 0, min: 0 },
      propertyValue: { type: Number, min: 0 },
      riskCategory: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    },

    // Verification tracking
    verificationRejectionReason: { type: String },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    rejectedAt: { type: Date },
    adminFeedback: { type: String },
    
    // Timestamps
    availableFrom: { type: Date, required: true }
  },
  { timestamps: true }
);

// Indexes for better search performance
propertySchema.index({ "address.coordinates": "2dsphere" });
propertySchema.index({ landlordId: 1, status: 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ bedrooms: 1 });
propertySchema.index({ propertyType: 1 });
propertySchema.index({ status: 1, isVerified: 1 });

export const Property: Model<IProperty> = mongoose.model<IProperty>("Property", propertySchema); 