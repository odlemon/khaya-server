# 🏢 Landlord Subscription Payment - Frontend Implementation Guide

## Overview

This guide covers how landlords can purchase premium features subscriptions with two payment options:
1. **Pay via App** - Instant payment (in-app)
2. **Pay Outside** - Upload proof of payment (admin reviews)

---

## Payment Flow Options

### Option 1: Pay via App (In-App Payment)

**Flow:**
```
1. Landlord selects subscription plan
2. Chooses "Pay via App"
3. Payment gateway processes payment
4. Subscription activated immediately
5. Email confirmation sent
```

**API Endpoint:**
```
POST /api/landlord/subscription/subscribe
Authorization: Bearer <landlord_token>
```

**Request Body:**
```json
{
  "planType": "premium", // or "premium_plus"
  "paymentMethod": "in_app",
  "gatewayResponse": { /* payment gateway response */ },
  "autoRenew": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription activated successfully",
  "data": {
    "subscription": {
      "planType": "premium",
      "amount": 15,
      "startDate": "2025-01-15T00:00:00.000Z",
      "endDate": "2025-02-15T00:00:00.000Z",
      "nextBillingDate": "2025-02-15T00:00:00.000Z",
      "isActive": true
    },
    "revenueSource": { /* revenue source record */ },
    "preferences": { /* updated preferences */ }
  }
}
```

---

### Option 2: Pay Outside (External Payment)

**Flow:**
```
1. Landlord selects subscription plan
2. Chooses "Pay Outside"
3. Uploads proof of payment (receipt/bank statement)
4. Payment request created (pending_admin_approval)
5. Admin reviews and approves
6. Subscription activated
7. Email confirmation sent
```

**API Endpoint:**
```
POST /api/landlord/subscription/request
Authorization: Bearer <landlord_token>
```

