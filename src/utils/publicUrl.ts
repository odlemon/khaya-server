// @ts-nocheck
import { logger } from "./logger";

/**
 * The externally reachable base URL of this API.
 *
 * Everything we put in an email — the agreement PDF button, the password reset
 * link — is built from this. Get it wrong and the mail goes out pointing at a
 * host the recipient cannot reach, which is how reset links ended up dead and
 * agreement links landed on a parked domain.
 *
 * In production this must be the public origin *including* any path prefix the
 * reverse proxy strips, e.g.
 *
 *   BACKEND_URL=https://khayamanage.co.zw/api/backend
 *
 * because nginx proxies /api/backend/ through to this server's root.
 */
export function getPublicApiBaseUrl(): string {
  const raw =
    process.env.BACKEND_URL ||
    process.env.API_PUBLIC_URL ||
    process.env.API_URL ||
    `http://localhost:${process.env.PORT || 4002}`;

  return raw.replace(/\/+$/, "");
}

/** True when the resolved base is only reachable from the server itself. */
export function isLocalOnlyBaseUrl(base: string = getPublicApiBaseUrl()): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/i.test(base);
}

/**
 * Warn loudly at boot when emailed links would be unreachable. A misconfigured
 * base URL is silent otherwise — mail still sends, it just cannot be opened.
 */
export function warnIfPublicBaseUrlUnusable(): void {
  const base = getPublicApiBaseUrl();
  const configured = Boolean(
    process.env.BACKEND_URL || process.env.API_PUBLIC_URL || process.env.API_URL
  );

  if (!configured) {
    logger.warn(
      `[publicUrl] BACKEND_URL is not set — emailed links will point at ${base}, ` +
        `which recipients cannot open. Set BACKEND_URL to the public API base.`
    );
    return;
  }

  if (isLocalOnlyBaseUrl(base) && process.env.NODE_ENV === "production") {
    logger.warn(
      `[publicUrl] BACKEND_URL resolves to ${base} in production — emailed links ` +
        `will not be reachable by recipients.`
    );
  }
}
