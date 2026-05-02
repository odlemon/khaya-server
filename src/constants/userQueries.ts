/**
 * Users terminated by Khayalami admin (soft — row kept, login blocked).
 * Use in Mongo queries to exclude them from normal listings.
 */
export const NOT_ADMIN_TERMINATED = {
  $or: [{ adminTerminatedAt: { $exists: false } }, { adminTerminatedAt: null }],
} as const;
