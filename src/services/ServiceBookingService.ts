// @ts-nocheck
import { ServiceBooking, IServiceBooking } from "../models/ServiceBooking";
import { ServiceReminder, IServiceReminder } from "../models/ServiceReminder";
import { Rental } from "../models/Rental";
import mongoose from "mongoose";

class ServiceBookingService {
  /**
   * Book a new service
   */
  async bookService(
    userId: string,
    userRole: "tenant" | "landlord",
    data: {
      rentalId: string;
      serviceType: string;
      customServiceName?: string;
      title: string;
      description: string;
      urgency?: string;
      requestedDate: Date;
      paidBy: "tenant" | "landlord" | "split";
      photoUrls?: string[];
      videoUrls?: string[];
      isRecurring?: boolean;
      recurringInterval?: number;
      tenantNotes?: string;
      landlordNotes?: string;
    }
  ): Promise<IServiceBooking> {
    // Get rental to extract property, landlord, tenant info
    const rental = await Rental.findById(data.rentalId);
    
    if (!rental) {
      throw new Error("Rental not found");
    }
    
    // Verify user is part of this rental
    const landlordIdStr = rental.landlordId.toString();
    const tenantIdStr = rental.tenantId.toString();
    const userIdStr = userId.toString();
    
    console.log("🔍 Service Booking Debug:");
    console.log("  - Rental ID:", data.rentalId);
    console.log("  - User ID:", userIdStr);
    console.log("  - Landlord ID:", landlordIdStr);
    console.log("  - Tenant ID:", tenantIdStr);
    console.log("  - User Role:", userRole);
    
    if (landlordIdStr !== userIdStr && tenantIdStr !== userIdStr) {
      console.log("❌ Authorization failed:");
      console.log("  - landlordIdStr !== userIdStr:", landlordIdStr !== userIdStr);
      console.log("  - tenantIdStr !== userIdStr:", tenantIdStr !== userIdStr);
      throw new Error("You are not authorized to book services for this rental");
    }
    
    console.log("✅ Authorization passed");
    
    // Calculate next service due if recurring
    let nextServiceDue = null;
    if (data.isRecurring && data.recurringInterval) {
      nextServiceDue = new Date(data.requestedDate);
      nextServiceDue.setMonth(nextServiceDue.getMonth() + data.recurringInterval);
    }
    
    // Determine initial status
    // If landlord books and pays, auto-approve
    // If tenant books, requires landlord approval
    const initialStatus = userRole === "landlord" && data.paidBy === "landlord"
      ? "approved"
      : "pending_landlord_approval";
    
    // Create service booking
    const service = await ServiceBooking.create({
      rentalId: rental._id,
      agreementId: rental.agreementId,
      propertyId: rental.propertyId,
      landlordId: rental.landlordId,
      tenantId: rental.tenantId,
      
      serviceType: data.serviceType,
      customServiceName: data.customServiceName,
      
      title: data.title,
      description: data.description,
      urgency: data.urgency || "medium",
      
      photoUrls: data.photoUrls || [],
      videoUrls: data.videoUrls || [],
      
      requestedDate: data.requestedDate,
      
      paidBy: data.paidBy,
      paymentStatus: "unpaid",
      
      status: initialStatus,
      
      requestedBy: userId,
      requestedByRole: userRole,
      
      tenantNotes: data.tenantNotes,
      landlordNotes: data.landlordNotes,
      landlordProvidedVendor: data.landlordProvidedVendor,
      
      isRecurring: data.isRecurring || false,
      recurringInterval: data.recurringInterval,
      nextServiceDue,
      
      // Auto-approve fields if landlord books
      approvedBy: initialStatus === "approved" ? new mongoose.Types.ObjectId(userId) : undefined,
      approvedAt: initialStatus === "approved" ? new Date() : undefined
    });
    
    console.log(`✅ Service booked: ${service._id} (${service.serviceType})`);
    
    // TODO: Send notification to other party
    
    return service;
  }

