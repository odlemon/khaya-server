# Landlord payout destination (bank vs EcoCash)

Landlords choose **one** active way to receive rent payouts: **bank transfer** or **EcoCash**. Saving one **clears** the other on `LandlordBalance` (and aligns `LandlordPreferences` for reception method).

Escrow distribution uses **`LandlordBalance`** when creating `Payout` rows; logic is centralized in `src/utils/landlordPayoutInstructions.ts`.

---

## Endpoints

**Base:** ` /api/landlord/payout-method`  
**Auth:** `Authorization: Bearer <token>`  
**Role:** `landlord` only

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Current selection + details (see response shape). |
| `PUT` | `/` | Set **either** bank **or** EcoCash (mutually exclusive). |

### `PUT` body — bank

```json
{
  "method": "bank",
  "bank": {
    "accountHolderName": "Jane Doe",
    "bankName": "CBZ Bank",
    "accountNumber": "1234567890",
    "branchCode": "optional"
  }
}
```

`accountHolderName` may also be sent as `accountName` (alias).

### `PUT` body — EcoCash

```json
{
  "method": "ecocash",
  "ecocash": {
    "registeredName": "Jane Doe",
    "phoneNumber": "0771234567"
  }
}
```

Phone is trimmed; spaces removed.

### `GET` response `data` (typical)

**Bank selected:**

```json
{
  "payoutMethod": "bank",
  "bank": {
    "accountHolderName": "...",
    "bankName": "...",
    "accountNumber": "...",
    "branchCode": null
  },
  "ecocash": null,
  "legacyMobileMoney": null
}
```

**EcoCash selected:**

```json
{
  "payoutMethod": "ecocash",
  "bank": null,
  "ecocash": {
    "registeredName": "...",
    "phoneNumber": "..."
  },
  "legacyMobileMoney": null
}
```

**Nothing configured yet:** `payoutMethod`, `bank`, `ecocash`, `legacyMobileMoney` may all be null.

**Legacy:** Older accounts may have only `bankDetails` without `payoutMethod` — they are reported as `payoutMethod: "bank"` with an optional `note`. Very old **non–EcoCash** mobile rows may appear only under `legacyMobileMoney`; landlords should re-save via **`PUT`** as EcoCash.

---

## Frontend checklist

1. **Profile / payouts settings page** — single radio or tabs: **Bank** | **EcoCash** (not both).
2. **Bank form** — account holder name, bank name, account number, optional branch; `PUT` with `method: "bank"`.
3. **EcoCash form** — registered name, phone; `PUT` with `method: "ecocash"`.
4. After successful `PUT`, replace local state with response `data` and show the success message (other method was cleared).
5. On load, `GET` and bind; if `legacyMobileMoney` is set, prompt user to confirm **EcoCash** details and save again.
6. Optional: mask account number in UI except last 4 digits (client-only; API returns full strings for the owner).

---

## Backend files

| File | Role |
|------|------|
| `src/models/LandlordBalance.ts` | `payoutMethod`, `ecocashDetails` |
| `src/utils/landlordPayoutInstructions.ts` | Maps balance → `Payout` snapshot (incl. EcoCash → `mobile_money` + provider `EcoCash`) |
| `src/services/LandlordPayoutMethodService.ts` | GET/PUT + preference sync |
| `src/services/EscrowService.ts` | Uses resolver when creating landlord payouts |
| `src/models/Escrow.ts` | `Payout.mobileMoneyDetails.provider` includes `EcoCash` |
