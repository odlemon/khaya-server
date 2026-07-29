# Rental Requests & In-App Notifications — Frontend Implementation Guide

This document tells the **portal frontend team** what to build, **for which role**, and **why** — then lists the APIs and UI behaviour in detail.

**Applies to:** Khayalami web portal (`https://khayamanage.co.zw`) and mobile app (same APIs).

---

## Who implements what

| What | Portal / role | New UI? | Priority |
|------|----------------|---------|----------|
| **“My rental requests”** tracking section | **Tenant** | **Yes — new screen or tab** | High |
| **Withdraw** a pending request | **Tenant** | Button on request card + confirm dialog | High |
| **Clear** withdrawn/declined requests | **Tenant + Landlord** | History tab — [WITHDRAWN_REQUESTS_CLEAR_FRONTEND.md](./WITHDRAWN_REQUESTS_CLEAR_FRONTEND.md) | High |
| **Notification bell** — new event types | **Tenant, Landlord, Admin** | Extend existing bell/inbox (no new API) | High |
| **Landlord** inbox + History + clear | **Landlord** | [LANDLORD_WITHDRAWN_REQUESTS_CLEAR_FRONTEND.md](./LANDLORD_WITHDRAWN_REQUESTS_CLEAR_FRONTEND.md) — remove **icon** on accepted / withdrawn / declined (not pending) | High |
| **Admin** listing review alerts | **Admin** | Extend bell only (`property_submitted`) | Medium |
| **Hide rented homes** from browse | **Tenant** browse/search | **No frontend work** — backend sets `Property.status = "rented"` and browse APIs already exclude it | None |

**Landlords do not get a new “rental requests” screen in this pass.** They already have connection management; the backend now also pushes in-app notifications when a tenant applies or withdraws.

**Admins do not get a new rental-requests screen.** They only need the notification bell to surface new listings awaiting verification.

---

## Background — why we are doing this

### User feedback (summary)

1. **Tenants** apply for properties but have **no dedicated place** to see all their applications, where each one stands (waiting, accepted, declined, withdrawn), or what to do next (chat, sign agreement, view tenancy).
2. **Landlords** were only notified by **email** for some events. They need **in-app notifications** (same bell as chat) when a tenant requests to rent or withdraws a request.
3. **Notifications** only fired for **chat**. Other important actions (requests, agreements, payments, maintenance, property verification) now create inbox rows on the backend — the frontend must **display and route** them.
4. **Rented properties** were still showing in browse lists. That is fixed on the **backend**; browse pages need no change.

### What “rental request” means in the system

There is no separate “Application” table. A tenant’s rental application is a **Connection** record linking:

`tenant` + `landlord` + `property` → status: `pending` | `accepted` | `rejected` | `cancelled`

- `cancelled` = tenant **withdrew** the request (show as **“Withdrawn”** in UI, not “Cancelled”).
- `rejected` = landlord **declined** (show as **“Declined”**).

---

## User stories

### Tenant

| ID | Story | Acceptance |
|----|--------|------------|
| T1 | As a **tenant**, I want a **“My rental requests”** page so I can see every property I applied for and its current status. | List shows all my connections with property image, title, status, and date. |
| T2 | As a **tenant**, I want to know **what to do next** on each request so I am not lost after the landlord accepts. | Each card shows a clear next step: wait, message landlord, review agreement, or view tenancy. |
| T3 | As a **tenant**, I want to **withdraw** a pending request if I change my mind. | Withdraw only on `pending`; landlord gets notified. |
| T4 | As a **tenant**, I want to **remove** old declined/withdrawn requests from my list so it stays tidy. | Clear actions on History — see dismiss doc. |
| T5 | As a **tenant**, I want **in-app alerts** when a landlord accepts or declines my request (not only email). | Bell shows `connection_accepted` / `connection_rejected`; tap opens relevant request or chat. |

### Landlord

