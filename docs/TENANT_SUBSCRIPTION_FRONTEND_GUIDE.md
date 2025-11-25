# 📱 Tenant Zero-Deposit Subscription Frontend Implementation Guide

## Overview

Tenants can subscribe to **Zero-Deposit Access** subscriptions to skip traditional deposits when renting properties. This is a **monthly recurring, account-level subscription** that provides access to zero-deposit rentals for **all** of the tenant's rentals.

**Key Points:**
- ✅ **Account-Level**: One subscription applies to all rentals (not per-rental)
- ✅ **No Rental Selection**: Tenant doesn't need to choose a specific rental
- ✅ **Monthly Recurring**: Subscription auto-renews monthly
- ✅ **Deducted from Rent**: Subscription fee is automatically deducted from rent payments

There are **2 subscription plans**:

1. **Premium** - USD 4.99-6.99/month (based on property value)
2. **Premium Plus** - USD 5.99-7.99/month (based on property value)

Tenants can pay for subscriptions using **2 payment methods**:
- **Online Payment** - Pay directly via payment gateway (instant activation)
- **External Payment** - Pay outside platform, upload proof, admin reviews and approves

---

## Subscription Plans & Pricing

### Property Value Brackets

The subscription price depends on the property value bracket:

| Bracket | Premium | Premium Plus |
|---------|---------|--------------|
| **Low** | USD 4.99/month | USD 5.99/month |
| **Medium** | USD 5.99/month | USD 6.99/month |
| **High** | USD 6.99/month | USD 7.99/month |

### Subscription Features

- ✅ **Zero-Deposit Access** - Skip 1-2 months' traditional deposit
- ✅ **Tenant Protection Coverage** - Up to USD 500 unpaid rent liability
- ✅ **Discounted Services** - Moving, cleaning, Wi-Fi setup, furniture hire

---

## API Endpoints

### 1. Subscribe to Zero-Deposit Access (Online Payment)

**Endpoint:**
```
POST /api/tenant/subscription/subscribe
Authorization: Bearer <tenant_token>
```

**Request Body:**
```json
{
  "planType": "premium",
  "propertyValueBracket": "medium",
  "gatewayResponse": {
    "provider": "paystack",
    "transactionId": "TXN123456",
    "transactionRef": "REF789012",
    "paidAt": "2025-01-15T10:30:00.000Z",
    "rawResponse": { ... }
  },
  "autoRenew": true
}
```

**Field Descriptions:**
- `planType` (required) - `"premium"` or `"premium_plus"`
- `propertyValueBracket` (required) - `"low"`, `"medium"`, or `"high"`
- `gatewayResponse` (required) - Payment gateway response after successful payment
- `autoRenew` (optional) - Default: `true`

**Note:** This is an **account-level subscription** - it applies to all rentals for the tenant. No `rentalId` is required.

**Response (Success):**
```json
{
  "success": true,
  "message": "Subscription activated successfully",
  "data": {
    "subscription": {
      "_id": "subscription_123",
      "tenantId": "tenant_123",
      "rentalId": "rental_123",
      "planType": "premium",
      "price": 5.99,
      "propertyValueBracket": "medium",
      "status": "active",
      "startDate": "2025-01-15T10:30:00.000Z",
      "endDate": "2025-02-15T10:30:00.000Z",
      "nextBillingDate": "2025-02-15T10:30:00.000Z",
      "autoRenew": true,
      "features": {
        "zeroDepositAccess": true,
        "tenantProtectionCoverage": 500,
        "discountedServices": true
      }
    },
    "revenueSource": {
      "_id": "revenue_123",
      "sourceType": "subscription",
      "amount": 5.99,
      "status": "collected"
    },
    "payment": {
      "_id": "payment_123",
      "amount": 5.99,
      "status": "verified"
    }
  }
}
```

**Response (Error - Already Subscribed):**
```json
{
  "success": false,
  "message": "You already have an active subscription for this rental"
}
```

