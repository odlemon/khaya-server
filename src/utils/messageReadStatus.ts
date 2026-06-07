// @ts-nocheck
import { Types } from "mongoose";

export function normalizeUserId(id: any): string {
  return id?._id?.toString?.() || id?.toString?.() || String(id);
}

/** Whether this user has read the message (per-user, not global). */
export function isMessageReadByUser(message: any, userId: string): boolean {
  const uid = normalizeUserId(userId);
  const readBy = message?.readBy || [];
  return readBy.some((entry: any) => normalizeUserId(entry) === uid);
}

/** Mongo filter: messages unread for a specific user. */
export function unreadMessagesFilterForUser(userId: string) {
  const userOid = new Types.ObjectId(userId);
  return {
    senderId: { $ne: userOid },
    readBy: { $nin: [userOid] },
  };
}
