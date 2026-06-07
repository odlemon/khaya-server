# Bank dashboard: insurance partner settlement

## User story

As a **bank administrator** using the Khayalami bank portal, I need to **settle insurance premiums** the same way I settle **landlord rent payouts**. Tenants pay rent into escrow; each payment can include an **insurance premium** deduction per property/landlord. After Khayalami runs **escrow distribution**, those premium slices are aggregated into an **insurance partner payout** batch. I must see pending batches, drill into contributing escrow lines (property, landlord, premium amount), and after our bank remits funds to th e **insurance partner** outside the platform, **mark the batch paid** so the system reflects that remittance.

## How money links to insurance today

1. **Escrow transaction** (`EscrowTransaction`): one row per captured payment. Holds `deductions.insurancePremium` (and other deductions), `landlordId`, `propertyId` / `rentalId`, and lifecycle `status` (`held` → `distributed` after distribution).
2. **Distribution** (`EscrowService.distributeEscrow`): sums `deductions.insurancePremium` across held rows, creates a **`Payout`** with `payoutType: "insurance_partner"` and `recipientType: "insurance_partner"` (new behaviour). Each contributing escrow row gets `insurancePartnerPayoutId` and `insurancePartnerPayoutStatus: "pending"`.
3. **Platform commission** remains a separate **`khayalami`** payout (amount excludes insurance). Escrow rows with platform commission get `khayalamiPayoutId` / `khayalamiPayoutStatus`; rows with **only** insurance premium still get insurance fields only where premium &gt; 0.
4. **Legacy data**: older runs stored the insurance batch as **`khayalami`** with **notes** containing `Insurance premium distribution`. List/detail/mark-paid APIs **include those batches** and set `isLegacyKhayalamiInsuranceBatch: true`. Mark-paid updates the same escrow insurance fields using `escrowTransactionIds` on that payout.

There is **no separate `recipientId` for the insurer** on `Payout` yet; the partner is implicit (single partner / ops config). Bank staff use their own records for where to send funds.

## Auth

All routes require a **bank_admin** JWT (same as existing bank admin APIs).

- `Authorization: Bearer <token>`
- Base path: `/api/bank-admin`

## Endpoints

### Summary (extended)

**`GET /api/bank-admin/summary`**

Existing response gains **`data.insurancePartnerPayouts`**:

| Field | Meaning |
|--------|--------|
| `recordsAwaitingSettlement.count` | `Payout` rows (insurance + legacy) in `pending` or `processing` |
| `recordsAwaitingSettlement.totalAmount` | Sum of `amount` for those payouts |
| `settledOutsideSystemLifetime.*` | Completed insurance-type payouts |
| `distributedEscrowRowsAwaitingInsuranceRemittance.escrowTransactionCount` | Distributed rows with `deductions.insurancePremium` &gt; 0 and `insurancePartnerPayoutStatus` not `paid` or `failed` |
| `distributedEscrowRowsAwaitingInsuranceRemittance.totalInsurancePremium` | Sum of premium on those rows |

`data.notes` includes **`markInsurancePaid`** and **`legacyInsurancePayouts`**.

### List insurance payouts

**`GET /api/bank-admin/insurance-payouts`**

Query:

| Param | Default | Description |
|--------|---------|-------------|
| `page` | `1` | Page number |
| `limit` | `20`, max `100` | Page size |
| `status` | `all` | `pending` \| `processing` \| `completed` \| `failed` \| `cancelled` \| `all` |

**Response** `200`:

```json
{
  "success": true,
  "data": {
    "payouts": [
      {
        "payoutId": "674abc...",
        "payoutType": "insurance_partner",
        "recipientType": "insurance_partner",
        "isLegacyKhayalamiInsuranceBatch": false,
        "amount": 12500,
        "status": "pending",
        "payoutMethod": "internal_transfer",
        "bankDetails": null,
        "mobileMoneyDetails": null,
        "externalReference": null,
        "processedAt": null,
        "notes": "Insurance premium distribution - …",
        "createdAt": "2026-04-28T10:00:00.000Z",
        "escrowTransactionCount": 42
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
  }
}
```