| ID | Story | Acceptance |
|----|--------|------------|
| L1 | As a **landlord**, I want an **in-app notification** when a tenant applies for my property. | Bell shows `connection_request`; tap opens landlord connection inbox or request detail. |
| L2 | As a **landlord**, I want to know when a tenant **withdraws** an application. | Bell shows `connection_cancelled`. |
| L3 | As a **landlord**, I want alerts for **rent received**, **agreements**, and **maintenance** in the same inbox. | Bell handles types listed in [Notification types by role](#notification-types-by-role). |

### Admin

| ID | Story | Acceptance |
|----|--------|------------|
| A1 | As an **admin**, I want to be notified when a **new listing is published** and needs verification. | Bell shows `property_submitted`; tap opens admin property review queue. |

---

## Tenant portal — screens to implement

### 1. New screen: “My rental requests”

**Where to put it**

- Tenant dashboard sidebar or bottom nav: **“My requests”** / **“Applications”** / **“Rental requests”**
- Optional: badge on nav using `GET /connections/stats` → `pending` count

**Layout**

```
┌─────────────────────────────────────────────────────────┐
│  My rental requests                          [stats?] │
├─────────────────────────────────────────────────────────┤
│  [ Active ]  [ History ]                                │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │ [img]  Sunny Apartment, Borrowdale                 │   │
│  │        Status: Pending                             │   │
│  │        Waiting for landlord response               │   │
│  │        Applied 12 May 2026                         │   │
│  │                        [ Withdraw ]                │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [img]  Garden Flat, Mount Pleasant               │   │
│  │        Status: Accepted                          │   │
│  │        Message landlord to continue              │   │
│  │                        [ Open chat ]             │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Tabs**

| Tab | Show records where `status` is | User goal |
|-----|-------------------------------|-----------|
| **Active** | `pending` or `accepted` | Track ongoing applications |
| **History** | `rejected` or `cancelled` | Review past outcomes; **clear** old items (dismiss doc) |

**Per-card fields (from API)**

| Field | Use on card |
|-------|-------------|
| `propertyId.title`, `propertyId.address`, `propertyId.images` | Title, location, thumbnail |
| `status` | Badge — map `cancelled` → **Withdrawn**, `rejected` → **Declined** |
| `nextStep` | Subtitle + primary button label (see table below) |
| `createdAt` | “Applied on …” |
| `respondedAt` | “Updated on …” when landlord responded |
| `landlordId.firstName/lastName` | Optional “Landlord: …” line |

**`nextStep` → UI copy and action**

| `nextStep` | Subtitle (example) | Primary button | Navigate to |
|------------|-------------------|----------------|-------------|
| `awaiting_landlord` | Waiting for landlord response | — (or disabled “Pending”) | — |
| `chat_available` | Landlord accepted — continue in chat | **Open chat** | Existing chat for this property/landlord |
| `agreement_pending` | Review and sign your agreement | **View agreement** | `/agreements/pending` or detail using `agreementId` |
| `active_rental` | You are renting this property | **View tenancy** | Tenant dashboard / rental detail using `rentalId` |
| `closed` | Application closed | **Remove** (History only) | Dismiss flow — [dismiss doc](./TENANT_DISMISS_WITHDRAWN_REQUESTS_FRONTEND.md) |

**Actions on Active tab**

| When | Button | API |
|------|--------|-----|
| `status === "pending"` | **Withdraw** | `PUT /connections/:connectionId/cancel-request` |
| `status === "accepted"` + `nextStep` | See table above | — |

**Withdraw flow**

1. Tenant taps **Withdraw**.
2. Confirm: “Withdraw your request for {property title}? The landlord will be notified.”
3. Optional text field → `cancelReason` in body.
4. On success: move card to **History** tab (status is now `cancelled` / Withdrawn).

**Empty states**

| Tab | Message | CTA |
|-----|---------|-----|
| Active | “You haven’t applied for any properties yet.” | **Browse homes** → property search |
| History | “No declined or withdrawn requests.” | — |

**Pagination**

- Use `pagination.hasNextPage` / infinite scroll or “Load more”.
- Default `limit=20`.

**Applying from property detail (existing flow)**

- Tenant still uses `POST /connections/request` from property page.
- After success, show toast: “Request sent” + link **View my requests**.
- Re-applying after withdraw uses the same endpoint; backend reactivates the row and it reappears under **Active**.

---

### 2. Tenant notification bell (extend existing)

Do **not** build a new notifications system. Extend the inbox from [PORTAL_REALTIME_CHAT_NOTIFICATIONS.md](./PORTAL_REALTIME_CHAT_NOTIFICATIONS.md).

**Tenant should handle these `notification.type` values**

| Type | Title (example) | On tap — navigate to |
|------|-----------------|----------------------|
| `connection_accepted` | Rental request accepted | **My rental requests** → that connection, or chat |
| `connection_rejected` | Rental request declined | **My rental requests** → History |
| `agreement_created` | New agreement | Agreement detail (`data.agreementId`) |
| `agreement_signed` | Agreement signed | Agreement or tenancy |
| `maintenance_update` | Maintenance update | Maintenance request detail (`data.maintenanceRequestId`) |
| `new_message`, `viewing_request`, etc. | (existing chat types) | Existing chat behaviour |

Use `data.connectionId`, `data.propertyId`, `data.agreementId` for deep links.

---

## Landlord portal — what to implement

**No new “rental requests” page required** if you already list connection requests (e.g. landlord dashboard / messages / requests).

**Do implement:**

1. **Notification bell** — handle new types:

| Type | On tap |
|------|--------|
| `connection_request` | Landlord connection list or request detail for `data.connectionId` |
| `connection_cancelled` | Same |
| `payment_received` | Payments / rental for `data.rentalId` or property |
| `property_verified` | Landlord property detail `data.propertyId` |
| `property_rejected` | Landlord property detail + rejection info |
| `agreement_created` / `agreement_signed` | Agreement flow |
| `maintenance_request` | Maintenance inbox for `data.maintenanceRequestId` |

2. **Existing list API** (unchanged): `GET /connections/landlord` — optional filters `?status=pending`, `?propertyId=...`

3. **Accept / reject** (if not already wired): `PUT /connections/:connectionId/accept`, `PUT /connections/:connectionId/reject`

---

## Admin portal — what to implement

**No rental-requests UI.**

**Do implement:**

| Type | On tap |
|------|--------|
| `property_submitted` | Admin property verification queue / listing `data.propertyId` |

---

## Notification types by role

| `type` | Tenant | Landlord | Admin |
|--------|:------:|:--------:|:-----:|
| `connection_request` | | ✓ | |
| `connection_accepted` | ✓ | | |
| `connection_rejected` | ✓ | | |
| `connection_cancelled` | | ✓ | |
| `property_submitted` | | | ✓ |
| `property_verified` | | ✓ | |
| `property_rejected` | | ✓ | |
| `agreement_created` | ✓ | ✓ | |
| `agreement_signed` | ✓ | ✓ | |
| `payment_received` | | ✓ | |
| `maintenance_request` | | ✓ | |
| `maintenance_update` | ✓ | | |
| Chat types (`new_message`, …) | ✓ | ✓ | ✓ |

---

## Technical reference

### Base URL

```env
VITE_API_URL=https://khayamanage.co.zw/api/backend
VITE_SOCKET_URL=https://khayamanage.co.zw
```

All paths below are under `/api`. Auth: `Authorization: Bearer <JWT>`.

### Status mapping (display)

| API `status` | Tenant UI label |
|--------------|-----------------|
| `pending` | Pending |
| `accepted` | Accepted |
| `rejected` | Declined |
| `cancelled` | **Withdrawn** |

---

### Tenant APIs

#### List my requests

```http
GET /connections/tenant/requests?page=1&limit=20
GET /connections/tenant/requests?status=pending
GET /connections/tenant/requests?includeDismissed=true
```

| Query | Default | Description |
|-------|---------|-------------|
| `page` | `1` | Page number |
| `limit` | `20` | Page size |
| `status` | all | `pending`, `accepted`, `rejected`, `cancelled` |
| `includeDismissed` | `false` | Include tenant-cleared history items |

**Response shape (per item)**

```json
{
  "_id": "...",
  "status": "accepted",
  "message": "I would like to rent this property...",
  "isActive": true,
  "dismissedByTenantAt": null,
  "landlordId": { "firstName": "John", "lastName": "Doe", "email": "..." },
  "propertyId": { "title": "...", "address": "...", "images": {} },
  "nextStep": "chat_available",
  "agreementStatus": null,
  "agreementId": null,
  "rentalStatus": null,
  "rentalId": null,
  "createdAt": "2026-05-01T10:00:00.000Z",
  "respondedAt": "2026-05-02T14:00:00.000Z"
}
```

#### Stats (nav badge)

```http
GET /connections/stats
```

```json
{
  "success": true,
  "data": {
    "pending": 2,
    "accepted": 1,
    "rejected": 0,
    "cancelled": 1,
    "total": 4
  }
}
```

#### Send / re-apply

```http
POST /connections/request
Content-Type: application/json

{
  "propertyId": "...",
  "landlordId": "...",
  "message": "I am interested in this property...",
  "proposedViewingDate": "2026-08-03",
  "expectedMoveInDate": "2026-07-01",
  "expectedBudgetMin": 400,
  "expectedBudgetMax": 600
}
```

#### Withdraw pending request

```http
PUT /connections/:connectionId/cancel-request
Content-Type: application/json

{ "cancelReason": "Found another place" }
```

#### Dismiss (History tab)

See [TENANT_DISMISS_WITHDRAWN_REQUESTS_FRONTEND.md](./TENANT_DISMISS_WITHDRAWN_REQUESTS_FRONTEND.md).

---

### Landlord APIs (reference)

```http
GET /connections/landlord?status=pending
PUT /connections/:connectionId/accept
PUT /connections/:connectionId/reject
```

---

### Notifications APIs (all roles)

```http
GET /notifications?page=1&limit=20
GET /notifications/unread-count
PUT /notifications/:id/read
PUT /notifications/read-all
```

Socket: listen for `notification_created` (see realtime doc).

---

### Browse listings — no frontend change

Rented properties are excluded server-side (`Property.status = "rented"`). Tenant browse/search/featured endpoints only return `published` listings.

---

## Implementation checklist

### Tenant portal

- [ ] Add **My rental requests** route and nav entry
- [ ] **Active** / **History** tabs with correct filters
- [ ] Request cards with status, `nextStep`, and actions
- [ ] **Withdraw** on pending with confirm + API
- [ ] **Clear** on History (dismiss doc)
- [ ] Empty states + pagination
- [ ] Bell: `connection_accepted`, `connection_rejected`, agreement + maintenance types
- [ ] Deep link from notifications to requests/chat/agreements

### Landlord portal

- [ ] Bell: `connection_request`, `connection_cancelled`, `payment_received`, property + agreement + maintenance types
- [ ] Tap notification → existing landlord requests / property / agreement screens

### Admin portal

- [ ] Bell: `property_submitted` → verification queue

---

## Related docs

- [TENANT_DISMISS_WITHDRAWN_REQUESTS_FRONTEND.md](./TENANT_DISMISS_WITHDRAWN_REQUESTS_FRONTEND.md)
- [PORTAL_REALTIME_CHAT_NOTIFICATIONS.md](./PORTAL_REALTIME_CHAT_NOTIFICATIONS.md)
- [CONNECTION_REQUEST_API.md](./CONNECTION_REQUEST_API.md)
- [CONNECTION_REQUEST_CANCEL.md](./CONNECTION_REQUEST_CANCEL.md)
