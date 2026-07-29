// @ts-nocheck
import { User } from "../models/User";

let cachedAdminIds: string[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

/**
 * Active Khayalami admin user IDs — used for @admin mentions and
 * admin-attention actions (property/doc verification, agreements, etc.).
 */
export async function getActiveAdminUserIds(excludeUserId?: string): Promise<string[]> {
  const now = Date.now();
  if (!cachedAdminIds || now - cachedAt > CACHE_TTL_MS) {
    const admins = await User.find({
      role: "admin",
      isActive: { $ne: false },
      $or: [{ adminTerminatedAt: { $exists: false } }, { adminTerminatedAt: null }],
    })
      .select("_id")
      .lean();

    cachedAdminIds = admins.map((a) => a._id.toString());
    cachedAt = now;
  }

  if (!excludeUserId) {
    return [...cachedAdminIds];
  }

  return cachedAdminIds.filter((id) => id !== excludeUserId);
}

export function clearAdminRecipientsCache(): void {
  cachedAdminIds = null;
  cachedAt = 0;
}
