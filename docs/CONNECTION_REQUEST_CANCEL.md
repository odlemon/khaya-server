# Tenant cancellation of rental / connection requests

## User story

**As a tenant**, after I send a rental interest (connection) request to a landlord for a property, I want to **withdraw that request** while it is still **pending**, so the landlord is informed and the request no longer appears as awaiting their action.

**As a landlord**, I want to be **notified when a tenant cancels** a pending request, so I am not waiting on a lead that has already withdrawn.

**Acceptance notes**

- Only **`pending`** requests can be cancelled by the tenant.
- After cancellation, the connection is stored with status **`cancelled`**, **`isActive: false`**, and the tenant **may send a new request** later for the same property (same unique key on tenant + landlord + property is reused when reactivating).
- Landlord receives an **email** (if landlord email is present) when the tenant cancels.

---

## Backend behaviour (summary)

| Field / behaviour | Detail |
|-------------------|--------|
| `status` | New enum value: **`cancelled`** (alongside `pending`, `accepted`, `rejected`). |
| `isActive` | Set to **`false`** on tenant cancel so a new request can be opened later. |
| `responseMessage` | Tenant optional note, or default `"Cancelled by tenant"`. |
| `respondedAt` / `respondedBy` | Set when the tenant cancels. |
| `GET /api/connections/stats` | Response `data` now includes **`cancelled`** count. |
| `GET /api/connections/status/:propertyId/:landlordId` | Response `data` includes **`isActive`**; `canChat` is true only when `accepted` **and** `isActive`. |

---

## API (for frontend integration)

Base path: **`/api/connections`** (all routes require **`Authorization: Bearer <token>`**).

### 1) Cancel pending request (recommended)

**`PUT /api/connections/:connectionId/cancel-request`**

- **Auth:** tenant only.
- **URL params:** `connectionId` — Mongo `_id` of the connection document (same id returned when sending a request or listing tenant requests).

**Request body (JSON, optional):**

```json
{
  "cancelReason": "Found another place"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `cancelReason` | string | No | Max 500 characters; shown in email to landlord when provided. |

**Success `200`:**

```json
{
  "success": true,
  "message": "Connection request cancelled successfully",
  "data": { "...connection document with populated tenantId, landlordId, propertyId..." }
}
```

**Typical errors**

| Status | When |
|--------|------|
| `400` | Invalid `connectionId`, or not `pending`. |
| `403` | Not a tenant, or connection belongs to another tenant. |
| `404` | Connection not found. |

---

### 2) Cancel pending request (legacy)

**`DELETE /api/connections/:requestId`**

- Same behaviour as **`PUT .../cancel-request`** (status `cancelled`, landlord email, etc.).
- **URL params:** `requestId` — same as connection `_id`.
- **Body:** optional JSON `{ "cancelReason": "..." }` (supported if your client sends a body on DELETE).

Prefer **`PUT`** for clearer semantics and reliable JSON bodies.

---

### 3) List / filter by status

Existing list endpoints support query **`status=cancelled`** (and other statuses):

- **`GET /api/connections/tenant/requests?status=cancelled&page=1&limit=20`** (tenant)
- **`GET /api/connections/landlord?status=cancelled`** (landlord; existing route)

---

## Frontend implementation notes

1. **Show “Cancel request”** only when `status === "pending"` (and user is tenant / owner of the row).
2. After success, refresh the list or patch local state: `status: "cancelled"`, `isActive: false`.
3. **Property interest / CTA:** use `GET /api/connections/status/:propertyId/:landlordId` — if `status === "cancelled"` and `isActive === false`, treat like “no active pipeline” and allow **Send request** again (backend will reactivate the same row on resend).
4. **Stats / badges:** include **`cancelled`** from **`GET /api/connections/stats`** if you show breakdowns.
5. **Landlord inbox:** show cancelled rows distinctly (e.g. greyed “Withdrawn by tenant”) using `status === "cancelled"`.

---

## Related

- Send request: **`POST /api/connections/request`** (unchanged).
- Landlord closing an accepted pipeline: **`PUT /api/connections/:connectionId/cancel`** (landlord; deactivates connection — different from tenant cancel of **pending** request).
