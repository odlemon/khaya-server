// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { rentalService } from "../services/RentalService";

export class RentalController {

  /**
   * Get user's rentals (landlord or tenant)
   */
  async getUserRentals(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      const rentals = await rentalService.getUserRentals(userId, userRole);

      res.status(200).json({
        success: true,
        data: rentals
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get rental dashboard (detailed view)
   */
  async getRentalDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { id } = req.params;

      const dashboard = await rentalService.getRentalDashboard(id, userId, userRole);

      res.status(200).json({
        success: true,
        data: dashboard
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create condition log
   */
  async createConditionLog(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { rentalId } = req.params;
      const { logType, customLabel, videoUrl, photoUrls, notes } = req.body;

      if (!logType) {
        return res.status(400).json({
          success: false,
          message: "Log type is required"
        });
      }

      if (!videoUrl) {
        return res.status(400).json({
          success: false,
          message: "Video is required"
        });
      }

      const log = await rentalService.createConditionLog(rentalId, userId, userRole, {
        logType,
        customLabel,
        videoUrl,
        photoUrls,
        notes
      });

      res.status(201).json({
        success: true,
        message: "Condition log created successfully",
        data: log
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update condition log
   */
  async updateConditionLog(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { conditionLogId } = req.params;
      const { logType, customLabel, videoUrl, photoUrls, notes } = req.body;

      const log = await rentalService.updateConditionLog(conditionLogId, userId, userRole, {
        logType,
        customLabel,
        videoUrl,
        photoUrls,
        notes
      });

      res.status(200).json({
        success: true,
        message: "Condition log updated successfully",
        data: log
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete condition log
   */
  async deleteConditionLog(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { conditionLogId } = req.params;

      await rentalService.deleteConditionLog(conditionLogId, userId, userRole);

      res.status(200).json({
        success: true,
        message: "Condition log deleted successfully"
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Submit payment proof
   */
  async submitPaymentProof(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { paymentId } = req.params;
      const { proofOfPayment, paymentMethod, paymentDate, utilityReceipts, notes } = req.body;

      if (!proofOfPayment) {
        return res.status(400).json({
          success: false,
          message: "Payment proof is required"
        });
      }

      if (!paymentMethod) {
        return res.status(400).json({
          success: false,
          message: "Payment method is required"
        });
      }

      const payment = await rentalService.submitPaymentProof(paymentId, userId, userRole, {
        proofOfPayment,
        paymentMethod,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        utilityReceipts,
        notes
      });

      res.status(200).json({
        success: true,
        message: "Payment proof submitted successfully",
        data: payment
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get condition logs for a rental
   */
  async getConditionLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { rentalId } = req.params;

      const logs = await rentalService.getConditionLogs(rentalId, userId, userRole);

      res.status(200).json({
        success: true,
        data: logs
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get payments for a rental
   */
  async getPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { rentalId } = req.params;

      const payments = await rentalService.getPayments(rentalId, userId, userRole);

      res.status(200).json({
        success: true,
        data: payments
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get maintenance requests for a rental
   */
  async getMaintenanceRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { rentalId } = req.params;

      const requests = await rentalService.getMaintenanceRequests(rentalId, userId, userRole);

      res.status(200).json({
        success: true,
        data: requests
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create maintenance request
   */
  async createMaintenanceRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { rentalId } = req.params;
      const { issueType, urgency, title, description, photoUrls, videoUrls } = req.body;

      if (!issueType || !urgency || !title || !description) {
        return res.status(400).json({
          success: false,
          message: "Issue type, urgency, title, and description are required"
        });
      }

      const request = await rentalService.createMaintenanceRequest(rentalId, userId, userRole, {
        issueType,
        urgency,
        title,
        description,
        photoUrls,
        videoUrls
      });

      res.status(201).json({
        success: true,
        message: "Maintenance request created successfully",
        data: request
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get service bookings for a rental
   */
  async getServiceBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { rentalId } = req.params;

      const bookings = await rentalService.getServiceBookings(rentalId, userId, userRole);

      res.status(200).json({
        success: true,
        data: bookings
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create service booking
   */
  async createServiceBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { rentalId } = req.params;
      const { serviceType, title, description, scheduledDate, cost, paidBy, serviceProvider, notes } = req.body;

      if (!serviceType || !title || !scheduledDate || !cost || !paidBy) {
        return res.status(400).json({
          success: false,
          message: "Service type, title, scheduled date, cost, and paidBy are required"
        });
      }

      const booking = await rentalService.createServiceBooking(rentalId, userId, userRole, {
        serviceType,
        title,
        description,
        scheduledDate: new Date(scheduledDate),
        cost,
        paidBy,
        serviceProvider,
        notes
      });

      res.status(201).json({
        success: true,
        message: "Service booking created successfully",
        data: booking
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Verify payment (landlord)
   */
  async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { paymentId } = req.params;
      const { verificationNotes } = req.body;

      const payment = await rentalService.verifyPayment(paymentId, userId, userRole, {
        verificationNotes
      });

      res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        data: payment
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Reject payment (landlord)
   */
  async rejectPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { paymentId } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required"
        });
      }

      const payment = await rentalService.rejectPayment(paymentId, userId, userRole, {
        rejectionReason
      });

      res.status(200).json({
        success: true,
        message: "Payment rejected",
        data: payment
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Dispute payment (both parties)
   */
  async disputePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { paymentId } = req.params;
      const { disputeReason } = req.body;

      if (!disputeReason) {
        return res.status(400).json({
          success: false,
          message: "Dispute reason is required"
        });
      }

      const payment = await rentalService.disputePayment(paymentId, userId, userRole, {
        disputeReason
      });

      res.status(200).json({
        success: true,
        message: "Payment marked as disputed",
        data: payment
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { rentalId } = req.params;

      const stats = await rentalService.getPaymentStats(rentalId, userId, userRole);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const rentalController = new RentalController();