---

### 2. Create Subscription Payment Request (External Payment)

**Endpoint:**
```
POST /api/tenant/subscription/request
Authorization: Bearer <tenant_token>
```

**Request Body:**
```json
{
  "planType": "premium",
  "propertyValueBracket": "medium",
  "proofOfPayment": "https://firebasestorage.googleapis.com/v0/b/.../receipt.jpg?alt=media&token=...",
  "paymentMethod": "bank_transfer",
  "autoRenew": true,
  "notes": "Subscription payment for January 2025"
}
```

**Field Descriptions:**
- `planType` (required) - `"premium"` or `"premium_plus"`
- `propertyValueBracket` (required) - `"low"`, `"medium"`, or `"high"`
- `proofOfPayment` (required) - **Firebase URL** (not file) - Frontend must upload file to Firebase first
- `paymentMethod` (required) - `"bank_transfer"`, `"cash"`, `"mobile_money"`, or `"other"`
- `autoRenew` (optional) - Default: `true`
- `notes` (optional) - Additional notes

**Note:** This is an **account-level subscription** - it applies to all rentals for the tenant. No `rentalId` is required.

**Response (Success):**
```json
{
  "success": true,
  "message": "Subscription payment request submitted successfully",
  "data": {
    "_id": "payment_request_123",
    "tenantId": "tenant_123",
    "rentalId": "rental_123",
    "requestType": "tenant_subscription",
    "amount": 5.99,
    "paymentMethod": "bank_transfer",
    "proofOfPayment": "https://firebasestorage.googleapis.com/...",
    "status": "pending_admin_approval",
    "submittedAt": "2025-01-15T10:30:00.000Z",
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Important Notes:**
- Frontend must upload the proof of payment file to Firebase Storage first
- Backend only receives the Firebase URL, not the file itself
- Payment request status will be `"pending_admin_approval"` until admin reviews

---

### 3. Get Subscription Status

**Endpoint:**
```
GET /api/tenant/subscription/status
Authorization: Bearer <tenant_token>
```

**Query Parameters:**
- `rentalId` (optional) - For backward compatibility, but not required for account-level subscriptions

**Response (Active Subscription):**
```json
{
  "success": true,
  "data": {
    "isActive": true,
    "subscription": {
      "_id": "subscription_123",
      "tenantId": "tenant_123",
      "rentalId": "rental_123",
      "planType": "premium",
      "price": 5.99,
      "propertyValueBracket": "medium",
      "status": "active",
      "startDate": "2025-01-15T10:30:00.000Z",
      "endDate": "2025-02-15T10:30:00.000Z",
      "nextBillingDate": "2025-02-15T10:30:00.000Z",
      "autoRenew": true,
      "features": {
        "zeroDepositAccess": true,
        "tenantProtectionCoverage": 500,
        "discountedServices": true
      }
    }
  }
}
```

**Response (No Active Subscription):**
```json
{
  "success": true,
  "data": {
    "isActive": false,
    "subscription": null
  }
}
```

---

### 4. Get Subscription History

**Endpoint:**
```
GET /api/tenant/subscription/history
Authorization: Bearer <tenant_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "subscription_123",
      "tenantId": "tenant_123",
      "rentalId": null,
      "planType": "premium",
      "price": 5.99,
      "propertyValueBracket": "medium",
      "status": "active",
      "startDate": "2025-01-15T10:30:00.000Z",
      "endDate": "2025-02-15T10:30:00.000Z",
      "nextBillingDate": "2025-02-15T10:30:00.000Z",
      "autoRenew": true,
      "cancelledAt": null,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### 5. Cancel Subscription

**Endpoint:**
```
POST /api/tenant/subscription/cancel
Authorization: Bearer <tenant_token>
```

**Request Body:**
```json
{
  "subscriptionId": "subscription_123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Subscription cancelled successfully"
}
```

