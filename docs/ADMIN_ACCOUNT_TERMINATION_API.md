# Admin account termination (Khayalami dashboard) — API

## Behaviour

- **Soft termination:** User row stays in MongoDB. Fields set:
  - `adminTerminatedAt` (date)
  - `adminTerminationReason` (string, required on terminate)
  - `adminTerminatedBy` (admin user id)
  - `isActive` → `false`
- **Who can be terminated:** Only **`tenant`** and **`landlord`** via this action. Staff roles (`admin`, `insurance_admin`, `bank_admin`) are rejected.
- **Login & API access:** Terminated users cannot log in (password or Google OAuth) and cannot use **any** authenticated route: JWT middleware returns **`403`** with `code: "ACCOUNT_ADMIN_TERMINATED"`.
- **Reinstatement (recommended):** `POST /api/admin/users/:userId/reinstate` with a **required reason** clears termination, sets `isActive: true`, and stores **`adminReinstatedAt`**, **`adminReinstatementReason`**, **`adminReinstatedBy`** for audit.
- **Legacy:** `PUT /api/admin/users/:userId/status` with `{ "isActive": true }` still clears termination fields but does **not** capture a reinstatement reason.

## Auth

All routes under **`/api/admin`** require **`Authorization: Bearer <token>`** and role **`admin`** (enforced globally on this router).

---

## Endpoints

### 1) List users for management (excludes terminated)

**`GET /api/admin/users`**

Query params (existing): `page`, `limit`, `role`, `search`, `isActive`.

**Change:** Results **exclude** users with `adminTerminatedAt` set.

---

### 2) Terminate a tenant or landlord account

**`POST /api/admin/users/:userId/terminate`**

**Body (JSON):**

```json
{
  "reason": "Fraudulent listings after investigation."
}
```

| Field | Type | Required |
|-------|------|----------|
| `reason` | string | Yes (1–2000 chars after trim) |

**Success `200`:** `{ success, message, data }` — `data` is the updated user (no password), with `adminTerminatedBy` populated (`firstName`, `lastName`, `email`, `role`).

**Errors**

| Status | Case |
|--------|------|
| `400` | Invalid `userId`, missing/empty `reason`, self-termination |
| `403` | Target is not tenant/landlord |
| `404` | User not found |
| `409` | Already terminated |

---

### 3) List terminated accounts

**`GET /api/admin/users/terminated`**

Query params:

| Param | Description |
|-------|-------------|
| `page` | Default `1` |
| `limit` | Default `20`, max `100` |
| `role` | Optional: `tenant` or `landlord` |

**Response:** Paginated `users` with termination metadata and populated `adminTerminatedBy`.

---

### 4) Reinstate (reverse termination)

**`POST /api/admin/users/:userId/reinstate`**

Use from the **terminated accounts** list. Clears `adminTerminatedAt` / `adminTerminationReason` / `adminTerminatedBy`, sets **`isActive`: `true`**, and records who reinstated and why.

**Body (JSON):**

```json
{
  "reason": "Appeal upheld — account restored per policy."
}
```

| Field | Type | Required |
|-------|------|----------|
| `reason` | string | Yes (1–2000 chars after trim) |

**Success `200`:** Updated user (no password), with **`adminReinstatedBy`** populated.

**Errors**

| Status | Case |
|--------|------|
| `400` | Invalid `userId`, missing/empty `reason`, self-target |
| `403` | Target is not tenant/landlord |
| `404` | User not found |
| `409` | Account is **not** currently terminated (`adminTerminatedAt` unset) |

After success, the user disappears from **`GET /api/admin/users/terminated`** and appears again in **`GET /api/admin/users`** (subject to other filters).

---

## Other updated surfaces

| Area | Change |
|------|--------|
| **`GET /api/users`** | Omits admin-terminated users. |
| **`GET /api/users/tenants`** (landlord picker) | Omits terminated tenants (`NOT_ADMIN_TERMINATED` + `isActive: true`). |
| **Document verification admin lists** | Pending / all lists omit terminated users. |
| **`/api/admin/dashboard/*` metrics** | User counts and recent-user widgets exclude terminated. |
| **`/api/admin/reports/*`** | Overview user counts, user series, and recent users table exclude terminated. |
| **`GET /api/admin/analytics`** | User growth aggregation excludes terminated. |

---

## Login / auth error codes

| Code | HTTP | When |
|------|------|------|
| `ACCOUNT_ADMIN_TERMINATED` | `403` | Login, 2FA completion, `/api/auth/me`, or any authenticated request with a valid JWT for a terminated user. |

---

## Breaking change

**`router.use(authorize(["admin"]))`** is now applied to **all** `/api/admin/*` routes. Non-admin authenticated users can no longer call these endpoints.
