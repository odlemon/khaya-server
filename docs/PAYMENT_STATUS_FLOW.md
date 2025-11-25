# 💳 Payment Status Flow - Agreement Fee

## Payment Status Rules

### 1. **No Payment Yet** (Default)
- **Status:** `"no_payment"`
- **When:** Tenant hasn't paid or created payment request yet
- **Agreement Status:** `"pending"` (if both signed) or `"draft"` (if not signed)

### 2. **External Payment Request Created** (Waiting for Approval)
- **Status:** `"pending_payment"`
- **When:** Tenant created payment request, waiting for admin approval
- **Payment Request Status:** `"pending_admin_approval"`
- **Agreement Status:** `"pending"` (not fully signed yet)

### 3. **Payment Approved** (Verified)
- **Status:** `"verified"`
- **When:** Admin approved the payment request
- **Payment Request Status:** `"approved"` or `"processed"`
- **Agreement Status:** `"signed"` (if both parties signed)

### 4. **Online Payment** (Instant Verification)
- **Status:** `"verified"` (immediately)
- **When:** Tenant paid via payment gateway
- **No approval needed** - instant verification
- **Agreement Status:** `"signed"` (if both parties signed)

---

## API Endpoint for Admin Approval

### Approve Payment Request

**Endpoint:**
```
POST /api/payment-requests/:id/approve
Authorization: Bearer <admin_token>
```

**URL Parameters:**
- `id` (required) - Payment request ID

**Request Body:**
```json
{
  "notes": "Payment verified and approved" // Optional
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Agreement fee payment request approved and processed successfully",
  "data": {
    "paymentRequest": {
      "_id": "payment_request_id",
      "status": "processed",
      "agreementId": "agreement_id",
      "amount": 40,
      ...
    },
    "payment": {
      "_id": "payment_id",
      "status": "verified",
      ...
    },
    "revenueSource": {
      "_id": "revenue_id",
      "status": "collected",
      ...
    }
  }
}
```

**What Happens When Admin Approves:**
1. ✅ Payment request status → `"processed"`
2. ✅ Payment record created (status: `"verified"`)
3. ✅ Revenue source created (status: `"collected"`)
4. ✅ Agreement `tenantSignature.paymentStatus` → `"verified"`
5. ✅ Agreement status → `"signed"` (if both parties signed)
6. ✅ Notifications sent to tenant and landlord

---

## Complete Flow Diagram

### External Payment Flow

```
┌─────────────────────────────────────────┐
│ Tenant Signs Agreement                  │
│ paymentStatus: "pending_payment"         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Tenant Creates Payment Request           │
│ POST /api/payment-requests               │
│ {                                        │
│   "agreementId": "...",                  │
│   "amount": 40,                          │
│   "proofOfPayment": "https://...",       │
│   "requestType": "agreement_fee"         │
│ }                                        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Payment Request Status:                  │
│ "pending_admin_approval"                 │
│                                          │
│ Agreement paymentStatus:                 │
│ "pending_payment"                        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Admin Approves Payment                   │
│ POST /api/payment-requests/:id/approve   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Payment Request Status: "processed"      │
│ Payment Record: "verified"               │
│                                          │
│ Agreement paymentStatus: "verified" ✅   │
│ Agreement Status: "signed" ✅             │
└─────────────────────────────────────────┘
```

### Online Payment Flow

```
┌─────────────────────────────────────────┐
│ Tenant Pays via Payment Gateway          │
│ (Payment processed instantly)             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Tenant Signs Agreement                  │
│ paymentStatus: "verified" ✅              │
│ (No approval needed)                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Agreement Status: "signed" ✅             │
│ (If both parties signed)                 │
└─────────────────────────────────────────┘
```

---

## Payment Status Logic

### When Tenant Signs

```javascript
// Check payment status
if (paymentVerified || paymentApproved || revenueSourceExists) {
  paymentStatus = "verified";
} else if (pendingPaymentRequest) {
  paymentStatus = "pending_payment"; // External payment waiting approval
} else {
  paymentStatus = "no_payment"; // No payment submitted yet (default)
}
```

### When Admin Approves

```javascript
// Admin approves payment request
1. Create Payment record (status: "verified")
2. Create RevenueSource (status: "collected")
3. Update PaymentRequest (status: "processed")
4. Update Agreement.tenantSignature.paymentStatus = "verified"
5. If both parties signed → Agreement.status = "signed"
```

---

## Frontend Display

### Payment Status Badge

```javascript
function getPaymentStatusBadge(paymentStatus) {
  switch (paymentStatus) {
    case "verified":
      return {
        text: "✅ Payment Verified",
        color: "green",
        message: "Payment approved. Agreement is fully signed."
      };
    
    case "pending_payment":
      return {
        text: "⏳ Pending Payment Approval",
        color: "orange",
        message: "Waiting for admin to approve payment."
      };
    
    case "no_payment":
      return {
        text: "❌ No Payment Submitted",
        color: "red",
        message: "Payment not yet submitted. Please pay the agreement fee."
      };
    
    default:
      return {
        text: "❓ Unknown Status",
        color: "gray",
        message: "Payment status unknown."
      };
  }
}
```

---

## Summary

| Scenario | Payment Status | Agreement Status | Action |
|----------|---------------|------------------|--------|
| **No payment** | `"no_payment"` | `"pending"` or `"draft"` | Tenant needs to pay |
| **External payment request created** | `"pending_payment"` | `"pending"` | Waiting for admin approval |
| **Admin approves** | `"verified"` | `"signed"` | ✅ Agreement complete |
| **Online payment** | `"verified"` | `"signed"` | ✅ Agreement complete (instant) |

---

## API Endpoints Reference

### For Tenant
- **Create Payment Request:** `POST /api/payment-requests`
- **Get Payment Request:** `GET /api/payment-requests/:id`
- **Get Agreement:** `GET /api/agreements/:id`

### For Admin
- **Approve Payment Request:** `POST /api/payment-requests/:id/approve`
- **Reject Payment Request:** `POST /api/payment-requests/:id/reject`
- **Get Pending Requests:** `GET /api/payment-requests/pending`

