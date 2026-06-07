// @ts-nocheck
import { notificationService } from "../services/NotificationService";
import { getSocketService } from "../services/realtimeRegistry";
import { resolveUserDisplayName } from "./userDisplayName";

export interface ChatNotificationReadResult {
  markedCount: number;
  notificationIds: string[];
  unreadCount: number;
}

/**
 * When a user reads chat messages (opens thread or PUT .../read),
 * mark matching in-app notifications for that chat as read and push live count to UI.
 */
export async function syncNotificationsReadForChat(
  userId: string,
  chatId: string
): Promise<ChatNotificationReadResult> {
  const userIdStr = userId?.toString?.() || userId;
  const { modifiedCount, notificationIds } =
    await notificationService.markReadByChatId(userIdStr, chatId);
  const unreadCount = await notificationService.getUnreadCount(userIdStr);

  if (modifiedCount > 0) {
    const socketService = getSocketService();
    if (socketService) {
      socketService.emitNotificationsMarkedRead(userIdStr, {
        chatId,
        markedCount: modifiedCount,
        notificationIds,
        unreadCount,
      });
    }

    void resolveUserDisplayName(userIdStr).then((name) => {
      console.log(
        `[REALTIME] notifications marked read via chat | user=${name} chatId=${chatId} marked=${modifiedCount} unreadCount=${unreadCount}`
      );
    });
  }

  return {
    markedCount: modifiedCount,
    notificationIds,
    unreadCount,
  };
}
