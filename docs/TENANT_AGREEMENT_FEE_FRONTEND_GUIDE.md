# Tenant Agreement Processing Fee Frontend Implementation Guide

## Overview

When a tenant signs a rental agreement, a **one-time Agreement Processing Fee** (USD 30–50) applies. The fee must be **paid before the tenant can sign**.

The fee covers:
- Digital lease contract creation
- E-signature processing
- Agreement digitalization

The fee amount depends on the property value:
- **Low/Medium Value Properties**: USD 30–40
- **High Value Properties** (over USD 100,000): USD 50

**Current flow:** Landlord signs → tenant pays fee → tenant signs → rent payments are rent (+ insurance if any) only. **No agreement fee on rent.**

---

## Payment Flow

### Flow 1: Online Upfront Payment (Required)

```
1. Landlord signs agreement
2. Tenant pays fee via POST /api/agreements/:id/pay-fee
3. agreementFeeStatus → "charged"; paymentStatus → "verified"
4. Tenant signs (canSignWithoutPayment becomes true once fee is charged)
5. Agreement status → "signed"; rental created
6. Rent schedule uses monthly rent only (no agreement fee portion)
```

### Flow 2: External Payment (Deposit / Proof)

```
1. Landlord signs agreement
2. Tenant uploads proof and creates payment request (requestType: "agreement_fee")
3. Status: pending_admin_approval → paymentStatus: "pending_payment"
4. Tenant cannot sign until admin approves
5. Admin approves → agreementFeeStatus → "charged"; paymentStatus → "verified"
6. Tenant signs → agreement signed; rental created
```

---

## API flags for UI

`GET /api/agreements/:id` (and list) includes:

| Field | Meaning |
|-------|---------|
| `agreementFeeAmount` | Fee due (USD) |
| `agreementFeeStatus` | `pending` \| `charged` |
| `paymentStatus` / `tenantSignature.paymentStatus` | `no_payment` \| `pending_payment` \| `verified` |
| `canSignWithoutPayment` | `false` until fee is charged (or fee amount is 0) |

Signing without a verified fee returns an error:
`Please pay the agreement fee before signing`

---

## API Endpoints

### 1. Pay Agreement Fee Online

**Endpoint:**
```
POST /api/agreements/:agreementId/pay-fee
Authorization: Bearer <tenant_token>
```

Use the ContiPay / EcoCash body fields used by the portal (`amount`, `phone`, `mobileMethod`, etc.).

### 2. External Payment Request

```
POST /api/payment-requests
Authorization: Bearer <tenant_token>
```

```json
{
  "agreementId": "...",
  "amount": 40,
  "paymentMethod": "bank_transfer",
  "proofOfPayment": "https://...",
  "requestType": "agreement_fee",
  "notes": "Agreement processing fee payment"
}
```

---

## Rent payments

First and subsequent rent installments **do not** include `agreementFeePortion`. Rent = monthly rent (+ insurance surcharge when `added_to_rent`).

---

## Frontend checklist

- [ ] After landlord signs, show **Pay agreement fee** before the Sign CTA
- [ ] Disable Sign while `canSignWithoutPayment === false`
- [ ] Show pending state when `paymentStatus === "pending_payment"`
- [ ] Enable Sign when `agreementFeeStatus === "charged"` / `paymentStatus === "verified"`
- [ ] Do not add agreement fee to first rent amount in the UI
