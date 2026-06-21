# Withdrawn & Declined Requests — Clear from List (Tenant + Landlord)

This guide covers **both portal roles**: showing **withdrawn** (`cancelled`) and **declined** (`rejected`) rental requests on **tenant and landlord**, and **clearing** them from each user’s History tab without deleting server data.

**Applies to:** Khayalami web portal and mobile app (same APIs).

---

## Overview

| Concept | Backend value | UI label |
|---------|---------------|----------|
| Tenant withdrew while pending | `status: "cancelled"` | **Withdrawn** |
| Landlord declined | `status: "rejected"` | **Declined** |

**Clear** = soft-hide for **that role only**:

| Role | Field set on clear | Other party still sees it? |
|------|-------------------|----------------------------|
| Tenant | `dismissedByTenantAt` | Yes — landlord History unchanged |
| Landlord | `dismissedByLandlordAt` | Yes — tenant History unchanged |

Nothing is deleted. Tenant can re-apply later (new connection row).

---

## Who implements what

| Screen | Role | Tabs | Clear actions |
|--------|------|------|---------------|
| **My rental requests** | Tenant | Active · History | Remove one · Clear all |
| **Rental requests / Inbox** | Landlord | Inbox · History | Remove one · Clear all |

---

## User stories

### Tenant

| ID | Story | Acceptance |
|----|--------|------------|
| T1 | I want withdrawn and declined applications in **History**. | `GET ...?status=cancelled` and `?status=rejected` return rows unless I cleared them. |
| T2 | I want to **remove one** old request from my list. | Single clear API; card disappears; data kept on server. |
| T3 | I want to **clear all** closed requests at once. | Bulk clear API; toast shows count. |
| T4 | I cannot clear pending or accepted requests. | API returns 400; no button on Active tab. |

### Landlord

| ID | Story | Acceptance |
|----|--------|------------|
| L1 | I want to see when a tenant **withdrew** a request. | History tab shows `cancelled` with badge **Withdrawn**. |
| L2 | I want to see requests I **declined**. | History shows `rejected` with badge **Declined**. |
| L3 | I want to **remove** closed and **accepted** requests from my list. | Remove icon on `accepted`, `cancelled`, `rejected`; not on `pending`. |
| L4 | My **Inbox** stays focused on work to do. | Default list = `pending` + `accepted`; clearing accepted hides row only. |

**Landlord detail:** [LANDLORD_WITHDRAWN_REQUESTS_CLEAR_FRONTEND.md](./LANDLORD_WITHDRAWN_REQUESTS_CLEAR_FRONTEND.md)

---

## UI structure (both roles)

