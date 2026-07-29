// @ts-nocheck
import { getActiveAdminUserIds } from "./adminRecipients";

type TaggedRole = "landlord" | "tenant" | "admin";

/**
 * Resolve user IDs who should receive a private @mention message or notification.
 * @admin notifies all active Khayalami admins (not only admins already in the chat).
 */
export async function resolveTaggedRecipientUserIds(
  participants: Array<{ _id?: { toString(): string }; toString?: () => string; role?: string }>,
  taggedRole: TaggedRole,
  senderId: string
): Promise<string[]> {
  const senderIdStr = senderId?.toString?.() || senderId;

  if (taggedRole === "admin") {
    return getActiveAdminUserIds(senderIdStr);
  }

  const target = participants.find((p: any) => p.role === taggedRole);
  if (!target) {
    return [];
  }

  const targetId = target._id?.toString?.() || target.toString?.();
  if (!targetId || targetId === senderIdStr) {
    return [];
  }

  return [targetId];
}
