# 🏢 Landlord Frontend Implementation Guide

## Overview

This guide covers all frontend features that landlords need to interact with the revenue and escrow system. Follow the implementation order for best results.

---

## 📋 Implementation Order

### **Phase 1: Escrow Dashboard & Payment Tracking** (HIGH PRIORITY)
Landlords need to see their money in escrow and track payments.

### **Phase 2: Payment History & Deductions** (HIGH PRIORITY)
Landlords need to understand what deductions are made and see payment breakdowns.

### **Phase 3: Service Request Management** (MEDIUM PRIORITY)
Landlords approve/reject maintenance service requests.

### **Phase 4: Property Features & Premium Management** (MEDIUM PRIORITY)
Landlords manage premium boosts, zero-deposit settings, and property features.

### **Phase 5: Tenant Subscriptions View** (LOW PRIORITY)
Landlords view which tenants have active subscriptions.

### **Phase 6: Balance & Withdrawals** (LOW PRIORITY)
Landlords view balance and request withdrawals.

---

## Phase 1: Escrow Dashboard & Payment Tracking

### 1.1 Landlord Escrow Dashboard

**What it does:**
- Shows total money held in escrow
- Shows pending payments (awaiting verification)
- Shows distributed payments (already paid out)
- Lists all escrow transactions

**API Endpoint:**
```
GET /api/escrow/landlord/transactions
Authorization: Bearer <landlord_token>
```

