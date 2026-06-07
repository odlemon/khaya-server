// @ts-nocheck
import { User } from "../models/User";

const nameCache = new Map<string, string>();

export function displayNameFromUser(user: {
  firstName?: string;
  lastName?: string;
  email?: string;
}): string {
  const full = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return full || user.email || "Unknown user";
}

export function cacheUserDisplayName(userId: string, name: string): void {
  if (userId && name) {
    nameCache.set(userId, name);
  }
}

export async function resolveUserDisplayName(userId: string): Promise<string> {
  if (!userId || userId === "unknown") {
    return "unknown";
  }

  const cached = nameCache.get(userId);
  if (cached) {
    return cached;
  }

  const user = await User.findById(userId).select("firstName lastName email").lean();
  if (!user) {
    return "Unknown user";
  }

  const name = displayNameFromUser(user);
  nameCache.set(userId, name);
  return name;
}

export async function resolveUserDisplayNames(
  userIds: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const missing: string[] = [];

  for (const id of [...new Set(userIds.filter(Boolean))]) {
    const cached = nameCache.get(id);
    if (cached) {
      result.set(id, cached);
    } else {
      missing.push(id);
    }
  }

  if (missing.length) {
    const users = await User.find({ _id: { $in: missing } })
      .select("firstName lastName email")
      .lean();

    for (const user of users) {
      const id = user._id.toString();
      const name = displayNameFromUser(user);
      nameCache.set(id, name);
      result.set(id, name);
    }

    for (const id of missing) {
      if (!result.has(id)) {
        result.set(id, "Unknown user");
      }
    }
  }

  return result;
}

export function displayNameFromPopulatedSender(sender: any): string | null {
  if (!sender || typeof sender !== "object") {
    return null;
  }
  if (sender.firstName || sender.lastName || sender.email) {
    return displayNameFromUser(sender);
  }
  return null;
}
