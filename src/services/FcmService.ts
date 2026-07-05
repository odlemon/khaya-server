// @ts-nocheck
import { Types } from "mongoose";
import { getFirebaseMessaging, isFcmEnabled, isFirebaseInitialized } from "../config/firebaseAdmin";
import { FCM_ANDROID_CHANNEL, FCM_ANDROID_ICON, FCM_ANDROID_SOUND } from "../config/fcmConfig";
import { FcmPushLog } from "../models/FcmPushLog";
import { pushTokenService } from "./PushTokenService";
import { getMessagePreview, getSenderDisplayName } from "../utils/pushNotificationFormat";
import { logger } from "../utils/logger";

const STALE_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

function isStaleTokenError(error: any): boolean {
  return STALE_TOKEN_CODES.has(error?.code);
}

export interface SendChatPushParams {
  token: string;
  message: {
    _id: unknown;
    chatId: unknown;
    content?: string;
    messageType?: string;
    createdAt?: Date | string;
  };
  sender: {
    firstName?: string;
    lastName?: string;
    role?: string;
  } | null;
  landlordId?: string;
  recipientUserId: string;
}

function stringifyDataPayload(data: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    out[key] = typeof value === "string" ? value : String(value);
  }
  return out;
}

class FcmService {
  canSend(): boolean {
    return isFcmEnabled() && isFirebaseInitialized();
  }

  getSkipReason(): string | null {
    if (!isFcmEnabled()) return "fcm_disabled";
    if (!isFirebaseInitialized()) return "no_firebase_init";
    return null;
  }

  async wasAlreadySent(
    messageId: string,
    recipientUserId: string,
    token: string
  ): Promise<boolean> {
    const existing = await FcmPushLog.findOne({
      messageId: new Types.ObjectId(messageId),
      recipientUserId: new Types.ObjectId(recipientUserId),
      token,
    }).select("_id");
    return !!existing;
  }

  async sendChatPush(params: SendChatPushParams): Promise<boolean> {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      return false;
    }

    const { token, message, sender, landlordId, recipientUserId } = params;
    const messageId = message._id?.toString?.() || String(message._id);

    if (await this.wasAlreadySent(messageId, recipientUserId, token)) {
      logger.info(`[FCM] skip duplicate | messageId=${messageId} userId=${recipientUserId}`);
      return false;
    }

    const title = getSenderDisplayName(sender);
    const body = getMessagePreview(message.content, message.messageType || "text");

    logger.info(
      `[FCM] send | messageId=${messageId} recipientUserId=${recipientUserId} tokenPrefix=${token.slice(0, 12)}`
    );

    try {
      await messaging.send({
        token,
        notification: { title, body },
        data: {
          type: "chat",
          messageId: String(messageId),
          chatId: String(message.chatId),
          landlordId: String(landlordId || ""),
          createdAt: new Date(message.createdAt || Date.now()).toISOString(),
        },
        android: {
          priority: "high",
          notification: {
            channelId: FCM_ANDROID_CHANNEL,
            icon: FCM_ANDROID_ICON,
            sound: FCM_ANDROID_SOUND,
          },
        },
      });

      await FcmPushLog.create({
        messageId: new Types.ObjectId(messageId),
        recipientUserId: new Types.ObjectId(recipientUserId),
        token,
        sentAt: new Date(),
      });

      return true;
    } catch (error: any) {
      logger.error(`[FCM] failed | code=${error?.code} message=${error?.message}`);

      if (isStaleTokenError(error)) {
        await pushTokenService.removeTokenByValue(token);
        logger.info(`[FCM] removed stale token | prefix=${token.slice(0, 12)}`);
      }

      return false;
    }
  }

  async sendChatPushToRecipient(params: {
    recipientUserId: string;
    message: SendChatPushParams["message"];
    sender: SendChatPushParams["sender"];
    landlordId?: string;
    recipientLabel?: string;
  }): Promise<number> {
    const label = params.recipientLabel || params.recipientUserId;

    const skipReason = this.getSkipReason();
    if (skipReason) {
      logger.info(`[FCM] skip | reason=${skipReason} to=${label}`);
      return 0;
    }

    const tokens = await pushTokenService.getTokensForUser(params.recipientUserId, "android");
    if (!tokens.length) {
      logger.info(`[FCM] skip | reason=no_device_token to=${label} userId=${params.recipientUserId}`);
      return 0;
    }

    let sent = 0;
    for (const { token } of tokens) {
      const ok = await this.sendChatPush({
        token,
        message: params.message,
        sender: params.sender,
        landlordId: params.landlordId,
        recipientUserId: params.recipientUserId,
      });
      if (ok) sent++;
    }
    return sent;
  }

  async sendAppPushToRecipient(params: {
    recipientUserId: string;
    notificationId: string;
    title: string;
    body: string;
    type: string;
    data?: Record<string, unknown>;
    recipientLabel?: string;
  }): Promise<number> {
    const label = params.recipientLabel || params.recipientUserId;

    const skipReason = this.getSkipReason();
    if (skipReason) {
      logger.info(`[FCM] skip | reason=${skipReason} to=${label} type=${params.type}`);
      return 0;
    }

    const messaging = getFirebaseMessaging();
    if (!messaging) {
      logger.info(`[FCM] skip | reason=no_firebase_init to=${label} type=${params.type}`);
      return 0;
    }

    const tokens = await pushTokenService.getTokensForUser(params.recipientUserId, "android");
    if (!tokens.length) {
      logger.info(
        `[FCM] skip | reason=no_device_token to=${label} userId=${params.recipientUserId} type=${params.type}`
      );
      return 0;
    }

    const dataPayload = stringifyDataPayload({
      type: params.type,
      notificationId: params.notificationId,
      ...(params.data || {}),
    });

    let sent = 0;
    for (const { token } of tokens) {
      const dedupeId = params.notificationId;
      if (await this.wasAlreadySent(dedupeId, params.recipientUserId, token)) {
        logger.info(
          `[FCM] skip duplicate | notificationId=${dedupeId} userId=${params.recipientUserId} type=${params.type}`
        );
        continue;
      }

      logger.info(
        `[FCM] send app | type=${params.type} notificationId=${dedupeId} recipientUserId=${params.recipientUserId} tokenPrefix=${token.slice(0, 12)}`
      );

      try {
        await messaging.send({
          token,
          notification: { title: params.title, body: params.body },
          data: dataPayload,
          android: {
            priority: "high",
            notification: {
              channelId: FCM_ANDROID_CHANNEL,
              icon: FCM_ANDROID_ICON,
              sound: FCM_ANDROID_SOUND,
            },
          },
        });

        await FcmPushLog.create({
          messageId: new Types.ObjectId(dedupeId),
          recipientUserId: new Types.ObjectId(params.recipientUserId),
          token,
          sentAt: new Date(),
        });
        sent++;
      } catch (error: any) {
        logger.error(`[FCM] failed | code=${error?.code} message=${error?.message} type=${params.type}`);

        if (isStaleTokenError(error)) {
          await pushTokenService.removeTokenByValue(token);
          logger.info(`[FCM] removed stale token | prefix=${token.slice(0, 12)}`);
        }
      }
    }

    return sent;
  }
}

export const fcmService = new FcmService();
