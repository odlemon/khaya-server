# Reinstate terminated accounts — frontend (Khayalami admin)

## User story

**As a Khayalami admin**, when I open the **terminated accounts** list, I want a **“Reinstate”** (or “Reverse termination”) action on a row so I can restore login and app access. I must enter a **reason** (audit trail) before confirming.

---

## API

**`POST /api/admin/users/:userId/reinstate`**

- **Auth:** `Authorization: Bearer <admin JWT>` (role `admin`).
- **URL:** `userId` = Mongo `_id` of the user (same as in `GET /api/admin/users/terminated`).

**Request body (JSON):**

```json
{
  "reason": "Why this account is being restored (required)."
}
```

| Field | Type | Required | Notes |
|-------|------|------------|--------|
| `reason` | string | Yes | Trimmed; max **2000** characters. |

**Success `200`**

- `data` includes the updated user document (password omitted).
- Useful fields to show briefly: `isActive`, `adminReinstatedAt`, `adminReinstatementReason`, populated `adminReinstatedBy` (who performed the reinstatement).
- Termination fields (`adminTerminatedAt`, etc.) will be **cleared**.

**Errors**

| HTTP | Typical cause |
|------|----------------|
| `400` | Missing/blank `reason`, invalid `userId` |
| `403` | User is not a tenant/landlord (should not appear in your list) |
| `404` | User id not found |
| `409` | User is **not** terminated — refresh the list |

---

## UI flow

1. **Terminated accounts** page: data from **`GET /api/admin/users/terminated`** (existing).
2. Per row, primary or overflow action: **“Reinstate account”**.
3. Opens a **modal**:
   - Multiline **reason** (required, show character count up to 2000).
   - Confirm: “This will allow the user to log in again.”
4. On submit: **`POST /api/admin/users/:userId/reinstate`** with `{ reason }`.
5. On **`200`**: toast success; **remove row** from local list or refetch terminated list (user will no longer match the terminated filter).
6. Optionally link: “View in active users” → **`GET /api/admin/users?search=<email>`**.

---

## Copy suggestions

- **Button:** “Reinstate” or “Restore account”
- **Modal title:** “Reinstate account”
- **Reason label:** “Reason for reinstatement (required for audit)”
- **409 message:** “This account is no longer in terminated status. Refresh the list.”

---

## Related

- Terminate: **`POST /api/admin/users/:userId/terminate`** — see `ADMIN_ACCOUNT_TERMINATION_API.md` / `ADMIN_ACCOUNT_TERMINATION_FRONTEND.md`.
- Legacy toggle without reinstatement reason: **`PUT /api/admin/users/:userId/status`** with `{ "isActive": true }` — prefer **`reinstate`** when you need an audit reason.
