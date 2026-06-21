# 📝 Tenant Agreement Signing Flow - Complete Guide

## Overview

When a tenant wants to sign an agreement, they must:
1. **Wait for landlord to sign first** (if not already signed)
2. **Sign the agreement** (no upfront fee required)
3. **Pay the agreement processing fee with the first rent installment** (one-time USD 30–50, bundled into the first scheduled rent payment)

**Important:** The agreement fee is a **one-time payment**, NOT a subscription. Tenants may still pay the fee upfront via the legacy `pay-fee` endpoint or an external payment request if they prefer.

---

## Complete Signing Flow

### Step 1: Check Agreement Status

**Endpoint:**
```
GET /api/agreements/:id
Authorization: Bearer <tenant_token>
```

**Check:**
- ✅ Is landlord signed? (`landlordSignature.signedAt` exists)
- ✅ Can tenant sign? (`canSignWithoutPayment: true` when landlord has signed)
- ✅ Agreement fee: `agreementFeeAmount`, `agreementFeeStatus` (`pending` | `charged`)
- ✅ Tenant fee state: `tenantSignature.paymentStatus` — `deferred` (default), `verified` (paid upfront), or `pending_payment` (external fee awaiting admin)

**Note:** Signing no longer requires upfront payment. After both parties sign, the rental is created and the fee is added to the **first** rent payment only.

---

### Step 2: Sign Agreement (No Upfront Fee Required)

**Endpoint:**
```
POST /api/agreements/:id/sign
Authorization: Bearer <tenant_token>
```

When the tenant signs without paying upfront, `tenantSignature.paymentStatus` is set to **`deferred`**. When both parties have signed, the agreement moves to `status: "signed"` and a rental is created automatically.

---

### Step 3: Pay Agreement Fee (Optional Upfront — Legacy)

Tenants who want to pay before signing can still use the flows below. If the fee is paid upfront, `agreementFeeStatus` becomes `charged` and it is **not** added to the first rent payment.

**Payment Status Options:**
- **Deferred (default):** Sign first → fee collected on first rent payment (`paymentStatus: "deferred"`)
- **Online upfront:** `POST /api/agreements/:id/pay-fee` → `paymentStatus: "verified"`
- **External upfront:** Payment request → admin approval → `paymentStatus: "verified"`

#### Option A: External Payment (Payment Request)

**Endpoint:**
```
POST /api/payment-requests
Authorization: Bearer <tenant_token>
```

**Request Body:**
```json
{
  "agreementId": "69240448387aea43d1f8a96f",
  "amount": 40,
  "paymentMethod": "bank_transfer",
  "proofOfPayment": "https://firebasestorage.googleapis.com/v0/b/.../receipt.jpg?alt=media&token=...",
  "requestType": "agreement_fee",
  "notes": "Agreement processing fee payment"
}
```

**Flow:**
1. Tenant uploads proof to Firebase Storage
2. Tenant creates payment request
3. Status: `pending_admin_approval`
4. Admin reviews and approves
5. `agreementFeeStatus` set to `charged` (optional before signing)

#### Option B: Online Payment (In-App)

**Endpoint:**
```
POST /api/agreements/:agreementId/pay-fee
Authorization: Bearer <tenant_token>
```

