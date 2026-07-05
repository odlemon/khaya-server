// @ts-nocheck
import { User } from "../models/User";
import { ChatNotification } from "./ChatService";
import { notificationService } from "./NotificationService";
import { getSocketService } from "./realtimeRegistry";
import { resolveUserDisplayNames } from "../utils/userDisplayName";
import { getMessagePreview, getSenderDisplayName } from "../utils/pushNotificationFormat";
import { fcmService } from "./FcmService";
import { isFcmEnabled } from "../config/firebaseAdmin";
import { logger } from "../utils/logger";

class ChatNotificationService {
  async dispatch(notification: ChatNotification): Promise<void> {
    const {
      recipientId,
      senderId,
      chatId,
      propertyId,
      type,
      messageContent,
      messageType,
      landlordId,
      data,
    } = notification;

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
    const isViewingChat = socketService?.isUserInChatRoom(recipientId, chatId) ?? false;
    const fcmActive = fcmService.canSend();
    const suppressBanner = isViewingChat || fcmActive;

    const sender = senderId
      ? await User.findById(senderId).select("firstName lastName role").lean()
      : null;

    const title = getSenderDisplayName(sender);
    const previewSource = messageContent ?? notification.message ?? "";
    const body = getMessagePreview(previewSource, messageType || "text");

    const messageId = data?.messageId?.toString?.() || data?.messageId || "";
    const resolvedLandlordId = landlordId || data?.landlordId || "";

    const saved = await notificationService.create({
      userId: recipientId,
      type,
      title,
      body,
      data: {
        chatId,
        propertyId,
        senderId,
        messageId,
        landlordId: resolvedLandlordId,
        senderName: title,
        isPrivate: data?.isPrivate ?? false,
        ...(data || {}),
      },
    });

    if (!saved) {
      console.log(`[REALTIME] notification not saved (push disabled for user?) | to=${toName}`);
      return;
    }

    console.log(
      `[REALTIME] notification saved | id=${saved._id} to=${toName} suppressBanner=${suppressBanner} viewing=${isViewingChat}`
    );

    const notificationPayload = {
      _id: saved._id,
      userId: saved.userId,
      type: saved.type,
      title: saved.title,
      body: saved.body,
      read: saved.read,
      createdAt: saved.createdAt,
      suppressBanner,
      data: {
        ...saved.data,
        messageId: String(messageId),
        chatId: String(chatId),
        landlordId: String(resolvedLandlordId),
        senderName: title,
      },
    };

    if (socketService) {
      socketService.emitNotificationCreated(recipientId, { notification: notificationPayload });
    }

    if (fcmActive && isFcmEnabled() && !isViewingChat && messageId) {
      const sent = await fcmService.sendChatPushToRecipient({
        recipientUserId: recipientId,
        recipientLabel: toName,
        message: {
          _id: messageId,
          chatId,
          content: previewSource,
          messageType: messageType || "text",
          createdAt: saved.createdAt,
        },
        sender,
        landlordId: resolvedLandlordId,
      });
      if (sent > 0) {
        console.log(`[FCM] delivered ${sent} push(es) | messageId=${messageId} to=${toName}`);
      }
    } else {
      let reason = "unknown";
      if (!fcmActive || !isFcmEnabled()) {
        reason = fcmService.getSkipReason() || "no_firebase_init";
      } else if (isViewingChat) {
        reason = "viewing_chat";
      } else if (!messageId) {
        reason = "no_message_id";
      }
      logger.info(`[FCM] skip | reason=${reason} to=${toName} chatId=${chatId} type=${type}`);
    }
  }
}

export const chatNotificationService = new ChatNotificationService();
