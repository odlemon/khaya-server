// @ts-nocheck
import { Types } from "mongoose";
import { Chat, Message, CHAT_INACTIVITY_TTL_SECONDS } from "../models/Chat";
import { Notification } from "../models/Notification";
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
 * Delete in-app notifications tied to the given chat IDs.
 * Matches both string and ObjectId forms of data.chatId.
 */
export async function deleteNotificationsForChatIds(
  chatIds: Array<string | Types.ObjectId>
): Promise<number> {
  if (!chatIds.length) {
    return 0;
  }

  const objectIds: Types.ObjectId[] = [];
  const stringIds: string[] = [];

  for (const id of chatIds) {
    const str = id?.toString?.() ?? String(id);
    stringIds.push(str);
    if (Types.ObjectId.isValid(str)) {
      objectIds.push(new Types.ObjectId(str));
    }
  }

  const result = await Notification.deleteMany({
    $or: [
      { "data.chatId": { $in: stringIds } },
      { "data.chatId": { $in: objectIds } },
    ],
  });

  const deleted = result.deletedCount ?? 0;
  if (deleted > 0) {
    LOG(`Deleted ${deleted} notification(s) for ${stringIds.length} chat(s)`);
  }
  return deleted;
}

/**
 * Delete notifications that reference specific message IDs.
 */
export async function deleteNotificationsForMessageIds(
  messageIds: Array<string | Types.ObjectId>
): Promise<number> {
  if (!messageIds.length) {
    return 0;
  }

  const objectIds: Types.ObjectId[] = [];
  const stringIds: string[] = [];

  for (const id of messageIds) {
    const str = id?.toString?.() ?? String(id);
    stringIds.push(str);
    if (Types.ObjectId.isValid(str)) {
      objectIds.push(new Types.ObjectId(str));
    }
  }

  const result = await Notification.deleteMany({
    $or: [
      { "data.messageId": { $in: stringIds } },
      { "data.messageId": { $in: objectIds } },
    ],
  });

  return result.deletedCount ?? 0;
}

/**
 * Delete chats (and their messages + related notifications) inactive longer than the threshold.
 * Used by lazy cleanup on chat list load and by the retention simulation script.
 */
export async function purgeInactiveChats(
  options: PurgeInactiveChatsOptions = {}
): Promise<{ chatsDeleted: number; messagesDeleted: number; notificationsDeleted: number }> {
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
    return { chatsDeleted: 0, messagesDeleted: 0, notificationsDeleted: 0 };
  }

  const messageResult = await Message.deleteMany({ chatId: { $in: chatIds } });
  const notificationsDeleted = await deleteNotificationsForChatIds(chatIds);
  const chatResult = await Chat.deleteMany({ _id: { $in: chatIds } });

  LOG(
    `Purged ${chatResult.deletedCount} chat(s), ${messageResult.deletedCount} message(s), ${notificationsDeleted} notification(s) (cutoff=${cutoff.toISOString()})`
  );

  return {
    chatsDeleted: chatResult.deletedCount ?? 0,
    messagesDeleted: messageResult.deletedCount ?? 0,
    notificationsDeleted,
  };
}

/**
 * Remove messages whose chat was deleted (e.g. by MongoDB TTL on standalone — no change streams).
 * Also removes notifications for those orphaned messages / missing chats.
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
  const messages = await Message.find({ chatId: { $in: ids } }).select("_id").lean();
  const messageIds = messages.map((m) => m._id);

  const result = await Message.deleteMany({ chatId: { $in: ids } });
  const deleted = result.deletedCount ?? 0;

  await deleteNotificationsForChatIds(ids);
  if (messageIds.length) {
    await deleteNotificationsForMessageIds(messageIds);
  }

  if (deleted > 0) {
    LOG(`Purged ${deleted} orphan message(s) for ${ids.length} missing chat(s)`);
  }
  return deleted;
}

/**
 * Remove notifications whose chatId / messageId no longer exists
 * (e.g. chats deleted by TTL before notification cascade existed).
 */
export async function purgeOrphanChatNotifications(): Promise<{
  byMissingChat: number;
  byMissingMessage: number;
}> {
  const withChatId = await Notification.find({
    "data.chatId": { $exists: true, $nin: [null, ""] },
  })
    .select("_id data.chatId")
    .lean();

  const chatIdSet = new Set<string>();
  for (const n of withChatId) {
    const raw = n.data?.chatId;
    if (raw == null || raw === "") continue;
    chatIdSet.add(String(raw));
  }

  let byMissingChat = 0;
  if (chatIdSet.size) {
    const candidateIds = [...chatIdSet].filter((id) => Types.ObjectId.isValid(id));
    const existing = await Chat.find({
      _id: { $in: candidateIds.map((id) => new Types.ObjectId(id)) },
    })
      .select("_id")
      .lean();
    const existingSet = new Set(existing.map((c) => c._id.toString()));
    const missingChatIds = candidateIds.filter((id) => !existingSet.has(id));
    byMissingChat = await deleteNotificationsForChatIds(missingChatIds);
  }

  const withMessageId = await Notification.find({
    "data.messageId": { $exists: true, $nin: [null, ""] },
  })
    .select("_id data.messageId")
    .lean();

  const messageIdSet = new Set<string>();
  for (const n of withMessageId) {
    const raw = n.data?.messageId;
    if (raw == null || raw === "") continue;
    messageIdSet.add(String(raw));
  }

  let byMissingMessage = 0;
  if (messageIdSet.size) {
    const candidateIds = [...messageIdSet].filter((id) => Types.ObjectId.isValid(id));
    const existing = await Message.find({
      _id: { $in: candidateIds.map((id) => new Types.ObjectId(id)) },
    })
      .select("_id")
      .lean();
    const existingSet = new Set(existing.map((m) => m._id.toString()));
    const missingMessageIds = candidateIds.filter((id) => !existingSet.has(id));
    byMissingMessage = await deleteNotificationsForMessageIds(missingMessageIds);
  }

  if (byMissingChat > 0 || byMissingMessage > 0) {
    LOG(
      `Purged orphan notifications: ${byMissingChat} (missing chat), ${byMissingMessage} (missing message)`
    );
  }

  return { byMissingChat, byMissingMessage };
}
