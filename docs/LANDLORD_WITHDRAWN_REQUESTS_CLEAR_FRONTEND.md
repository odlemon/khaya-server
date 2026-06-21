# Landlord — Clear Requests from List (Frontend Guide)

This document is **landlord portal only**. It explains how landlords **remove clutter** from their rental-request list using a **remove icon**, including **accepted** connections as well as withdrawn and declined ones.

Tenant-side clear behaviour: [TENANT_DISMISS_WITHDRAWN_REQUESTS_FRONTEND.md](./TENANT_DISMISS_WITHDRAWN_REQUESTS_FRONTEND.md).

---

## User story

| ID | Story | Acceptance |
|----|--------|------------|
| L1 | As a **landlord**, I want withdrawn and declined requests in **History**. | History lists `cancelled` + `rejected` unless cleared. |
| L2 | As a **landlord**, I want to **clear accepted** requests from my inbox when I no longer need them visible. | Remove icon on accepted cards; clears from landlord view only. |
| L3 | As a **landlord**, I must **not** clear **pending** requests — I should Accept or Decline. | No remove icon on `pending`; API returns 400. |
| L4 | Clearing must **not** affect the tenant’s view or active tenancy. | Soft-hide via `dismissedByLandlordAt` only. |

---

## What can be cleared

| `status` | UI label | Remove icon | Tab |
|----------|----------|-------------|-----|
| `pending` | **Pending** | **Hidden** | Inbox |
| `accepted` | **Accepted** | **Shown** | Inbox |
| `cancelled` | **Withdrawn** | **Shown** | History |
| `rejected` | **Declined** | **Shown** | History |

**Rule:** Landlord can clear **`accepted`**, **`cancelled`**, and **`rejected`**. Only **`pending`** is blocked.

---

## Screen layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Rental requests                          [ Clear all ]         │
├─────────────────────────────────────────────────────────────────┤
│  [ Inbox ]    [ History ]                                       │
├─────────────────────────────────────────────────────────────────┤
│  INBOX                                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ [tenant]  Avondale Flat     Pending     [Accept] [Decline]│ │
│  │                           (no remove icon)                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ [tenant]  Kundai Residence  Accepted              [ 🗑 ]  │ │
│  │           Chat / agreement links…                         │ │
│  └───────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  HISTORY                                                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ [tenant]  Borrowdale House  Withdrawn             [ 🗑 ]  │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ [tenant]  Old Flat          Declined              [ 🗑 ]  │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Clear all** — header action on **Inbox** and/or **History**: clears every dismissible row (`accepted` + `cancelled` + `rejected`) not yet hidden.

---

## Remove icon visibility

**Show the remove icon when ALL are true:**

| # | Condition |
|---|-----------|
| 1 | `connection.status` is `accepted`, `cancelled`, or `rejected` |
| 2 | `connection.dismissedByLandlordAt` is null / missing |

**Never show when:**

- `status === "pending"` (use Accept / Decline instead)

```tsx
const LANDLORD_CLEARABLE = new Set(["accepted", "cancelled", "rejected"]);

function showLandlordRemoveIcon(connection: {
  status: string;
  dismissedByLandlordAt?: string | null;
}): boolean {
  if (connection.dismissedByLandlordAt) return false;
  return LANDLORD_CLEARABLE.has(connection.status);
}
```

**Icon spec**

- Trash / archive icon button — not a full text button
- `aria-label="Remove from list"`
- Min 44×44px touch target on mobile
- Trailing edge of card row

**Accepted cards:** keep primary actions (Message, View agreement) **and** show remove icon on the trailing edge. Clearing accepted does **not** cancel the tenancy or chat — it only hides the request row from the landlord’s list.

---

## Tab data loading

### Inbox

```http
GET /connections/landlord
```

Returns **`pending`** + **`accepted`** (excludes landlord-cleared rows).

Optional: `?status=pending`, `?status=accepted`, `?propertyId=...`

### History

```http
GET /connections/landlord?status=cancelled
GET /connections/landlord?status=rejected
```

Paginated variant:

```http
GET /connections/landlord/requests?status=cancelled&page=1&limit=20
```

| Param | Purpose |
|-------|---------|
| `includeDismissed=true` | Include rows you already cleared |
| `propertyId` | Filter by listing |

---

## Interactions

### A. Remove one (icon)

1. Confirm (recommended for **accepted**):  
   *“Remove this request from your list? Your connection with the tenant is not cancelled.”*
2. For withdrawn/declined, shorter copy is fine:  
   *“Remove from your list?”*

```http
PUT /connections/landlord/:connectionId/clear
Authorization: Bearer <landlord_jwt>
```

**Success (200)**

```json
{
  "success": true,
  "message": "Request removed from your list",
  "data": {
    "_id": "...",
    "status": "accepted",
    "dismissedByLandlordAt": "2026-05-30T14:00:00.000Z"
  }
}
```

