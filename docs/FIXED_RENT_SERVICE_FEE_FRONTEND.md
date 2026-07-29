# Fixed Rent Service Fee — Frontend Integration Guide

## Why this change

Previously the platform took a percentage-based processing fee (1.5–2%) from the landlord's payout on every rent payment. This has been replaced with a **flat USD 10 service fee per monthly rent installment**. Landlords now choose at listing time whether they absorb the fee or pass it on to the tenant.

---

## How the two payer modes work

| Mode | Listing `price` | Tenant pays | Landlord receives |
|------|-----------------|-------------|-------------------|
| **Landlord pays** (default) | $100 | $100 | $90 (after $10 deduction) |
| **Tenant pays** | $100 | $110 ($100 rent + $10 fee) | $100 |

The stored `price` field is always the landlord's **base rent**. The API enriches every property response with computed fields so the frontend never has to do the math.

---

## New / changed API fields

### Property responses (all list, detail, search, featured, favorites)

Every property object now includes:

```json
{
  "price": 100,
  "serviceFeePayer": "landlord",
  "serviceFee": {
    "payer": "landlord",
    "amount": 10
  },
  "tenantPayableRent": 100,
  "landlordRentBeforeOtherDeductions": 90
}
```

When the landlord chose **tenant pays**:

```json
{
  "price": 100,
  "serviceFeePayer": "tenant",
  "serviceFee": {
    "payer": "tenant",
    "amount": 10
  },
  "tenantPayableRent": 110,
  "landlordRentBeforeOtherDeductions": 100
}
```

### Field reference

| Field | Type | Description |
|-------|------|-------------|
| `price` | `number` | The landlord's base monthly rent. Unchanged. |
| `serviceFeePayer` | `"landlord" \| "tenant"` | Who bears the platform service fee. Defaults to `"landlord"` for existing listings. |
| `serviceFee.payer` | `"landlord" \| "tenant"` | Same as `serviceFeePayer` (nested for convenience). |
| `serviceFee.amount` | `number` | Always `10` (the fixed fee). |
| `tenantPayableRent` | `number` | The rent amount the **tenant** actually pays each month. Use this for display on property cards and detail pages. |
| `landlordRentBeforeOtherDeductions` | `number` | What the landlord receives from rent before subscription/insurance deductions. Useful for landlord dashboard. |

---

## Creating or updating a listing

### `POST /api/properties`

Add `serviceFeePayer` to the request body. It is optional; omitting it defaults to `"landlord"`.

```json
{
  "title": "Sunridge Apartments Unit 4",
  "price": 350,
  "serviceFeePayer": "tenant",
  "deposit": 700,
  "images": { "mainImage": "https://..." },
  ...
}
```

### `PUT /api/properties/:id`

```json
{
  "serviceFeePayer": "landlord"
}
```

Validation: must be `"landlord"` or `"tenant"`. Any other value will fail Mongoose enum validation.

**Important**: Changing `serviceFeePayer` on an existing listing only affects **future** agreements. Active agreements and rentals snapshot the payer at creation time.

---

## Frontend display rules

### Property cards (browse / search / featured)

- Show `tenantPayableRent` as the monthly rent, not `price`.
- If `serviceFeePayer === "tenant"`, optionally show a small badge or note: "Includes $10 service fee".

### Property detail page

- Primary rent display: `tenantPayableRent`
- Show the fee breakdown:
  - Base rent: `price`
  - Service fee: `serviceFee.amount` (paid by `serviceFee.payer`)

### Landlord listing form

Add a selector for "Who pays the service fee?" with two options:
- **I will pay** (`"landlord"`) — shown as default
- **Tenant pays** (`"tenant"`)

Show a live preview:
- If landlord pays: "Tenant sees: $`price` / Landlord receives: $`price - 10`"
- If tenant pays: "Tenant sees: $`price + 10` / Landlord receives: $`price`"

### Landlord dashboard / my listings

- Show `price` as "Base Rent"
- Show `landlordRentBeforeOtherDeductions` as "Your Take (before subscriptions)"
- Show `serviceFeePayer` as a label: "Fee: You pay" or "Fee: Tenant pays"

---

## Search / price filters

The `minPrice` and `maxPrice` query parameters on `GET /api/properties` and `GET /api/properties/tenant/with-connections` now filter against tenant-payable rent across both payer modes:

- Landlord-paid listings: filters against `price` directly.
- Tenant-paid listings: filters against `price + 10`.

The frontend does not need to adjust filter values. Pass the tenant-facing price range and the backend handles mixed results.

---

## Agreements and Rentals

When an agreement is created, the listing's `serviceFeePayer` and the fixed fee amount are snapshotted:

```json
{
  "serviceFeePayer": "tenant",
  "serviceFeeAmount": 10
}
```

These fields appear on both Agreement and Rental objects. They cannot be changed after agreement creation, even if the landlord later updates the listing.

### Payment schedule

Each scheduled payment's `amount` already includes the fee when `serviceFeePayer === "tenant"`.

- Landlord-paid: `amount = monthlyRent` (fee deducted from landlord's payout)
- Tenant-paid: `amount = monthlyRent + 10` (full base rent goes to landlord)

Payment `metadata` includes:

```json
{
  "rentPortion": 350,
  "serviceFee": 10,
  "serviceFeePayer": "tenant"
}
```

(Only present when tenant-paid and/or other surcharges exist.)

---

## Invoices

When the tenant bears the fee, the invoice includes a line item:

```
Monthly Rent     $350
Service Fee       $10
─────────────────────
Total            $360
```

When the landlord bears the fee, the invoice only shows:

```
Monthly Rent     $350
─────────────────────
Total            $350
```

(The $10 is a payout deduction on the landlord side, not a tenant charge.)

---

## Escrow / revenue records

Revenue sources of type `processing_fee` now always have `amount: 10` and their `description` includes the payer mode, e.g. `"Service fee ($10, landlord-paid)"`.

---

## Legacy / backward compatibility

- **Existing listings** without `serviceFeePayer` default to `"landlord"`.
- **Existing agreements / rentals** without `serviceFeePayer` default to `"landlord"`, and `serviceFeeAmount` defaults to `10`.
- **Old percentage-based fee references** in other docs are outdated. This document is the source of truth.

---

## Error handling

| Scenario | HTTP | Response |
|----------|------|----------|
| Invalid `serviceFeePayer` value (not `"landlord"` or `"tenant"`) | 400 | Mongoose validation error |
| Rent below $10 with landlord-paid fee | — | System clamps `landlordRentBeforeOtherDeductions` to $0 (no negative). Landlord should set a higher price. |

---

## Summary of endpoints affected

| Endpoint | Change |
|----------|--------|
| `POST /api/properties` | Accepts `serviceFeePayer` |
| `PUT /api/properties/:id` | Accepts `serviceFeePayer` |
| `GET /api/properties` | Returns enriched pricing; price filter updated |
| `GET /api/properties/:id` | Returns enriched pricing |
| `GET /api/properties/featured` | Returns enriched pricing |
| `GET /api/properties/tenant/with-connections` | Returns enriched pricing; price filter updated |
| `GET /api/properties/search/location` | Returns enriched pricing |
| `GET /api/properties/landlord/my-properties` | Returns enriched pricing |
| Favorites endpoints | Returns enriched pricing on populated property |
| Agreement / Rental objects | Include `serviceFeePayer`, `serviceFeeAmount` |
| Invoices | Tenant-paid fee shown as line item |
