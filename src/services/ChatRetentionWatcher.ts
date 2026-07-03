// @ts-nocheck
import type { ChangeStream } from "mongodb";
import { Chat, Message } from "../models/Chat";
import { logger } from "../utils/logger";

let chatDeleteStream: ChangeStream | null = null;

/**
 * When MongoDB TTL (or manual purge) deletes a Chat, remove orphaned messages.
 */
export function startChatRetentionWatcher(): void {
  if (chatDeleteStream) {
    return;
  }

  try {
    chatDeleteStream = Chat.watch([{ $match: { operationType: "delete" } }]);

    chatDeleteStream.on("change", async (change: { documentKey?: { _id?: unknown } }) => {
      const chatId = change.documentKey?._id;
      if (!chatId) return;

      try {
        const result = await Message.deleteMany({ chatId });
        if (result.deletedCount > 0) {
          logger.info(
            `[ChatRetention] Cascade-deleted ${result.deletedCount} message(s) for chat ${chatId}`
          );
        }
      } catch (err: any) {
        logger.error(`[ChatRetention] Cascade delete failed for chat ${chatId}: ${err.message}`);
      }
    });

    chatDeleteStream.on("error", (err: Error) => {
      logger.error(`[ChatRetention] Change stream error: ${err.message}`);
    });

    logger.info("[ChatRetention] Chat delete change stream started");
  } catch (err: any) {
    logger.warn(
      `[ChatRetention] Change stream unavailable (${err.message}) — orphan messages cleaned via purgeOrphanMessages on chat list load`
    );
  }
}

export async function stopChatRetentionWatcher(): Promise<void> {
  if (chatDeleteStream) {
    await chatDeleteStream.close();
    chatDeleteStream = null;
    logger.info("[ChatRetention] Chat delete change stream stopped");
  }
}
