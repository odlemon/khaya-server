// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { rentalReminderService } from "../services/RentalReminderService";
import { invoiceService } from "../services/InvoiceService";
import { Invoice } from "../models/Invoice";
import { buildInvoicePdfBuffer, getInvoicePdfFilename } from "../services/InvoicePdfService";
import { Types } from "mongoose";

export class TenantController {
  /**
   * Get upcoming rent reminders for tenant
   * GET /api/tenant/rental-reminders
   */
  async getUpcomingRentReminders(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user._id;
      const userRole = (req as any).user.role;

      if (userRole !== "tenant") {
        return res.status(403).json({
          success: false,
          message: "This endpoint is for tenants only"
        });
      }

      const reminders = await rentalReminderService.getUpcomingPaymentsForTenant(tenantId.toString());

      res.status(200).json({
        success: true,
        message: "Upcoming rent reminders retrieved successfully",
        data: reminders
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Generate invoice for a specific payment
   * GET /api/tenant/invoices/:paymentId
   */
  async generateInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentId } = req.params;
      const tenantId = (req as any).user._id;
      const userRole = (req as any).user.role;

      if (userRole !== "tenant") {
        return res.status(403).json({
          success: false,
          message: "This endpoint is for tenants only"
        });
      }

      if (!Types.ObjectId.isValid(paymentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment ID"
        });
      }

      const invoice = await invoiceService.generateInvoiceForPayment(paymentId, tenantId.toString());

      res.status(200).json({
        success: true,
        message: "Invoice generated successfully",
        data: invoice
      });
    } catch (error: any) {
      if (error.message === "Payment not found") {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      if (error.message.includes("Access denied")) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }

  /**
   * Get all invoices for tenant
   * GET /api/tenant/invoices?rentalId=xxx (rentalId is required)
   */
  /**
   * Download one invoice as a PDF.
   *
   * Open to the tenant it belongs to and to that property's landlord — the
   * landlord is a party to the tenancy and has no other way to obtain a copy.
   */
  async downloadInvoicePdf(req: Request, res: Response, next: NextFunction) {
    try {
      const { invoiceId } = req.params;
      const userId = (req as any).user._id.toString();

      if (!Types.ObjectId.isValid(invoiceId)) {
        return res.status(400).json({ success: false, message: "Invalid invoice ID" });
      }

      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        return res.status(404).json({ success: false, message: "Invoice not found" });
      }

      const isTenant = invoice.tenantId?.toString() === userId;
      const isLandlord = invoice.landlordId?.toString() === userId;
      if (!isTenant && !isLandlord) {
        return res.status(403).json({ success: false, message: "This invoice is not yours" });
      }

      const pdf = await buildInvoicePdfBuffer(invoice as any);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${getInvoicePdfFilename(invoice as any)}"`
      );
      res.setHeader("Content-Length", pdf.length.toString());
      return res.status(200).send(pdf);
    } catch (error) {
      next(error);
    }
  }

  async getAllInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { rentalId } = req.query;

      if (userRole !== "tenant") {
        return res.status(403).json({
          success: false,
          message: "This endpoint is for tenants only"
        });
      }

      // rentalId is required
      if (!rentalId) {
        return res.status(400).json({
          success: false,
          message: "rentalId query parameter is required"
        });
      }

      // Validate rentalId
      if (!Types.ObjectId.isValid(rentalId as string)) {
        return res.status(400).json({
          success: false,
          message: "Invalid rental ID"
        });
      }

      const invoices = await invoiceService.getAllInvoicesForTenant(
        tenantId.toString(),
        rentalId as string
      );

      res.status(200).json({
        success: true,
        message: "Invoices retrieved successfully for rental",
        data: invoices,
        count: invoices.length,
        rentalId: rentalId
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const tenantController = new TenantController();




