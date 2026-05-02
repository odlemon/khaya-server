# Password reset (forgot password)

## Status

Implemented as **email link + token** (not guessable; stored hashed in MongoDB). Types `PasswordResetRequest` / `PasswordResetConfirm` in `src/types/auth/index.d.ts` align with this flow.

## Endpoints (public — no `Authorization` header)

Base: **`/api/auth`**

### 1) Request reset email

**`POST /api/auth/forgot-password`**

```json
{ "email": "user@example.com" }
```

**Responses**

- **`200`** — Always this shape when the request is valid (avoids email enumeration):
  - `success: true`
  - `message`: explains that if an account exists, instructions were sent.
- **`400`** — Missing/empty email.
- **`503`** — Email could not be sent (SMTP error). Safe to retry.

**No email is sent** when: no user for that email, account is **admin-terminated**, or account matches **self-deleted** pattern (`!isActive && isVerified`).

### 2) Set new password with token

**`POST /api/auth/reset-password`**

```json
{
  "token": "<token from email query string>",
  "newPassword": "min8chars",
  "confirmPassword": "min8chars"
}
```

| Field | Required | Notes |
|--------|-----------|--------|
| `token` | Yes | From link `?token=...` |
| `newPassword` | Yes | Min **8** characters |
| `confirmPassword` | No | If sent, must match `newPassword` |

**`200`** — Password updated; user can log in with `POST /api/auth/login`.

**`400`** — Invalid/expired token, weak password, mismatched confirm, or account blocked for reset.

## Link target: mobile app vs web

### Everything in the app, no Chrome (custom scheme)

For a **Capacitor** (or similar) app, you usually do **not** want an `https://` reset page that opens the **system browser** as a separate app. Instead the email uses a **custom app link** so the OS opens **only your app**:

```text
khayalami://reset-password?token=<opaque-token>
```

- **`khayalami://`** is registered with Android (and iOS) so the OS routes that URL to your app, not Chrome.
- The “page” is still **your bundled UI** (e.g. WebView): e.g. Capacitor handles the URL and navigates to **`/auth/reset-password`** inside the app. The link only *looks* URL-like; it is a **deep link**, not a public website tab.

**Backend (this repo)** — the reset link is **hardcoded** in `src/services/PasswordResetService.ts` as:

```text
khayalami://reset-password?token=<opaque-token>
```

(constant `PASSWORD_RESET_APP_DEEP_LINK_BASE`). There is **no** `FRONTEND_URL` / `lysp.io` fallback for this email anymore, so the inbox link always matches the app deep link.

If the base string ever contains **`?`**, the code appends **`&token=`** instead of **`?token=`**.

**Same scheme everywhere:** **`khayalami`** + **`reset-password`** (host/path segment) must match what the **mobile app** declares (Android `<intent-filter>` `android:scheme` / `android:host`, iOS URL types, etc.). To change the URI, edit the constant in `PasswordResetService.ts` and update native config together.

**Optional later:** **`https://`** links that still open the app (no browser) use **Android App Links** / **iOS Universal Links** (verified domain, `assetlinks.json`, etc.). More setup; custom scheme is the smallest “app only” path.

**Mobile client responsibilities**

1. OS + app: register the deep link so tapping the email opens the app.
2. Router: allow **`/auth/reset-password?token=...`** even when a session exists (deep link from email should not bounce to home before reset).
3. Read **`token`** from the opened URL, show set-password UI, then **`POST /api/auth/reset-password`** with `{ token, newPassword }`.

Backend does **not** put a JWT in the email—only the **opaque reset `token`**. After reset succeeds, navigate to login and use **`POST /api/auth/login`** as usual.

**More detail for the mobile / Capacitor repo:** see **`docs/PASSWORD_RESET_MOBILE_APP_FRONTEND.md`** in this repo (hand-off for the app project).

## Testing

1. **`POST /api/auth/forgot-password`** with a real tenant/landlord email (active or pending verification).
2. Check inbox for link (or server logs if using a dev mailbox).
3. **`POST /api/auth/reset-password`** with `token` and new password.
4. **`POST /api/auth/login`** with new password.

## Security notes

- Token is **single-use** and expires in **1 hour**.
- Only the **latest** unused token per user is valid after a new request (previous unused rows are marked used).
- `PasswordResetToken` uses a **TTL index** on `expiresAt` for automatic cleanup.
