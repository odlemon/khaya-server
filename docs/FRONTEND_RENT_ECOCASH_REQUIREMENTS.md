# Frontend Requirements — Tenant Rent Payment (EcoCash)

**Audience:** Portal and mobile frontend teams  
**Scope:** Online rent payments via EcoCash only  
**Related:** [TENANT_RENT_ECOCASH_PAYMENT_FRONTEND.md](./TENANT_RENT_ECOCASH_PAYMENT_FRONTEND.md) (full API reference), [ENDED_RENTALS_FRONTEND.md](./ENDED_RENTALS_FRONTEND.md) (ended rentals)

---

## What you must build

Tenants with an **active** rental pay rent in three steps:

1. **Show** amount due and a “Pay with EcoCash” button
2. **POST** to initiate payment → receive `paymentId`
3. **Poll** status until `paid === true` or a terminal failure

The frontend never talks to ContiPay directly. All gateway work is backend-only.

---

## When to show the pay UI

| Condition | Action |
|-----------|--------|
| Rental `status === "active"` and `canPayRent === true` | Show pay form |
| Rental ended / suspended (`isReadOnlyHistory === true`) | Hide pay form; show “No longer active” |
| No pending rent installment | Hide pay button or show “Nothing due” |
| User is not the tenant on that rental | Do not show pay UI |

Load rental from:

```
GET /api/rentals
GET /api/rentals?status=active
GET /api/tenant/dashboard
```

Optional — display amount before pay:

```
GET /api/rentals/:rentalId/payments?status=pending
```

The **first pending** installment is what the backend charges. The first payment may include an **agreement fee** (e.g. $1,530 = $1,500 rent + $30 fee).

---

## Step 1 — Initiate payment

### Request

```
POST /api/payments/rental/:rentalId/create
Authorization: Bearer <token>
Content-Type: application/json
```

**Minimum body:**

```json
{
  "paymentMethod": "ecocash",
  "paymentType": "rent",
  "amount": 500
}
```

The `amount` field is **required** — it is exactly what EcoCash will charge. Partial payments are allowed as long as `amount` does not exceed the installment balance due.

### Required fields

| Field | Value | Notes |
|-------|-------|-------|
| `paymentMethod` | `"ecocash"` | **Required.** Never send `"contipay"` in new UI. |
| `paymentType` | `"rent"` | Optional; defaults to `"rent"`. |

### Optional fields

| Field | When to send |
|-------|----------------|
| `phone` | **Required in production UI.** Optional in UAT (backend ignores it in sandbox). |
| `amount` | **Required.** Amount to charge via EcoCash (supports partial pay up to balance due). |
| `notes` | Optional user note. |
| `email`, `firstName`, `lastName` | Optional; passed to gateway profile. |

### Phone number (production)

- **Required** when not in test mode.
- Validate Zimbabwe format: `07XXXXXXXX` or `2637XXXXXXXX`.
- In **UAT / sandbox** (`testMode: true` in response): phone is optional; backend uses test number `0771234567`.

### Success response (`201`)

Store these fields immediately:

| Field | Use |
|-------|-----|
| `data.paymentId` | Poll key — required |
| `data.statusCheckUrl` | Relative path — prepend `VITE_API_URL` |
| `data.instructions` | Show to user (“Check your phone…”) |
| `data.testMode` | If `true`, show sandbox banner |

Example:

```json
{
  "success": true,
  "data": {
    "paymentId": "6a42275ada655860a1e897de",
    "statusCheckUrl": "/api/webhooks/payment-status/6a42275ada655860a1e897de",
    "instructions": "PENDING SUBSCRIBER VALIDATION",
    "testMode": true
  }
}
```

### On initiate — UI must

- Disable the pay button (prevent double submit)
- Show a loading / processing screen
- Display `instructions` from the response
- Start polling (Step 2) using `paymentId`

### Initiate errors — show and allow retry

