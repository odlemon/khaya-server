// @ts-nocheck

export type NotificationGroup = "messages" | "actions";

const MESSAGE_TYPES = new Set([
  "new_message",
  "viewing_request",
  "move_in_request",
  "viewing_response",
  "move_in_response",
  "chat",
]);

/**
 * Resolve inbox group from notification type.
 * Chat / @mention traffic → messages; everything else → actions.
 */
export function resolveNotificationGroup(type: string): NotificationGroup {
  if (MESSAGE_TYPES.has(type)) {
    return "messages";
  }
  return "actions";
}

export function isValidNotificationGroup(value: unknown): value is NotificationGroup {
  return value === "messages" || value === "actions";
}

/**
 * Mongo filter for a group, including legacy rows that lack `group`
 * (matched by type instead).
 */
export function groupFilterClause(group: NotificationGroup): Record<string, unknown> {
  if (group === "messages") {
    return {
      $or: [
        { group: "messages" },
        { group: { $exists: false }, type: { $in: [...MESSAGE_TYPES] } },
      ],
    };
  }

  return {
    $or: [
      { group: "actions" },
      {
        group: { $exists: false },
        type: { $nin: [...MESSAGE_TYPES] },
      },
    ],
  };
}