**Query Parameters (optional):**
- `status` - Filter by status: "pending", "held", "distributed"
- `startDate` - Filter from date (ISO string)
- `endDate` - Filter to date (ISO string)

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "escrow_123",
      "tenantId": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "propertyId": {
        "title": "2 Bedroom Apartment",
        "address": "123 Main St, Lusaka"
      },
      "totalAmount": 500,
      "landlordAmount": 485,
      "khayalamiAmount": 15,
      "deductions": {
        "subscriptionFee": 5,
        "processingFee": 10,
        "insurancePremium": 0,
        "totalDeductions": 15
      },
      "status": "held",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "distributedAt": null
    }
  ]
}
```

**UI Components to Build:**

1. **Escrow Summary Cards**
   ```
   ┌─────────────────────────────────┐
   │ Total Pending:    K1,500        │
   │ (Awaiting verification)          │
   └─────────────────────────────────┘
   
   ┌─────────────────────────────────┐
   │ Total Held:       K3,000        │
   │ (In escrow, ready for payout)    │
   └─────────────────────────────────┘
   
   ┌─────────────────────────────────┐
   │ Total Distributed: K5,000        │
   │ (Already paid to you)            │
   └─────────────────────────────────┘
   ```

2. **Escrow Transactions List**
   - Table or card list showing:
     - Tenant name
     - Property name
     - Total payment amount
     - Your net amount (landlordAmount)
     - Deductions breakdown (expandable)
     - Status badge (pending/held/distributed)
     - Date
     - Distribution date (if distributed)

3. **Filters**
   - Status filter (All, Pending, Held, Distributed)
   - Date range picker
   - Property filter (if landlord has multiple properties)

**Implementation Steps:**
1. Create `/landlord/escrow` page
2. Create API service function: `getLandlordEscrowTransactions()`
3. Build summary cards component
4. Build escrow transaction card/table component
5. Add filters component
6. Add loading states
7. Add empty state (when no transactions)

---

### 1.2 Escrow Transaction Detail View

**What it does:**
- Shows detailed breakdown of a single escrow transaction
- Shows all deductions clearly
- Shows payment method and source

**UI Components to Build:**

1. **Transaction Detail Modal/Page**
   ```
   ┌─────────────────────────────────────┐
   │ Escrow Transaction Details          │
   ├─────────────────────────────────────┤
   │ Tenant: John Doe                    │
   │ Property: 2 Bedroom Apartment       │
   │ Date: Jan 15, 2025                  │
   │                                     │
   │ Payment Breakdown:                 │
   │ ────────────────────────────────    │
   │ Total Payment:      K500.00        │
   │                                     │
   │ Deductions:                        │
   │   • Subscription Fee:  K5.00       │
   │   • Processing Fee:   K10.00       │
   │   • Insurance:          K0.00       │
   │   ─────────────────────────────    │
   │   Total Deductions:   K15.00       │
   │                                     │
   │ Your Net Amount:     K485.00       │
   │                                     │
   │ Status: Held (in escrow)            │
   │ Distribution Date: Not yet         │
   └─────────────────────────────────────┘
   ```

**Implementation Steps:**
1. Create transaction detail component
2. Add expand/collapse for deductions
3. Show status with color coding
4. Show distribution date if available

---

## Phase 2: Payment History & Deductions

### 2.1 Payment History Page

**What it does:**
- Shows all rent payments from tenants
- Shows payment status (verified, pending, distributed)
- Shows deduction breakdown for each payment

**API Endpoint:**
```
GET /api/landlord/payments
Authorization: Bearer <landlord_token>
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "_id": "payment_123",
        "tenantId": {
          "firstName": "John",
          "lastName": "Doe"
        },
        "propertyId": {
          "title": "2 Bedroom Apartment"
        },
        "amount": 500,
        "totalAmount": 500,
        "paymentMethod": "in_app",
        "status": "verified",
        "paymentDate": "2025-01-15T10:30:00.000Z",
        "deductions": {
          "subscriptionFee": 5,
          "processingFee": 10,
          "insurancePremium": 0,
          "totalDeductions": 15,
          "netRentAmount": 485
        },
        "escrowStatus": "held"
      }
    ],
    "stats": {
      "totalReceived": 10000,
      "totalDeductions": 300,
      "netReceived": 9700,
      "pendingAmount": 1500
    }
  }
}
```

**UI Components to Build:**

1. **Payment Statistics Cards**
   ```
   ┌─────────────────────────────────┐
   │ Total Received:    K10,000      │
   │ This Month                        │
   └─────────────────────────────────┘
   
   ┌─────────────────────────────────┐
   │ Total Deductions:    K300       │
   │ (Fees & commissions)            │
   └─────────────────────────────────┘
   
   ┌─────────────────────────────────┐
   │ Net Received:      K9,700       │
   │ (After deductions)              │
   └─────────────────────────────────┘
   ```

2. **Payment List**
   - Show each payment with:
     - Tenant name
     - Property name
     - Payment amount
     - Payment date
     - Status badge
     - Deduction breakdown (expandable)
     - Net amount (your portion)

3. **Deduction Breakdown Component** (Reusable)
   ```typescript
   interface DeductionBreakdownProps {
     totalAmount: number;
     deductions: {
       subscriptionFee: number;
       processingFee: number;
       insurancePremium: number;
     };
     netAmount: number;
   }
   ```

**Implementation Steps:**
1. Create `/landlord/payments` page
2. Create API service: `getLandlordPayments()`
3. Build payment statistics cards
4. Build payment list component
5. Create reusable deduction breakdown component
6. Add filters (date range, property, status)

---

### 2.2 Understanding Deductions

**What landlords need to know:**

1. **Subscription Fee (K5-8/month)**
   - Paid by tenant (not deducted from rent)
   - Shows tenant has zero-deposit access
   - You don't pay this

2. **Processing Fee (1.5-2% of rent)**
   - Deducted from rent payment
   - Example: K500 rent → K10 processing fee (2%)
   - This is Khayalami's commission

3. **Insurance Premium (if applicable)**
   - Only if landlord opted into insurance
   - ~15% commission to Khayalami
   - Usually K0 if no insurance

**UI Component: Help/Info Tooltip**
- Add "?" icon next to deductions
- Show explanation when clicked:
  ```
  Processing Fee: 1.5-2% of rent amount.
  This is Khayalami's commission for 
  processing the payment.
  
  Subscription Fee: Paid by tenant for 
  zero-deposit access. Not deducted from 
  your rent.
  ```

---

## Phase 3: Service Request Management

### 3.1 View Pending Service Requests

**What it does:**
- Landlord sees maintenance requests from tenants
- Can approve or reject requests
- Can provide own vendor or let admin assign

**API Endpoint:**
```
GET /api/services/landlord/pending
Authorization: Bearer <landlord_token>
```

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "service_123",
      "title": "Fix leaking tap",
      "serviceType": "plumbing",
      "description": "Kitchen tap is leaking",
      "urgency": "high",
      "status": "pending_landlord_approval",
      "tenantId": {
        "firstName": "John",
        "lastName": "Doe",
        "phoneNumber": "+260971234568"
      },
      "propertyId": {
        "title": "2 Bedroom Apartment",
        "address": "123 Main St"
      },
      "requestedDate": "2025-01-20T00:00:00.000Z",
      "photos": ["url1", "url2"],
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**UI Components to Build:**

1. **Pending Requests List**
   - Card showing:
     - Service title and type
     - Urgency badge (low/medium/high/emergency)
     - Tenant name and contact
     - Property name
     - Description
     - Photos (if any)
     - Requested date
     - Action buttons (Approve/Reject)

2. **Service Request Detail Modal**
   - Full details
   - Photo gallery
   - Approve/Reject buttons

**Implementation Steps:**
1. Create `/landlord/services/pending` page
2. Create API service: `getPendingServiceRequests()`
3. Build service request card component
4. Build service detail modal
5. Add approve/reject functionality

---

### 3.2 Approve Service Request

**What it does:**
- Landlord approves service request
- Can choose to provide own vendor or let admin assign

**API Endpoint:**
```
POST /api/services/:serviceId/approve
Authorization: Bearer <landlord_token>
```

**Request Body:**
```json
{
  "approvalNotes": "I'll arrange my plumber",
  "hasVendor": true  // or false if admin should assign
}
```

**Response:**
```json
{
  "success": true,
  "message": "Service request approved",
  "data": {
    "_id": "service_123",
    "status": "scheduled",  // or "approved" if hasVendor: false
    "approvedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

**UI Components to Build:**

1. **Approve Modal**
   ```
   ┌─────────────────────────────────────┐
   │ Approve Service Request?            │
   ├─────────────────────────────────────┤
   │ Service: Fix leaking tap            │
   │ Tenant: John Doe                    │
   │                                     │
   │ Do you have a vendor?               │
   │ ○ Yes, I'll arrange my vendor       │
   │ ○ No, let admin assign one          │
   │                                     │
   │ Notes (optional):                   │
   │ [___________________________]       │
   │                                     │
   │ [Cancel]  [Approve]                 │
   └─────────────────────────────────────┘
   ```

**Implementation Steps:**
1. Create approve modal component
2. Add radio buttons for vendor choice
3. Add notes textarea
4. Create API service: `approveServiceRequest()`
5. Handle success/error responses
6. Update UI after approval

---

### 3.3 Reject Service Request

**What it does:**
- Landlord rejects service request
- Must provide rejection reason

**API Endpoint:**
```
POST /api/services/:serviceId/reject
Authorization: Bearer <landlord_token>
```

**Request Body:**
```json
{
  "rejectionReason": "This is not urgent. Will handle next month."
}
```

**UI Components to Build:**

1. **Reject Modal**
   ```
   ┌─────────────────────────────────────┐
   │ Reject Service Request?              │
   ├─────────────────────────────────────┤
   │ Service: Fix leaking tap             │
   │ Tenant: John Doe                    │
   │                                     │
   │ Rejection Reason (required):        │
   │ [___________________________]       │
   │ [___________________________]       │
   │                                     │
   │ [Cancel]  [Reject]                  │
   └─────────────────────────────────────┘
   ```

**Implementation Steps:**
1. Create reject modal component
2. Add required reason textarea
3. Create API service: `rejectServiceRequest()`
4. Handle validation (reason required)
5. Update UI after rejection

---

## Phase 4: Preferences & Settings

### 4.1 Payment Reception Preferences

**What it does:**
- Landlord chooses how to receive payments (Bank Transfer, Mobile Money, PayPal, Cash)
- For Mobile Money, landlord must enter phone number
- Details saved and used for payouts

**API Endpoint:**
```
GET /api/landlord/preferences
PATCH /api/landlord/preferences/payment-reception
```

**See detailed guide:** `LANDLORD_PREFERENCES_IMPLEMENTATION.md` - Feature 1

---

### 4.2 Subscription Payment Preferences

**What it does:**
- Landlord chooses how to pay for premium subscription
- Option 1: "Pay via Rent" - Deducted from rent payments
- Option 2: "Pay Yourself" - Direct payment interface

**API Endpoint:**
```
PATCH /api/landlord/preferences/subscription-payment
```

**See detailed guide:** `LANDLORD_PREFERENCES_IMPLEMENTATION.md` - Feature 2

---

## Phase 5: Property Features & Premium Management

### 5.1 Premium Boost Purchase (Featured Listings)

**What it does:**
- Landlord can purchase premium boosts for their properties
- Premium boosts make properties featured (appear at top of search)
- Cost: USD 10-25 per property (one-time or recurring)
- Increases visibility and gets more tenant inquiries

**API Endpoint (To Be Implemented):**
```
POST /api/properties/:propertyId/boost
Authorization: Bearer <landlord_token>
```

**Request Body:**
```json
{
  "boostType": "featured", // or "premium", "highlighted"
  "duration": 30, // days
  "amount": 15 // USD 10-25
}
```

**Response Example:**
```json
{
  "success": true,
  "message": "Premium boost purchased successfully",
  "data": {
    "propertyId": "property_123",
    "boostType": "featured",
    "isFeatured": true,
    "boostExpiresAt": "2025-02-15T00:00:00.000Z",
    "revenueSource": {
      "_id": "revenue_123",
      "sourceType": "premium_boost",
      "amount": 15,
      "status": "collected"
    }
  }
}
```

**UI Components to Build:**

1. **Premium Boost Purchase Modal**
   ```
   ┌─────────────────────────────────────┐
   │ Boost Your Property Listing          │
   ├─────────────────────────────────────┤
   │ Property: 2 Bedroom Apartment        │
   │                                     │
   │ Boost Options:                      │
   │ ┌─────────────────────────────────┐ │
   │ │ ⭐ Featured Listing              │ │
   │ │ • Appears at top of search       │ │
   │ │ • Highlighted badge              │ │
   │ │ • More visibility                │ │
   │ │ Price: K15 (30 days)             │ │
   │ │ [Select]                         │ │
   │ └─────────────────────────────────┘ │
   │                                     │
   │ Duration:                           │
   │ ○ 7 days (K10)                      │
   │ ○ 30 days (K15)                    │
   │ ○ 90 days (K25)                    │
   │                                     │
   │ Total: K15                          │
   │                                     │
   │ [Cancel]  [Purchase Boost]          │
   └─────────────────────────────────────┘
   ```

2. **Property Boost Status Card**
   ```
   ┌─────────────────────────────────┐
   │ Property: 2 Bedroom Apartment   │
   │                                 │
   │ Boost Status:                   │
   │ ⭐ Featured (Active)            │
   │ Expires: Feb 15, 2025           │
   │                                 │
   │ [Extend Boost] [View Details]   │
   └─────────────────────────────────┘
   ```

3. **Boost History**
   - Show all boost purchases
   - Show active boosts
   - Show expired boosts
   - Show total spent on boosts

**Implementation Steps:**
1. Create `/landlord/properties/:id/boost` page
2. Create boost purchase modal
3. Create API service: `purchasePremiumBoost()`
4. Add payment integration (in-app payment)
5. Update property card to show boost badge
6. Add boost expiration tracking
7. Add boost renewal option

---

### 5.2 Zero Deposit Settings Management

**What it does:**
- Landlord can enable/disable zero-deposit option for each property
- When enabled, tenants can use subscription to skip traditional deposit
- This affects which tenants can rent the property

**API Endpoint:**
```
PATCH /api/properties/:propertyId/zero-deposit
Authorization: Bearer <landlord_token>
```

**Request Body:**
```json
{
  "zeroDepositAvailable": true // or false
}
```

**Response Example:**
```json
{
  "success": true,
  "message": "Zero deposit setting updated",
  "data": {
    "_id": "property_123",
    "zeroDepositAvailable": true,
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**UI Components to Build:**

1. **Zero Deposit Toggle**
   ```
   ┌─────────────────────────────────┐
   │ Property: 2 Bedroom Apartment   │
   │                                 │
   │ Zero Deposit Option             │
   │ ─────────────────────────────── │
   │                                 │
   │ Allow tenants to use            │
   │ zero-deposit subscription?     │
   │                                 │
   │ [Toggle: ON/OFF]                │
   │                                 │
   │ ℹ️ When enabled, tenants can    │
   │    use subscription to skip     │
   │    traditional deposit.         │
   │                                 │
   │ [Save Changes]                  │
   └─────────────────────────────────┘
   ```

2. **Zero Deposit Info Card**
   ```
   ┌─────────────────────────────────┐
   │ About Zero Deposit              │
   │                                 │
   │ • Tenants pay subscription     │
   │   (K5-8/month) instead of      │
   │   large upfront deposit         │
   │                                 │
   │ • You still get full deposit    │
   │   protection via insurance     │
   │                                 │
   │ • Attracts more tenants         │
   │                                 │
   │ • Subscription fee is paid by   │
   │   tenant (not deducted from    │
   │   your rent)                    │
   └─────────────────────────────────┘
   ```

**Implementation Steps:**
1. Add zero-deposit toggle to property settings page
2. Create API service: `updateZeroDepositSetting()`
3. Add info tooltip explaining zero-deposit
4. Show current status on property card
5. Add confirmation when disabling (warn about impact)

---

### 5.3 View Tenant Subscriptions

**What it does:**
- Landlord sees which tenants have active subscriptions
- Shows subscription status for each rental
- Helps understand why subscription fees are deducted

**Note:** Subscriptions are managed by tenants, but landlords can view them.

**API Endpoint:**
```
GET /api/landlord/subscriptions
Authorization: Bearer <landlord_token>
```

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "subscription_123",
      "tenantId": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "rentalId": "rental_123",
      "propertyId": {
        "title": "2 Bedroom Apartment"
      },
      "planType": "premium",
      "price": 5.99,
      "status": "active",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-02-01T00:00:00.000Z",
      "nextBillingDate": "2025-02-01T00:00:00.000Z",
      "features": {
        "zeroDepositAccess": true,
        "tenantProtectionCoverage": 500,
        "discountedServices": true
      }
    }
  ]
}
```

**UI Components to Build:**

1. **Subscriptions List**
   - Show for each rental:
     - Tenant name
     - Property name
     - Subscription plan (Premium/Premium+)
     - Status badge (Active/Cancelled/Expired)
     - Price per month
     - Next billing date
     - Features (zero-deposit, protection coverage)

2. **Subscription Status Card**
   ```
   ┌─────────────────────────────────┐
   │ Tenant: John Doe                │
   │ Property: 2 Bedroom Apt        │
   │                                 │
   │ Plan: Premium                   │
   │ Status: ✅ Active               │
   │ Price: K5.99/month             │
   │                                 │
   │ Features:                       │
   │ • Zero-Deposit Access           │
   │ • Protection Coverage: K500     │
   │ • Discounted Services           │
   │                                 │
   │ Next Billing: Feb 1, 2025      │
   └─────────────────────────────────┘
   ```

**Implementation Steps:**
1. Create `/landlord/subscriptions` page (optional)
2. Or add subscription info to rental details page
3. Create API service: `getLandlordSubscriptions()`
4. Build subscription card component
5. Show status with color coding

---

### 5.4 Property Payment Settings & Features

**What it does:**
- Landlord can view payment-related settings for each property
- Shows if property accepts zero-deposit
- Shows processing fee rate
- Shows active premium boosts
- Shows insurance status

**UI Components to Build:**

1. **Property Features Dashboard**
   ```
   ┌─────────────────────────────────┐
   │ Property: 2 Bedroom Apartment   │
   │                                 │
   │ ┌─────────────────────────────┐ │
   │ │ Payment Settings             │ │
   │ ├─────────────────────────────┤ │
   │ │ Monthly Rent: K500           │ │
   │ │ Processing Fee: 2% (K10)    │ │
   │ │ Zero-Deposit: ✅ Enabled     │ │
   │ │ Insurance: ❌ Not opted in   │ │
   │ └─────────────────────────────┘ │
   │                                 │
   │ ┌─────────────────────────────┐ │
   │ │ Premium Features             │ │
   │ ├─────────────────────────────┤ │
   │ │ ⭐ Featured: Active          │ │
   │ │    Expires: Feb 15, 2025     │ │
   │ │ [Extend] [View History]      │ │
   │ └─────────────────────────────┘ │
   │                                 │
   │ [Purchase Boost] [Settings]     │
   └─────────────────────────────────┘
   ```

2. **Boost History List**
   - Show all boost purchases for property
   - Show dates, amounts, duration
   - Show active vs expired
   - Total spent on boosts

**Implementation Steps:**
1. Create property features/settings page
2. Show all property features in one place
3. Add quick actions (purchase boost, toggle zero-deposit)
4. Show boost history
5. Show payment settings summary

---

## Phase 6: Tenant Subscriptions View

### 6.1 View Tenant Subscriptions

**What it does:**
- Landlord sees which tenants have active subscriptions
- Shows subscription status for each rental
- Helps understand why subscription fees are deducted

**Note:** Subscriptions are managed by tenants, but landlords can view them.

**API Endpoint:**
```
GET /api/landlord/subscriptions
Authorization: Bearer <landlord_token>
```

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "subscription_123",
      "tenantId": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "rentalId": "rental_123",
      "propertyId": {
        "title": "2 Bedroom Apartment"
      },
      "planType": "premium",
      "price": 5.99,
      "status": "active",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-02-01T00:00:00.000Z",
      "nextBillingDate": "2025-02-01T00:00:00.000Z",
      "features": {
        "zeroDepositAccess": true,
        "tenantProtectionCoverage": 500,
        "discountedServices": true
      }
    }
  ]
}
```

**UI Components to Build:**

1. **Subscriptions List**
   - Show for each rental:
     - Tenant name
     - Property name
     - Subscription plan (Premium/Premium+)
     - Status badge (Active/Cancelled/Expired)
     - Price per month
     - Next billing date
     - Features (zero-deposit, protection coverage)

2. **Subscription Status Card**
   ```
   ┌─────────────────────────────────┐
   │ Tenant: John Doe                │
   │ Property: 2 Bedroom Apt        │
   │                                 │
   │ Plan: Premium                   │
   │ Status: ✅ Active               │
   │ Price: K5.99/month             │
   │                                 │
   │ Features:                       │
   │ • Zero-Deposit Access           │
   │ • Protection Coverage: K500     │
   │ • Discounted Services           │
   │                                 │
   │ Next Billing: Feb 1, 2025      │
   └─────────────────────────────────┘
   ```

**Implementation Steps:**
1. Create `/landlord/subscriptions` page (optional)
2. Or add subscription info to rental details page
3. Create API service: `getLandlordSubscriptions()`
4. Build subscription card component
5. Show status with color coding

---

## Phase 6: Balance & Withdrawals

### 7.1 Landlord Balance Dashboard

**What it does:**
- Shows current available balance
- Shows pending balance (in escrow)
- Shows transaction history

**API Endpoint:**
```
GET /api/landlord/balance
Authorization: Bearer <landlord_token>
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "availableBalance": 5000,
    "pendingBalance": 3000,
    "totalEarned": 10000,
    "transactions": [
      {
        "_id": "txn_123",
        "type": "credit",
        "amount": 485,
        "description": "Escrow distribution - 1 payment(s)",
        "date": "2025-01-31T00:00:00.000Z",
        "status": "completed"
      }
    ]
  }
}
```

**UI Components to Build:**

1. **Balance Summary Cards**
   ```
   ┌─────────────────────────────────┐
   │ Available Balance               │
   │ K5,000                          │
   │ (Ready to withdraw)             │
   └─────────────────────────────────┘
   
   ┌─────────────────────────────────┐
   │ Pending Balance                 │
   │ K3,000                           │
   │ (In escrow, awaiting distribution)│
   └─────────────────────────────────┘
   ```

2. **Transaction History**
   - List of all transactions
   - Show credit/debit
   - Show description
   - Show date
   - Show status

**Implementation Steps:**
1. Create `/landlord/balance` page
2. Create API service: `getLandlordBalance()`
3. Build balance cards
4. Build transaction history list
5. Add filters (date range, type)

---

### 7.2 Withdrawal Request (If Implemented)

**What it does:**
- Landlord requests withdrawal of available balance
- Can choose bank transfer or mobile money

**Note:** This may not be implemented yet. Check with backend team.

**UI Components to Build:**

1. **Withdrawal Form**
   ```
   ┌─────────────────────────────────┐
   │ Request Withdrawal               │
   ├─────────────────────────────────┤
   │ Available Balance: K5,000       │
   │                                 │
   │ Amount: [K_____]                │
   │                                 │
   │ Payment Method:                 │
   │ ○ Bank Transfer                 │
   │ ○ Mobile Money                  │
   │                                 │
   │ [Cancel]  [Request Withdrawal]   │
   └─────────────────────────────────┘
   ```

---

## 📊 Dashboard Overview

### Main Landlord Dashboard

**What it shows:**
- Quick stats (total properties, active rentals, pending requests)
- Recent payments
- Pending service requests
- Escrow summary

**API Endpoint:**
```
GET /api/landlord/dashboard
Authorization: Bearer <landlord_token>
```

**UI Layout:**
```
┌─────────────────────────────────────────────┐
│ Landlord Dashboard                         │
├─────────────────────────────────────────────┤
│                                             │
│ [Properties: 5] [Rentals: 3] [Requests: 2] │
│                                             │
│ ┌──────────────┐  ┌──────────────┐        │
│ │ Escrow Held   │  │ Pending Req   │        │
│ │ K3,000        │  │ 2 services    │        │
│ └──────────────┘  └──────────────┘        │
│                                             │
│ Recent Payments                             │
│ ──────────────────────────────────────      │
│ • John Doe - K500 - Jan 15                 │
│ • Jane Smith - K600 - Jan 14              │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🎨 UI/UX Best Practices

