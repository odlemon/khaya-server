// @ts-nocheck
import { getActiveAdminUserIds } from "./adminRecipients";

type TaggedRole = "landlord" | "tenant" | "admin";

/**
 * Resolve user IDs who should receive a private @mention message or notification.
 * Only the tagged party — never other participants or broadcast admins (except @admin role).
 */
export async function resolveTaggedRecipientUserIds(
  participants: Array<{ _id?: { toString(): string }; toString?: () => string; role?: string }>,
  taggedRole: TaggedRole,
  senderId: string
): Promise<string[]> {
  const senderIdStr = senderId?.toString?.() || senderId;

  if (taggedRole === "admin") {
    const adminsInChat = participants
      .filter((p: any) => p.role === "admin")
      .map((p: any) => p._id?.toString?.() || p.toString?.())
      .filter((id: string) => id && id !== senderIdStr);

    if (adminsInChat.length) {
      return adminsInChat;
    }

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
