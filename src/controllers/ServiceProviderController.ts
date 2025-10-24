// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { serviceProviderService } from "../services/ServiceProviderService";

export class ServiceProviderController {
  async createProvider(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user._id;
      const data = await serviceProviderService.createProvider(adminId, req.body);
      res.status(201).json({ success: true, message: "Service provider created", data });
    } catch (error) { next(error); }
  }

  async getAllProviders(req: Request, res: Response, next: NextFunction) {
    try {
      const { serviceType, city, isActive, isVerified } = req.query;
      const filters: any = {};
      if (serviceType) filters.serviceType = serviceType as string;
      if (city) filters.city = city as string;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (isVerified !== undefined) filters.isVerified = isVerified === 'true';
      
      const data = await serviceProviderService.getAllProviders(filters);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getProviderById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = await serviceProviderService.getProviderById(id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async updateProvider(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user._id;
      const { id } = req.params;
      const data = await serviceProviderService.updateProvider(id, adminId, req.body);
      res.json({ success: true, message: "Service provider updated", data });
    } catch (error) { next(error); }
  }

  async verifyProvider(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user._id;
      const { id } = req.params;
      const { isVerified, verificationNotes } = req.body;
      const data = await serviceProviderService.verifyProvider(id, adminId, isVerified, verificationNotes);
      res.json({ success: true, message: `Provider ${isVerified ? 'verified' : 'unverified'}`, data });
    } catch (error) { next(error); }
  }

  async deleteProvider(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user._id;
      const { id } = req.params;
      await serviceProviderService.deleteProvider(id, adminId);
      res.json({ success: true, message: "Service provider deleted" });
    } catch (error) { next(error); }
  }

  async getProvidersByServiceType(req: Request, res: Response, next: NextFunction) {
    try {
      const { serviceType } = req.params;
      const data = await serviceProviderService.getProvidersByServiceType(serviceType);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
}

export const serviceProviderController = new ServiceProviderController();