**Request Body:**
```json
{
  "planType": "premium", // or "premium_plus"
  "proofOfPayment": "https://storage.example.com/receipt.jpg",
  "paymentMethod": "bank_transfer", // or "cash", "mobile_money", "other"
  "autoRenew": true,
  "notes": "Payment via bank transfer"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription payment request submitted successfully",
  "data": {
    "_id": "request_123",
    "landlordId": "landlord_123",
    "amount": 15,
    "planType": "premium",
    "status": "pending_admin_approval",
    "submittedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

---

## UI Components to Build

### 1. Subscription Purchase Page

**Route:** `/landlord/subscription/purchase`

```
┌─────────────────────────────────────┐
│ Subscribe to Premium Features         │
├─────────────────────────────────────┤
│                                     │
│ Choose Your Plan:                   │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Premium                         │ │
│ │ K15/month                       │ │
│ │ • Featured listings             │ │
│ │ • Priority support              │ │
│ │ • Advanced analytics            │ │
│ │ [Select]                        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Premium Plus                    │ │
│ │ K25/month                       │ │
│ │ • All Premium features          │ │
│ │ • Advanced analytics            │ │
│ │ • Dedicated support             │ │
│ │ [Select]                        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Payment Method:                     │
│ ○ Pay via App (Instant)            │
│ ○ Pay Outside (Upload Proof)      │
│                                     │
│ Auto-renew: [Toggle ON]             │
│                                     │
│ [Cancel]  [Subscribe]               │
└─────────────────────────────────────┘
```

### 2. Pay via App Flow

**When "Pay via App" selected:**
```
┌─────────────────────────────────────┐
│ Complete Payment                      │
├─────────────────────────────────────┤
│ Plan: Premium                        │
│ Amount: K15                          │
│                                     │
│ [Payment Gateway Integration]        │
│                                     │
│ [Cancel]  [Pay Now]                 │
└─────────────────────────────────────┘
```

**After Payment:**
- Show success message
- Redirect to subscription status page
- Show "Subscription Active" confirmation

### 3. Pay Outside Flow

**When "Pay Outside" selected:**
```
┌─────────────────────────────────────┐
│ Upload Payment Proof                 │
├─────────────────────────────────────┤
│ Plan: Premium (K15/month)           │
│                                     │
│ Payment Method:                     │
│ [Bank Transfer ▼]                   │
│   • Bank Transfer                   │
│   • Cash                            │
│   • Mobile Money                    │
│   • Other                           │
│                                     │
│ Upload Proof of Payment *           │
│ [Choose File] [Upload]              │
│ Preview: [receipt.jpg]              │
│                                     │
│ Notes (optional):                   │
│ [___________________________]       │
│                                     │
│ ℹ️ Your subscription will be         │
│    activated after admin review     │
│    (usually within 24-48 hours)     │
│                                     │
│ [Cancel]  [Submit Request]          │
└─────────────────────────────────────┘
```

**After Submission:**
- Show "Request Submitted" confirmation
- Show status: "Pending Admin Review"
- Redirect to subscription status page

### 4. Subscription Status Page

**Route:** `/landlord/subscription/status`

```
┌─────────────────────────────────────┐
│ Subscription Status                  │
├─────────────────────────────────────┤
│                                     │
│ Current Plan: Premium                │
│ Status: ✅ Active                    │
│                                     │
│ Started: Jan 15, 2025                │
│ Next Billing: Feb 15, 2025          │
│ Amount: K15/month                   │
│                                     │
│ Payment Method: Pay via App          │
│ Auto-renew: ✅ Enabled               │
│                                     │
│ Features:                            │
│ ✓ Featured property listings        │
│ ✓ Priority customer support         │
│ ✓ Advanced analytics                │
│                                     │
│ [Manage Subscription]               │
│ [Cancel Subscription]                │
└─────────────────────────────────────┘
```

**If Pending:**
```
┌─────────────────────────────────────┐
│ Subscription Status                  │
├─────────────────────────────────────┤
│                                     │
│ Plan: Premium                        │
│ Status: ⏳ Pending Review            │
│                                     │
│ Submitted: Jan 15, 2025              │
│ Amount: K15                          │
│                                     │
│ Your payment request is being       │
│ reviewed by admin. You'll be        │
│ notified once it's processed.        │
│                                     │
│ [View Request Details]               │
└─────────────────────────────────────┘
```

---

## API Service Functions (TypeScript)

```typescript
// services/landlordSubscriptionService.ts

