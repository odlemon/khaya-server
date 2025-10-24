// @ts-nocheck
import mongoose from "mongoose";
import { IMaintenanceRequest, MaintenanceRequest } from "../models/MaintenanceRequest";
import { Rental } from "../models/Rental";

type Role = "tenant" | "landlord" | "admin";

export class MaintenanceService {
  private assertObjectId(id: string, label: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error(`${label} is invalid`);
    }
  }

  async createRequest(
    rentalId: string,
    userId: string,
    userRole: Role,
    data: {
      issueType: "plumbing" | "electrical" | "hvac" | "aircon" | "appliance" | "structural" | "pest_control" | "other";
      urgency: "low" | "medium" | "high" | "emergency";
      title: string;
      description: string;
      photoUrls?: string[];
      videoUrls?: string[];
    }
  ): Promise<IMaintenanceRequest> {
    this.assertObjectId(rentalId, "rentalId");
    const rental = await Rental.findById(rentalId);
    if (!rental) throw new Error("Rental not found");

    // Only tenant or landlord of this rental can create
    const allowed = [rental.tenantId.toString(), rental.landlordId.toString()].includes(userId.toString());
    if (!allowed) throw new Error("Not authorized to create maintenance for this rental");

    const request = await MaintenanceRequest.create({
      rentalId: rental._id,
      agreementId: rental.agreementId,
      propertyId: rental.propertyId,
      landlordId: rental.landlordId,
      tenantId: rental.tenantId,
      issueType: data.issueType,
      urgency: data.urgency,
      title: data.title,
      description: data.description,
      photoUrls: data.photoUrls || [],
      videoUrls: data.videoUrls || [],
      status: "pending"
    });
    return request;
  }

  async getMyRequests(userId: string, role: Role): Promise<IMaintenanceRequest[]> {
    this.assertObjectId(userId, "userId");
    
    const q = role === "tenant" ? { tenantId: userId } : role === "landlord" ? { landlordId: userId } : {};
    
    console.log("🔍 Get My Requests Debug:");
    console.log("  - User ID:", userId);
    console.log("  - Role:", role);
    console.log("  - Query:", q);
    
    try {
      const requests = await MaintenanceRequest.find(q)
        .populate("rentalId", "status startDate endDate")
        .populate("propertyId", "title address")
        .populate("landlordId", "firstName lastName email")
        .populate("tenantId", "firstName lastName email")
        .sort({ createdAt: -1 });
      
      console.log("  - Found requests:", requests.length);
      console.log("  - Statuses:", requests.map(r => ({ 
        id: r._id, 
        status: r.status, 
        title: r.title,
        createdAt: r.createdAt 
      })));
      
      return requests;
    } catch (error) {
      console.error("❌ Error fetching maintenance requests:", error);
      throw error;
    }
  }

  async getById(id: string, userId: string, role: Role): Promise<IMaintenanceRequest> {
    this.assertObjectId(id, "requestId");
    
    const req = await MaintenanceRequest.findById(id)
      .populate("rentalId", "status startDate endDate")
      .populate("propertyId", "title address")
      .populate("landlordId", "firstName lastName email")
      .populate("tenantId", "firstName lastName email");
      
    if (!req) throw new Error("Maintenance request not found");
    
    const allowed = [req.tenantId.toString(), req.landlordId.toString()].includes(userId.toString()) || role === "admin";
    if (!allowed) throw new Error("Not authorized to view this request");
    
    return req;
  }

  async cancel(id: string, userId: string): Promise<IMaintenanceRequest> {
    const req = await MaintenanceRequest.findById(id);
    if (!req) throw new Error("Maintenance request not found");
    if (req.tenantId.toString() !== userId.toString()) throw new Error("Only the tenant can cancel this request");
    if (!["pending", "approved"].includes(req.status)) throw new Error("Cannot cancel at this stage");
    req.status = "cancelled";
    await req.save();
    return req;
  }

  async landlordList(landlordId: string, status?: string): Promise<IMaintenanceRequest[]> {
    this.assertObjectId(landlordId, "landlordId");
    
    const q: any = { landlordId };
    if (status) q.status = status;
    
    console.log("🔍 Landlord List Debug:");
    console.log("  - Landlord ID:", landlordId);
    console.log("  - Status filter:", status);
    console.log("  - Query:", q);
    
    try {
      const requests = await MaintenanceRequest.find(q)
        .populate("rentalId", "status startDate endDate")
        .populate("propertyId", "title address")
        .populate("landlordId", "firstName lastName email")
        .populate("tenantId", "firstName lastName email")
        .sort({ createdAt: -1 });
      
      console.log("  - Found requests:", requests.length);
      console.log("  - Statuses:", requests.map(r => ({ 
        id: r._id, 
        status: r.status, 
        title: r.title 
      })));
      
      return requests;
    } catch (error) {
      console.error("❌ Error fetching landlord maintenance requests:", error);
      throw error;
    }
  }

  async approve(id: string, landlordId: string, notes?: string): Promise<IMaintenanceRequest> {
    const req = await MaintenanceRequest.findById(id);
    if (!req) throw new Error("Maintenance request not found");
    if (req.landlordId.toString() !== landlordId.toString()) throw new Error("Only landlord can approve");
    if (req.status !== "pending") throw new Error("Only pending requests can be approved");
    
    // Change status to awaiting_vendor (admin will assign vendor)
    req.status = "awaiting_vendor";
    if (notes) req.landlordNotes = notes;
    req.approvedAt = new Date();
    
    // Add vendor update
    req.vendorUpdates = req.vendorUpdates || [];
    req.vendorUpdates.push({
      message: "Request approved by landlord. Awaiting vendor assignment from Khayalami.",
      timestamp: new Date(),
      from: "landlord",
      type: "status_update"
    });
    
    await req.save();
    
    console.log("✅ Maintenance request approved, awaiting vendor assignment:", id);
    return req;
  }

  async reject(id: string, landlordId: string, reason: string): Promise<IMaintenanceRequest> {
    this.assertObjectId(id, "requestId");
    this.assertObjectId(landlordId, "landlordId");
    
    const req = await MaintenanceRequest.findById(id);
    if (!req) throw new Error("Maintenance request not found");
    if (req.landlordId.toString() !== landlordId.toString()) throw new Error("Only landlord can reject");
    if (req.status !== "pending") throw new Error("Only pending requests can be rejected");
    if (!reason) throw new Error("rejectionReason is required");
    
    console.log("🔍 Rejecting maintenance request:");
    console.log("  - Request ID:", id);
    console.log("  - Landlord ID:", landlordId);
    console.log("  - Current status:", req.status);
    console.log("  - Rejection reason:", reason);
    console.log("  - Tenant ID:", req.tenantId.toString());
    
    req.status = "rejected";
    req.rejectedAt = new Date();
    req.rejectionReason = reason;
    
    try {
      await req.save();
      console.log("  - ✅ Successfully rejected request");
      console.log("  - New status:", req.status);
      console.log("  - Rejected at:", req.rejectedAt);
      
      // Verify the request can be found by tenant
      const tenantRequests = await MaintenanceRequest.find({ tenantId: req.tenantId });
      console.log("  - Tenant can see", tenantRequests.length, "requests");
      console.log("  - Tenant request statuses:", tenantRequests.map(r => ({ id: r._id, status: r.status })));
      
      return req;
    } catch (error) {
      console.error("❌ Error rejecting maintenance request:", error);
      throw error;
    }
  }

  async progress(id: string, landlordId: string, notes?: string): Promise<IMaintenanceRequest> {
    const req = await MaintenanceRequest.findById(id);
    if (!req) throw new Error("Maintenance request not found");
    if (req.landlordId.toString() !== landlordId.toString()) throw new Error("Only landlord can progress");
    if (!["approved", "pending"].includes(req.status)) throw new Error("Can only progress pending/approved");
    req.status = "in_progress";
    if (notes) req.landlordNotes = notes;
    await req.save();
    return req;
  }

  async complete(id: string, actorId: string, role: Role, notes?: string): Promise<IMaintenanceRequest> {
    const req = await MaintenanceRequest.findById(id);
    if (!req) throw new Error("Maintenance request not found");
    const allowed = [req.tenantId.toString(), req.landlordId.toString()].includes(actorId.toString()) || role === "admin";
    if (!allowed) throw new Error("Not authorized to complete");
    if (!["in_progress", "vendor_assigned", "approved", "pending"].includes(req.status)) throw new Error("Cannot complete at this stage");
    
    req.status = "completed";
    req.resolutionNotes = notes;
    req.completedAt = new Date();
    req.workCompletedAt = new Date();
    
    // Add completion update
    req.vendorUpdates = req.vendorUpdates || [];
    req.vendorUpdates.push({
      message: `Maintenance work completed by ${role}. ${notes || 'Work finished successfully.'}`,
      timestamp: new Date(),
      from: role as "vendor" | "landlord" | "tenant" | "admin",
      type: "completion_update"
    });
    
    await req.save();
    return req;
  }

  // Admin methods
  async getAllRequests(filters?: {
    status?: string;
    issueType?: string;
    urgency?: string;
  }): Promise<IMaintenanceRequest[]> {
    const query: any = {};
    
    // Default to requests that need admin attention (awaiting_vendor, vendor_assigned, in_progress, completed)
    if (filters?.status) {
      query.status = filters.status;
    } else {
      query.status = { $in: ["awaiting_vendor", "vendor_assigned", "in_progress", "completed"] };
    }
    
    if (filters?.issueType) query.issueType = filters.issueType;
    if (filters?.urgency) query.urgency = filters.urgency;
    
    return MaintenanceRequest.find(query)
      .populate("rentalId", "status startDate endDate")
      .populate("propertyId", "title address")
      .populate("landlordId", "firstName lastName email")
      .populate("tenantId", "firstName lastName email")
      .sort({ createdAt: -1 });
  }

  async getAwaitingVendorRequests(): Promise<IMaintenanceRequest[]> {
    return MaintenanceRequest.find({ status: "awaiting_vendor" })
      .populate("rentalId", "status startDate endDate")
      .populate("propertyId", "title address")
      .populate("landlordId", "firstName lastName email")
      .populate("tenantId", "firstName lastName email")
      .sort({ createdAt: -1 });
  }

  async assignVendor(
    requestId: string, 
    adminId: string, 
    vendorId: string, 
    estimatedArrival?: Date
  ): Promise<IMaintenanceRequest> {
    const req = await MaintenanceRequest.findById(requestId);
    if (!req) throw new Error("Maintenance request not found");
    if (req.status !== "awaiting_vendor") throw new Error("Request must be awaiting vendor assignment");

    // Get vendor details
    const { ServiceProvider } = await import("../models/ServiceProvider");
    const vendor = await ServiceProvider.findById(vendorId);
    if (!vendor) throw new Error("Service provider not found");
    if (!vendor.isActive) throw new Error("Service provider is not active");

    // Check if vendor can handle this service type
    if (!vendor.serviceTypes.includes(req.issueType)) {
      throw new Error(`Vendor cannot handle ${req.issueType} services`);
    }

    // Assign vendor
    req.status = "vendor_assigned";
    req.assignedVendor = {
      vendorId: vendor._id,
      vendorName: vendor.name,
      phoneNumber: vendor.phoneNumber,
      company: vendor.company,
      email: vendor.email
    };
    req.vendorAssignedAt = new Date();
    if (estimatedArrival) req.estimatedArrival = estimatedArrival;

    // Add vendor assignment update
    req.vendorUpdates = req.vendorUpdates || [];
    req.vendorUpdates.push({
      message: `Vendor assigned: ${vendor.name} (${vendor.company}). ${estimatedArrival ? `ETA: ${estimatedArrival.toLocaleString()}` : 'ETA to be confirmed.'}`,
      timestamp: new Date(),
      from: "admin",
      type: "status_update"
    });

    await req.save();
    
    console.log(`✅ Vendor assigned to maintenance request: ${requestId}`);
    return req;
  }

  async updateVendorETA(
    requestId: string,
    adminId: string,
    estimatedArrival: Date,
    message?: string
  ): Promise<IMaintenanceRequest> {
    const req = await MaintenanceRequest.findById(requestId);
    if (!req) throw new Error("Maintenance request not found");
    if (!req.assignedVendor) throw new Error("No vendor assigned to this request");

    req.estimatedArrival = estimatedArrival;

    // Add ETA update
    req.vendorUpdates = req.vendorUpdates || [];
    req.vendorUpdates.push({
      message: message || `ETA updated: ${estimatedArrival.toLocaleString()}`,
      timestamp: new Date(),
      from: "admin",
      type: "eta_update"
    });

    await req.save();
    return req;
  }

  async markVendorArrived(
    requestId: string,
    adminId: string,
    message?: string
  ): Promise<IMaintenanceRequest> {
    const req = await MaintenanceRequest.findById(requestId);
    if (!req) throw new Error("Maintenance request not found");
    if (!req.assignedVendor) throw new Error("No vendor assigned to this request");
    if (req.status !== "vendor_assigned") throw new Error("Vendor must be assigned first");

    req.status = "in_progress";
    req.actualArrival = new Date();

    // Add arrival update
    req.vendorUpdates = req.vendorUpdates || [];
    req.vendorUpdates.push({
      message: message || "Vendor has arrived and work is in progress",
      timestamp: new Date(),
      from: "admin",
      type: "status_update"
    });

    await req.save();
    return req;
  }
}

export const maintenanceService = new MaintenanceService();


