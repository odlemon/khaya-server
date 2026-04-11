// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { insuranceAdminService } from "../services/InsuranceAdminService";

export class InsuranceAdminController {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await insuranceAdminService.getSummary();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listPolicies(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(String(req.query.page || "1"), 10) || 1;
      const limit = parseInt(String(req.query.limit || "20"), 10) || 20;
      const statusRaw = String(req.query.status || "all").toLowerCase();
      const allowed = ["all", "in_force", "awaiting_signature", "ended"];
      const status = allowed.includes(statusRaw)
        ? statusRaw
        : "all";

      const result = await insuranceAdminService.listPolicies({
        page,
        limit,
        status,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getPolicyByPropertyId(req: Request, res: Response, next: NextFunction) {
    try {
      const { propertyId } = req.params;
      const result = await insuranceAdminService.getPolicyByPropertyId(propertyId);

      if (result.error === "invalid_id") {
        return res.status(400).json({
          success: false,
          message: "Invalid property id.",
        });
      }
      if (result.error === "not_found") {
        return res.status(404).json({
          success: false,
          message: "Property not found.",
        });
      }
      if (result.error === "insurance_not_enabled") {
        return res.status(404).json({
          success: false,
          message: "Insurance is not enabled on this property.",
        });
      }

      res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      next(error);
    }
  }
}

export const insuranceAdminController = new InsuranceAdminController();