| HTTP | Typical message | UI |
|------|-----------------|-----|
| `400` | `Online rent payment requires paymentMethod 'ecocash'` | Fix request body |
| `400` | `Payment amount is required...` | Send `amount` in body |
| `400` | `Payment amount cannot exceed amount due` | Lower to balance due |
| `400` | `No pending rent installment found` | Refresh; nothing to pay |
| `400` | `This rental is no longer active` | Hide pay UI |
| `400` | Gateway error | Toast + retry |
| `401` | Unauthorized | Redirect to login |
| `404` | Rental not found | Error state |

---

## Step 2 — Poll payment status

### Request

```
GET /api/webhooks/payment-status/:paymentId
Authorization: Bearer <token>
```

Use `statusCheckUrl` from Step 1 (prepend API base URL).

**Do not** call `POST /api/webhooks/contipay` from the browser. That endpoint is ContiPay → backend only.

### Polling rules

| Rule | Value |
|------|-------|
| Interval | Every **3–5 seconds** |
| Keep polling while | `data.paid === false` AND status is `pending` or `processing` |
| Stop when | `data.paid === true` OR terminal status (see below) |
| Frontend UX timeout | **2–3 minutes** — then show “Still processing” with option to keep waiting or retry |
| Backend hard expiry | ~**15 minutes** — poll returns `status: "expired"` |

### Poll statuses — what to do

| `data.status` | `data.paid` | Frontend action |
|---------------|-------------|-----------------|
| `pending` | `false` | Keep polling — awaiting gateway |
| `processing` | `false` | Keep polling — payment in flight at EcoCash |
| `completed` | `true` | **Success** — stop polling, show receipt |
| `cancelled` | `false` | **Failed** — stop polling, show error + retry |
| `expired` | `false` | **Timed out** — stop polling, show retry |
| `rejected` | `false` | **Failed** — stop polling, show error |
| `failed` | `false` | **Failed** — stop polling, show error |

> **Important:** While polling, `data.payment.status` inside the response may show `overdue` on a scheduled installment. That is normal during gateway processing. Trust **`data.paid`** and top-level **`data.status`**, not the nested payment status alone.

### Success poll response

```json
{
  "success": true,
  "data": {
    "paid": true,
    "status": "completed",
    "payment": {
      "_id": "...",
      "status": "verified",
      "amount": 1500,
      "receiptNumber": "REC-...",
      "verifiedAt": "2026-07-01T07:58:40.400Z"
    }
  }
}
```

### Still processing

```json
{
  "success": true,
  "data": {
    "paid": false,
    "status": "processing",
    "payment": {
      "status": "overdue",
      "gatewayReference": "RENT-..."
    }
  }
}
```

→ Keep polling.

### On success — UI must

- Stop polling
- Show success screen (amount, receipt number if present, date)
- Refresh:
  - Rental detail
  - Payment history (`GET /api/rentals/:rentalId/payments`)
  - Tenant dashboard

### On failure / timeout — UI must

- Stop polling (or let user manually stop after UX timeout)
- Show clear message
- Re-enable “Pay with EcoCash” for retry
- Do not assume payment failed if only the frontend UX timeout fired — user may still complete on phone; optional “Check status” button can poll again with same `paymentId`

---

## UI state machine

```
[IDLE]
  → user taps "Pay with EcoCash"
[INITIATING] — POST create, button disabled
  → 201 + paymentId
[POLLING] — show instructions, poll every 3–5s
  → paid: true          → [SUCCESS] → refresh data
  → cancelled/expired   → [FAILED]  → allow retry
  → frontend 3min limit → [STILL_PROCESSING] → optional continue polling or retry
```

### Screens / components

1. **Pay rent card** — amount due, EcoCash branding, phone input (prod), CTA
2. **Processing overlay** — spinner, `instructions`, “Waiting for EcoCash confirmation…”
3. **Success** — receipt summary
4. **Error** — message + retry button
5. **Test mode banner** (UAT) — “Sandbox mode — no real charge”

