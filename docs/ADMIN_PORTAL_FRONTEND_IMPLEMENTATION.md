# 🎛️ Admin Portal Frontend Implementation Guide

## Overview

This guide describes what needs to be added to your existing admin portal sections and what new sections need to be created. All descriptions are narrative-based with API endpoints and request/response examples.

---

## 🏠 Home Section

### Dashboard - Overview with Metrics and Analytics

**What to Add:**

1. **Escrow Summary Card**
   - Display total funds held in escrow
   - Show pending distribution amount
   - Show total distributed (all time)
   - Show last distribution date

2. **Payment Requests Pending Count**
   - Show number of pending payment requests awaiting review
   - Link to payment requests section

3. **Revenue Metrics**
   - Total revenue (all time)
   - Revenue this month
   - Revenue by source (subscriptions, processing fees, boosts, etc.)

**API Endpoints to Use:**

**Get Escrow Summary:**
```
GET /api/escrow/summary
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Escrow summary retrieved successfully",
  "data": {
    "account": {
      "totalHeld": 50000,
      "totalDistributed": 200000,
      "totalLandlordPayouts": 190000,
      "totalKhayalamiPayouts": 10000,
      "pendingTransactions": 50,
      "distributedTransactions": 200,
      "autoDistributionEnabled": true,
      "distributionDay": 1,
      "lastDistributionDate": "2025-01-31T00:00:00.000Z",
      "lastDistributionAmount": 50000,
      "lastDistributionMethod": "scheduled"
    },
    "totalHeld": 50000,
    "pendingLandlordPayouts": 47500,
    "pendingKhayalamiPayouts": 2500,
    "transactionCounts": {
      "pending": 5,
      "held": 50,
      "distributed": 200
    }
  }
}
```

**Get Pending Payment Requests Count:**
```
GET /api/payment-requests/pending
Authorization: Bearer <admin_token>
```

Count the items in the response array to get the pending count.

---

## 🏘️ Property Management Section

### Properties - Property Listings

**What to Add:**

1. **Premium Boost Status Column**
   - Show if property has active premium boost
   - Display boost expiration date
   - Show boost history link

2. **Boost Management Actions**
   - View boost history for each property
   - See boost purchase details

**API Endpoints to Use:**

**Get Property Boost History:**
```
GET /api/properties/:propertyId/boosts/history
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "boosts": [
      {
        "_id": "boost_123",
        "sourceType": "premium_boost",
        "amount": 15,
        "propertyId": {
          "_id": "property_123",
          "title": "2 Bedroom Apartment",
          "address": "123 Main St"
        },
        "payerId": {
          "_id": "landlord_123",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        },
        "status": "collected",
        "createdAt": "2025-01-15T10:00:00.000Z"
      }
    ],
    "summary": {
      "total": 5,
      "totalSpent": 75,
      "active": 2,
      "expired": 3
    }
  }
}
```

---

## 💰 Payments Section

### Payments - Payment Transactions

**What to Add:**

1. **Payment Method Filter**
   - Filter by "in_app" (online) or "cash" (external)
   - Show payment gateway details for online payments
   - Show proof of payment links for external payments

2. **Escrow Status Column**
   - Show if payment is in escrow
   - Display escrow transaction status (pending, held, distributed)
   - Link to escrow transaction details

3. **Revenue Source Breakdown**
   - Show deductions (subscription fees, processing fees, insurance)
   - Display net amount to landlord
   - Display Khayalami commission

**No new API endpoints needed** - Use existing payment endpoints and enhance the display.

---

### Earnings - Revenue Analytics

**What to Add:**

1. **Revenue by Source Breakdown**
   - Subscription fees (tenant subscriptions)
   - Processing fees (rent processing)
   - Agreement fees
   - Premium boosts
   - Landlord subscriptions (premium features, zero deposit protection)
   - Insurance commissions

2. **Revenue Over Time Chart**
   - Daily, weekly, monthly revenue trends
   - Compare different revenue sources

3. **Top Revenue Sources**
   - List top revenue-generating sources
   - Show percentages

**API Endpoints to Use:**

