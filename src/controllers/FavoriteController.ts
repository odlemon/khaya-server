// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { favoriteService } from "../services/FavoriteService";
import { applyServiceFeeFields } from "../utils/serviceFee";

export class FavoriteController {

  /**
   * Add a property to favorites
   */
  async addToFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { propertyId, notes, priority, reminderDate } = req.body;

      if (!propertyId) {
        return res.status(400).json({
          success: false,
          message: "Property ID is required"
        });
      }

      const favorite = await favoriteService.addToFavorites({
        userId,
        propertyId,
        notes,
        priority,
        reminderDate: reminderDate ? new Date(reminderDate) : undefined
      });

      res.status(201).json({
        success: true,
        message: "Property added to favorites",
        data: favorite
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Remove a property from favorites
   */
  async removeFromFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { propertyId } = req.params;

      await favoriteService.removeFromFavorites(userId, propertyId);

      res.status(200).json({
        success: true,
        message: "Property removed from favorites"
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get user's favorite properties
   */
  async getUserFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { 
        page = 1, 
        limit = 10, 
        priority, 
        sortBy = "addedAt", 
        sortOrder = "desc" 
      } = req.query;

      const result = await favoriteService.getUserFavorites(userId, {
        page: Number(page),
        limit: Number(limit),
        priority: priority as "low" | "medium" | "high",
        sortBy: sortBy as "addedAt" | "priority" | "reminderDate",
        sortOrder: sortOrder as "asc" | "desc"
      });

      const enriched = result.favorites.map((fav: any) => {
        const obj = fav.toObject ? fav.toObject() : { ...fav };
        if (obj.propertyId && typeof obj.propertyId === "object") {
          applyServiceFeeFields(obj.propertyId);
        }
        return obj;
      });

      res.status(200).json({
        success: true,
        data: enriched,
        pagination: {
          page: result.page,
          limit: Number(limit),
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update favorite details
   */
  async updateFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { propertyId } = req.params;
      const { notes, priority, reminderDate } = req.body;

      const favorite = await favoriteService.updateFavorite(userId, propertyId, {
        notes,
        priority,
        reminderDate: reminderDate ? new Date(reminderDate) : undefined
      });

      res.status(200).json({
        success: true,
        message: "Favorite updated successfully",
        data: favorite
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Check if a property is favorited
   */
  async checkIfFavorited(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { propertyId } = req.params;

      const isFavorited = await favoriteService.isFavorited(userId, propertyId);

      res.status(200).json({
        success: true,
        data: { isFavorited }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get favorite count for a property
   */
  async getPropertyFavoriteCount(req: Request, res: Response, next: NextFunction) {
    try {
      const { propertyId } = req.params;

      const count = await favoriteService.getPropertyFavoriteCount(propertyId);

      res.status(200).json({
        success: true,
        data: { count }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get upcoming reminders
   */
  async getUpcomingReminders(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { days = 7 } = req.query;

      const reminders = await favoriteService.getUpcomingReminders(userId, Number(days));

      res.status(200).json({
        success: true,
        data: reminders
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Bulk add properties to favorites
   */
  async bulkAddToFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { propertyIds } = req.body;

      if (!propertyIds || !Array.isArray(propertyIds)) {
        return res.status(400).json({
          success: false,
          message: "Property IDs array is required"
        });
      }

      const result = await favoriteService.bulkAddToFavorites(userId, propertyIds);

      res.status(200).json({
        success: true,
        message: "Bulk operation completed",
        data: result
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get favorite statistics
   */
  async getFavoriteStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;

      const stats = await favoriteService.getFavoriteStats(userId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const favoriteController = new FavoriteController(); 