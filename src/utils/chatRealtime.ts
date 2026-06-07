// @ts-nocheck
import { Request } from "express";
import { getSocketService } from "../services/realtimeRegistry";
import {
  displayNameFromPopulatedSender,
  resolveUserDisplayName,
} from "./userDisplayName";

/**
 * Emit a new chat message to connected clients via Socket.IO.
 * Notification inbox delivery is handled separately in ChatService.sendChatNotification.
 */
export async function emitChatMessageRealtime(
  req: Request,
  chatId: string,
  message: any,
  options?: { senderId?: string }
): Promise<void> {
  try {
    const socketService =
      getSocketService() || (req as any).app?.get?.("socketService");

    if (!socketService) {
      console.warn("[REALTIME] Socket service unavailable — message saved but not pushed in real time");
      return;
    }

    const messageObj = message?.toObject ? message.toObject() : message;
    const messageId = messageObj?._id?.toString?.() || "unknown";
    const senderId =
      options?.senderId ||
      messageObj?.senderId?._id?.toString?.() ||
      messageObj?.senderId?.toString?.() ||
      "unknown";

    const populatedName = displayNameFromPopulatedSender(messageObj?.senderId);
    if (populatedName) {
      console.log(
        `[REALTIME] REST → socket push | chatId=${chatId} messageId=${messageId} sender=${populatedName}`
      );
    } else {
      const senderName = await resolveUserDisplayName(senderId);
      console.log(
        `[REALTIME] REST → socket push | chatId=${chatId} messageId=${messageId} sender=${senderName}`
      );
    }

    await socketService.emitNewMessage(chatId, messageObj);
  } catch (error: any) {
    console.error("emitChatMessageRealtime failed:", error.message || error);
  }
}
