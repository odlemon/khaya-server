// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { landlordPayoutMethodService } from "../services/LandlordPayoutMethodService";

export class LandlordPayoutMethodController {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user._id.toString();
      const data = await landlordPayoutMethodService.getPayoutMethod(landlordId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async put(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user._id.toString();
      const { method, bank, ecocash } = req.body || {};

      if (method === "bank") {
        const data = await landlordPayoutMethodService.setBankPayout(landlordId, bank);
        return res.status(200).json({
          success: true,
          message: "Bank account saved. EcoCash and other mobile methods were cleared.",
          data,
        });
      }

      if (method === "ecocash") {
        const data = await landlordPayoutMethodService.setEcocashPayout(landlordId, ecocash);
        return res.status(200).json({
          success: true,
          message: "EcoCash details saved. Bank details were cleared.",
          data,
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Body must include method: "bank" with bank { ... } or method: "ecocash" with ecocash { ... }',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to save payout method",
      });
    }
  }
}

export const landlordPayoutMethodController = new LandlordPayoutMethodController();
