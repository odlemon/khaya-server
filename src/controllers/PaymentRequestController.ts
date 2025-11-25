// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { paymentRequestService } from "../services/PaymentRequestService";

export class PaymentRequestController {
  /**
   * Create payment request (tenant submits external payment)
   * POST /api/payment-requests
   */
  async createPaymentRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?._id?.toString() || (req as any).user?._id || (req as any).user?.id || (req as any).user?.userId;
      const { rentalId, agreementId, amount, proofOfPayment, paymentMethod, notes, requestType, propertyId, landlordId } = req.body;

      if (!amount || !proofOfPayment || !paymentMethod) {
        res.status(400).json({
          success: false,
          message: "Missing required fields: amount, proofOfPayment, paymentMethod"
        });
        return;
      }

      const paymentRequest = await paymentRequestService.createPaymentRequest({
        tenantId: userId,
        rentalId,
        agreementId,
        amount,
        proofOfPayment,
        paymentMethod,
        notes,
        requestType,
        propertyId,
        landlordId
      });

      res.status(201).json({
        success: true,
        message: "Payment request submitted successfully. Waiting for admin approval.",
        data: paymentRequest
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get pending payment requests (admin only)
   * GET /api/payment-requests/pending
   */
  async getPendingRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        tenantId: req.query.tenantId as string | undefined,
        landlordId: req.query.landlordId as string | undefined
      };

      const paymentRequests = await paymentRequestService.getPendingRequests(filters);

      res.json({
        success: true,
        data: paymentRequests
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Approve payment request (admin only)
   * POST /api/payment-requests/:id/approve
   */
  async approvePaymentRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = (req as any).user?._id?.toString() || (req as any).user?._id || (req as any).user?.id || (req as any).user?.userId;

      const result = await paymentRequestService.approvePaymentRequest(id, adminId);

      res.json({
        success: true,
        message: "Payment request approved successfully",
        data: result
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Reject payment request (admin only)
   * POST /api/payment-requests/:id/reject
   */
  async rejectPaymentRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = (req as any).user?._id?.toString() || (req as any).user?._id || (req as any).user?.id || (req as any).user?.userId;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        res.status(400).json({
          success: false,
          message: "Rejection reason is required"
        });
        return;
      }

      const paymentRequest = await paymentRequestService.rejectPaymentRequest(id, adminId, rejectionReason);

      res.json({
        success: true,
        message: "Payment request rejected",
        data: paymentRequest
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get payment request by ID
   * GET /api/payment-requests/:id
   */
  async getPaymentRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const paymentRequest = await paymentRequestService.getPaymentRequest(id);

      if (!paymentRequest) {
        res.status(404).json({
          success: false,
          message: "Payment request not found"
        });
        return;
      }

      res.json({
        success: true,
        data: paymentRequest
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const paymentRequestController = new PaymentRequestController();
