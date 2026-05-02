# Password reset — mobile app (Capacitor) hand-off

This file documents how **app-only, no Chrome** reset works together with **khaya-backend**. Native / router / Capacitor files live in the **mobile app repository**, not in `khaya-backend`.

## How it works (no website tab)

The email link is **not** meant to be a normal `https://` marketing page (that often opens the **browser** app).

It is a **custom app link**, for example:

```text
khayalami://reset-password?token=<opaque-token>
```

- Android sees **`khayalami://`** and opens **Khayalami** (your `MainActivity`), not Chrome.
- **Capacitor** can listen for that URL and route inside the **WebView** to something like **`/auth/reset-password`** — still your app UI, not a separate browser app.

So: **no public website required** for the reset UI; the “site” is your **bundled** app. The only URL-like piece is the **email deep link**, which is normal.

## Backend (khaya-backend)

Reset links in email are **hardcoded** in `src/services/PasswordResetService.ts` (`PASSWORD_RESET_APP_DEEP_LINK_BASE`):

```text
khayalami://reset-password?token=<opaque-token>
```

No env var is required for the link shape. If the base ever includes **`?`**, the service appends **`&token=`**.

## API (unchanged)

After the app opens with `token` in the query:

1. Show set-new-password screen.
2. **`POST /api/auth/reset-password`** with `{ "token": "...", "newPassword": "..." }` (optional `confirmPassword`).
3. On success, go to login; **`POST /api/auth/login`** as usual.

## What to align in the **mobile app** repo

| Concern | Where / what |
|--------|----------------|
| Open app from link | **Android:** `AndroidManifest.xml` — `<intent-filter>` with `android:scheme` / `android:host` matching **`khayalami`** and **`reset-password`** (or whatever you choose). |
| Same “name” everywhere | **`PASSWORD_RESET_DEEP_LINK_BASE`** must match that **scheme + host** (and path if you use one). |
| Deep link → screen | e.g. **`src/main.js`** (or app entry): read URL, extract `token`, navigate to **`/auth/reset-password`**. |
| Router guard | e.g. **`src/router/index.js`**: **`/auth/reset-password`** with `?token=` should be **allowed** even if the user still has a session (otherwise email → app can bounce to home before reset). |

## Changing the scheme

You may use another scheme (e.g. `mybrand://reset`). Update **both**:

- `PASSWORD_RESET_DEEP_LINK_BASE` on the server, and  
- native intent filters / iOS URL types in the app.

## Optional: `https://` without opening Chrome

Use **Android App Links** / **iOS Universal Links** (verified domain, `assetlinks.json`, etc.). Links look like normal HTTPS but open the app. Not required if you stay on a **custom scheme**.
