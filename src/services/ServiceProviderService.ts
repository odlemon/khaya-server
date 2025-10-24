// @ts-nocheck
import mongoose from "mongoose";
import { IServiceProvider, ServiceProvider } from "../models/ServiceProvider";

export class ServiceProviderService {
  private assertObjectId(id: string, label: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error(`${label} is invalid`);
    }
  }

  async createProvider(
    adminId: string,
    data: {
      name: string;
      company: string;
      phoneNumber: string;
      email: string;
      serviceTypes: string[];
      location: {
        city: string;
        area: string;
        coordinates?: {
          latitude: number;
          longitude: number;
        };
      };
      businessLicense?: string;
      insuranceNumber?: string;
      workingHours?: {
        start: string;
        end: string;
        days: string[];
      };
    }
  ): Promise<IServiceProvider> {
    this.assertObjectId(adminId, "adminId");

    const provider = await ServiceProvider.create({
      ...data,
      createdBy: adminId,
      isVerified: false,
      rating: 3,
      totalJobs: 0,
      isActive: true,
      stats: {
        completedJobs: 0,
        averageRating: 0,
        responseTime: 24,
        onTimeRate: 0
      }
    });

    console.log(`✅ Service provider created: ${provider.name} (${provider.company})`);
    return provider;
  }

  async getAllProviders(filters?: {
    serviceType?: string;
    city?: string;
    isActive?: boolean;
    isVerified?: boolean;
  }): Promise<IServiceProvider[]> {
    const query: any = {};
    
    if (filters?.serviceType) {
      query.serviceTypes = filters.serviceType;
    }
    if (filters?.city) {
      query["location.city"] = filters.city;
    }
    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    if (filters?.isVerified !== undefined) {
      query.isVerified = filters.isVerified;
    }

    return ServiceProvider.find(query)
      .populate("createdBy", "firstName lastName email")
      .sort({ rating: -1, totalJobs: -1 });
  }

  async getProviderById(id: string): Promise<IServiceProvider> {
    this.assertObjectId(id, "providerId");
    
    const provider = await ServiceProvider.findById(id)
      .populate("createdBy", "firstName lastName email");
    
    if (!provider) {
      throw new Error("Service provider not found");
    }
    
    return provider;
  }

  async updateProvider(
    id: string,
    adminId: string,
    data: {
      name?: string;
      company?: string;
      phoneNumber?: string;
      email?: string;
      serviceTypes?: string[];
      location?: {
        city: string;
        area: string;
        coordinates?: {
          latitude: number;
          longitude: number;
        };
      };
      businessLicense?: string;
      insuranceNumber?: string;
      workingHours?: {
        start: string;
        end: string;
        days: string[];
      };
      isActive?: boolean;
    }
  ): Promise<IServiceProvider> {
    this.assertObjectId(id, "providerId");
    this.assertObjectId(adminId, "adminId");

    const provider = await ServiceProvider.findById(id);
    if (!provider) {
      throw new Error("Service provider not found");
    }

    // Update fields
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        provider[key] = data[key];
      }
    });

    await provider.save();
    
    console.log(`✅ Service provider updated: ${provider.name}`);
    return provider;
  }

  async verifyProvider(
    id: string,
    adminId: string,
    isVerified: boolean,
    verificationNotes?: string
  ): Promise<IServiceProvider> {
    this.assertObjectId(id, "providerId");
    this.assertObjectId(adminId, "adminId");

    const provider = await ServiceProvider.findById(id);
    if (!provider) {
      throw new Error("Service provider not found");
    }

    provider.isVerified = isVerified;
    if (verificationNotes) {
      provider.verificationNotes = verificationNotes;
    }

    await provider.save();
    
    console.log(`✅ Service provider verification updated: ${provider.name} - ${isVerified ? 'Verified' : 'Unverified'}`);
    return provider;
  }

  async deleteProvider(id: string, adminId: string): Promise<void> {
    this.assertObjectId(id, "providerId");
    this.assertObjectId(adminId, "adminId");

    const provider = await ServiceProvider.findById(id);
    if (!provider) {
      throw new Error("Service provider not found");
    }

    // Check if provider has any active maintenance requests
    const { MaintenanceRequest } = await import("../models/MaintenanceRequest");
    const activeRequests = await MaintenanceRequest.find({
      "assignedVendor.vendorId": id,
      status: { $in: ["vendor_assigned", "in_progress"] }
    });

    if (activeRequests.length > 0) {
      throw new Error("Cannot delete provider with active maintenance requests");
    }

    await ServiceProvider.findByIdAndDelete(id);
    
    console.log(`✅ Service provider deleted: ${provider.name}`);
  }

  async getProvidersByServiceType(serviceType: string): Promise<IServiceProvider[]> {
    return ServiceProvider.find({
      serviceTypes: serviceType,
      isActive: true,
      isVerified: true
    }).sort({ rating: -1, stats: { completedJobs: -1 } });
  }

  async updateProviderStats(
    providerId: string,
    stats: {
      completedJobs?: number;
      averageRating?: number;
      responseTime?: number;
      onTimeRate?: number;
    }
  ): Promise<IServiceProvider> {
    this.assertObjectId(providerId, "providerId");

    const provider = await ServiceProvider.findById(providerId);
    if (!provider) {
      throw new Error("Service provider not found");
    }

    if (stats.completedJobs !== undefined) {
      provider.stats.completedJobs = stats.completedJobs;
    }
    if (stats.averageRating !== undefined) {
      provider.stats.averageRating = stats.averageRating;
    }
    if (stats.responseTime !== undefined) {
      provider.stats.responseTime = stats.responseTime;
    }
    if (stats.onTimeRate !== undefined) {
      provider.stats.onTimeRate = stats.onTimeRate;
    }

    await provider.save();
    return provider;
  }
}

export const serviceProviderService = new ServiceProviderService();



