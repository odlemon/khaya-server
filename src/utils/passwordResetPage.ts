// @ts-nocheck

/**
 * Server-rendered password reset pages.
 *
 * These are plain HTML forms with no JavaScript on purpose: helmet's default
 * CSP sets script-src 'self', so an inline script would be blocked, and a form
 * also works in the stripped-down browsers some mail clients open links in.
 */

const TEAL = "#1C7E83";
const CHARCOAL = "#233A47";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · Khayalami</title>
<style>
  body { margin:0; padding:24px; background:#f4f6f7; color:${CHARCOAL};
         font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif; line-height:1.5; }
  .card { max-width:420px; margin:32px auto; background:#fff; border-radius:16px; padding:28px;
          box-shadow:0 6px 24px rgba(35,58,71,.08); }
  h1 { font-size:22px; margin:0 0 6px; }
  p  { font-size:15px; color:#5b6b75; margin:0 0 18px; }
  label { display:block; font-size:14px; font-weight:600; margin:16px 0 6px; }
  input[type=password] { width:100%; box-sizing:border-box; padding:13px 14px; font-size:16px;
          border:1px solid #d7dee2; border-radius:10px; background:#fbfcfc; }
  input[type=password]:focus { outline:none; border-color:${TEAL}; background:#fff; }
  button { width:100%; margin-top:22px; padding:14px; font-size:16px; font-weight:700; color:#fff;
           background:${TEAL}; border:0; border-radius:10px; cursor:pointer; }
  .note { font-size:13px; color:#7c8b95; margin-top:18px; }
  .bad  { background:#fdecec; color:#a12020; padding:12px 14px; border-radius:10px; font-size:14px; margin-bottom:4px; }
  .good { background:#e9f6ef; color:#15683f; padding:12px 14px; border-radius:10px; font-size:14px; }
  .tick { font-size:40px; line-height:1; margin-bottom:8px; }
</style>
</head><body><div class="card">${body}</div></body></html>`;
}

/** The reset form itself. Posts back to the same URL the link opened. */
export function renderResetForm(opts: { token: string; error?: string }): string {
  const error = opts.error
    ? `<div class="bad">${escapeHtml(opts.error)}</div>`
    : "";

  return shell(
    "Reset your password",
    `<h1>Reset your password</h1>
     <p>Choose a new password for your Khayalami account.</p>
     ${error}
     <form method="POST" accept-charset="UTF-8">
       <input type="hidden" name="token" value="${escapeHtml(opts.token)}">
       <label for="newPassword">New password</label>
       <input id="newPassword" type="password" name="newPassword" minlength="8" required
              autocomplete="new-password" placeholder="At least 8 characters">
       <label for="confirmPassword">Confirm new password</label>
       <input id="confirmPassword" type="password" name="confirmPassword" minlength="8" required
              autocomplete="new-password" placeholder="Re-enter your password">
       <button type="submit">Update password</button>
     </form>
     <p class="note">This link is valid for one hour and can only be used once.</p>`
  );
}

/** Shown after the form is submitted. */
export function renderResetResult(opts: { success: boolean; message: string }): string {
  if (opts.success) {
    return shell(
      "Password updated",
      `<div class="tick">✓</div>
       <h1>Password updated</h1>
       <div class="good">${escapeHtml(opts.message)}</div>
       <p class="note">You can close this page and sign in to the Khayalami app with your new password.</p>`
    );
  }

  return shell(
    "Reset failed",
    `<h1>We couldn't reset your password</h1>
     <div class="bad">${escapeHtml(opts.message)}</div>
     <p class="note">Request a new reset link from the app and try again.</p>`
  );
}

/** Shown when the link carries no token at all. */
export function renderMissingToken(): string {
  return shell(
    "Invalid link",
    `<h1>This link is not valid</h1>
     <div class="bad">The reset link is missing its token. It may have been altered by your email client.</div>
     <p class="note">Request a new password reset from the Khayalami app.</p>`
  );
}
