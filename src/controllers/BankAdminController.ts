// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { bankAdminService } from "../services/BankAdminService";

export class BankAdminController {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await bankAdminService.getSummary();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getHeldLandlordBreakdown(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await bankAdminService.getHeldLandlordBreakdown();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listLandlordPayouts(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(String(req.query.page || "1"), 10) || 1;
      const limit = parseInt(String(req.query.limit || "20"), 10) || 20;
      const status = String(req.query.status || "all").toLowerCase();

      const result = await bankAdminService.listLandlordPayouts({
        page,
        limit,
        status,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getLandlordPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const { payoutId } = req.params;
      const result = await bankAdminService.getLandlordPayoutById(payoutId);

      if (result.error === "invalid_id") {
        return res.status(400).json({
          success: false,
          message: "Invalid payout id.",
        });
      }
      if (result.error === "not_found") {
        return res.status(404).json({
          success: false,
          message: "Landlord payout not found.",
        });
      }

      res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      next(error);
    }
  }

  async listInsurancePartnerPayouts(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(String(req.query.page || "1"), 10) || 1;
      const limit = parseInt(String(req.query.limit || "20"), 10) || 20;
      const status = String(req.query.status || "all").toLowerCase();

      const result = await bankAdminService.listInsurancePartnerPayouts({
        page,
        limit,
        status,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getInsurancePartnerPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const { payoutId } = req.params;
      const result = await bankAdminService.getInsurancePartnerPayoutById(payoutId);

      if (result.error === "invalid_id") {
        return res.status(400).json({
          success: false,
          message: "Invalid payout id.",
        });
      }
      if (result.error === "not_found") {
        return res.status(404).json({
          success: false,
          message: "Insurance partner payout not found.",
        });
      }

      res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      next(error);
    }
  }

  async markInsurancePartnerPayoutPaid(req: Request, res: Response, next: NextFunction) {
    try {
      const { payoutId } = req.params;
      const bankAdminId = (req as any).user._id.toString();
      const { externalReference, notes } = req.body || {};

      const result = await bankAdminService.markInsurancePartnerPayoutPaid(
        payoutId,
        bankAdminId,
        { externalReference, notes },
      );

      if (result.error === "invalid_id") {
        return res.status(400).json({
          success: false,
          message: "Invalid payout id.",
        });
      }
      if (result.error === "not_found") {
        return res.status(404).json({
          success: false,
          message: "Insurance partner payout not found.",
        });
      }
      if (result.error === "already_completed") {
        return res.status(409).json({
          success: false,
          message: "This payout is already marked completed.",
        });
      }
      if (result.error === "cancelled_payout") {
        return res.status(409).json({
          success: false,
          message: "Cannot mark a cancelled payout as paid.",
        });
      }

      res.status(200).json({
        success: true,
        message:
          "Insurance payout marked as paid. Linked escrow rows updated with insurancePartnerPayoutStatus paid.",
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }

  async markLandlordPayoutPaid(req: Request, res: Response, next: NextFunction) {
    try {
      const { payoutId } = req.params;
      const bankAdminId = (req as any).user._id.toString();
      const { externalReference, notes } = req.body || {};

      const result = await bankAdminService.markLandlordPayoutPaid(
        payoutId,
        bankAdminId,
        { externalReference, notes },
      );

      if (result.error === "invalid_id") {
        return res.status(400).json({
          success: false,
          message: "Invalid payout id.",
        });
      }
      if (result.error === "not_found") {
        return res.status(404).json({
          success: false,
          message: "Landlord payout not found.",
        });
      }
      if (result.error === "already_completed") {
        return res.status(409).json({
          success: false,
          message: "This payout is already marked completed.",
        });
      }
      if (result.error === "cancelled_payout") {
        return res.status(409).json({
          success: false,
          message: "Cannot mark a cancelled payout as paid.",
        });
      }

      res.status(200).json({
        success: true,
        message: "Payout marked as paid. Linked escrow rows updated.",
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const bankAdminController = new BankAdminController();