**Errors**

| HTTP | When |
|------|------|
| 400 | Status is `pending` |
| 403 | Not your request |
| 404 | Unknown id |

---

### B. Clear all

Clears **accepted + withdrawn + declined** in one call (never `pending`).

```http
PUT /connections/landlord/clear-closed
Authorization: Bearer <landlord_jwt>
```

**Success (200)**

```json
{
  "success": true,
  "message": "Requests cleared from your list",
  "data": { "clearedCount": 8 }
}
```

Confirm copy: *“Clear all accepted, withdrawn, and declined requests from your list? Pending requests will stay.”*

Show **Clear all** when Inbox or History has at least one dismissible row.

---

## TypeScript helpers

```typescript
const API = import.meta.env.VITE_API_URL;
const LANDLORD_CLEARABLE = new Set(["accepted", "cancelled", "rejected"]);

export function showLandlordRemoveIcon(connection: {
  status: string;
  dismissedByLandlordAt?: string | null;
}) {
  if (connection.dismissedByLandlordAt) return false;
  return LANDLORD_CLEARABLE.has(connection.status);
}

export async function fetchLandlordInbox(token: string) {
  const res = await fetch(`${API}/connections/landlord`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await res.json()).data ?? [];
}

export async function fetchLandlordHistory(token: string) {
  const headers = { Authorization: `Bearer ${token}` };
  const [withdrawn, declined] = await Promise.all([
    fetch(`${API}/connections/landlord?status=cancelled`, { headers }).then((r) => r.json()),
    fetch(`${API}/connections/landlord?status=rejected`, { headers }).then((r) => r.json()),
  ]);
  return [...(withdrawn.data ?? []), ...(declined.data ?? [])].sort(
    (a, b) =>
      new Date(b.updatedAt ?? b.createdAt).getTime() -
      new Date(a.updatedAt ?? a.createdAt).getTime()
  );
}

export async function clearOneLandlordRequest(token: string, connectionId: string) {
  const res = await fetch(`${API}/connections/landlord/${connectionId}/clear`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message);
  return res.json();
}

export async function clearAllLandlordDismissible(token: string) {
  const res = await fetch(`${API}/connections/landlord/clear-closed`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message);
  return res.json();
}
```

---

## React card example

```tsx
function LandlordRequestCard({ connection, onRemove }: Props) {
  const canRemove = showLandlordRemoveIcon(connection);

  return (
    <div className="request-card">
      <div className="request-card__main">
        <TenantAvatar user={connection.tenantId} />
        <div>
          <h3>{connection.propertyId.title}</h3>
          <StatusBadge status={connection.status} />
        </div>
      </div>
      <div className="request-card__actions">
        {connection.status === "pending" && (
          <>
            <Button onClick={onAccept}>Accept</Button>
            <Button variant="outline" onClick={onDecline}>Decline</Button>
          </>
        )}
        {connection.status === "accepted" && (
          <Button variant="link" href={chatUrl}>Message</Button>
        )}
        {canRemove && (
          <button
            type="button"
            className="icon-btn"
            aria-label="Remove from list"
            onClick={() => onRemove(connection._id)}
          >
            <TrashIcon size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## Implementation checklist

- [ ] Remove icon on **`accepted`** (Inbox), **`cancelled`**, **`rejected`** (History)
- [ ] **No** remove icon on **`pending`**
- [ ] `PUT /connections/landlord/:id/clear` with confirm (stronger copy for accepted)
- [ ] **Clear all** → `PUT /connections/landlord/clear-closed` (includes accepted)
- [ ] Explain in UI: clearing accepted **hides the row only** — does not end tenancy
- [ ] Empty states per tab after clear

---

## API summary

| Action | Method | Endpoint |
|--------|--------|----------|
| List inbox | GET | `/connections/landlord` |
| List accepted only | GET | `/connections/landlord?status=accepted` |
| List withdrawn | GET | `/connections/landlord?status=cancelled` |
| List declined | GET | `/connections/landlord?status=rejected` |
| Remove one | PUT | `/connections/landlord/:connectionId/clear` |
| Clear all dismissible | PUT | `/connections/landlord/clear-closed` |

Clearable statuses: **`accepted`**, **`cancelled`**, **`rejected`**.  
Not clearable: **`pending`**.

---

## What clear does NOT do

| Expectation | Reality |
|-------------|---------|
| Deletes the connection | No |
| Cancels an active tenancy | No |
| Hides from tenant | No |
| Clears pending requests | No — API 400 |
| Blocks chat if already accepted | No — chat/agreement unchanged |

---

## Related docs

- [WITHDRAWN_REQUESTS_CLEAR_FRONTEND.md](./WITHDRAWN_REQUESTS_CLEAR_FRONTEND.md) — combined reference
- [TENANT_RENTAL_REQUESTS_FRONTEND.md](./TENANT_RENTAL_REQUESTS_FRONTEND.md) — product context
