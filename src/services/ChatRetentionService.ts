// @ts-nocheck
import { Chat, Message, CHAT_INACTIVITY_TTL_SECONDS } from "../models/Chat";
import { logger } from "../utils/logger";

const LOG = (msg: string, ...args: unknown[]) => logger.info(`[ChatRetention] ${msg}`, ...args);

export function getInactivitySeconds(): number {
  return CHAT_INACTIVITY_TTL_SECONDS;
}

/**
 * Ensure MongoDB TTL index matches the hardcoded 5-day retention (e.g. after a test run left 10s).
 * Called on server startup before accepting traffic.
 */
export async function ensureChatRetentionTtlIndex(): Promise<void> {
  const seconds = getInactivitySeconds();
  const collection = Chat.collection;
  const indexes = await collection.indexes();
  const ttlIndex = indexes.find((i) => i.key?.lastActivityAt === 1);
  const current = ttlIndex?.expireAfterSeconds as number | undefined;

  if (current === seconds) {
    LOG(`TTL index OK: ${seconds}s (${Math.round(seconds / 86400)} days)`);
    return;
  }

  if (ttlIndex?.name) {
    await collection.dropIndex(ttlIndex.name);
  }
  await collection.createIndex({ lastActivityAt: 1 }, { expireAfterSeconds: seconds });
  LOG(
    `TTL index updated: ${current ?? "none"}s → ${seconds}s (${Math.round(seconds / 86400)} days)`
  );
}

export interface PurgeInactiveChatsOptions {
  inactivitySeconds?: number;
  /** When true, only delete chats tagged metadata.retentionTestDummy */
  onlyTestDummies?: boolean;
}

/**
 * Delete chats (and their messages) inactive longer than the threshold.
 * Used by lazy cleanup on chat list load and by the retention simulation script.
 */
export async function purgeInactiveChats(
  options: PurgeInactiveChatsOptions = {}
): Promise<{ chatsDeleted: number; messagesDeleted: number }> {
  const inactivitySeconds = options.inactivitySeconds ?? getInactivitySeconds();
  const cutoff = new Date(Date.now() - inactivitySeconds * 1000);

  const filter: Record<string, unknown> = {
    $or: [
      { lastActivityAt: { $lt: cutoff } },
      {
        lastActivityAt: { $exists: false },
        updatedAt: { $lt: cutoff },
      },
    ],
  };

  if (options.onlyTestDummies) {
    filter["metadata.retentionTestDummy"] = true;
  }

  const staleChats = await Chat.find(filter).select("_id").lean();
  const chatIds = staleChats.map((c) => c._id);

  if (chatIds.length === 0) {
    return { chatsDeleted: 0, messagesDeleted: 0 };
  }

  const messageResult = await Message.deleteMany({ chatId: { $in: chatIds } });
  const chatResult = await Chat.deleteMany({ _id: { $in: chatIds } });

  LOG(
    `Purged ${chatResult.deletedCount} chat(s), ${messageResult.deletedCount} message(s) (cutoff=${cutoff.toISOString()})`
  );

  return {
    chatsDeleted: chatResult.deletedCount ?? 0,
    messagesDeleted: messageResult.deletedCount ?? 0,
  };
}

/**
 * Remove messages whose chat was deleted (e.g. by MongoDB TTL on standalone — no change streams).
 */
export async function purgeOrphanMessages(): Promise<number> {
  const orphanIds = await Message.aggregate([
    {
      $lookup: {
        from: Chat.collection.name,
        localField: "chatId",
        foreignField: "_id",
        as: "chat",
      },
    },
    { $match: { chat: { $size: 0 } } },
    { $group: { _id: "$chatId" } },
  ]);

  if (!orphanIds.length) {
    return 0;
  }

  const ids = orphanIds.map((o) => o._id);
  const result = await Message.deleteMany({ chatId: { $in: ids } });
  const deleted = result.deletedCount ?? 0;
  if (deleted > 0) {
    LOG(`Purged ${deleted} orphan message(s) for ${ids.length} missing chat(s)`);
  }
  return deleted;
}
