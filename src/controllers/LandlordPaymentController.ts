import { Request, Response, NextFunction } from "express";
import { LandlordPaymentService } from "../services/LandlordPaymentService";

const landlordPaymentService = new LandlordPaymentService();

export class LandlordPaymentController {
  /**
   * Get landlord payments with commission details
   */
  async getLandlordPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user?.id;
      
      if (!landlordId) {
        return res.status(400).json({
          success: false,
          message: "Landlord ID is required"
        });
      }

      const filters = {
        status: req.query.status as string,
        paymentMethod: req.query.paymentMethod as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        page: req.query.page ? parseInt(req.query.page as string) : 1
      };

      const result = await landlordPaymentService.getLandlordPayments(landlordId, filters);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get landlord payment statistics
   */
  async getLandlordPaymentStats(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user?.id;
      
      if (!landlordId) {
        return res.status(400).json({
          success: false,
          message: "Landlord ID is required"
        });
      }

      const stats = await landlordPaymentService.getLandlordPaymentStats(landlordId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get landlord balance
   */
  async getLandlordBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user?.id;
      
      if (!landlordId) {
        return res.status(400).json({
          success: false,
          message: "Landlord ID is required"
        });
      }

      const balance = await landlordPaymentService.getLandlordBalance(landlordId);

      res.json({
        success: true,
        data: balance
      });
    } catch (error) {
      next(error);
    }
  }
}

export const landlordPaymentController = new LandlordPaymentController();