**Important Notes:**
- Cancellation disables auto-renewal
- Subscription remains active until `endDate`
- No refunds are issued
- Tenant loses zero-deposit access after `endDate`

---

## Frontend Implementation Flow

### Flow 1: Online Payment Subscription

```
1. Tenant selects subscription plan (Premium/Premium Plus)
2. Frontend determines property value bracket (low/medium/high)
3. Frontend calculates price based on plan and bracket
4. Tenant clicks "Subscribe Now"
5. Frontend integrates with payment gateway
6. Payment gateway processes payment
7. On success, frontend calls POST /api/tenant/subscription/subscribe
8. Backend activates account-level subscription immediately
9. Frontend shows success message
10. Frontend updates UI to show active subscription
```

### Flow 2: External Payment Subscription

```
1. Tenant selects subscription plan (Premium/Premium Plus)
2. Frontend determines property value bracket (low/medium/high)
3. Frontend calculates price based on plan and bracket
4. Tenant clicks "Pay via Deposit"
5. Frontend shows file upload dialog
6. Tenant selects proof of payment file (PDF/image)
7. Frontend uploads file to Firebase Storage
8. Frontend gets Firebase URL
9. Frontend calls POST /api/tenant/subscription/request with Firebase URL
10. Backend creates payment request (status: "pending_admin_approval")
11. Frontend shows "Payment request submitted" message
12. Frontend shows pending status
13. Admin reviews and approves/rejects
14. If approved, account-level subscription is activated
15. Frontend receives notification (via WebSocket or polling)
16. Frontend updates UI to show active subscription
```

---

## UI Components to Build

### 1. Subscription Selection Screen

```
┌─────────────────────────────────────┐
│ Zero-Deposit Access Subscription    │
├─────────────────────────────────────┤
│                                     │
│ Choose Your Plan:                   │
│                                     │
│ ┌──────────────┐  ┌──────────────┐ │
│ │   Premium    │  │ Premium Plus │ │
│ │              │  │              │ │
│ │  $5.99/mo    │  │  $6.99/mo    │ │
│ │              │  │              │ │
│ │ ✓ Zero Deposit│ │ ✓ Zero Deposit│ │
│ │ ✓ Protection │ │ ✓ Protection │ │
│ │ ✓ Discounts  │ │ ✓ Discounts  │ │
│ │              │  │ ✓ Priority   │ │
│ │              │  │ ✓ Support    │ │
│ │              │  │              │ │
│ │  [Select]    │  │  [Select]    │ │
│ └──────────────┘  └──────────────┘ │
│                                     │
│ Property Value: Medium              │
│                                     │
│ [Cancel]                            │
└─────────────────────────────────────┘
```

### 2. Payment Method Selection

```
┌─────────────────────────────────────┐
│ Choose Payment Method                │
├─────────────────────────────────────┤
│                                     │
│ Amount: $5.99/month                 │
│                                     │
│ ○ Pay Online                        │
│   Pay directly via payment gateway  │
│   Instant activation                │
│                                     │
│ ○ Pay via Deposit/External         │
│   Pay outside platform              │
│   Upload proof for review           │
│                                     │
│ [Continue]                          │
│ [Back]                              │
└─────────────────────────────────────┘
```

### 3. Subscription Status Card

```
┌─────────────────────────────────────┐
│ Active Subscription                 │
├─────────────────────────────────────┤
│                                     │
│ Plan: Premium                       │
│ Price: $5.99/month                  │
│                                     │
│ Status: ✓ Active                    │
│ Started: Jan 15, 2025               │
│ Expires: Feb 15, 2025              │
│ Next Billing: Feb 15, 2025         │
│                                     │
│ Auto-Renew: ✓ Enabled               │
│                                     │
│ Features:                           │
│ ✓ Zero-Deposit Access              │
│ ✓ Protection Coverage ($500)       │
│ ✓ Discounted Services              │
│                                     │
│ [Cancel Subscription]               │
└─────────────────────────────────────┘
```

