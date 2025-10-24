// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { adminReportsService } from "../services/AdminReportsService";

export class AdminReportsController {
  async getReports(req: Request, res: Response, next: NextFunction) {
    try {
      const { section = "overview", startDate, endDate, groupBy = "month", format = "json" } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      // Minimal: only overview for now
      if (section !== "overview") {
        return res.status(400).json({ success: false, message: "Only section=overview is implemented right now" });
      }

      const kpis = await adminReportsService.getOverview(start, end);
      const { series, tables } = await adminReportsService.getOverviewSeriesAndTables(groupBy as any, start, end);

      const payload = {
        success: true,
        meta: {
          section: "overview",
          range: { startDate: start?.toISOString() || null, endDate: end?.toISOString() || null },
          groupBy,
          format,
          generatedAt: new Date().toISOString()
        },
        kpis,
        series,
        tables
      };

      return res.json(payload);
    } catch (error) {
      next(error);
    }
  }
}

export const adminReportsController = new AdminReportsController();