**Get Distribution Statistics:**
```
GET /api/escrow/stats?startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Distribution statistics retrieved successfully",
  "data": {
    "totalDistributed": 50000,
    "landlordPayouts": 47500,
    "khayalamiPayouts": 2500,
    "transactionCount": 50,
    "averageTransactionAmount": 1000,
    "distributionBreakdown": {
      "byMonth": [
        {
          "month": "2025-01",
          "total": 50000,
          "landlord": 47500,
          "khayalami": 2500
        }
      ]
    }
  }
}
```

---

### Incoming Requests - Payment Requests (NEW SUB-SECTION)

**⚠️ This is a NEW section that needs to be added to Payments**

**What to Build:**

1. **Payment Requests List Page**
   - Show all pending payment requests
   - Display tenant name, landlord name, property, amount
   - Show payment method (bank_transfer, cash, mobile_money, other)
   - Show submission date
   - Show status badge (pending, approved, rejected)

2. **Payment Request Detail View**
   - Show full payment request details
   - Display proof of payment (PDF/image viewer)
   - Show tenant and landlord information
   - Show property details
   - Display notes (if any)

3. **Approve/Reject Actions**
   - Approve button (adds payment to escrow)
   - Reject button (requires rejection reason)
   - Show rejection reason if rejected

4. **Filters**
   - Filter by status (pending, approved, rejected, processed)
   - Filter by date range
   - Filter by tenant
   - Filter by landlord
   - Filter by payment method

**API Endpoints to Use:**

