// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { notificationService } from "../services/NotificationService";

export class NotificationController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id.toString();
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const unreadOnly = req.query.unreadOnly === "true";

      const result = await notificationService.list(userId, { page, limit, unreadOnly });

      res.json({
        success: true,
        message: "Notifications retrieved successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id.toString();
      const unreadCount = await notificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: { unreadCount },
      });
    } catch (error) {
      next(error);
    }
  }

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id.toString();
      const { id } = req.params;

      const notification = await notificationService.markRead(id, userId);

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      }

      res.json({
        success: true,
        message: "Notification marked as read",
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id.toString();
      const modifiedCount = await notificationService.markAllRead(userId);

      res.json({
        success: true,
        message: "All notifications marked as read",
        data: { modifiedCount },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