  /**
   * Get all services for a rental
   */
  async getServicesForRental(
    rentalId: string,
    userId: string,
    filters?: {
      status?: string;
      serviceType?: string;
      paidBy?: string;
      urgency?: string;
    }
  ): Promise<IServiceBooking[]> {
    // Verify user has access to this rental
    const rental = await Rental.findById(rentalId);
    
    if (!rental) {
      throw new Error("Rental not found");
    }
    
    const landlordIdStr = rental.landlordId.toString();
    const tenantIdStr = rental.tenantId.toString();
    const userIdStr = userId.toString();
    
    console.log("🔍 Get Services Debug:");
    console.log("  - Rental ID:", rentalId);
    console.log("  - User ID:", userIdStr);
    console.log("  - Landlord ID:", landlordIdStr);
    console.log("  - Tenant ID:", tenantIdStr);
    
    if (landlordIdStr !== userIdStr && tenantIdStr !== userIdStr) {
      console.log("❌ Get Services Authorization failed:");
      console.log("  - landlordIdStr !== userIdStr:", landlordIdStr !== userIdStr);
      console.log("  - tenantIdStr !== userIdStr:", tenantIdStr !== userIdStr);
      throw new Error("You are not authorized to view services for this rental");
    }
    
    console.log("✅ Get Services Authorization passed");
    
    // Build query
    const query: any = { rentalId };
    
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.serviceType) {
      query.serviceType = filters.serviceType;
    }
    if (filters?.paidBy) {
      query.paidBy = filters.paidBy;
    }
    if (filters?.urgency) {
      query.urgency = filters.urgency;
    }
    
    const services = await ServiceBooking.find(query)
      .populate("requestedBy", "firstName lastName")
      .populate("approvedBy", "firstName lastName")
      .sort({ createdAt: -1 });
    
