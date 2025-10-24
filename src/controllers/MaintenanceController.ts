// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { maintenanceService } from "../services/MaintenanceService";

export class MaintenanceController {
  async createRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { rentalId } = req.params;
      const { issueType, urgency, title, description, photoUrls, videoUrls } = req.body || {};
      const data = await maintenanceService.createRequest(rentalId, userId, userRole, {
        issueType, urgency, title, description, photoUrls, videoUrls
      });
      res.status(201).json({ success: true, message: "Maintenance request created", data });
    } catch (error) { next(error); }
  }

  async getMyRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const role = (req as any).user.role;
      const data = await maintenanceService.getMyRequests(userId, role);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const role = (req as any).user.role;
      const { id } = req.params;
      const data = await maintenanceService.getById(id, userId, role);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { id } = req.params;
      const data = await maintenanceService.cancel(id, userId);
      res.json({ success: true, message: "Request cancelled", data });
    } catch (error) { next(error); }
  }

  async landlordList(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user._id;
      const { status } = req.query;
      const data = await maintenanceService.landlordList(landlordId, status as string);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user._id;
      const { id } = req.params;
      const { notes } = req.body || {};
      const data = await maintenanceService.approve(id, landlordId, notes);
      res.json({ success: true, message: "Request approved", data });
    } catch (error) { next(error); }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user._id;
      const { id } = req.params;
      const { rejectionReason } = req.body || {};
      const data = await maintenanceService.reject(id, landlordId, rejectionReason);
      res.json({ success: true, message: "Request rejected", data });
    } catch (error) { next(error); }
  }

  async progress(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user._id;
      const { id } = req.params;
      const { notes } = req.body || {};
      const data = await maintenanceService.progress(id, landlordId, notes);
      res.json({ success: true, message: "Request in progress", data });
    } catch (error) { next(error); }
  }

  async complete(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = (req as any).user._id;
      const role = (req as any).user.role;
      const { id } = req.params;
      const { notes } = req.body || {};
      const data = await maintenanceService.complete(id, actorId, role, notes);
      res.json({ success: true, message: "Request completed", data });
    } catch (error) { next(error); }
  }

  // Admin methods
  async getAllRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, issueType, urgency } = req.query;
      const filters: any = {};
      if (status) filters.status = status;
      if (issueType) filters.issueType = issueType;
      if (urgency) filters.urgency = urgency;
      
      const data = await maintenanceService.getAllRequests(filters);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getAwaitingVendorRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await maintenanceService.getAwaitingVendorRequests();
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async assignVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user._id;
      const { id } = req.params;
      const { vendorId, estimatedArrival } = req.body;
      const data = await maintenanceService.assignVendor(id, adminId, vendorId, estimatedArrival ? new Date(estimatedArrival) : undefined);
      res.json({ success: true, message: "Vendor assigned", data });
    } catch (error) { next(error); }
  }

  async updateVendorETA(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user._id;
      const { id } = req.params;
      const { estimatedArrival, message } = req.body;
      const data = await maintenanceService.updateVendorETA(id, adminId, new Date(estimatedArrival), message);
      res.json({ success: true, message: "ETA updated", data });
    } catch (error) { next(error); }
  }

  async markVendorArrived(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user._id;
      const { id } = req.params;
      const { message } = req.body || {};
      const data = await maintenanceService.markVendorArrived(id, adminId, message);
      res.json({ success: true, message: "Vendor marked as arrived", data });
    } catch (error) { next(error); }
  }
}

export const maintenanceController = new MaintenanceController();