**Get Pending Payment Requests:**
```
GET /api/payment-requests/pending
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `startDate` (optional) - ISO date string
- `endDate` (optional) - ISO date string
- `tenantId` (optional) - Filter by tenant ID
- `landlordId` (optional) - Filter by landlord ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "request_123",
      "tenantId": {
        "_id": "tenant_123",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "landlordId": {
        "_id": "landlord_123",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane@example.com"
      },
      "propertyId": {
        "_id": "property_123",
        "title": "2 Bedroom Apartment",
        "address": "123 Main St"
      },
      "rentalId": {
        "_id": "rental_123"
      },
      "amount": 500,
      "paymentMethod": "bank_transfer",
      "proofOfPayment": "https://firebasestorage.googleapis.com/.../receipt.pdf",
      "status": "pending_admin_approval",
      "submittedAt": "2025-01-15T10:30:00.000Z",
      "notes": "Rent payment for January 2025",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Get Payment Request by ID:**
```
GET /api/payment-requests/:id
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "request_123",
    "tenantId": { ... },
    "landlordId": { ... },
    "propertyId": { ... },
    "rentalId": { ... },
    "amount": 500,
    "paymentMethod": "bank_transfer",
    "proofOfPayment": "https://firebasestorage.googleapis.com/.../receipt.pdf",
    "status": "pending_admin_approval",
    "submittedAt": "2025-01-15T10:30:00.000Z",
    "notes": "Rent payment for January 2025"
  }
}
```

**Approve Payment Request:**
```
POST /api/payment-requests/:id/approve
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{}
```

(No body required)

**Response:**
```json
{
  "success": true,
  "message": "Payment request approved and processed successfully",
  "data": {
    "paymentRequest": {
      "_id": "request_123",
      "status": "processed",
      "paymentId": "payment_456",
      "escrowTransactionId": "escrow_789",
      "reviewedBy": "admin_123",
      "reviewedAt": "2025-01-15T11:00:00.000Z"
    },
    "payment": {
      "_id": "payment_456",
      "amount": 500,
      "status": "verified",
      "paymentMethod": "cash"
    }
  }
}
```

**Reject Payment Request:**
```
POST /api/payment-requests/:id/reject
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "rejectionReason": "Receipt shows incorrect amount. Please resubmit with correct proof showing K500."
}
```

**⚠️ Important:** `rejectionReason` is **REQUIRED**. The API will return 400 error if not provided.

**Response:**
```json
{
  "success": true,
  "message": "Payment request rejected",
  "data": {
    "_id": "request_123",
    "status": "rejected",
    "rejectionReason": "Receipt shows incorrect amount. Please resubmit with correct proof showing K500.",
    "reviewedBy": "admin_123",
    "reviewedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

**UI Components to Build:**
1. Payment Requests List Page (`/admin/payments/requests`)
2. Payment Request Detail Modal/Page
3. Proof of Payment Viewer (PDF/image)
4. Approve/Reject Action Buttons
5. Rejection Reason Input Modal
6. Filters (status, date, tenant, landlord, payment method)

---

## 💰 Escrow Management Section (NEW SECTION)

**⚠️ This is a completely NEW section that needs to be created**

### Escrow Overview

**What to Build:**

1. **Escrow Dashboard**
   - Total funds held in escrow
   - Pending distribution amount
   - Total distributed (all time)
   - Last distribution date and method
   - Auto-distribution status (enabled/disabled)
   - Distribution day setting

2. **Escrow Account Summary**
   - Total held amount
   - Pending landlord payouts
   - Pending Khayalami payouts
   - Transaction counts (pending, held, distributed)

**API Endpoints to Use:**

**Get Escrow Summary:**
```
GET /api/escrow/summary
Authorization: Bearer <admin_token>
```

(Response shown in Dashboard section above)

---

### Escrow Transactions

**What to Build:**

1. **Escrow Transactions List**
   - Show all escrow transactions
   - Filter by status (pending, held, distributed, cancelled)
   - Filter by date range
   - Filter by landlord
   - Show transaction details:
     - Payment ID
     - Rental ID
     - Property
     - Tenant
     - Landlord
     - Total amount
     - Landlord amount
     - Khayalami amount
     - Status
     - Created date
     - Distributed date (if distributed)

2. **Transaction Detail View**
   - Show full transaction details
   - Show deductions breakdown
   - Show revenue sources
   - Show payout information (if distributed)

**Note:** Currently, there's no direct endpoint to get all escrow transactions. You may need to use the escrow summary endpoint or create a new endpoint. For now, use the summary endpoint which provides transaction counts.

---

### Distribution Management

**What to Build:**

1. **Distribution Dashboard**
   - Show pending transactions ready for distribution
   - Display total amount to distribute
   - Show breakdown (landlord payouts vs Khayalami payouts)
   - Show last distribution details

2. **Manual Distribution Trigger**
   - Button to trigger manual distribution
   - Optional filters:
     - Specific landlord
     - Date range
   - Confirmation modal before distribution
   - Success/error messages

3. **Distribution History**
   - Show past distributions
   - Display distribution date
   - Show distribution method (scheduled/manual)
   - Show total distributed
   - Show number of landlords paid
   - Show Khayalami payout amount

4. **Pending Distribution Preview**
   - List transactions ready for distribution
   - Group by landlord
   - Show amounts per landlord
   - Show total Khayalami commission

**API Endpoints to Use:**

**Get Pending Distribution:**
```
GET /api/distribution/pending
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `landlordId` (optional) - Filter by landlord ID
- `startDate` (optional) - ISO date string
- `endDate` (optional) - ISO date string

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "_id": "escrow_123",
        "paymentId": "payment_456",
        "rentalId": "rental_789",
        "propertyId": "property_101",
        "landlordId": "landlord_202",
        "tenantId": "tenant_303",
        "totalAmount": 500,
        "landlordAmount": 475,
        "khayalamiAmount": 25,
        "paymentMethod": "in_app",
        "status": "held",
        "createdAt": "2025-01-15T10:00:00.000Z"
      }
    ],
    "summary": {
      "count": 50,
      "totalAmount": 50000,
      "totalLandlordAmount": 47500,
      "totalKhayalamiAmount": 2500
    }
  }
}
```

**Get Distribution Summary:**
```
GET /api/distribution/summary
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "account": {
      "totalHeld": 50000,
      "totalDistributed": 200000,
      "totalLandlordPayouts": 190000,
      "totalKhayalamiPayouts": 10000,
      "pendingTransactions": 50,
      "distributedTransactions": 200,
      "autoDistributionEnabled": true,
      "distributionDay": 1,
      "lastDistributionDate": "2025-01-31T00:00:00.000Z",
      "lastDistributionAmount": 50000,
      "lastDistributionMethod": "scheduled"
    },
    "totalHeld": 50000,
    "pendingLandlordPayouts": 47500,
    "pendingKhayalamiPayouts": 2500,
    "transactionCounts": {
      "pending": 5,
      "held": 50,
      "distributed": 200
    }
  }
}
```

**Trigger Manual Distribution:**
```
POST /api/distribution/manual
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "landlordId": "optional_landlord_id",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-01-31T23:59:59.999Z"
}
```

All fields are optional. If not provided, distributes all held transactions.

**Response:**
```json
{
  "success": true,
  "message": "Distribution completed successfully",
  "data": {
    "totalDistributed": 50000,
    "landlordPayouts": 10,
    "khayalamiPayouts": 1,
    "payoutIds": ["payout_1", "payout_2", ...]
  }
}
```

**Alternative: Use Escrow Distribute Endpoint:**
```
POST /api/escrow/distribute
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "landlordId": "optional_landlord_id",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Escrow distributed successfully: K50000 to 10 landlords and Khayalami",
  "data": {
    "totalDistributed": 50000,
    "landlordPayouts": 10,
    "khayalamiPayouts": 1,
    "payoutIds": ["payout_1", "payout_2", ...]
  }
}
```

**UI Components to Build:**
1. Escrow Dashboard Page (`/admin/escrow`)
2. Distribution Management Page (`/admin/escrow/distribution`)
3. Pending Distribution Preview Component
4. Manual Distribution Trigger Button with Filters
5. Distribution History Table
6. Distribution Confirmation Modal

---

## 💰 Revenue & Subscriptions Section (NEW SECTION)

**⚠️ This is a completely NEW section that needs to be created**

### Revenue Sources

**What to Build:**

1. **Revenue Sources List**
   - Show all revenue sources
   - Filter by source type:
     - `subscription` - Tenant subscriptions
     - `agreement_fee` - Agreement processing fees
     - `processing_fee` - Rent processing fees
     - `premium_boost` - Property premium boosts
     - `insurance_commission` - Insurance commissions
     - `service_fee` - Service fees
   - Filter by status (pending, collected, distributed)
   - Filter by date range
   - Show payer (tenant/landlord)
   - Show recipient (usually "khayalami")
   - Show amount
   - Show status
   - Show distribution date (if distributed)

2. **Revenue Summary**
   - Total revenue by source type
   - Revenue by status
   - Revenue over time

**Note:** Currently, there's no direct endpoint to get all revenue sources. You may need to create this endpoint or use existing payment/escrow data to calculate revenue.

---

### Landlord Subscriptions

**What to Build:**

1. **Premium Features Subscriptions**
   - List all landlords with active premium features subscriptions
   - Show subscription plan (premium, premium_plus)
   - Show subscription status (active, expired)
   - Show payment method (via_rent, pay_yourself)
   - Show start date, end date, next billing date
   - Show auto-renew status

2. **Zero Deposit Protection Subscriptions**
   - List all landlords with active zero deposit protection
   - Show subscription status
   - Show payment method
   - Show coverage amount
   - Show dates

3. **Subscription Management**
   - View subscription details
   - See subscription history
   - View payment history for subscriptions

**Note:** Currently, there's no direct admin endpoint to view all landlord subscriptions. You may need to create this endpoint or query landlord preferences.

---

### Premium Boosts

**What to Build:**

1. **All Premium Boosts**
   - List all premium boosts (across all properties)
   - Filter by status (active, expired)
   - Filter by property
   - Filter by landlord
   - Show boost details:
     - Property
     - Landlord
     - Amount paid
     - Duration
     - Start date
     - End date
     - Status

2. **Boost Analytics**
   - Total boosts purchased
   - Total revenue from boosts
   - Active boosts count
   - Expired boosts count

**API Endpoints to Use:**

**Get All Boosts History:**
```
GET /api/properties/boosts/history
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `landlordId` (optional) - Filter by landlord ID

**Response:**
```json
{
  "success": true,
  "data": {
    "boosts": [
      {
        "_id": "boost_123",
        "sourceType": "premium_boost",
        "amount": 15,
        "propertyId": {
          "_id": "property_123",
          "title": "2 Bedroom Apartment",
          "address": "123 Main St"
        },
        "payerId": {
          "_id": "landlord_123",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        },
        "status": "collected",
        "createdAt": "2025-01-15T10:00:00.000Z"
      }
    ],
    "boostsByProperty": [
      {
        "property": {
          "_id": "property_123",
          "title": "2 Bedroom Apartment",
          "address": "123 Main St"
        },
        "boosts": [ ... ],
        "totalSpent": 45
      }
    ],
    "summary": {
      "total": 50,
      "totalSpent": 750,
      "active": 20,
      "expired": 30,
      "properties": 15
    }
  }
}
```

**UI Components to Build:**
1. Revenue Sources Page (`/admin/revenue/sources`)
2. Landlord Subscriptions Page (`/admin/subscriptions/landlords`)
3. Premium Boosts Page (`/admin/boosts`)
4. Revenue Analytics Dashboard
5. Subscription Management Components

---

## 🔧 Settings Section (NEW SECTION)

**⚠️ This is a completely NEW section that needs to be created**

### Escrow Settings

**What to Build:**

1. **Auto-Distribution Settings**
   - Toggle auto-distribution on/off
   - Set distribution day (1-31, day of month)
   - View current settings
   - Save changes

**Note:** Currently, there's no endpoint to update escrow settings. You may need to create this endpoint or it may be handled directly in the database.

---

## Summary of New Sections and Additions

### New Sections to Create:

1. **💰 Escrow Management** (NEW)
   - Escrow Overview
   - Escrow Transactions
   - Distribution Management

2. **💰 Revenue & Subscriptions** (NEW)
   - Revenue Sources
   - Landlord Subscriptions
   - Premium Boosts

3. **🔧 Settings** (NEW)
   - Escrow Settings

### Additions to Existing Sections:

1. **🏠 Home → Dashboard**
   - Escrow summary card
   - Payment requests pending count
   - Revenue metrics

2. **🏘️ Property Management → Properties**
   - Premium boost status column
   - Boost management actions

3. **💰 Payments → Payments**
   - Payment method filter
   - Escrow status column
   - Revenue source breakdown

4. **💰 Payments → Earnings**
   - Revenue by source breakdown
   - Revenue over time chart
   - Top revenue sources

5. **💰 Payments → Incoming Requests** (NEW SUB-SECTION)
   - Payment requests list
   - Payment request detail view
   - Approve/reject actions
   - Filters

---

## API Endpoints Summary

### Escrow Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/escrow/summary` | Get escrow account summary |
| `GET` | `/api/escrow/stats` | Get distribution statistics |
| `POST` | `/api/escrow/distribute` | Trigger manual distribution |

### Distribution Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/distribution/summary` | Get distribution summary |
| `GET` | `/api/distribution/pending` | Get pending transactions |
| `POST` | `/api/distribution/manual` | Trigger manual distribution |

### Payment Request Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/payment-requests/pending` | Get pending payment requests |
| `GET` | `/api/payment-requests/:id` | Get payment request by ID |
| `POST` | `/api/payment-requests/:id/approve` | Approve payment request |
| `POST` | `/api/payment-requests/:id/reject` | Reject payment request |

### Premium Boost Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/properties/boosts/history` | Get all boosts history |
| `GET` | `/api/properties/:propertyId/boosts/history` | Get property boost history |

---

## Implementation Priority

### Phase 1: Critical (Do First)
1. ✅ Payment Requests section (Incoming Requests)
2. ✅ Escrow Overview dashboard
3. ✅ Distribution Management

### Phase 2: Important (Do Second)
4. ✅ Revenue Analytics enhancements
5. ✅ Premium Boosts management
6. ✅ Escrow Transactions view

### Phase 3: Nice to Have (Do Third)
7. ✅ Landlord Subscriptions management
8. ✅ Revenue Sources detailed view
9. ✅ Escrow Settings

---

## Important Notes

1. **Payment Requests** - This is the most critical new feature. Admins need to review and approve/reject external payment requests.

2. **Distribution Management** - Admins need to be able to trigger manual distributions and see what's pending.

3. **Escrow Overview** - Essential for understanding the financial state of the platform.

4. **Revenue Analytics** - Important for business insights and reporting.

5. **All endpoints require admin authentication** - Make sure to include `Authorization: Bearer <admin_token>` header in all requests.

6. **Error Handling** - Implement proper error handling for all API calls, especially for distribution operations which are critical.

7. **Confirmation Modals** - Always show confirmation modals before triggering distributions or rejecting payment requests.

8. **Real-time Updates** - Consider implementing real-time updates for payment requests and escrow status using WebSocket/Socket.IO if available.