    return services;
  }

  /**
   * Get service by ID
   */
  async getServiceById(
    serviceId: string,
    userId: string
  ): Promise<IServiceBooking> {
    const service = await ServiceBooking.findById(serviceId)
      .populate("requestedBy", "firstName lastName email phoneNumber")
      .populate("approvedBy", "firstName lastName")
      .populate("assignedAdmin", "firstName lastName")
      .populate("rentalId")
      .populate("propertyId");
    
    if (!service) {
      throw new Error("Service not found");
    }
    
    // Verify user has access
    const landlordIdStr = service.landlordId.toString();
    const tenantIdStr = service.tenantId.toString();
    
    if (landlordIdStr !== userId && tenantIdStr !== userId) {
      throw new Error("You are not authorized to view this service");
    }
    
    return service;
  }

  /**
   * Landlord approves service request
   */
  async approveLandlordService(
    serviceId: string,
    landlordId: string,
    data?: {
      approvalNotes?: string;
      hasVendor: boolean;
    }
  ): Promise<IServiceBooking> {
    const service = await ServiceBooking.findById(serviceId);
    
    if (!service) {
      throw new Error("Service not found");
    }
    
    // Verify user is the landlord
    const landlordIdStr = service.landlordId.toString();
    const userIdStr = landlordId.toString();
    
    console.log("🔍 Approve Service Debug:");
    console.log("  - Service ID:", serviceId);
    console.log("  - User ID:", userIdStr);
    console.log("  - Landlord ID:", landlordIdStr);
    
    if (landlordIdStr !== userIdStr) {
      console.log("❌ Approve Service Authorization failed:");
      console.log("  - landlordIdStr !== userIdStr:", landlordIdStr !== userIdStr);
      throw new Error("Only the landlord can approve this service");
    }
    
    console.log("✅ Approve Service Authorization passed");
    
    // Only allow approval if status is pending_landlord_approval
    if (service.status !== "pending_landlord_approval") {
      throw new Error(`Cannot approve service with status: ${service.status}`);
    }
    
    // Simple boolean: does landlord have vendor or not
    service.status = data?.hasVendor ? "scheduled" : "approved";
    service.approvedBy = new mongoose.Types.ObjectId(landlordId);
    service.approvedAt = new Date();
    service.approvalNotes = data?.approvalNotes;
    
    if (data?.hasVendor) {
      // Landlord has vendor - service is scheduled
      service.scheduledDate = service.requestedDate;
    } else {
      // Landlord has no vendor - admin will assign
      // Status remains "approved" for admin to assign vendor
    }
    
    await service.save();
    
    console.log(`✅ Service approved by landlord: ${serviceId}`);
    
    // TODO: Send notification to tenant
    // TODO: Send notification to admin (if pending_assignment)
    
    return service;
  }

  /**
   * Landlord rejects service request
   */
  async rejectLandlordService(
    serviceId: string,
    landlordId: string,
    rejectionReason: string
  ): Promise<IServiceBooking> {
    const service = await ServiceBooking.findById(serviceId);
    
    if (!service) {
      throw new Error("Service not found");
    }
    
    // Verify user is the landlord
    const landlordIdStr = service.landlordId.toString();
    const userIdStr = landlordId.toString();
    
    console.log("🔍 Reject Service Debug:");
    console.log("  - Service ID:", serviceId);
    console.log("  - User ID:", userIdStr);
    console.log("  - Landlord ID:", landlordIdStr);
    
    if (landlordIdStr !== userIdStr) {
      console.log("❌ Reject Service Authorization failed:");
      console.log("  - landlordIdStr !== userIdStr:", landlordIdStr !== userIdStr);
      throw new Error("Only the landlord can reject this service");
    }
    
    console.log("✅ Reject Service Authorization passed");
    
    // Only allow rejection if status is pending_landlord_approval
    if (service.status !== "pending_landlord_approval") {
      throw new Error(`Cannot reject service with status: ${service.status}`);
    }
    
    if (!rejectionReason) {
      throw new Error("Rejection reason is required");
    }
    
    // Update service
    service.status = "rejected";
    service.rejectedBy = new mongoose.Types.ObjectId(landlordId);
    service.rejectedAt = new Date();
    service.rejectionReason = rejectionReason;
    
    await service.save();
    
    console.log(`❌ Service rejected by landlord: ${serviceId}`);
    
    // TODO: Send notification to tenant
    
    return service;
  }

  /**
   * Cancel service
   */
  async cancelService(
    serviceId: string,
    userId: string,
    reason?: string
  ): Promise<IServiceBooking> {
    const service = await ServiceBooking.findById(serviceId);
    
    if (!service) {
      throw new Error("Service not found");
    }
    
    // Verify user has access
    const landlordIdStr = service.landlordId.toString();
    const tenantIdStr = service.tenantId.toString();
    const userIdStr = userId.toString();
    
    console.log("🔍 Cancel Service Debug:");
    console.log("  - Service ID:", serviceId);
    console.log("  - User ID:", userIdStr);
    console.log("  - Landlord ID:", landlordIdStr);
    console.log("  - Tenant ID:", tenantIdStr);
    
    if (landlordIdStr !== userIdStr && tenantIdStr !== userIdStr) {
      console.log("❌ Cancel Service Authorization failed:");
      console.log("  - landlordIdStr !== userIdStr:", landlordIdStr !== userIdStr);
      console.log("  - tenantIdStr !== userIdStr:", tenantIdStr !== userIdStr);
      throw new Error("You are not authorized to cancel this service");
    }
    
    console.log("✅ Cancel Service Authorization passed");
    
    // Only allow cancellation if not completed
    if (service.status === "completed") {
      throw new Error("Cannot cancel completed service");
    }
    
    service.status = "cancelled";
    
    if (userId === landlordIdStr) {
      service.landlordNotes = reason || "Cancelled by landlord";
    } else {
      service.tenantNotes = reason || "Cancelled by tenant";
    }
    
    await service.save();
    
    console.log(`❌ Service cancelled: ${serviceId}`);
    
    // TODO: Send notification to other party
    
    return service;
  }

  /**
   * Rate service (after completion)
   */
  async rateService(
    serviceId: string,
    userId: string,
    data: {
      rating: number;
      feedback?: string;
    }
  ): Promise<IServiceBooking> {
    const service = await ServiceBooking.findById(serviceId);
    
    if (!service) {
      throw new Error("Service not found");
    }
    
    // Verify user has access
    const landlordIdStr = service.landlordId.toString();
    const tenantIdStr = service.tenantId.toString();
    
    if (landlordIdStr !== userId && tenantIdStr !== userId) {
      throw new Error("You are not authorized to rate this service");
    }
    
    // Only allow rating for completed services
    if (service.status !== "completed") {
      throw new Error("Can only rate completed services");
    }
    
    if (data.rating < 1 || data.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }
    
    service.rating = data.rating;
    service.feedback = data.feedback;
    
    await service.save();
    
    console.log(`⭐ Service rated: ${serviceId} (${data.rating} stars)`);
    
    return service;
  }

  /**
   * Get all services for a user (across all rentals)
   */
  async getUserServices(
    userId: string,
    userRole: "tenant" | "landlord",
    filters?: {
      status?: string;
      serviceType?: string;
    }
  ): Promise<IServiceBooking[]> {
    const query: any = userRole === "tenant" ? { tenantId: userId } : { landlordId: userId };
    
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.serviceType) {
      query.serviceType = filters.serviceType;
    }
    
    const services = await ServiceBooking.find(query)
      .populate("rentalId")
      .populate("propertyId")
      .populate("requestedBy", "firstName lastName")
      .sort({ createdAt: -1 });
    
    return services;
  }

  /**
   * Get service reminders for user
   */
  async getServiceReminders(
    userId: string,
    userRole: "tenant" | "landlord"
  ): Promise<IServiceReminder[]> {
    const query: any = userRole === "tenant" ? { tenantId: userId } : { landlordId: userId };
    query.status = { $in: ["pending", "sent"] };
    
    const reminders = await ServiceReminder.find(query)
      .populate("rentalId")
      .sort({ dueDate: 1 });
    
    return reminders;
  }

  /**
   * Admin: Assign vendor to service
   */
  async assignVendor(
    serviceId: string,
    adminId: string,
    data: {
      serviceProvider: {
        name: string;
        phoneNumber: string;
        company?: string;
        rating?: number;
      };
      scheduledDate: Date;
      estimatedCost: number;
      adminNotes?: string;
    }
  ): Promise<IServiceBooking> {
    const service = await ServiceBooking.findById(serviceId);
    
    if (!service) {
      throw new Error("Service not found");
    }
    
    service.serviceProvider = data.serviceProvider;
    service.scheduledDate = data.scheduledDate;
    service.estimatedCost = data.estimatedCost;
    service.adminNotes = data.adminNotes;
    service.assignedAdmin = new mongoose.Types.ObjectId(adminId);
    service.status = "scheduled";
    
    await service.save();
    
    console.log(`👷 Vendor assigned to service: ${serviceId}`);
    
    // TODO: Send notifications to tenant and landlord
    
    return service;
  }

  /**
   * Admin: Update service status
   */
  async updateServiceStatus(
    serviceId: string,
    adminId: string,
    status: string,
    notes?: string
  ): Promise<IServiceBooking> {
    const service = await ServiceBooking.findById(serviceId);
    
    if (!service) {
      throw new Error("Service not found");
    }
    
    service.status = status as any;
    
    if (status === "completed") {
      service.completedDate = new Date();
      service.completionNotes = notes;
    }
    
    if (notes && !service.adminNotes) {
      service.adminNotes = notes;
    } else if (notes) {
      service.adminNotes += `\n${notes}`;
    }
    
    await service.save();
    
    console.log(`📊 Service status updated: ${serviceId} → ${status}`);
    
    // TODO: Send notifications
    
    return service;
  }

  /**
   * Admin: Create bill for service
   */
  async createServiceBill(
    serviceId: string,
    adminId: string,
    data: {
      finalCost: number;
      billDetails: any;
      invoiceUrl?: string;
      notes?: string;
    }
  ): Promise<IServiceBooking> {
    const service = await ServiceBooking.findById(serviceId);
    
    if (!service) {
      throw new Error("Service not found");
    }
    
    service.finalCost = data.finalCost;
    service.invoiceUrl = data.invoiceUrl;
    service.paymentStatus = "pending_approval";
    service.completionNotes = data.notes;
    
    // Auto-generate receipt number
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    service.receiptNumber = `SVC-${timestamp}-${random}`;
    
    await service.save();
    
    console.log(`💰 Bill created for service: ${serviceId} (K${data.finalCost})`);
    
    // TODO: Send notification to payer (tenant or landlord)
    
    return service;
  }

  /**
   * Pay for service
   */
  async payForService(
    serviceId: string,
    userId: string,
    data: {
      amount: number;
      paymentMethod: "in_app" | "cash";
      gatewayResponse?: any;
      proofOfPayment?: string;
    }
  ): Promise<IServiceBooking> {
    const service = await ServiceBooking.findById(serviceId);
    
    if (!service) {
      throw new Error("Service not found");
    }
    
    // Verify user is the payer
    const landlordIdStr = service.landlordId.toString();
    const tenantIdStr = service.tenantId.toString();
    
    if (service.paidBy === "landlord" && landlordIdStr !== userId) {
      throw new Error("Only landlord can pay for this service");
    }
    
    if (service.paidBy === "tenant" && tenantIdStr !== userId) {
      throw new Error("Only tenant can pay for this service");
    }
    
    if (service.paymentStatus === "paid") {
      throw new Error("Service already paid");
    }
    
    // Update payment status
    service.paymentStatus = "paid";
    
    // TODO: Integrate with payment gateway
    // TODO: Credit landlord balance if needed
    
    await service.save();
    
    console.log(`💳 Service paid: ${serviceId} (K${data.amount})`);
    
    return service;
  }

  /**
   * Admin: Get all service requests
   */
  async getAllServices(
    filters?: {
      status?: string;
      serviceType?: string;
      urgency?: string;
      assignedAdmin?: string;
    }
  ): Promise<IServiceBooking[]> {
    const query: any = {};
    
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.serviceType) {
      query.serviceType = filters.serviceType;
    }
    if (filters?.urgency) {
      query.urgency = filters.urgency;
    }
    if (filters?.assignedAdmin) {
      query.assignedAdmin = filters.assignedAdmin;
    }
    
    const services = await ServiceBooking.find(query)
      .populate("rentalId")
      .populate("propertyId")
      .populate("landlordId", "firstName lastName email phoneNumber")
      .populate("tenantId", "firstName lastName email phoneNumber")
      .populate("requestedBy", "firstName lastName")
      .populate("assignedAdmin", "firstName lastName")
      .sort({ createdAt: -1 });
    
    return services;
  }

  /**
   * Get all services for a landlord
   */
  async getLandlordServices(
    landlordId: string,
    filters?: {
      status?: string;
      serviceType?: string;
      propertyId?: string;
    }
  ): Promise<IServiceBooking[]> {
    const query: any = { landlordId: new mongoose.Types.ObjectId(landlordId) };
    
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.serviceType) {
      query.serviceType = filters.serviceType;
    }
    if (filters?.propertyId) {
      query.propertyId = new mongoose.Types.ObjectId(filters.propertyId);
    }
    
    const services = await ServiceBooking.find(query)
      .populate("tenantId", "firstName lastName email phoneNumber")
      .populate("propertyId", "title address")
      .populate("rentalId")
      .sort({ createdAt: -1 });
    
    return services;
  }

  /**
   * Get pending services for a landlord
   */
  async getLandlordPendingServices(landlordId: string): Promise<IServiceBooking[]> {
    const services = await ServiceBooking.find({
      landlordId: new mongoose.Types.ObjectId(landlordId),
      status: "pending_landlord_approval"
    })
      .populate("tenantId", "firstName lastName email phoneNumber")
      .populate("propertyId", "title address")
      .populate("rentalId")
      .sort({ createdAt: -1 });
    
    return services;
  }

  /**
   * Get service by ID (with authorization check)
   */
  async getServiceById(serviceId: string, userId: string): Promise<IServiceBooking> {
    const service = await ServiceBooking.findById(serviceId)
      .populate("landlordId", "firstName lastName email phoneNumber")
      .populate("tenantId", "firstName lastName email phoneNumber")
      .populate("propertyId", "title address")
      .populate("rentalId")
      .populate("agreementId", "title");
    
    if (!service) {
      throw new Error("Service not found");
    }
    
    // Verify user has access to this service
    const landlordIdStr = service.landlordId.toString();
    const tenantIdStr = service.tenantId.toString();
    const userIdStr = userId.toString();
    
    if (landlordIdStr !== userIdStr && tenantIdStr !== userIdStr) {
      throw new Error("You are not authorized to view this service");
    }
    
    return service;
  }

  /**
   * Admin: Assign vendor to approved service
   */
  async assignVendorToService(
    serviceId: string,
    adminId: string,
    vendorData: {
      name: string;
      phoneNumber: string;
      company?: string;
      scheduledDate?: Date;
    }
  ): Promise<IServiceBooking> {
    const service = await ServiceBooking.findById(serviceId);
    
    if (!service) {
      throw new Error("Service not found");
    }
    
    if (service.status !== "approved") {
      throw new Error("Service must be approved before assigning vendor");
    }
    
    service.status = "scheduled";
    service.serviceProvider = {
      name: vendorData.name,
      phoneNumber: vendorData.phoneNumber,
      company: vendorData.company
    };
    service.scheduledDate = vendorData.scheduledDate || service.requestedDate;
    service.assignedAdmin = new mongoose.Types.ObjectId(adminId);
    
    await service.save();
    
    console.log(`✅ Vendor assigned to service: ${serviceId}`);
    return service;
  }

  /**
   * Get services needing vendor assignment (for admin)
   */
  async getServicesNeedingVendorAssignment(): Promise<IServiceBooking[]> {
    const services = await ServiceBooking.find({
      status: "approved"
    })
      .populate("landlordId", "firstName lastName email phoneNumber")
      .populate("tenantId", "firstName lastName email phoneNumber")
      .populate("propertyId", "title address")
      .populate("rentalId")
      .sort({ createdAt: -1 });
    
    return services;
  }

  /**
   * Admin approves service (proceed) when landlord has no vendor
   * Sets status to scheduled (no vendor details needed per requirements)
   */
  async adminApproveService(
    serviceId: string,
    adminId: string,
    data?: { scheduledDate?: Date }
  ): Promise<IServiceBooking> {
    const service = await ServiceBooking.findById(serviceId);
    if (!service) {
      throw new Error("Service not found");
    }
    if (service.status !== "approved") {
      throw new Error(`Cannot approve service with status: ${service.status}`);
    }
    service.status = "scheduled";
    service.assignedAdmin = new mongoose.Types.ObjectId(adminId);
    service.scheduledDate = data?.scheduledDate || service.requestedDate;
    await service.save();
    return service;
  }

  /**
   * Admin rejects service after landlord requested admin to provide vendor
   */
  async adminRejectService(
    serviceId: string,
    adminId: string,
    rejectionReason: string
  ): Promise<IServiceBooking> {
    const service = await ServiceBooking.findById(serviceId);
    if (!service) {
      throw new Error("Service not found");
    }
    if (service.status !== "approved") {
      throw new Error(`Cannot reject service with status: ${service.status}`);
    }
    if (!rejectionReason) {
      throw new Error("rejectionReason is required");
    }
    service.status = "rejected";
    service.rejectedBy = new mongoose.Types.ObjectId(adminId);
    service.rejectedAt = new Date();
    service.rejectionReason = rejectionReason;
    await service.save();
    return service;
  }

  /**
   * Mark service as completed
   */
  async markServiceCompleted(
    serviceId: string,
    userId: string,
    completionData: {
      completionNotes?: string;
      finalCost?: number;
      photos?: string[];
    }
  ): Promise<IServiceBooking> {
    const service = await ServiceBooking.findById(serviceId);
    
    if (!service) {
      throw new Error("Service not found");
    }
    
    if (!["scheduled", "in_progress"].includes(service.status)) {
      throw new Error("Service must be scheduled or in progress to mark as completed");
    }
    
    service.status = "completed";
    service.completedDate = new Date();
    service.completionNotes = completionData.completionNotes;
    
    if (completionData.finalCost) {
      service.finalCost = completionData.finalCost;
    }
    
    if (completionData.photos) {
      service.photoUrls = [...(service.photoUrls || []), ...completionData.photos];
    }
    
    await service.save();
    
    console.log(`✅ Service completed: ${serviceId}`);
    return service;
  }

  /**
   * Get services with payment status
   */
  async getServicesWithPaymentStatus(
    userId: string,
    userRole: string,
    filters?: {
      status?: string;
      paymentStatus?: string;
      serviceType?: string;
    }
  ): Promise<IServiceBooking[]> {
    let query: any = {};
    
    if (userRole === "landlord") {
      query.landlordId = new mongoose.Types.ObjectId(userId);
    } else if (userRole === "tenant") {
      query.tenantId = new mongoose.Types.ObjectId(userId);
    }
    
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.paymentStatus) {
      query.paymentStatus = filters.paymentStatus;
    }
    if (filters?.serviceType) {
      query.serviceType = filters.serviceType;
    }
    
    const services = await ServiceBooking.find(query)
      .populate("landlordId", "firstName lastName email phoneNumber")
      .populate("tenantId", "firstName lastName email phoneNumber")
      .populate("propertyId", "title address")
      .populate("rentalId")
      .sort({ createdAt: -1 });
    
    return services;
  }
}

export const serviceBookingService = new ServiceBookingService();

