# Property Insurance Feature

## Overview

Landlords can enable **Rental Insurance Protection** on their property listings. The insurance premium is automatically calculated based on coverage type, risk category, and property details. When tenants pay rent, the insurance portion is automatically deducted, allocated to the insurance partner, and the landlord receives their net rent.

## Two Pricing Models

### Model 1: Included in Rent (`included_in_rent`)

The insurance premium is **subtracted** from the landlord's desired rent. The tenant sees one consolidated price.

```
Desired Rent:     $500
Insurance:       -$15
Landlord Gets:    $485
Tenant Pays:      $500
```

### Model 2: Added to Rent (`added_to_rent`)

The insurance premium is **added on top** of the desired rent. The tenant pays more.

```
Desired Rent:     $500
Insurance:       +$15
Landlord Gets:    $500
Tenant Pays:      $515
```

---

## Premium Table

Premiums are calculated based on **coverage type** and **risk category**:

| Coverage  | Low Risk | Medium Risk | High Risk |
|-----------|----------|-------------|-----------|
| Basic     | $8       | $12         | $18       |
| Standard  | $12      | $18         | $25       |
| Premium   | $18      | $25         | $35       |

**Adjustments:**
- Houses/townhouses: +10% surcharge
- Rooms/studios: -10% discount
- Property value > $200,000: +15%
- Property value > $100,000: +5%

---

## API Endpoints

### 1. Preview Insurance Pricing (Landlord)

Call this **before** creating/updating a listing to show the landlord a pricing breakdown.

**Endpoint:** `POST /api/properties/insurance/preview`
**Auth:** Required (landlord)

**Request Body:**

```json
{
  "desiredRent": 500,
  "coverageType": "standard",
  "riskCategory": "medium",
  "pricingModel": "included_in_rent",
  "propertyType": "apartment",
  "propertyValue": 80000
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "desiredRent": 500,
    "insurancePremium": 18,
    "pricingModel": "included_in_rent",
    "landlordReceives": 482,
    "tenantPays": 500
  }
}
```

For `added_to_rent`:

```json
{
  "success": true,
  "data": {
    "desiredRent": 500,
    "insurancePremium": 18,
    "pricingModel": "added_to_rent",
    "landlordReceives": 500,
    "tenantPays": 518
  }
}
```

### 2. Get Premium Table

Returns the full premium lookup table so the frontend can show all tier options.

**Endpoint:** `GET /api/properties/insurance/premium-table`
**Auth:** Required

**Response:**

```json
{
  "success": true,
  "data": {
    "basic":    { "low": 8,  "medium": 12, "high": 18 },
    "standard": { "low": 12, "medium": 18, "high": 25 },
    "premium":  { "low": 18, "medium": 25, "high": 35 }
  }
}
```

### 3. Create Property with Insurance

**Endpoint:** `POST /api/properties`
**Auth:** Required (landlord)

Include the `insurance` object in the request body:

```json
{
  "title": "Modern 2-Bed Apartment",
  "price": 500,
  "deposit": 500,
  "propertyType": "apartment",
  "...other fields...": "...",
  "insurance": {
    "enabled": true,
    "coverageType": "standard",
    "pricingModel": "included_in_rent",
    "riskCategory": "medium",
    "propertyValue": 80000
  }
}
```

The backend **auto-calculates** `insurance.monthlyPremium` based on the settings. You do **not** need to send `monthlyPremium`.

**Response** includes the insurance config with the calculated premium:

```json
{
  "success": true,
  "data": {
    "...property fields...": "...",
    "insurance": {
      "enabled": true,
      "coverageType": "standard",
      "pricingModel": "included_in_rent",
      "riskCategory": "medium",
      "propertyValue": 80000,
      "monthlyPremium": 18
    }
  }
}
```

### 4. Update Property Insurance

**Endpoint:** `PUT /api/properties/:id`
**Auth:** Required (landlord / admin)

Send the `insurance` object in the update body:

```json
{
  "insurance": {
    "enabled": true,
    "coverageType": "premium",
    "pricingModel": "added_to_rent",
    "riskCategory": "high",
    "propertyValue": 150000
  }
}
```

To **disable** insurance:

```json
{
  "insurance": {
    "enabled": false
  }
}
```

---

## How Insurance Flows Through Payments

### When Rental is Created (Payment Schedule)

- If insurance is `added_to_rent`, the scheduled payment amount = `monthlyRent + insurancePremium`.
- If insurance is `included_in_rent`, the scheduled payment amount = `monthlyRent` (unchanged).

### When Tenant Pays Rent

1. `PaymentCalculationService.calculateRentDeductions` calls `InsuranceService.getRentalInsurancePremium(rentalId)`.
2. Looks up the property via the rental and returns `insurance.monthlyPremium` (or 0 if not enabled).
3. The premium is included in `deductions.insurancePremium` alongside subscription fees and processing fees.
4. A `RevenueSource` with `sourceType: "insurance_commission"` is created.
5. The premium is stored on the `EscrowTransaction` under `deductions.insurancePremium`.