export const landlordSubscriptionService = {
  // Subscribe (in-app payment)
  async subscribe(data: {
    planType: 'premium' | 'premium_plus';
    paymentMethod: 'in_app';
    gatewayResponse: any;
    autoRenew?: boolean;
  }) {
    const response = await fetch('/api/landlord/subscription/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Create subscription payment request (external payment)
  async createSubscriptionRequest(data: {
    planType: 'premium' | 'premium_plus';
    proofOfPayment: string;
    paymentMethod: 'bank_transfer' | 'cash' | 'mobile_money' | 'other';
    autoRenew?: boolean;
    notes?: string;
  }) {
    const response = await fetch('/api/landlord/subscription/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Get subscription status
  async getSubscriptionStatus() {
    const response = await fetch('/api/landlord/subscription/status', {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  // Cancel subscription
  async cancelSubscription() {
    const response = await fetch('/api/landlord/subscription/cancel', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  }
};
```

---

## Premium Boost Purchase Flow

### Option 1: Pay via App (In-App Payment)

**API Endpoint:**
```
POST /api/properties/:propertyId/boost
Authorization: Bearer <landlord_token>
```

**Request Body:**
```json
{
  "duration": 30, // 7, 30, or 90 days
  "paymentMethod": "in_app",
  "gatewayResponse": { /* payment gateway response */ }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Premium boost purchased successfully",
  "data": {
    "boost": {
      "propertyId": "property_123",
      "duration": 30,
      "amount": 15,
      "startDate": "2025-01-15T00:00:00.000Z",
      "expirationDate": "2025-02-14T00:00:00.000Z",
      "isActive": true
    },
    "revenueSource": { /* revenue source record */ },
    "property": { /* updated property with isFeatured: true */ }
  }
}
```

---

### Option 2: Pay Outside (External Payment)

**API Endpoint:**
```
POST /api/properties/:propertyId/boost/request
Authorization: Bearer <landlord_token>
```

**Request Body:**
```json
{
  "duration": 30, // 7, 30, or 90 days
  "proofOfPayment": "https://storage.example.com/receipt.jpg",
  "paymentMethod": "bank_transfer", // or "cash", "mobile_money", "other"
  "notes": "Payment via bank transfer"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Boost payment request submitted successfully",
  "data": {
    "_id": "request_123",
    "propertyId": "property_123",
    "amount": 15,
    "duration": 30,
    "status": "pending_admin_approval",
    "submittedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

---

## UI Components for Premium Boost

### 1. Boost Purchase Page

**Route:** `/landlord/properties/:id/boost`

```
┌─────────────────────────────────────┐
│ Boost Your Property                  │
├─────────────────────────────────────┤
│ Property: 2 Bedroom Apartment        │
│                                     │
│ Choose Duration:                     │
│ ○ 7 days (K10)                      │
│ ● 30 days (K15)                     │
│ ○ 90 days (K25)                     │
│                                     │
│ Payment Method:                     │
│ ○ Pay via App (Instant)            │
│ ○ Pay Outside (Upload Proof)       │
│                                     │
│ Total: K15                          │
│                                     │
│ [Cancel]  [Purchase Boost]          │
└─────────────────────────────────────┘
```

### 2. Boost Payment Options

**If "Pay via App":**
- Show payment gateway
- Process payment
- Activate boost immediately

**If "Pay Outside":**
```
┌─────────────────────────────────────┐
│ Upload Payment Proof                 │
├─────────────────────────────────────┤
│ Boost: 30 days (K15)                │
│                                     │
│ Payment Method:                     │
│ [Bank Transfer ▼]                   │
│                                     │
│ Upload Proof *                      │
│ [Choose File] [Upload]              │
│                                     │
│ Notes:                              │
│ [___________________________]       │
│                                     │
│ [Cancel]  [Submit Request]          │
└─────────────────────────────────────┘
```

---

## Implementation Checklist

### Subscription Purchase
- [ ] Create `/landlord/subscription/purchase` page
- [ ] Build plan selection (Premium/Premium Plus)
- [ ] Build payment method selection (Pay via App / Pay Outside)
- [ ] If "Pay via App": Integrate payment gateway
- [ ] If "Pay Outside": Build file upload form
- [ ] Create API service functions
- [ ] Handle success/error responses
- [ ] Show subscription status after purchase

### Boost Purchase
- [ ] Create `/landlord/properties/:id/boost` page
- [ ] Build duration selection (7/30/90 days)
- [ ] Build payment method selection
- [ ] If "Pay via App": Integrate payment gateway
- [ ] If "Pay Outside": Build file upload form
- [ ] Create API service functions
- [ ] Show boost status after purchase

### Status Pages
- [ ] Create subscription status page
- [ ] Create boost status page
- [ ] Show pending/active status
- [ ] Show expiration dates
- [ ] Add renewal options

---

## Important Notes

1. **Payment Methods:**
   - **Pay via App**: Instant activation, requires payment gateway
   - **Pay Outside**: Admin review required, activation after approval

2. **Admin Review:**
   - All external payments go through admin review
   - Admin approves via existing `/api/payment-requests/:id/approve` endpoint
   - System automatically detects if it's a boost or subscription request

3. **Email Notifications:**
   - Subscription/boost purchase confirmation (in-app)
   - Request submitted notification (external)
   - Approval/rejection notifications (external)

4. **Status Tracking:**
   - Use `GET /api/landlord/subscription/status` for subscription
   - Use `GET /api/properties/:propertyId/boosts` for boost status




