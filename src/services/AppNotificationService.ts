// @ts-nocheck
import { notificationService, CreateNotificationInput } from "./NotificationService";
import { getSocketService } from "./realtimeRegistry";
import { getActiveAdminUserIds } from "../utils/adminRecipients";
import { INotification, NotificationType } from "../models/Notification";

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
