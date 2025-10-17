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
  
  // Status
  status: "draft" | "published" | "rented" | "inactive";
  isVerified: boolean;
  isFeatured: boolean;
  
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
    
    // Property Details
    bedrooms: { type: Number, required: true, min: 0 },
    bathrooms: { type: Number, required: true, min: 0 },
    area: { type: Number, required: true, min: 0 },
    floor: { type: Number, min: 0 },
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
    
    // Status
    status: { 
      type: String, 
      enum: ["draft", "published", "rented", "inactive"], 
      default: "draft" 
    },
    isVerified: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    
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