### 4. Payment Request Status

```
┌─────────────────────────────────────┐
│ Payment Request Pending             │
├─────────────────────────────────────┤
│                                     │
│ Amount: $5.99                       │
│ Method: Bank Transfer               │
│                                     │
│ Status: ⏳ Pending Admin Approval    │
│                                     │
│ Submitted: Jan 15, 2025 10:30 AM   │
│                                     │
│ Your payment request is being       │
│ reviewed by admin. You will be     │
│ notified once approved.             │
│                                     │
│ [View Proof]                        │
└─────────────────────────────────────┘
```

---

## Error Handling

### Common Errors

**1. Already Subscribed:**
```json
{
  "success": false,
  "message": "You already have an active subscription for this rental"
}
```
**Frontend Action:** Show message and disable subscribe button

**2. Invalid Rental:**
```json
{
  "success": false,
  "message": "Access denied. This rental does not belong to you."
}
```
**Frontend Action:** Show error and redirect to rentals list

**3. Missing Required Fields:**
```json
{
  "success": false,
  "message": "Missing required fields: rentalId, planType, propertyValueBracket"
}
```
**Frontend Action:** Highlight missing fields and show validation errors

**4. Payment Gateway Error:**
```json
{
  "success": false,
  "message": "Gateway response required for in-app payments"
}
```
**Frontend Action:** Retry payment or show error message

---

## Firebase Upload Flow

### Step 1: Upload File to Firebase

```javascript
// Frontend code example (pseudo-code)
const uploadProofToFirebase = async (file) => {
  // 1. Get Firebase Storage reference
  const storageRef = firebase.storage().ref();
  const fileRef = storageRef.child(`subscriptions/${Date.now()}_${file.name}`);
  
  // 2. Upload file
  const uploadTask = await fileRef.put(file);
  
  // 3. Get download URL
  const downloadURL = await uploadTask.ref.getDownloadURL();
  
  return downloadURL; // This is what you send to backend
};
```

### Step 2: Send URL to Backend

```javascript
// Use the Firebase URL in API request
const response = await fetch('/api/tenant/subscription/request', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    rentalId: 'rental_123',
    planType: 'premium',
    propertyValueBracket: 'medium',
    proofOfPayment: downloadURL, // Firebase URL, not file
    paymentMethod: 'bank_transfer'
  })
});
```

---

## Important Notes

1. **Firebase Upload Required**: Frontend must upload proof of payment files to Firebase Storage. Backend only receives the URL.

2. **Property Value Bracket**: Frontend must determine the bracket (low/medium/high) based on property value. This affects pricing.

3. **Account-Level Subscription**: Each tenant can have one active account-level subscription that applies to all their rentals. No need to subscribe per rental.

4. **Monthly Recurring**: This is a monthly subscription that auto-renews unless cancelled. Each month, the subscription fee is deducted from rent payments (if tenant has active subscription).

5. **Auto-Renewal**: Subscriptions auto-renew monthly unless cancelled. Cancellation disables auto-renewal but subscription remains active until `endDate`.

6. **Payment Request Status**: External payment requests go through admin review. Status changes:
   - `pending_admin_approval` → `approved` (subscription activated)
   - `pending_admin_approval` → `rejected` (subscription not activated)

7. **Zero-Deposit Access**: Subscription must be active to use zero-deposit feature. If subscription expires or is cancelled, tenant loses access.

8. **Deduction from Rent**: If tenant has an active subscription, the subscription fee is automatically deducted from rent payments each month.

---

## Next Steps

1. **Build Subscription Selection UI** - Show plans and pricing
2. **Integrate Payment Gateway** - For online payments
3. **Implement Firebase Upload** - For proof of payment
4. **Create Payment Request Flow** - For external payments
5. **Add Subscription Status Display** - Show active/pending/cancelled
6. **Implement Cancellation Flow** - Allow tenants to cancel
7. **Add Notifications** - Notify on approval/rejection

