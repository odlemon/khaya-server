# Admin account termination — frontend (Khayalami admin dashboard)

## Goals

1. Let a **Khayalami admin** pick a **tenant** or **landlord** from the normal user list and **terminate** their account with a **required reason**.
2. Show **terminated accounts** in a separate screen (audit / compliance).
3. Rely on existing **user list** APIs that **hide** terminated users from default management views.

---

## API the admin UI should call

Base URL: **`/api/admin`** (prefix as in your environment). All calls: **`Authorization: Bearer <admin JWT>`**.

### User picker (no terminated users)

- **`GET /api/admin/users?role=tenant&page=1&limit=20`** (and `role=landlord` or omit for all non-terminated roles returned by backend filter).
- Use `data.users` and `data.pagination` from the response.

### Terminate

- **`POST /api/admin/users/:userId/terminate`**
- Body:

```json
{ "reason": "string required" }
```

- On **`409`**: show “Already terminated” and refresh lists.
- On **`403`**: target was not tenant/landlord — should not happen if UI only offers those.
- On **`200`**: show success toast; remove user from active list client-side or refetch.

### Terminated-only list

- **`GET /api/admin/users/terminated?page=1&limit=20`**
- Optional: **`&role=tenant`** or **`&role=landlord`**
- Render: name, email, role, `adminTerminatedAt`, `adminTerminationReason`, and populated **`adminTerminatedBy`** (who terminated).

---

## UX recommendations

1. **Terminate flow:** Modal with multiline **reason** (required, max 2000 chars), confirm checkbox (“This will immediately block login”), then POST.
2. **After terminate:** Clear admin token cache only if the terminated user was the current session (edge case); normally you are admin.
3. **Reinstate (optional):** If product wants undo without DB access, expose **`PUT /api/admin/users/:userId/status`** with `{ "isActive": true }` only for super-admin or hide from UI per policy.
4. **Global auth handling:** If any API returns **`403`** with **`code: "ACCOUNT_ADMIN_TERMINATED"`**, clear local session and redirect to login (terminated user’s app session).

---

## Copy for end users (terminated account)

If the mobile/web app calls **`POST /api/auth/login`** for a terminated user, response is **`403`** with a support-oriented message. Map `ACCOUNT_ADMIN_TERMINATED` to a single screen: account disabled, contact support.

---

## Regression note

Any client that called **`/api/admin/*`** without an **admin** token will now receive **`403`**. Ensure the dashboard uses an **admin** login only for these routes.

---

## Reinstate (reverse termination)

From the terminated list, call **`POST /api/admin/users/:userId/reinstate`** with a required **`reason`**. See **`ADMIN_ACCOUNT_REINSTATE_FRONTEND.md`** for the full UI/API notes.
