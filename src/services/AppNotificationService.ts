// @ts-nocheck
import { notificationService, CreateNotificationInput } from "./NotificationService";
import { getSocketService } from "./realtimeRegistry";
import { getActiveAdminUserIds } from "../utils/adminRecipients";
import { INotification, NotificationType } from "../models/Notification";
import { fcmService } from "./FcmService";
import { logger } from "../utils/logger";

export type AppNotifyInput = CreateNotificationInput;

class AppNotificationService {
  async notify(input: AppNotifyInput): Promise<INotification | null> {
    const saved = await notificationService.create(input);
    if (!saved) {
      return null;
    }

    const payload = {
      notification: {
        _id: saved._id,
        userId: saved.userId,
        type: saved.type,
        title: saved.title,
        body: saved.body,
        data: saved.data,
        read: saved.read,
        createdAt: saved.createdAt,
      },
    };

    const socketService = getSocketService();
    if (socketService) {
      socketService.emitNotificationCreated(input.userId, payload);
      socketService.emitChatNotification(input.userId, payload);
    }

    const notificationId = saved._id.toString();
    const sent = await fcmService.sendAppPushToRecipient({
      recipientUserId: input.userId,
      notificationId,
      title: saved.title,
      body: saved.body,
      type: saved.type,
      data: saved.data as Record<string, unknown>,
    });

    if (sent > 0) {
      logger.info(`[FCM] delivered ${sent} app push(es) | type=${saved.type} to userId=${input.userId}`);
    }

    return saved;
  }

  async notifyMany(
    userIds: string[],
    build: (userId: string) => Omit<AppNotifyInput, "userId">
  ): Promise<void> {
    const unique = [...new Set(userIds.filter(Boolean))];
    await Promise.all(
      unique.map((userId) =>
        this.notify({
          userId,
          ...build(userId),
        })
      )
    );
  }

  async notifyAdmins(
    build: () => Omit<AppNotifyInput, "userId">,
    excludeUserId?: string
  ): Promise<void> {
    const adminIds = await getActiveAdminUserIds(excludeUserId);
    await this.notifyMany(adminIds, () => build());
  }
}

export const appNotificationService = new AppNotificationService();

export { NotificationType };