```
┌──────────────────────────────────────────────────────────────┐
│  Rental requests                                             │
├──────────────────────────────────────────────────────────────┤
│  [ Inbox / Active ]    [ History ]         [ Clear all ]     │
├──────────────────────────────────────────────────────────────┤
│  History card (withdrawn or declined)                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ [photo]  Property title, area                         │  │
│  │          Tenant name (landlord) / Landlord (tenant)    │  │
│  │          Badge: Withdrawn | Declined                   │  │
│  │          Subtitle + date                               │  │
│  │                                    [ Remove ]          │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Tab behaviour

| Tab | Query | Shows |
|-----|-------|--------|
| **Inbox / Active** | No `status` (default) | `pending`, `accepted` |
| **History — Withdrawn** | `status=cancelled` | Tenant-withdrawn |
| **History — Declined** | `status=rejected` | Landlord-declined |
| **History — All closed** | Two fetches or client merge | `cancelled` + `rejected` |

**Clear all** belongs on **History** only, visible when at least one clearable card is shown.

---

## Card rules

### Tenant

| `status` | Badge | Show Remove? | Which tab |
|----------|-------|----------------|-----------|
| `pending` | Pending | No | Active |
| `accepted` | Accepted | No | Active |
| `cancelled` | Withdrawn | Yes | History |
| `rejected` | Declined | Yes | History |

### Landlord

| `status` | Badge | Show Remove icon? | Which tab |
|----------|-------|-------------------|-----------|
| `pending` | Pending | **No** | Inbox |
| `accepted` | Accepted | **Yes** | Inbox |
| `cancelled` | Withdrawn | **Yes** | History |
| `rejected` | Declined | **Yes** | History |

Clearing **accepted** hides the row from the landlord list only — it does not cancel tenancy or chat.

If `dismissedByTenantAt` (tenant) or `dismissedByLandlordAt` (landlord) is set, hide the card unless `includeDismissed=true`.

---

## Interactions

### A. Remove one request

1. Confirm: *“Remove this request from your list? This does not delete it from the system.”*
2. Call role-specific **clear one** endpoint (below).
3. On success: remove card or refetch History; toast *“Request removed from your list”*.
4. On **400** (tenant): only withdrawn/declined. **Landlord:** only `pending` is blocked.

### B. Clear all

1. Confirm: *“Clear all withdrawn and declined requests from your list?”*
2. Call role-specific **clear all** endpoint.
3. On success: toast *“Cleared {clearedCount} request(s)”*; show empty History if needed.

### C. Optional — “Show cleared”

Refetch with `includeDismissed=true`. Render muted rows; hide Remove (already cleared).

---

## API reference

### Base URL & auth

```env
VITE_API_URL=https://khayamanage.co.zw/api/backend
```

All routes require `Authorization: Bearer <jwt>`.

Prefix: `/connections`

---

### List requests

#### Tenant

```http
GET /connections/tenant/requests
GET /connections/tenant/requests?status=cancelled
GET /connections/tenant/requests?status=rejected
GET /connections/tenant/requests?status=cancelled&includeDismissed=true
```

Query params:

| Param | Values | Default |
|-------|--------|---------|
| `status` | `pending`, `accepted`, `rejected`, `cancelled` | all (subject to dismiss filter) |
| `includeDismissed` | `true` / omit | omit = hide cleared rows |
| `page`, `limit` | pagination | `1`, `20` |

**Default (no status):** returns non-dismissed rows across statuses. **Recommended UX:** Active tab uses `status=pending` + `status=accepted` (two calls or client filter); History uses `cancelled` / `rejected`.

#### Landlord

```http
GET /connections/landlord
GET /connections/landlord?status=cancelled
GET /connections/landlord?status=rejected
GET /connections/landlord/requests?page=1&limit=20&status=cancelled
```

| Param | Values | Default |
|-------|--------|---------|
| `status` | `pending`, `accepted`, `rejected`, `cancelled` | **inbox:** `pending` + `accepted` |
| `includeDismissed` | `true` / omit | omit = hide landlord-cleared rows |
| `propertyId` | filter by listing | optional |
| `page`, `limit` | on `/landlord/requests` only | optional |

**Response (200)**

```json
{
  "success": true,
  "data": [
    {
      "_id": "69240448387aea43d1f8a96f",
      "status": "cancelled",
      "message": "I would like to rent this property",
      "dismissedByTenantAt": null,
      "dismissedByLandlordAt": null,
      "tenantId": { "firstName": "Nyasha", "lastName": "Karata" },
      "propertyId": { "title": "Avondale Flat", "images": {} },
      "createdAt": "2026-05-30T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
}
```

Tenant list also includes pipeline fields: `nextStep`, `agreementStatus`, `rentalId`, etc.

---

### Clear one request

#### Tenant

```http
PUT /connections/tenant/:connectionId/clear
```

Legacy alias (still supported):

```http
PUT /connections/:connectionId/dismiss
```

#### Landlord

```http
PUT /connections/landlord/:connectionId/clear
```

**Success (200)**

```json
{
  "success": true,
  "message": "Connection request removed from your list",
  "data": {
    "_id": "...",
    "status": "cancelled",
    "dismissedByTenantAt": "2026-05-30T12:00:00.000Z"
  }
}
```

Landlord response sets `dismissedByLandlordAt` instead.

**Errors**

| HTTP | When |
|------|------|
| 400 | **Tenant:** `pending` or `accepted`. **Landlord:** `pending` only |
| 403 | Wrong role or not owner of request |
| 404 | Unknown `connectionId` |

---

### Clear all closed requests

#### Tenant

```http
PUT /connections/tenant/clear-closed
```

Legacy alias:

```http
PUT /connections/dismiss-withdrawn
```

#### Landlord

```http
PUT /connections/landlord/clear-closed
```

No request body.

**Success (200)**

**Landlord bulk clear** also includes **`accepted`** rows.

```json
{
  "success": true,
  "message": "Requests cleared from your list",
  "data": { "clearedCount": 3 }
}
```

**Tenant:** clears `cancelled` + `rejected` only.  
**Landlord:** clears `accepted` + `cancelled` + `rejected` (never `pending`).

---

### Stats (optional badge counts)

```http
GET /connections/stats
```

Includes `cancelled` count for **both** landlord and tenant (respects dismiss filters unless `includeDismissed=true`).

---

## Frontend implementation checklist

### Tenant portal

- [ ] **Active** tab: `pending` + `accepted` only; no clear buttons
- [ ] **History** tab: load `cancelled` + `rejected` (exclude dismissed by default)
- [ ] **Remove** per card → `PUT /connections/tenant/:id/clear`
- [ ] **Clear all** → `PUT /connections/tenant/clear-closed`
- [ ] Confirm dialogs + error toasts
- [ ] Optional: `includeDismissed=true` debug toggle

### Landlord portal

- [ ] **Inbox:** remove icon on **`accepted`** only (not `pending`)
- [ ] **History:** remove icon on **`cancelled`** + **`rejected`**
- [ ] **Clear all** → includes accepted + history (`PUT /connections/landlord/clear-closed`)
- [ ] Copy: clearing accepted does **not** end tenancy
- [ ] See [LANDLORD_WITHDRAWN_REQUESTS_CLEAR_FRONTEND.md](./LANDLORD_WITHDRAWN_REQUESTS_CLEAR_FRONTEND.md)

### Shared

- [ ] Do not treat clear as delete — copy should say “removed from your list”
- [ ] Re-apply flow unchanged: tenant uses `POST /connections/request` from property page

---

## TypeScript helpers (optional)

```typescript
const API = import.meta.env.VITE_API_URL;

type ConnectionStatus = "pending" | "accepted" | "rejected" | "cancelled";

async function fetchTenantHistory(token: string, status: "cancelled" | "rejected") {
  const res = await fetch(
    `${API}/connections/tenant/requests?status=${status}&limit=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const json = await res.json();
  return json.data ?? [];
}

async function clearOneTenant(token: string, connectionId: string) {
  return fetch(`${API}/connections/tenant/${connectionId}/clear`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function clearAllTenant(token: string) {
  return fetch(`${API}/connections/tenant/clear-closed`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function fetchLandlordHistory(token: string) {
  const [withdrawn, declined] = await Promise.all([
    fetch(`${API}/connections/landlord?status=cancelled`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json()),
    fetch(`${API}/connections/landlord?status=rejected`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json()),
  ]);
  return [...(withdrawn.data ?? []), ...(declined.data ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

async function clearOneLandlord(token: string, connectionId: string) {
  return fetch(`${API}/connections/landlord/${connectionId}/clear`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function clearAllLandlord(token: string) {
  return fetch(`${API}/connections/landlord/clear-closed`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
}

function statusLabel(status: ConnectionStatus, viewerRole: "tenant" | "landlord"): string {
  if (status === "cancelled") return "Withdrawn";
  if (status === "rejected") return "Declined";
  if (status === "accepted") return "Accepted";
  return "Pending";
}

function canClear(status: ConnectionStatus): boolean {
  return status === "cancelled" || status === "rejected";
}
```

---

## What clear does NOT do

| Expectation | Reality |
|-------------|---------|
| Deletes from database | No |
| Hides from the other party | No — independent dismiss flags |
| Clears pending | No — API 400 (both roles) |
| Landlord clears accepted | Yes — row hidden only; tenancy unchanged |
| Tenant clears accepted | No — API 400 |
| Blocks tenant re-apply | No |

---

## Related docs

- [TENANT_RENTAL_REQUESTS_FRONTEND.md](./TENANT_RENTAL_REQUESTS_FRONTEND.md) — full tenant requests screen
- [TENANT_DISMISS_WITHDRAWN_REQUESTS_FRONTEND.md](./TENANT_DISMISS_WITHDRAWN_REQUESTS_FRONTEND.md) — tenant-only quick reference (superseded by this doc for API paths)
- [CONNECTION_REQUEST_CANCEL.md](./CONNECTION_REQUEST_CANCEL.md) — withdraw before History
