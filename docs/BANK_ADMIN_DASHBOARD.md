# Bank partner dashboard (backend)

APIs for the **bank / settlement portal**: view escrow-related money flows, landlord destination details, and **confirm transfers** performed outside Khayalami by marking payout records as paid.

**Auth:** same staff login as other portals — `POST /api/auth/login` with role **`bank_admin`** (e.g. seeded `admin@metbank` / `Admin@123`).  
**Header:** `Authorization: Bearer <JWT>`

**Scope:** These routes expose **landlord rent payouts** only (the `Payout` rows created when Khayalami runs escrow distribution). They do **not** expose insurance-only or generic Khayalami commission payout settlement unless you extend the service later.

---

## Money flow (how to read the dashboard)

1. **Tenant pays** → funds enter **escrow** as `EscrowTransaction` (`pending` → `held` when verified).
2. **Khayalami runs distribution** (`POST /api/escrow/distribute` as platform admin) → creates a **`Payout`** per landlord (with bank / mobile snapshot) and sets escrow rows to `distributed` with `landlordPayoutStatus: pending`.
3. **Bank pays landlord** outside the app → bank user calls **`mark-paid`** on that payout → `Payout.status = completed`, linked escrow rows get `landlordPayoutStatus: paid` and `landlordPayoutDate`.

**Pre-distribution:** money still in escrow with `status: held` — see **`GET /escrow/held-by-landlord`**.  
**Post-distribution, pre-bank-transfer:** landlord **`Payout`** with `status: pending` — see **`GET /payouts?status=pending`**.

Amounts are whatever currency your `Payment` / `Escrow` records use (no conversion in these endpoints).

---

## Endpoints

Base path: **`/api/bank-admin`**

All routes require **`bank_admin`**.

| Method | Path | Purpose |
|--------|------|--------|
| `GET` | `/summary` | Headline balances + payout pipeline |
| `GET` | `/escrow/held-by-landlord` | Held escrow, grouped by landlord (before distribution) |
| `GET` | `/payouts` | Paginated landlord payouts |
| `GET` | `/payouts/:payoutId` | Single payout + linked escrow lines |
| `POST` | `/payouts/:payoutId/mark-paid` | Record external transfer + sync escrow flags |

---

### 1. `GET /api/bank-admin/summary`

**Response `data` (shape):**

- **`escrow`** — from existing escrow accounting (`totalHeld`, `pendingLandlordShareInEscrow`, Khayalami share, transaction counts, lifetime distribution highlights).
- **`landlordPayouts.recordsAwaitingSettlement`** — count + sum of **landlord** `Payout` documents in `pending` or `processing`.
- **`landlordPayouts.settledOutsideSystemLifetime`** — count + sum of **landlord** payouts already `completed`.
- **`landlordPayouts.distributedEscrowRowsAwaitingBankConfirmation`** — count of `EscrowTransaction` rows that are `distributed` but `landlordPayoutStatus` still `pending` (should align with open payout work).
- **`notes`** — short field guide for frontend tooltips.

---

### 2. `GET /api/bank-admin/escrow/held-by-landlord`

List of landlords with **held** escrow (not yet through platform distribution).

Each item includes `landlordId`, optional **User** banking hints (`bankAccount`, `bankName` on the user profile), **heldTransactionCount**, **totalLandlordAmount** (sum of `landlordAmount` for those rows).

---

### 3. `GET /api/bank-admin/payouts`

**Query:**

| Param | Default | Description |
|--------|---------|-------------|
| `page` | `1` | Page index |
| `limit` | `20` | Page size (max `100`) |
| `status` | `all` | `all` \| `pending` \| `processing` \| `completed` \| `failed` \| `cancelled` |

**Response:** `data.payouts[]` with `payoutId`, `amount`, `status`, `payoutMethod`, **`bankDetails` / `mobileMoneyDetails`** (snapshot on the payout), landlord summary, `escrowTransactionCount`, timestamps.

---

### 4. `GET /api/bank-admin/payouts/:payoutId`

Full detail for one **landlord** payout, including **each linked `EscrowTransaction`**.

**Linked lines (`escrowTransactions[]`):**

