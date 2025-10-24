// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { serviceBookingService } from "../services/ServiceBookingService";

export class ServiceBookingController {
  /**
   * Book a new service
   * POST /api/services/book
   */
  async bookService(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      
      const {
        rentalId,
        serviceType,
        customServiceName,
        title,
        description,
        urgency,
        requestedDate,
        paidBy,
        photoUrls,
        videoUrls,
        isRecurring,
        recurringInterval,
        tenantNotes,
        landlordNotes
      } = req.body;
      
      // Validation
      if (!rentalId || !serviceType || !title || !description || !requestedDate || !paidBy) {
        return res.status(400).json({
          success: false,
          message: "Required fields: rentalId, serviceType, title, description, requestedDate, paidBy"
        });
      }
      
      const service = await serviceBookingService.bookService(userId, userRole, {
        rentalId,
        serviceType,
        customServiceName,
        title,
        description,
        urgency,
        requestedDate,
        paidBy,
        photoUrls,
        videoUrls,
        isRecurring,
        recurringInterval,
        tenantNotes,
        landlordNotes
      });
      
      res.status(201).json({
        success: true,
        message: "Service request created successfully",
        data: service
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get all services for a rental
   * GET /api/services/rental/:rentalId
   */
  async getServicesForRental(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { rentalId } = req.params;
      const { status, serviceType, paidBy, urgency } = req.query;
      
      const services = await serviceBookingService.getServicesForRental(rentalId, userId, {
        status: status as string,
        serviceType: serviceType as string,
        paidBy: paidBy as string,
        urgency: urgency as string
      });
      
      res.json({
        success: true,
        data: services
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get service by ID
   * GET /api/services/:serviceId
   */
  async getServiceById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { serviceId } = req.params;
      
      const service = await serviceBookingService.getServiceById(serviceId, userId);
      
      res.json({
        success: true,
        data: service
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Landlord approves service request
   * POST /api/services/:serviceId/approve
   */
  async approveLandlordService(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user._id;
      const { serviceId } = req.params;
      const { approvalNotes, hasVendor } = req.body;
      
      if (typeof hasVendor !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: "hasVendor must be a boolean (true/false)"
        });
      }
      
      const service = await serviceBookingService.approveLandlordService(serviceId, landlordId, {
        approvalNotes,
        hasVendor
      });
      
      res.json({
        success: true,
        message: "Service approved successfully",
        data: service
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Landlord rejects service request
   * POST /api/services/:serviceId/reject
   */
  async rejectLandlordService(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user._id;
      const { serviceId } = req.params;
      const { rejectionReason } = req.body;
      
      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message: "rejectionReason is required"
        });
      }
      
      const service = await serviceBookingService.rejectLandlordService(serviceId, landlordId, rejectionReason);
      
      res.json({
        success: true,
        message: "Service rejected",
        data: service
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Cancel service
   * PUT /api/services/:serviceId/cancel
   */
  async cancelService(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { serviceId } = req.params;
      const { reason } = req.body;
      
      const service = await serviceBookingService.cancelService(serviceId, userId, reason);
      
      res.json({
        success: true,
        message: "Service cancelled successfully",
        data: service
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Rate service
   * POST /api/services/:serviceId/rate
   */
  async rateService(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { serviceId } = req.params;
      const { rating, feedback } = req.body;
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5"
        });
      }
      
      const service = await serviceBookingService.rateService(serviceId, userId, {
        rating,
        feedback
      });
      
      res.json({
        success: true,
        message: "Thank you for your feedback!",
        data: service
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get all services for user (across all rentals)
   * GET /api/services/history
   */
  async getUserServices(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { status, serviceType } = req.query;
      
      const services = await serviceBookingService.getUserServices(userId, userRole, {
        status: status as string,
        serviceType: serviceType as string
      });
      
      res.json({
        success: true,
        data: services
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get service reminders
   * GET /api/services/reminders
   */
  async getServiceReminders(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      
      const reminders = await serviceBookingService.getServiceReminders(userId, userRole);
      
      res.json({
        success: true,
        data: reminders
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Pay for service
   * POST /api/services/:serviceId/pay
   */
  async payForService(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { serviceId } = req.params;
      const { amount, paymentMethod, gatewayResponse, proofOfPayment } = req.body;
      
      if (!amount || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: "Amount and paymentMethod are required"
        });
      }
      
      const service = await serviceBookingService.payForService(serviceId, userId, {
        amount,
        paymentMethod,
        gatewayResponse,
        proofOfPayment
      });
      
      res.json({
        success: true,
        message: "Payment successful",
        data: service
      });
    } catch (error: any) {
      next(error);
    }
  }

  // ========== ADMIN ENDPOINTS ==========

  /**
   * Admin: Get all service requests
   * GET /api/admin/services
   */
  async getAllServices(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, serviceType, urgency, assignedAdmin } = req.query;
      
      const services = await serviceBookingService.getAllServices({
        status: status as string,
        serviceType: serviceType as string,
        urgency: urgency as string,
        assignedAdmin: assignedAdmin as string
      });
      
      res.json({
        success: true,
        data: services
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Admin: Assign vendor to service
   * PUT /api/admin/services/:serviceId/assign
   */
  async assignVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user._id;
      const { serviceId } = req.params;
      const { serviceProvider, scheduledDate, estimatedCost, adminNotes } = req.body;
      
      if (!serviceProvider || !scheduledDate || !estimatedCost) {
        return res.status(400).json({
          success: false,
          message: "serviceProvider, scheduledDate, and estimatedCost are required"
        });
      }
      
      const service = await serviceBookingService.assignVendor(serviceId, adminId, {
        serviceProvider,
        scheduledDate,
        estimatedCost,
        adminNotes
      });
      
      res.json({
        success: true,
        message: "Vendor assigned successfully",
        data: service
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Admin: Update service status
   * PUT /api/admin/services/:serviceId/status
   */
  async updateServiceStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user._id;
      const { serviceId } = req.params;
      const { status, notes } = req.body;
      
      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Status is required"
        });
      }
      
      const service = await serviceBookingService.updateServiceStatus(serviceId, adminId, status, notes);
      
      res.json({
        success: true,
        message: "Service status updated",
        data: service
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Admin: Create bill for service
   * POST /api/admin/services/:serviceId/bill
   */
  async createServiceBill(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user._id;
      const { serviceId } = req.params;
      const { finalCost, billDetails, invoiceUrl, notes } = req.body;
      
      if (!finalCost) {
        return res.status(400).json({
          success: false,
          message: "finalCost is required"
        });
      }
      
      const service = await serviceBookingService.createServiceBill(serviceId, adminId, {
        finalCost,
        billDetails,
        invoiceUrl,
        notes
      });
      
      res.json({
        success: true,
        message: "Bill created successfully",
        data: service
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get all services for a landlord
   */
  async getLandlordServices(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user._id;
      const { status, serviceType, propertyId } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status as string;
      if (serviceType) filters.serviceType = serviceType as string;
      if (propertyId) filters.propertyId = propertyId as string;
      
      const services = await serviceBookingService.getLandlordServices(landlordId, filters);
      
      res.json({
        success: true,
        data: services
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get pending services for a landlord
   */
  async getLandlordPendingServices(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user._id;
      
      const services = await serviceBookingService.getLandlordPendingServices(landlordId);
      
      res.json({
        success: true,
        data: services
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get service by ID
   */
  async getServiceById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { serviceId } = req.params;
      
      const service = await serviceBookingService.getServiceById(serviceId, userId);
      
      res.json({
        success: true,
        data: service
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Admin: Get services needing vendor assignment
   */
  async getServicesNeedingVendorAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const services = await serviceBookingService.getServicesNeedingVendorAssignment();
      
      res.json({
        success: true,
        data: services
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Admin: Assign vendor to service
   */
  async assignVendorToService(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user._id;
      const { serviceId } = req.params;
      const { name, phoneNumber, company, scheduledDate } = req.body;
      
      if (!name || !phoneNumber) {
        return res.status(400).json({
          success: false,
          message: "Vendor name and phone number are required"
        });
      }
      
      const service = await serviceBookingService.assignVendorToService(serviceId, adminId, {
        name,
        phoneNumber,
        company,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined
      });
      
      res.json({
        success: true,
        message: "Vendor assigned successfully",
        data: service
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Mark service as completed
   */
  async markServiceCompleted(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { serviceId } = req.params;
      const { completionNotes, finalCost, photos } = req.body;
      
      const service = await serviceBookingService.markServiceCompleted(serviceId, userId, {
        completionNotes,
        finalCost,
        photos
      });
      
      res.json({
        success: true,
        message: "Service marked as completed",
        data: service
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get services with payment status
   */
  async getServicesWithPaymentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { status, paymentStatus, serviceType } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status as string;
      if (paymentStatus) filters.paymentStatus = paymentStatus as string;
      if (serviceType) filters.serviceType = serviceType as string;
      
      const services = await serviceBookingService.getServicesWithPaymentStatus(userId, userRole, filters);
      
      res.json({
        success: true,
        data: services
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Admin: Approve service (schedule) when landlord asked admin to provide vendor
   * POST /api/services/admin/:serviceId/approve
   */
  async adminApproveService(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user._id;
      const { serviceId } = req.params;
      const { scheduledDate } = req.body || {};
      const service = await serviceBookingService.adminApproveService(
        serviceId,
        adminId,
        { scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined }
      );
      res.json({ success: true, message: "Service approved and scheduled", data: service });
    } catch (error: any) { next(error); }
  }

  /**
   * Admin: Reject service
   * POST /api/services/admin/:serviceId/reject
   */
  async adminRejectService(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user._id;
      const { serviceId } = req.params;
      const { rejectionReason } = req.body || {};
      if (!rejectionReason) {
        return res.status(400).json({ success: false, message: "rejectionReason is required" });
      }
      const service = await serviceBookingService.adminRejectService(serviceId, adminId, rejectionReason);
      res.json({ success: true, message: "Service rejected", data: service });
    } catch (error: any) { next(error); }
  }
}

export const serviceBookingController = new ServiceBookingController();

