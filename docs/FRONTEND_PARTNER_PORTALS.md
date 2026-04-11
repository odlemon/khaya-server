# Frontend work — partner portals (Bank & Insurance)

This document lists **what the frontend should implement or fix** when building or maintaining the **bank admin** and **insurance admin** experiences against this backend. It is separate from the API reference docs (`BANK_ADMIN_DASHBOARD.md`, `INSURANCE_ADMIN_DASHBOARD.md`).

---

## Shared (both portals)

1. **Login** — Use existing `POST /api/auth/login`. After success, read **`user.role`**:
   - `bank_admin` → bank portal routes only  
   - `insurance_admin` → insurance portal routes only  
   Do not send Khayalami `admin` users to these apps unless you intentionally widen access later.

2. **Auth header** — `Authorization: Bearer <token>` on every request.

3. **403 handling** — If the API returns forbidden, show a clear “wrong portal / insufficient permissions” message.

---

## Bank admin — payout detail page (fixes & requirements)

### 1. Linked escrow table — **column bindings**

The API returns **`data.escrowTransactions[]`**. Use these fields so columns are never blank when the API has data:

| UI column | Use this field | Do **not** rely only on |
|-----------|----------------|-------------------------|
| Property / reference | **`propertyDisplayTitle`** | `property.title` alone (can be null for service lines) |
| Subtitle (optional) | **`propertyDisplaySubtitle`** | — |
| Escrow status | **`status`** or **`escrowStatus`** (same value) | A nested path like `escrow.status` unless you map it |
| Landlord amount | **`landlordAmount`** | — |
| Payout to landlord | **`landlordPayoutStatus`** (`pending` / `paid`) | — |
| Paid date | **`landlordPayoutDate`** | — |
| Payment type | **`paymentType`** | — |

**Why some properties look empty:** For **service**-type lines, the backend may have **no `propertyId`** on the escrow row. Then **`property`** is `null` but **`propertyDisplayTitle`** is still set to a human label (e.g. “Service / platform (no property on file)”). **Always render `propertyDisplayTitle` for the main property column.**

### 2. Landlord bank / mobile details

- Prefer **`data.bankDetails`** and **`data.mobileMoneyDetails`** on the payout.
- If both are null, the backend may still have filled them from **`LandlordBalance`** — show whatever the GET returns. If still null, show “No payout method on file” and optionally link to internal ops docs.

### 3. **Mark paid** form

- **Endpoint:** `POST /api/bank-admin/payouts/:payoutId/mark-paid`  
- **Body:** optional `externalReference`, `notes` (JSON).

After success:

- Show confirmation from API message.
- Read **`data.emailSent`** — if `true`, you can show “Landlord notified by email”; if `false`, show “Payout recorded; email may not have been sent (check address or logs).”
- Refetch **`GET /api/bank-admin/payouts/:payoutId`** (or invalidate cache) so the table shows **`landlordPayoutStatus: paid`** and **paid date**.

**Disable “Mark paid”** when `data.status === 'completed'` and show read-only state.

### 4. Bank dashboard — other screens (checklist)

| Screen | API | Frontend tasks |
|--------|-----|----------------|
| Home / KPIs | `GET /api/bank-admin/summary` | Cards for escrow totals, pending vs completed landlord payouts, short tooltips from `data.notes` if useful |
| Pre-distribution queue | `GET /api/bank-admin/escrow/held-by-landlord` | Table: landlord, amount, count, optional bank hints |
| Payout list | `GET /api/bank-admin/payouts?page=&limit=&status=` | Filters, pagination, row → detail navigation |

---

## Insurance admin — checklist

| Screen | API | Frontend tasks |
|--------|-----|----------------|
| Home | `GET /api/insurance-admin/summary` | Cards: total with insurance, in force / awaiting signature / ended |
| Policies table | `GET /api/insurance-admin/policies?status=&page=&limit=` | Filter by `phase`, link to detail |
| Policy detail | `GET /api/insurance-admin/policies/property/:propertyId` | Show policyholder (landlord), cover start when `phase === 'in_force'`, agreement history |

Branch UI on **`user.role === 'insurance_admin'`** and on each policy’s **`phase`** (`in_force` | `awaiting_signature` | `ended`).

---

## Testing checklist (frontend)

- [ ] Bank: payout detail table shows **property** for rows that have `propertyDisplayTitle` in JSON.  
- [ ] Bank: **escrow status** shows `distributed` (not “—”) when `status` / `escrowStatus` is present.  
- [ ] Bank: **Mark paid** updates UI after refetch; **completed** payout cannot be submitted twice.  
- [ ] Bank: summary and payout list work with real pagination.  
- [ ] Insurance: list/detail match documented `phase` behaviour.  
- [ ] Both: expired token → redirect to login.

---

## Reference (backend)

- Bank APIs: [BANK_ADMIN_DASHBOARD.md](./BANK_ADMIN_DASHBOARD.md)  
- Insurance APIs: [INSURANCE_ADMIN_DASHBOARD.md](./INSURANCE_ADMIN_DASHBOARD.md)