### Get one insurance payout (with lines)

**`GET /api/bank-admin/insurance-payouts/:payoutId`**

**Response** `200` — `data` includes **`escrowTransactions`** (one object per linked escrow row):

Per line (extends landlord-style bank line):

- `escrowTransactionId`, `totalAmount`, `landlordAmount`, `khayalamiAmount`, `escrowStatus`, `paymentType`, `distributedAt`
- `property`, `propertyDisplayTitle`, `propertyDisplaySubtitle`, `rentalId`
- **`insurancePremium`**: `deductions.insurancePremium` for that line
- **`deductions`**: full breakdown object
- **`insurancePartnerPayoutStatus`**, **`insurancePartnerPayoutDate`**
- **`landlord`**: `{ userId, firstName, lastName, email, phone }` when populated

**Errors**: `400` invalid id, `404` not found (id not an insurance batch).

### Mark insurance payout paid

**`POST /api/bank-admin/insurance-payouts/:payoutId/mark-paid`**

**Body** (JSON, all optional but at least one is typical in production):

```json
{
  "externalReference": "BANK-WIRE-REF-998877",
  "notes": "Remitted to insurer partner account ending 4521"
}
```

**Behaviour**:

- Sets payout `status` to `completed`, `processedAt`, `processedBy` (bank admin user).
- Appends optional `notes` with a timestamped tag.
- **`EscrowTransaction.updateMany`** for all `_id` in `escrowTransactionIds`: `insurancePartnerPayoutStatus: "paid"`, `insurancePartnerPayoutDate: now`, `insurancePartnerPayoutId` set to this payout (backfills legacy rows).

**Response** `200`:

```json
{
  "success": true,
  "message": "Insurance payout marked as paid. Linked escrow rows updated with insurancePartnerPayoutStatus paid.",
  "data": {
    "payoutId": "674abc...",
    "status": "completed",
    "processedAt": "2026-05-02T14:30:00.000Z",
    "externalReference": "BANK-WIRE-REF-998877",
    "escrowTransactionsUpdated": 42
  }
}
```

**Errors**: `400` invalid id, `404` wrong type / missing payout, `409` already completed or cancelled.

## Frontend checklist

1. **Dashboard**: read `GET /summary` and show insurance cards alongside landlord metrics (`insurancePartnerPayouts` + remittance row counts).
2. **List screen**: `GET /insurance-payouts?status=pending`; show `amount`, `escrowTransactionCount`, `createdAt`, badge when `isLegacyKhayalamiInsuranceBatch`.
3. **Detail screen**: `GET /insurance-payouts/:payoutId`; table of `escrowTransactions` with landlord, property, **`insurancePremium`**, and line-level **`insurancePartnerPayoutStatus`** (pending until mark-paid).
4. **Settlement action**: confirm dialog → `POST .../mark-paid` with `externalReference` from bank core; handle `409` for duplicate confirm.
5. **Do not** use `/api/bank-admin/payouts/:id` for insurance batches — those remain **landlord-only**.

## Related landlord APIs (unchanged)

- `GET /api/bank-admin/payouts` — landlord payouts only  
- `GET /api/bank-admin/payouts/:payoutId`  
- `POST /api/bank-admin/payouts/:payoutId/mark-paid`

## Data model reference

| Model | Fields |
|--------|--------|
| `Payout` | `payoutType: "insurance_partner"`, `recipientType: "insurance_partner"`, `amount`, `escrowTransactionIds`, `status`, `notes`, … |
| `EscrowTransaction` | `deductions.insurancePremium`, `insurancePartnerPayoutId`, `insurancePartnerPayoutStatus`, `insurancePartnerPayoutDate` |
