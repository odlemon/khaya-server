// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { notificationService } from "../services/NotificationService";
import { pushTokenService } from "../services/PushTokenService";
import { isValidNotificationGroup } from "../utils/notificationGroup";

export class NotificationController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id.toString();
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const unreadOnly = req.query.unreadOnly === "true";
      const groupParam = req.query.group;
      const group = isValidNotificationGroup(groupParam) ? groupParam : undefined;

      if (groupParam !== undefined && group === undefined) {
        return res.status(400).json({
          success: false,
          message: "Invalid group. Use messages or actions.",
        });
      }

      const result = await notificationService.list(userId, {
        page,
        limit,
        unreadOnly,
        group,
      });

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
      const counts = await notificationService.getUnreadCountByGroup(userId);

      res.json({
        success: true,
        data: counts,
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
      const groupParam = req.query.group;
      const group = isValidNotificationGroup(groupParam) ? groupParam : undefined;

      if (groupParam !== undefined && group === undefined) {
        return res.status(400).json({
          success: false,
          message: "Invalid group. Use messages or actions.",
        });
      }

      const modifiedCount = await notificationService.markAllRead(userId, group);

      res.json({
        success: true,
        message: group
          ? `All ${group} notifications marked as read`
          : "All notifications marked as read",
        data: { modifiedCount, group: group || null },
      });
    } catch (error) {
      next(error);
    }
  }

  async registerDeviceToken(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id.toString();
      const { token, platform = "android" } = req.body;

      if (!token || typeof token !== "string") {
        return res.status(400).json({
          success: false,
          message: "FCM token is required",
        });
      }

      const normalizedPlatform = platform === "ios" ? "ios" : "android";

      await pushTokenService.upsertToken(userId, token, normalizedPlatform);

      res.json({
        success: true,
        message: "Device token registered",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Detach this device from the account, so push stops on logout.
   *
   * Removing by token value rather than by user is deliberate: the token belongs
   * to the handset, and leaving it attached is what kept delivering one person's
   * chats to a phone that had already signed out — or worse, to whoever signed in
   * on that handset next.
   */
  async unregisterDeviceToken(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id.toString();
      const token = req.body?.token;

      if (!token || typeof token !== "string") {
        return res.status(400).json({
          success: false,
          message: "FCM token is required",
        });
      }

      const removed = await pushTokenService.removeToken(userId, token);
      if (!removed) {
        // Token may be registered to a different account on a shared handset.
        await pushTokenService.removeTokenByValue(token);
      }

      res.json({
        success: true,
        message: "Device token removed",
      });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
