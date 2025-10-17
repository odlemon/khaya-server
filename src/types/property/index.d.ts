// @ts-nocheck
export interface Property {
  id: string;
  landlordId: string;
  title: string;
  description: string;
  propertyType: PropertyType;
  listingType: ListingType;
  
  // Location
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    coordinates: {
      latitude: number;
      longitude: number;
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
  area: number;
  floor: number;
  totalFloors: number;
  furnishingLevel: FurnishingLevel;
  
  // Amenities & Features
  amenities: string[];
  petFriendly: boolean;
  petOwnershipAllowed: boolean;
  proximityToTransport: {
    busStop: number;
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
  
  // Media
  images: {
    mainImage: string;
    gallery: string[];
    floorPlan?: string;
    virtualTour?: string;
  };
  
  // Status
  status: PropertyStatus;
  isVerified: boolean;
  isFeatured: boolean;
  
  // Timestamps
  availableFrom: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum PropertyType {
  APARTMENT = "apartment",
  HOUSE = "house",
  ROOM = "room",
  STUDIO = "studio",
  TOWNHOUSE = "townhouse",
}

export enum ListingType {
  RENT = "rent",
  SALE = "sale",
}

export enum FurnishingLevel {
  UNFURNISHED = "unfurnished",
  SEMI_FURNISHED = "semi_furnished",
  FULLY_FURNISHED = "fully_furnished",
}

export enum PropertyStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  RENTED = "rented",
  INACTIVE = "inactive",
}

export interface PropertyFilters {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  propertyType?: PropertyType;
  furnishingLevel?: FurnishingLevel;
  petFriendly?: boolean;
  boreholeAvailable?: boolean;
  solarAvailable?: boolean;
  zeroDepositAvailable?: boolean;
  city?: string;
  status?: PropertyStatus;
}

export interface PropertySearchParams extends PropertyFilters {
  page?: number;
  limit?: number;
}

export interface LocationSearchParams {
  latitude: number;
  longitude: number;
  radius?: number;
  limit?: number;
}

export interface CreatePropertyRequest {
  title: string;
  description: string;
  propertyType: PropertyType;
  listingType?: ListingType;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  price: number;
  deposit: number;
  zeroDepositAvailable?: boolean;
  utilitiesIncluded?: boolean;
  utilitiesCost?: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  floor?: number;
  totalFloors?: number;
  furnishingLevel: FurnishingLevel;
  amenities?: string[];
  petFriendly?: boolean;
  petOwnershipAllowed?: boolean;
  proximityToTransport?: {
    busStop?: number;
    trainStation?: number;
    taxiRank?: number;
  };
  boreholeAvailable?: boolean;
  solarAvailable?: boolean;
  backupPower?: boolean;
  internetAvailable?: boolean;
  parkingAvailable?: boolean;
  parkingSpaces?: number;
  khayalamiAgentAssistance?: boolean;
  viewingSchedule?: {
    available?: boolean;
    preferredTimes?: string[];
    contactPhone?: string;
  };
  images: {
    mainImage: string;
    gallery?: string[];
    floorPlan?: string;
    virtualTour?: string;
  };
  availableFrom: Date;
}

export interface UpdatePropertyRequest extends Partial<CreatePropertyRequest> {
  status?: PropertyStatus;
  isVerified?: boolean;
  isFeatured?: boolean;
} 