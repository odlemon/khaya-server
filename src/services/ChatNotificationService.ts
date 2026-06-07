// @ts-nocheck
import { User } from "../models/User";
import { ChatNotification } from "./ChatService";
import { notificationService } from "./NotificationService";
import { getSocketService } from "./realtimeRegistry";
import { resolveUserDisplayNames } from "../utils/userDisplayName";

const TYPE_TITLES: Record<ChatNotification["type"], string> = {
  new_message: "New message",
  viewing_request: "Viewing request",
  move_in_request: "Move-in request",
  viewing_response: "Viewing request update",
  move_in_response: "Move-in request update",
};

class ChatNotificationService {
  async dispatch(notification: ChatNotification): Promise<void> {
    const { recipientId, senderId, chatId, propertyId, type, message, data } = notification;

    if (recipientId === senderId) {
      console.log(`[REALTIME] notification skipped (sender is recipient) | type=${type}`);
      return;
    }

    const nameMap = await resolveUserDisplayNames([recipientId, senderId]);
    const toName = nameMap.get(recipientId) || "Unknown user";
    const fromName = nameMap.get(senderId) || "Unknown user";

    console.log(
      `[REALTIME] notification dispatch | type=${type} to=${toName} from=${fromName} chatId=${chatId}`
    );

    const socketService = getSocketService();
    const suppressBanner =
      socketService?.isUserInChatRoom(recipientId, chatId) ?? false;

    let title = TYPE_TITLES[type] || "Chat notification";
    let body = message;

    if (senderId) {
      const sender = await User.findById(senderId).select("firstName lastName");
      if (sender) {
        title = `${sender.firstName} ${sender.lastName}`.trim() || title;
      }
    }

    const saved = await notificationService.create({
      userId: recipientId,
      type,
      title,
      body: suppressBanner ? body.substring(0, 120) : body,
      data: {
        chatId,
        propertyId,
        senderId,
        suppressBanner,
        ...(data || {}),
      },
    });

    if (!saved) {
      console.log(`[REALTIME] notification not saved (push disabled for user?) | to=${toName}`);
      return;
    }

    console.log(
      `[REALTIME] notification saved | id=${saved._id} to=${toName} suppressBanner=${suppressBanner}`
    );

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

    if (socketService) {
      socketService.emitNotificationCreated(recipientId, payload);
      socketService.emitChatNotification(recipientId, payload);
    }
  }
}

export const chatNotificationService = new ChatNotificationService();