---

## Environment differences

| | UAT / sandbox | Production |
|---|---------------|------------|
| Phone field | Optional (ignored) | **Required** |
| `testMode` in response | `true` | `false` / absent |
| Banner | Show test mode notice | Hide |
| EcoCash prompt | Simulated (auto-completes ~30s) | Real USSD on user's phone |
| Payment label | “EcoCash” | “EcoCash” |

---

## Must do checklist

- [ ] Use `paymentMethod: "ecocash"` (not `contipay`)
- [ ] Only enable pay when `canPayRent === true`
- [ ] Disable pay button on submit
- [ ] Poll `GET /api/webhooks/payment-status/:paymentId` after every successful create
- [ ] Poll every 3–5 seconds until `paid === true` or terminal status
- [ ] Treat `processing` the same as `pending` — keep polling
- [ ] Show `instructions` during polling
- [ ] Refresh rental and payment lists on success
- [ ] Collect and validate phone in production
- [ ] Show test banner when `testMode === true`

## Must not do

- [ ] Call `POST /api/webhooks/contipay` from the browser
- [ ] Use `paymentMethod: "contipay"` in new UI
- [ ] Show pay form on ended / inactive rentals
- [ ] Assume payment succeeded without polling
- [ ] Stop polling just because nested `payment.status` is `overdue`
- [ ] Allow multiple concurrent create requests for the same rental

---

## Reference code (TypeScript)

```typescript
const API_BASE = import.meta.env.VITE_API_URL;

const TERMINAL_FAILURE = ["cancelled", "expired", "rejected", "failed"] as const;
const POLL_INTERVAL_MS = 4000;
const UX_TIMEOUT_MS = 3 * 60 * 1000;

export async function initiateRentEcoCash(
  rentalId: string,
  token: string,
  amount: number,
  phone?: string
) {
  const res = await fetch(`${API_BASE}/api/payments/rental/${rentalId}/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentMethod: "ecocash",
      paymentType: "rent",
      amount,
      ...(phone && { phone }),
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Payment failed to start");
  return json.data as {
    paymentId: string;
    statusCheckUrl: string;
    instructions?: string;
    testMode?: boolean;
  };
}

export async function pollRentPaymentStatus(paymentId: string, token: string) {
  const res = await fetch(`${API_BASE}/api/webhooks/payment-status/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Status check failed");
  return json.data as { paid: boolean; status: string; payment?: Record<string, unknown> };
}

export async function payRentWithPolling(
  rentalId: string,
  token: string,
  amount: number,
  opts?: { phone?: string; onStatus?: (status: string) => void }
) {
  const { paymentId, instructions, testMode } = await initiateRentEcoCash(
    rentalId,
    token,
    amount,
    opts?.phone
  );
  const deadline = Date.now() + UX_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const { paid, status } = await pollRentPaymentStatus(paymentId, token);
    opts?.onStatus?.(status);

    if (paid) return { ok: true as const, paymentId, instructions, testMode };
    if (TERMINAL_FAILURE.includes(status as (typeof TERMINAL_FAILURE)[number])) {
      return { ok: false as const, paymentId, status, instructions, testMode };
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  return { ok: false as const, paymentId, status: "timeout" as const, instructions, testMode };
}
```

---

## Quick sandbox test

1. Log in as tenant with an active rental and pending installment.
2. `POST` `{ "paymentMethod": "ecocash", "paymentType": "rent" }` — no phone needed in UAT.
3. Poll every 4s on `paymentId`.
4. Expect `paid: true` within ~30 seconds in sandbox.

---

## One-line summary

**POST** rent pay with `paymentMethod: "ecocash"` → **poll** `GET /api/webhooks/payment-status/:paymentId` every 3–5s until `paid === true` or failure — never call the ContiPay webhook from the client.