**Request Body:**
```json
{
  "paymentMethod": "in_app",
  "gatewayResponse": {
    "provider": "paystack",
    "transactionId": "TXN123456",
    "transactionRef": "REF789012",
    "paidAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Flow:**
1. Tenant pays via payment gateway
2. Payment processed immediately
3. Tenant can sign immediately

---

### Step 4: First Rent Payment (Default Fee Collection)

After the rental is created, the **first** scheduled rent payment amount includes:
- Monthly rent
- Insurance surcharge (if `added_to_rent` on the property)
- Agreement processing fee (if `agreementFeeStatus === "pending"`)

Subsequent rent payments exclude the agreement fee. Payment `metadata` includes `rentPortion`, `agreementFeePortion`, and `insurancePortion` for reconciliation.

---

### Step 5: Sign Agreement (Reference)

**Endpoint:**
```
POST /api/agreements/:id/sign
Authorization: Bearer <tenant_token>
```

**Request Body:**
```json
{
  "signatureData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "signatureType": "drawing"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Agreement signed successfully",
  "data": {
    "_id": "69240448387aea43d1f8a96f",
    "status": "signed",
    "tenantSignature": {
      "signedAt": "2025-11-24T10:30:00.000Z",
      "signatureUrl": "https://...",
      "ipAddress": "192.168.1.1"
    }
  }
}
```

**Response (Success - Payment Pending):**
```json
{
  "success": true,
  "message": "Agreement signed successfully. Payment approval pending.",
  "data": {
    "_id": "69240448387aea43d1f8a96f",
    "status": "pending",
    "tenantSignature": {
      "signedAt": "2025-11-24T10:30:00.000Z",
      "signatureUrl": "https://...",
      "ipAddress": "192.168.1.1",
      "paymentStatus": "pending_payment"
    }
  }
}
```

**Response (Success - Payment Verified):**
```json
{
  "success": true,
  "message": "Agreement signed successfully",
  "data": {
    "_id": "69240448387aea43d1f8a96f",
    "status": "signed",
    "tenantSignature": {
      "signedAt": "2025-11-24T10:30:00.000Z",
      "signatureUrl": "https://...",
      "ipAddress": "192.168.1.1",
      "paymentStatus": "verified"
    }
  }
}
```

**Error (Landlord Not Signed):**
```json
{
  "success": false,
  "message": "Landlord must sign the agreement before tenant can sign"
}
```

---

## Agreement Fee Details

### Fee Amount Calculation

| Property Value | Fee Amount |
|----------------|------------|
| **< USD 50,000** | USD 30 |
| **USD 50,000 - USD 100,000** | USD 40 |
| **> USD 100,000** | USD 50 |

### Fee Payment Methods

1. **External Payment** (Payment Request)
   - Upload proof of payment
   - Admin reviews and approves
   - Status: `pending_admin_approval` → `approved` → `processed`

2. **Online Payment** (In-App)
   - Pay via payment gateway
   - Instant processing
   - Status: `verified` immediately

---

## Frontend Implementation Checklist

### 1. Agreement Detail Page
- [ ] Show agreement details
- [ ] Show landlord signature status
- [ ] Show agreement fee payment status
- [ ] Show tenant signature status
- [ ] Disable sign button if conditions not met

### 2. Agreement Fee Payment Screen
- [ ] Calculate fee amount (based on property value)
- [ ] Show fee amount to tenant
- [ ] Offer two payment options:
  - [ ] Pay Online (in-app)
  - [ ] Pay via Deposit/External
- [ ] Handle payment request creation
- [ ] Show payment status (pending/approved/rejected)

### 3. Agreement Signing Screen
- [ ] Check if landlord signed
- [ ] Check if fee paid
- [ ] Show signature canvas/input
- [ ] Submit signature
- [ ] Handle errors (fee not paid, landlord not signed)
- [ ] Show success message

### 4. Status Tracking
- [ ] Poll for payment request status updates
- [ ] Show real-time status changes
- [ ] Notify when fee is approved
- [ ] Enable sign button when conditions met

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────┐
│ Tenant Views Agreement                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Check Status:                            │
│ • Landlord signed?                       │
│ • Fee paid?                              │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
   [Not Signed]  [Fee Not Paid]
        │             │
        │             ▼
        │    ┌────────────────────┐
        │    │ Pay Agreement Fee  │
        │    │ • External Payment  │
        │    │ • Online Payment    │
        │    └─────────┬──────────┘
        │              │
        │              ▼
        │    ┌────────────────────┐
        │    │ Wait for Approval  │
        │    │ (if external)      │
        │    └─────────┬──────────┘
        │              │
        └──────┬───────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ All Conditions Met:                     │
│ ✅ Landlord signed                       │
│ ✅ Fee paid                              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Tenant Signs Agreement                  │
│ • Draw signature                         │
│ • Submit signature                       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Agreement Status: "signed"               │
│ Both parties signed                      │
└─────────────────────────────────────────┘
```

---

## Related Documentation

1. **Agreement Fee Payment**: `TENANT_AGREEMENT_FEE_FRONTEND_GUIDE.md`
   - Complete API endpoints
   - Payment request flow
   - Firebase upload instructions
   - UI components

2. **Agreement Details**: `AGREEMENT_DETAILS_API.md`
   - Get agreement by ID
   - Response structure
   - All fields reference

3. **Tenant Subscriptions** (Separate): `TENANT_SUBSCRIPTION_FRONTEND_GUIDE.md`
   - Zero-deposit subscriptions
   - Monthly recurring payments
   - NOT related to agreement signing

---

## Key Points

1. **Agreement Fee ≠ Subscription**
   - Agreement fee is a **one-time payment** (USD 30-50)
   - Can be paid before or after signing
   - Covers digital contract processing

2. **Signing Order**
   - Landlord signs first (required)
   - Tenant can sign (even if payment pending)
   - Payment approval updates signature status

3. **Payment Methods**
   - **Online**: Pay → Sign → Status: "verified" immediately
   - **External**: Sign → Upload proof → Status: "pending_payment" → Admin approves → Status: "verified"

4. **Signature Payment Status**
   - `"pending_payment"` - Payment request submitted, waiting for admin approval
   - `"payment_approved"` - Payment approved, processing
   - `"verified"` - Payment verified, signature fully valid

5. **Agreement Status**
   - `"pending"` - Both signed but payment pending (external payment)
   - `"signed"` - Both signed and payment verified

6. **Frontend Display**
   - Show signature with status badge
   - If `paymentStatus: "pending_payment"`, show: "⏳ Waiting for payment approval"
   - If `paymentStatus: "verified"`, show: "✅ Signed and verified"

---

## Quick Reference

**Check if fee paid:**
- Check for `PaymentRequest` with `requestType: "agreement_fee"` and `status: "approved"` or `"processed"`
- Check for `Payment` with `agreementId` and `paymentType: "service"` and `status: "verified"`
- Check for `RevenueSource` with `sourceType: "agreement_fee"` and `status: "collected"`

**Create payment request:**
```
POST /api/payment-requests
{
  "agreementId": "...",
  "amount": 40,
  "paymentMethod": "bank_transfer",
  "proofOfPayment": "https://firebasestorage...",
  "requestType": "agreement_fee"
}
```

**Sign agreement:**
```
POST /api/agreements/:id/sign
{
  "signatureData": "data:image/png;base64,...",
  "ipAddress": "192.168.1.1"
}
```