### Invoice

The invoice automatically includes an **"Insurance Premium"** line item when the premium is > 0 (already handled by `InvoiceService`).

### Escrow Distribution

When `distributeEscrow` runs:
1. Insurance premiums are **separated** from the Khayalami platform fees.
2. A dedicated **insurance partner payout** is created for the total insurance premiums collected.
3. Khayalami receives only their platform fees (subscription + processing).
4. Landlord receives their net rent.

---

## Property Model — New `insurance` Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `insurance.enabled` | Boolean | `false` | Toggle insurance on/off |
| `insurance.coverageType` | String enum | `"basic"` | `"basic"` / `"standard"` / `"premium"` |
| `insurance.pricingModel` | String enum | `"included_in_rent"` | `"included_in_rent"` / `"added_to_rent"` |
| `insurance.monthlyPremium` | Number | `0` | Auto-calculated by backend |
| `insurance.propertyValue` | Number | - | Estimated property value (for underwriting) |
| `insurance.riskCategory` | String enum | `"medium"` | `"low"` / `"medium"` / `"high"` |

---

## Frontend Changes Required

### 1. Property Listing Form (Landlord) — HIGH EFFORT

Add a new **"Property Protection & Insurance"** section:

- **Toggle:** "Enable Rental Insurance Protection" → maps to `insurance.enabled`
- **Dropdown:** Coverage type (Basic / Standard / Premium) → `insurance.coverageType`
- **Radio buttons:** Pricing model:
  - "Include in rent (subtracted from my rent)" → `"included_in_rent"`
  - "Add as separate charge to tenant" → `"added_to_rent"`
- **Input:** Estimated property value → `insurance.propertyValue`
- **Dropdown:** Risk category (Low / Medium / High) → `insurance.riskCategory`

**On change**, call `POST /api/properties/insurance/preview` to show:
- Net Rent (Landlord Receives)
- Insurance Premium
- Platform Fee (if shown)
- Total Tenant Payment

**On submit**, send the `insurance` object as part of the create/update property request. The backend calculates `monthlyPremium` automatically.

### 2. Property Detail View (Tenant) — LOW EFFORT

- If `insurance.enabled && insurance.pricingModel === "added_to_rent"`:
  - Show price breakdown: Rent ($500) + Insurance ($15) = Total ($515)
- If `insurance.enabled && insurance.pricingModel === "included_in_rent"`:
  - Optionally show a badge/icon: "Insurance Protected"
  - Price stays as-is (already includes insurance)
- If `insurance.enabled === false`:
  - No change

### 3. Tenant Payment Screen — LOW EFFORT

- No changes needed — payment amount already comes from the backend (scheduled payment includes the insurance surcharge for `added_to_rent`).
- Invoice line items already include "Insurance Premium" when applicable.

### 4. Landlord Dashboard / Earnings — MEDIUM EFFORT

- Show insurance deduction in rent breakdown:
  - Total Collected: $515
  - Insurance Premium: -$18
  - Platform Fee: -$10
  - **Net Received: $487**
- This data is already in escrow transactions (`deductions.insurancePremium`) and invoices.

### 5. Tenant Invoice View — LOW/NO EFFORT

- If frontend already renders `lineItems` from the Invoice API, the "Insurance Premium" line item appears automatically.
- If not, render `invoice.lineItems[]` and `invoice.deductions`.

---

## Files Changed (Backend)

| File | Change |
|------|--------|
| `src/models/Property.ts` | Added `insurance` subdocument (interface + schema) |
| `src/services/InsuranceService.ts` | **NEW** — premium calculation, listing breakdown, premium table |
| `src/services/PaymentCalculationService.ts` | `calculateInsurancePremium` now calls `InsuranceService` instead of returning 0 |
| `src/controllers/PropertyController.ts` | Auto-calculate premium on create/update; new preview + premium-table endpoints |
| `src/routes/propertyRoutes.ts` | Added `POST /insurance/preview` and `GET /insurance/premium-table` |
| `src/services/RentalService.ts` | Payment schedule adds insurance surcharge for `added_to_rent` properties |
| `src/services/EscrowService.ts` | `distributeEscrow` separates insurance payouts from platform fees |
| `src/services/PaynowService.ts` | `processRentPostPayment` creates `insurance_commission` revenue source |

---

## Deposit Homes Note

For properties **with deposits**, the existing flow already handles:
- `Property.deposit` — displayed in listing
- `Rental.depositAmount` — stored on rental
- Deposit held in Khayalami escrow until tenant moves out and damage assessment is complete

The dashboard breakdown for deposit homes:
- Net Rent (Landlord Receives)
- Deposit (1 month) — held in escrow
- Platform Fee
- Total Tenant Payment