| Field | Notes |
|--------|--------|
| `escrowStatus` | Escrow row lifecycle: `pending` \| `held` \| `distributed` \| `cancelled`. |
| `status` | **Same value as `escrowStatus`** — use either; some UIs only bind `status`. |
| `property` | Populated from `propertyId` on the escrow row when set. |
| `propertyDisplayTitle` | **Preferred for tables** — human-readable label. If there is no property on the escrow row, we try **`rentalId` → Rental → Property**. If still unknown, you get e.g. `Service / platform (no property on file)` for `paymentType: service`. |
| `propertyDisplaySubtitle` | Usually city from address when property exists. |
| `landlordPayoutStatus` | `pending` until bank **mark-paid**, then `paid`. |

**Why some rows had “empty” property in the UI:** the API always had `property: null` when that escrow line was created **without** `propertyId` (common for **service**-type lines). The JSON still had `escrowStatus: "distributed"` — if the UI showed a dash, the frontend was likely reading the wrong keys (e.g. `row.status` instead of `escrowStatus` / `status`, or not using `property?.title`). Use **`propertyDisplayTitle`** for a single column.

**Bank details on the payout:** if `bankDetails` / `mobileMoneyDetails` on the `Payout` are null, the API **falls back** to the landlord’s current **`LandlordBalance`** payout instructions when available.

---

### 5. `POST /api/bank-admin/payouts/:payoutId/mark-paid`

Call after the bank has **actually sent** funds to the landlord (external transfer).

**Body (JSON, optional fields):**

```json
{
  "externalReference": "STR-REF-12345",
  "notes": "Paid via bulk file 2025-03-15"
}
```

**Effects:**

- Sets `Payout.status` → `completed`, `processedAt` → now, `processedBy` → current bank admin user.
- Sets `externalReference` if provided.
- Appends `notes` with a timestamped line.
- **`EscrowTransaction.updateMany`** for all IDs on that payout: `landlordPayoutStatus` → `paid`, `landlordPayoutDate` → now.
- Sends **`sendLandlordBankPayoutConfirmed`** email to the landlord (amount, payout id, optional bank reference, timestamp). If email fails, the payout is still marked paid; check logs. Response includes **`emailSent`: true/false** when the landlord had an email and send succeeded.

**Errors:**

- `409` if payout already `completed`.
- `409` if payout `cancelled`.
- `404` if not a landlord payout.

---

## Frontend user stories

1. **As a bank operator, I log in with bank portal credentials** and see only bank APIs (`role: bank_admin` from login / `/api/auth/me`).

2. **As a bank operator, I open a dashboard home** that shows total escrow held, landlord share still in escrow, how many landlord payout records are unsettled, and lifetime settled totals — use **`GET /summary`**.

3. **As a bank operator, I view upcoming obligations before platform distribution** — list landlords and amounts still in **held** escrow — **`GET /escrow/held-by-landlord`** (optional table: landlord name, email, bank hints, amount, #payments).

4. **As a bank operator, I work a settlement queue** of **Payout** rows waiting for our transfer — filter `pending`/`processing` — **`GET /payouts?status=pending`**.

5. **As a bank operator, I open a payout detail screen** to copy **bank or mobile money details**, see amount, and see which properties/rent lines contributed — **`GET /payouts/:payoutId`**.

6. **As a bank operator, after I pay the landlord in core banking, I mark the payout paid in Khayalami** — submit bank reference and optional note — **`POST /payouts/:payoutId/mark-paid`**.

7. **As a bank operator, I filter history** of completed payouts for reconciliation — **`GET /payouts?status=completed`** (client-side date filter on `createdAt`/`processedAt` if needed).

8. **As a product owner, I communicate** that Khayalami **admin** still runs **escrow distribution**; the bank portal is for **outbound landlord settlement** and visibility, not for creating payouts (unless you add that later).

---

## Reference files

| File | Role |
|------|------|
| `src/services/BankAdminService.ts` | Summary, lists, mark-paid + escrow sync |
| `src/controllers/BankAdminController.ts` | HTTP handlers |
| `src/routes/bankAdminRoutes.ts` | Routes + `authorize(["bank_admin"])` |
| `src/services/EscrowService.ts` | Distribution creates `Payout` + escrow updates |
| `src/models/Escrow.ts` | `EscrowTransaction`, `Payout` schemas |

---

## Example requests

```http
GET /api/bank-admin/summary
Authorization: Bearer <token>
```

```http
GET /api/bank-admin/payouts?page=1&limit=20&status=pending
Authorization: Bearer <token>
```

```http
POST /api/bank-admin/payouts/674a1b2c3d4e5f6789012345/mark-paid
Authorization: Bearer <token>
Content-Type: application/json

{
  "externalReference": "BATCH-8899",
  "notes": "MT103 confirmed"
}
```
