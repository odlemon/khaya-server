# Frontend API Reference - Revenue & Escrow System

## Base URL
```
Production: https://your-api-domain.com/api
Development: http://localhost:3000/api
```

## Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

---

## Payment Request Endpoints

### 1. Submit Payment Request (Tenant)
**POST** `/payment-requests`

Submit an external payment request with proof of payment.

**Request:**
```json
{
  "rentalId": "507f1f77bcf86cd799439011",
  "amount": 500,
  "proofOfPayment": "https://storage.example.com/receipt.jpg",
  "paymentMethod": "bank_transfer",
  "notes": "Payment via bank transfer on 15th Jan"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Payment request submitted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "tenantId": "507f1f77bcf86cd799439013",
    "rentalId": "507f1f77bcf86cd799439011",
    "amount": 500,
    "paymentMethod": "bank_transfer",
    "proofOfPayment": "https://storage.example.com/receipt.jpg",
    "status": "pending_admin_approval",
    "submittedAt": "2025-01-15T10:30:00.000Z",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Missing required fields
- `401` - Unauthorized
- `500` - Server error

---

### 2. Get Pending Payment Requests (Admin)
**GET** `/payment-requests/pending`

Get all pending payment requests awaiting admin review.

**Query Parameters:**
- `startDate` (optional) - ISO date string
- `endDate` (optional) - ISO date string
- `tenantId` (optional) - Filter by tenant
- `landlordId` (optional) - Filter by landlord

**Example:**
```
GET /payment-requests/pending?startDate=2025-01-01&endDate=2025-01-31
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "tenantId": {
        "_id": "507f1f77bcf86cd799439013",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "landlordId": {
        "_id": "507f1f77bcf86cd799439014",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane@example.com"
      },
      "propertyId": {
        "_id": "507f1f77bcf86cd799439015",
        "title": "2 Bedroom Apartment",
        "address": "123 Main St"
      },
      "rentalId": "507f1f77bcf86cd799439011",
      "amount": 500,
      "paymentMethod": "bank_transfer",
      "proofOfPayment": "https://storage.example.com/receipt.jpg",
      "status": "pending_admin_approval",
      "submittedAt": "2025-01-15T10:30:00.000Z",
      "notes": "Payment via bank transfer"
    }
  ]
}
```

---

### 3. Get Payment Request by ID
**GET** `/payment-requests/:id`

Get a specific payment request by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "tenantId": { /* user object */ },
    "landlordId": { /* user object */ },
    "propertyId": { /* property object */ },
    "rentalId": { /* rental object */ },
    "amount": 500,
    "paymentMethod": "bank_transfer",
    "proofOfPayment": "https://storage.example.com/receipt.jpg",
    "status": "pending_admin_approval",
    "submittedAt": "2025-01-15T10:30:00.000Z",
    "paymentId": null, // Set after approval
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

---

### 4. Approve Payment Request (Admin)
**POST** `/payment-requests/:id/approve`

Approve a payment request. This will:
1. Create a payment record
2. Add payment to escrow
3. Send email notifications to tenant and landlord

**Response (200):**
```json
{
  "success": true,
  "message": "Payment request approved and processed successfully",
  "data": {
    "paymentRequest": {
      "_id": "507f1f77bcf86cd799439012",
      "status": "processed",
      "paymentId": "507f1f77bcf86cd799439016",
      "reviewedBy": "507f1f77bcf86cd799439017",
      "reviewedAt": "2025-01-15T11:00:00.000Z"
    },
    "payment": {
      "_id": "507f1f77bcf86cd799439016",
      "amount": 500,
      "status": "verified",
      "paymentMethod": "cash"
    },
    "escrowTransaction": {
      "totalHeld": 5000,
      "pendingTransactions": 10
    }
  }
}
```

---

### 5. Reject Payment Request (Admin)
**POST** `/payment-requests/:id/reject`

Reject a payment request with a reason.

**Request:**
```json
{
  "rejectionReason": "Receipt is unclear or invalid. Please resubmit with a clearer image."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment request rejected",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "status": "rejected",
    "rejectionReason": "Receipt is unclear or invalid. Please resubmit with a clearer image.",
    "reviewedBy": "507f1f77bcf86cd799439017",
    "reviewedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

---

## Distribution Endpoints

### 6. Get Pending Distribution (Admin)
**GET** `/distribution/pending`

Get all escrow transactions ready for distribution.

**Query Parameters:**
- `landlordId` (optional) - Filter by landlord
- `startDate` (optional) - ISO date string
- `endDate` (optional) - ISO date string

**Example:**
```
GET /distribution/pending?startDate=2025-01-01&endDate=2025-01-31
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "_id": "507f1f77bcf86cd799439018",
        "tenantId": {
          "firstName": "John",
          "lastName": "Doe"
        },
        "landlordId": {
          "firstName": "Jane",
          "lastName": "Smith"
        },
        "propertyId": {
          "title": "2 Bedroom Apartment",
          "address": "123 Main St"
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
        "createdAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "summary": {
      "count": 25,
      "totalAmount": 12500,
      "totalLandlordAmount": 12125,
      "totalKhayalamiAmount": 375
    }
  }
}
```

---

### 7. Manual Distribution (Admin)
**POST** `/distribution/manual`

Trigger manual distribution of escrow funds.

**Request:**
```json
{
  "landlordId": "507f1f77bcf86cd799439014", // optional
  "startDate": "2025-01-01T00:00:00Z", // optional
  "endDate": "2025-01-31T23:59:59Z" // optional
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Distribution completed successfully",
  "data": {
    "totalDistributed": 12500,
    "landlordPayouts": 20,
    "khayalamiPayouts": 1,
    "payoutIds": [
      "507f1f77bcf86cd799439019",
      "507f1f77bcf86cd799439020"
    ]
  }
}
```

**Note:** This creates payouts for:
- All landlords (grouped by landlord)
- Khayalami (single payout with all commissions)

---

### 8. Get Distribution Summary (Admin)
**GET** `/distribution/summary`

Get escrow account summary and distribution statistics.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "account": {
      "_id": "507f1f77bcf86cd799439021",
      "accountType": "main",
      "totalHeld": 5000,
      "totalDistributed": 25000,
      "totalLandlordPayouts": 24000,
      "totalKhayalamiPayouts": 1000,
      "pendingTransactions": 10,
      "distributedTransactions": 50,
      "lastDistributionDate": "2025-01-31T00:00:00.000Z",
      "lastDistributionAmount": 12500,
      "lastDistributionMethod": "scheduled"
    }
  }
}
```

---

## Escrow Endpoints (Existing)

### 9. Get Landlord Escrow Summary
**GET** `/escrow/landlord/:landlordId`

Get escrow summary for a specific landlord.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "pendingAmount": 1500,
    "heldAmount": 3000,
    "distributedAmount": 5000,
    "transactions": [
      {
        "_id": "507f1f77bcf86cd799439018",
        "tenantId": {
          "firstName": "John",
          "lastName": "Doe"
        },
        "propertyId": {
          "title": "2 Bedroom Apartment",
          "address": "123 Main St"
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
        "createdAt": "2025-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

---

## Payment Endpoints (Existing - Updated)

### 10. Create Payment (In-App)
**POST** `/payments`

Create an in-app payment. This automatically:
1. Calculates deductions
2. Creates revenue sources
3. Adds to escrow
4. Sends email notifications

**Request:**
```json
{
  "rentalId": "507f1f77bcf86cd799439011",
  "amount": 500,
  "paymentMethod": "in_app",
  "paymentType": "rent",
  "gatewayResponse": { /* payment gateway response */ }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439016",
    "rentalId": "507f1f77bcf86cd799439011",
    "amount": 500,
    "totalAmount": 500,
    "paymentMethod": "in_app",
    "status": "verified",
    "deductions": {
      "subscriptionFee": 5,
      "processingFee": 10,
      "insurancePremium": 0,
      "totalDeductions": 15,
      "netRentAmount": 485
    },
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

---

## Error Responses

All endpoints may return these error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Missing required fields: rentalId, amount"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Access denied. Admin role required."
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Payment request not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to process request"
}
```

---

## TypeScript Types

```typescript
// Payment Request Types
interface PaymentRequest {
  _id: string;
  tenantId: string | User;
  landlordId: string | User;
  propertyId: string | Property;
  rentalId: string | Rental;
  amount: number;
  paymentMethod: 'bank_transfer' | 'cash' | 'mobile_money' | 'other';
  proofOfPayment: string;
  status: 'pending_admin_approval' | 'approved' | 'rejected' | 'processed';
  submittedAt: Date;
  reviewedBy?: string | User;
  reviewedAt?: Date;
  rejectionReason?: string;
  paymentId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Escrow Transaction Types
interface EscrowTransaction {
  _id: string;
  paymentId: string;
  rentalId: string;
  landlordId: string | User;
  tenantId: string | User;
  propertyId: string | Property;
  totalAmount: number;
  landlordAmount: number;
  khayalamiAmount: number;
  deductions: {
    subscriptionFee: number;
    processingFee: number;
    insurancePremium: number;
    totalDeductions: number;
  };
  status: 'pending' | 'held' | 'distributed' | 'cancelled';
  createdAt: Date;
}

// Distribution Response Types
interface DistributionResult {
  success: boolean;
  totalDistributed: number;
  landlordPayouts: number;
  khayalamiPayouts: number;
  payoutIds: string[];
}

// Deduction Breakdown Types
interface DeductionBreakdown {
  totalAmount: number;
  subscriptionFee: number;
  processingFee: number;
  insurancePremium: number;
  netRentAmount: number;
  khayalamiTotal: number;
}
```

---

## Rate Limiting

- Payment requests: 10 per hour per user
- Distribution: 5 per hour per admin
- General endpoints: 100 requests per minute

---

## Webhooks (Future)

Webhooks will be available for:
- Payment request status changes
- Distribution completed
- Escrow status updates

(To be implemented in future version)