### 1. Status Indicators
- 🟡 **Pending** - Awaiting verification/approval
- 🔵 **Held** - In escrow, ready for distribution
- 🟢 **Distributed** - Already paid out
- 🔴 **Rejected** - Request rejected

### 2. Color Coding
- **Green**: Positive (distributed, approved, active)
- **Yellow**: Pending/waiting
- **Red**: Rejected/error
- **Blue**: In progress (held, scheduled)

### 3. Information Hierarchy
- Most important info first (amounts, status)
- Deductions in expandable sections
- Details in modals or separate pages

### 4. Mobile Responsiveness
- Cards stack vertically on mobile
- Filters in drawer/modal on mobile
- Touch-friendly buttons (min 44px)

---

## 🔌 API Service Functions (TypeScript)

```typescript
// services/landlordService.ts

export const landlordService = {
  // Get escrow transactions
  async getEscrowTransactions(filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await fetch(`/api/escrow/landlord/transactions?${params}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  // Get payments
  async getPayments() {
    const response = await fetch('/api/landlord/payments', {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  // Get pending service requests
  async getPendingServiceRequests() {
    const response = await fetch('/api/services/landlord/pending', {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  // Approve service request
  async approveServiceRequest(serviceId: string, data: {
    approvalNotes?: string;
    hasVendor: boolean;
  }) {
    const response = await fetch(`/api/services/${serviceId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Reject service request
  async rejectServiceRequest(serviceId: string, rejectionReason: string) {
    const response = await fetch(`/api/services/${serviceId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ rejectionReason })
    });
    return response.json();
  },

  // Get landlord balance
  async getBalance() {
    const response = await fetch('/api/landlord/balance', {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  // Purchase premium boost
  async purchasePremiumBoost(propertyId: string, data: {
    boostType: string;
    duration: number;
    amount: number;
  }) {
    const response = await fetch(`/api/properties/${propertyId}/boost`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Update zero deposit setting
  async updateZeroDeposit(propertyId: string, zeroDepositAvailable: boolean) {
    const response = await fetch(`/api/properties/${propertyId}/zero-deposit`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ zeroDepositAvailable })
    });
    return response.json();
  },

  // Get property boosts
  async getPropertyBoosts(propertyId: string) {
    const response = await fetch(`/api/properties/${propertyId}/boosts`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  // Get landlord preferences
  async getPreferences() {
    const response = await fetch('/api/landlord/preferences', {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  // Update payment reception method
  async updatePaymentReception(data: {
    method: 'bank_transfer' | 'mobile_money' | 'paypal' | 'cash';
    bankDetails?: any;
    mobileMoneyDetails?: any;
    paypalDetails?: any;
  }) {
    const response = await fetch('/api/landlord/preferences/payment-reception', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Update subscription payment method
  async updateSubscriptionPayment(data: {
    method: 'via_rent' | 'pay_yourself';
    subscriptionDetails?: any;
  }) {
    const response = await fetch('/api/landlord/preferences/subscription-payment', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Get dashboard data
  async getDashboard() {
    const response = await fetch('/api/landlord/dashboard', {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  }
};
```

---

## ✅ Implementation Checklist

### Phase 1: Escrow Dashboard
- [ ] Create `/landlord/escrow` page
- [ ] Build escrow summary cards
- [ ] Build escrow transactions list
- [ ] Add filters (status, date range)
- [ ] Add transaction detail view
- [ ] Add loading states
- [ ] Add empty states

### Phase 2: Payment History
- [ ] Create `/landlord/payments` page
- [ ] Build payment statistics cards
- [ ] Build payment list component
- [ ] Create deduction breakdown component (reusable)
- [ ] Add filters
- [ ] Add payment detail view

### Phase 3: Service Requests
- [ ] Create `/landlord/services/pending` page
- [ ] Build pending requests list
- [ ] Build service detail modal
- [ ] Build approve modal (with vendor choice)
- [ ] Build reject modal (with reason)
- [ ] Add success/error handling

### Phase 4: Preferences & Settings
- [ ] Create payment reception preferences page
- [ ] Build payment method selection
- [ ] Build bank transfer form
- [ ] Build mobile money form (with phone number)
- [ ] Build PayPal form
- [ ] Create subscription payment preferences page
- [ ] Build "Pay via Rent" vs "Pay Yourself" selection
- [ ] Add payment gateway for "Pay Yourself"
- [ ] See `LANDLORD_PREFERENCES_IMPLEMENTATION.md` for details

### Phase 5: Property Features & Premium
- [ ] Create premium boost purchase page
- [ ] Build boost purchase modal
- [ ] Add zero-deposit toggle to property settings
- [ ] Build property features dashboard
- [ ] Show boost status on property cards
- [ ] Build boost history list
- [ ] Add boost expiration tracking

### Phase 6: Tenant Subscriptions
- [ ] Add subscription info to rental details
- [ ] Build subscription status card
- [ ] Show which tenants have active subscriptions

### Phase 7: Balance & Withdrawals
- [ ] Create `/landlord/balance` page
- [ ] Build balance summary cards
- [ ] Build transaction history
- [ ] Add withdrawal form (if implemented)

### Shared Components
- [ ] Create `StatusBadge` component
- [ ] Create `DeductionBreakdown` component
- [ ] Create `ConfirmationModal` component
- [ ] Create `LoadingSpinner` component
- [ ] Create `EmptyState` component

---

## 📝 Important Notes

1. **Deductions Explanation**
   - Processing fee (1.5-2%) is deducted from rent
   - Subscription fee is paid by tenant (not from rent)
   - Insurance premium only if landlord opted in

2. **Escrow Flow**
   - Payments go to escrow first
   - Distributed monthly (auto) or manually (admin)
   - Landlord receives net rent (after deductions)

3. **Service Requests**
   - Landlord must approve/reject
   - Can provide own vendor or let admin assign
   - Rejection requires reason

4. **Premium Boosts**
   - Cost: USD 10-25 per property
   - Makes property featured (top of search)
   - Duration: 7, 30, or 90 days
   - Can be renewed/extended
   - Creates revenue source for Khayalami

5. **Zero Deposit Settings**
   - Landlord can enable/disable per property
   - When enabled, tenants can use subscription
   - Subscription fee paid by tenant (not from rent)
   - Attracts more tenants

6. **Tenant Subscriptions**
   - Managed by tenants
   - Landlords can view but not modify
   - Shows which tenants have zero-deposit access
   - Subscription fee appears in deductions (but paid by tenant)

---

## 🚀 Quick Start

1. **Start with Phase 1** (Escrow Dashboard) - Most important
2. **Then Phase 2** (Payment History) - Helps understand deductions
3. **Then Phase 3** (Service Requests) - Core functionality
4. **Phase 4 & 5** can be added later

---

## 📚 Related Documentation

- `FRONTEND_IMPLEMENTATION_GUIDE.md` - General frontend guide
- `FRONTEND_API_REFERENCE.md` - Complete API documentation
- `REVENUE_MODEL_IMPLEMENTATION_SRD.md` - System requirements
- `ESCROW_SYSTEM.md` - Escrow system details

