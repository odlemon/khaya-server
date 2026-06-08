// @ts-nocheck

const TRANSIENT_DB_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH",
]);

const TRANSIENT_DB_MESSAGE_PATTERNS = [
  /ECONNRESET/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /socket hang up/i,
  /connection closed/i,
  /topology was destroyed/i,
  /server selection timed out/i,
];

const TRANSIENT_DB_ERROR_NAMES = new Set([
  "MongoNetworkError",
  "MongoServerSelectionError",
  "MongooseServerSelectionError",
]);

export function isTransientDbError(err: any): boolean {
  if (!err) return false;

  if (TRANSIENT_DB_ERROR_NAMES.has(err.name)) {
    return true;
  }

  if (err.code && TRANSIENT_DB_CODES.has(err.code)) {
    return true;
  }

  const message = String(err.message || "");
  return TRANSIENT_DB_MESSAGE_PATTERNS.some((pattern) => pattern.test(message));
}
