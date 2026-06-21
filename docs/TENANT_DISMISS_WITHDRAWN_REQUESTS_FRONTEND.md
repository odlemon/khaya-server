# Clear Withdrawn & Declined Requests — Frontend Implementation Guide

This document covers **one feature** on the tenant **“My rental requests”** screen: letting tenants **remove** old declined or withdrawn applications from their list.

**Who implements this:** **Tenant portal** and **Landlord portal** (web + mobile).

**Landlord clear UI (icon on History only):** [LANDLORD_WITHDRAWN_REQUESTS_CLEAR_FRONTEND.md](./LANDLORD_WITHDRAWN_REQUESTS_CLEAR_FRONTEND.md)

**Combined tenant + landlord reference:** [WITHDRAWN_REQUESTS_CLEAR_FRONTEND.md](./WITHDRAWN_REQUESTS_CLEAR_FRONTEND.md)

**Who does NOT implement clear UI:** Admin — they see full connection data in admin tools; dismiss is cosmetic for tenant/landlord inbox only.

**Parent screen:** Build the main requests UI first using [TENANT_RENTAL_REQUESTS_FRONTEND.md](./TENANT_RENTAL_REQUESTS_FRONTEND.md). This doc is the **History tab** behaviour.

---

## User story

| ID | Story | Acceptance |
|----|--------|------------|
| D1 | As a **tenant**, after a landlord **declines** my application or I **withdraw** it, I want to **clear** it from my list so I only see active applications. | Declined/withdrawn items can be removed from the default list without deleting data from the server. |
| D2 | As a **tenant**, I want to **clear all** old closed requests at once instead of one by one. | “Clear all” on History removes every dismissible item in one action. |
| D3 | As a **tenant**, I should **not** be able to clear pending or accepted requests — those are still live. | Clear buttons only appear for `rejected` and `cancelled`. |

### Why soft-hide (not delete)

- Landlords keep their records for auditing and inbox history.
- Tenants can **re-apply** to the same property later; the backend reuses the same connection row and clears the hide flag automatically.
- “Clear” only sets `dismissedByTenantAt` — nothing is destroyed.

---

## Where this lives in the UI

**Screen:** Tenant → **My rental requests** → **History** tab

```
┌─────────────────────────────────────────────────────────┐
│  My rental requests                                     │
├─────────────────────────────────────────────────────────┤
│  [ Active ]  [ History ]          [ Clear all ]  ← here │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │ [img]  Old Listing, Avondale                     │   │
│  │        Status: Withdrawn                         │   │
│  │        You withdrew this request                 │   │
│  │                              [ Remove ]          │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [img]  Another Flat                              │   │
│  │        Status: Declined                          │   │
│  │        Landlord declined your request            │   │
│  │                              [ Remove ]          │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Optional:** Settings toggle **“Show cleared requests”** → refetch with `includeDismissed=true` (power users / support).

---

## What to show on each History card

| API `status` | Badge label | Show “Remove”? | Notes |
|--------------|-------------|----------------|-------|
| `cancelled` | **Withdrawn** | Yes | Tenant withdrew while pending |
| `rejected` | **Declined** | Yes | Landlord rejected |
| `pending` | — | **No** | Belongs on **Active** tab, not History |
| `accepted` | — | **No** | Belongs on **Active** tab |

If `dismissedByTenantAt` is set, the row is **hidden** from the default list. Do not show Remove on items the user cannot see unless `includeDismissed=true`.

---

## Interactions to implement

### A. Remove one request

**When:** User taps **Remove** (or trash icon) on a History card.

**Steps**

1. Show confirm dialog:  
   *“Remove this request from your list? You can still apply again later if the property is available.”*
2. `PUT /connections/tenant/:connectionId/clear` (legacy: `PUT /connections/:connectionId/dismiss`)
3. On success:
   - Remove card from list (optimistic) or refetch History
   - Toast: “Request removed from your list”
4. On error `400`: toast — only declined/withdrawn requests can be cleared

**Do not show Remove** on Active tab cards.

---

### B. Clear all (bulk)

**When:** User taps **Clear all** in the History tab header.

**Show button only if** History has at least one visible `rejected` or `cancelled` item (not yet dismissed).

**Steps**

1. Confirm:  
   *“Clear all declined and withdrawn requests from your list?”*
2. `PUT /connections/tenant/clear-closed` (legacy: `PUT /connections/dismiss-withdrawn`)
3. On success:
   - Toast: “Cleared {dismissedCount} request(s)” (if `dismissedCount > 0`)
   - Empty History state if list is now empty
4. Refetch or clear local History array

---

### C. Optional — “Show cleared”

**When:** User enables toggle in History tab or settings.

```http
GET /connections/tenant/requests?includeDismissed=true&status=cancelled
GET /connections/tenant/requests?includeDismissed=true&status=rejected
```

Show cleared items with muted style and **no** Remove button (already dismissed), or hide Remove since action is done.

---

## Re-applying after clear

No special UI. When tenant applies again from the property page:

- `POST /connections/request` reactivates the connection
- `status` → `pending`, `dismissedByTenantAt` cleared
- Item appears on **Active** tab again

Tell user in copy if needed: “You previously applied for this property — your new request has been sent.”

---

## Technical reference

### Base URL

```env
VITE_API_URL=https://khayamanage.co.zw/api/backend
```

Auth: Bearer JWT, **tenant role only** (403 for landlord/admin).

---

### Dismiss one

```http
PUT /connections/:connectionId/dismiss
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

**Errors**

| HTTP | When |
|------|------|
| 400 | Status is `pending` or `accepted` |
| 403 | Not tenant or not owner of request |
| 404 | Unknown `connectionId` |

---

### Dismiss all withdrawn / declined

```http
PUT /connections/dismiss-withdrawn
```

**Success (200)**

```json
{
  "success": true,
  "message": "Withdrawn and declined requests cleared from your list",
  "data": { "dismissedCount": 3 }
}
```

---

### List (default hides dismissed)

```http
GET /connections/tenant/requests
```

Excludes rows where `dismissedByTenantAt` is set.

```http
GET /connections/tenant/requests?includeDismissed=true
```

Includes cleared rows (for optional “Show cleared” toggle).

---

## What this does NOT do

| Expectation | Reality |
|-------------|---------|
| Deletes data from database | No — soft-hide only |
| Hides request from landlord | No — landlord inbox unchanged |
| Clears pending/accepted requests | No — API returns 400 |
| Required on landlord/admin apps | No — tenant only |

---

## Implementation checklist (tenant portal)

- [ ] History tab only shows `rejected` + `cancelled` (not dismissed by default)
- [ ] **Remove** per card with confirm dialog
- [ ] **Clear all** in History header with confirm dialog
- [ ] Handle API errors with user-friendly toasts
- [ ] Optional: `includeDismissed=true` toggle for support/debug
- [ ] Do not show clear actions on Active tab

---

## Related docs

- [TENANT_RENTAL_REQUESTS_FRONTEND.md](./TENANT_RENTAL_REQUESTS_FRONTEND.md) — main screen, user stories, landlord/admin notification scope
- [CONNECTION_REQUEST_CANCEL.md](./CONNECTION_REQUEST_CANCEL.md) — withdraw (before item lands in History)
