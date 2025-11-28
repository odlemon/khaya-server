# Frontend Implementation Guide - Revenue & Escrow System

## Overview

This guide outlines what needs to be implemented on the frontend to support the new revenue model and escrow system. Follow the implementation order for best results.

---

## Implementation Order

### Phase 1: Payment Request System (External Payments)
**Priority: HIGH** - Required for tenants to submit external payments

### Phase 2: Payment Display & Tracking
**Priority: HIGH** - Users need to see payment status and escrow information

### Phase 3: Distribution Management (Admin)
**Priority: MEDIUM** - Admin needs to manually trigger distributions

### Phase 4: Revenue Analytics (Admin)
**Priority: LOW** - Analytics and reporting

---

## Phase 1: Payment Request System

### 1.1 Tenant: Submit External Payment Request

**Endpoint:** `POST /api/payment-requests`

**Request Body:**
```json
{
  "rentalId": "507f1f77bcf86cd799439011",
  "amount": 500,
  "proofOfPayment": "https://storage.example.com/receipt.jpg",
  "paymentMethod": "bank_transfer", // or "cash", "mobile_money", "other"
  "notes": "Optional notes about the payment"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment request submitted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "tenantId": "...",
    "rentalId": "...",
    "amount": 500,
    "status": "pending_admin_approval",
    "submittedAt": "2025-01-15T10:30:00Z",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

**UI Components to Build:**
1. **Payment Request Form**
   - File upload for proof of payment (receipt/image)
   - Amount input field
   - Payment method dropdown (bank_transfer, cash, mobile_money, other)
   - Notes textarea (optional)
   - Submit button

2. **Payment Request Status Card**
   - Show current status (pending, approved, rejected)
   - Display submitted date
   - Show rejection reason if rejected

**Implementation Steps:**
1. Create `/tenant/payments/submit-external` page
2. Add file upload component for receipt
3. Create API service function `submitPaymentRequest()`
4. Add success/error handling
5. Show confirmation message after submission
6. Redirect to payment status page

---

### 1.2 Admin: Review Payment Requests

**Endpoint:** `GET /api/payment-requests/pending`

**Query Parameters:**
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date
- `tenantId` (optional): Filter by tenant
- `landlordId` (optional): Filter by landlord

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "tenantId": {
        "_id": "...",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "landlordId": {
        "_id": "...",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane@example.com"
      },
      "propertyId": {
        "_id": "...",
        "title": "2 Bedroom Apartment",
        "address": "123 Main St"
      },
      "amount": 500,
      "paymentMethod": "bank_transfer",
      "proofOfPayment": "https://storage.example.com/receipt.jpg",
      "status": "pending_admin_approval",
      "submittedAt": "2025-01-15T10:30:00Z",
      "notes": "Payment via bank transfer"
    }
  ]
}
```

**UI Components to Build:**
1. **Payment Requests List Page** (`/admin/payments/requests`)
   - Table showing all pending requests
   - Columns: Tenant, Property, Amount, Payment Method, Submitted Date, Actions
   - Filter by date range, tenant, landlord
   - View receipt button (opens modal/image viewer)
   - Approve/Reject buttons

2. **Payment Request Detail Modal**
   - Show full request details
   - Display receipt image
   - Approve button (with confirmation)
   - Reject button (requires rejection reason input)

**Implementation Steps:**
1. Create `/admin/payments/requests` page
2. Create API service function `getPendingPaymentRequests()`
3. Build payment request table component
4. Add image viewer for receipts
5. Create approve/reject modals
6. Implement approve/reject API calls

---

### 1.3 Admin: Approve Payment Request

**Endpoint:** `POST /api/payment-requests/:id/approve`

**Response:**
```json
{
  "success": true,
  "message": "Payment request approved and processed successfully",
  "data": {
    "paymentRequest": { /* updated request */ },
    "payment": { /* created payment */ },
    "escrowTransaction": { /* escrow summary */ }
  }
}
```

**UI Flow:**
1. Admin clicks "Approve" on payment request
2. Show confirmation dialog: "Approve this payment request?"
3. On confirm, call API
4. Show success message: "Payment approved and processed"
5. Update request status in UI
6. Optionally send notification to tenant

---

### 1.4 Admin: Reject Payment Request

**Endpoint:** `POST /api/payment-requests/:id/reject`

**Request Body:**
```json
{
  "rejectionReason": "Receipt is unclear or invalid. Please resubmit with a clearer image."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment request rejected",
  "data": { /* updated request with rejection reason */ }
}
```

**UI Flow:**
1. Admin clicks "Reject" on payment request
2. Show modal with textarea for rejection reason (required)
3. On submit, call API
4. Show success message
5. Update request status in UI
6. Tenant will receive email notification

---

## Phase 2: Payment Display & Tracking

### 2.1 Tenant: View Payment History

**Endpoint:** Use existing payment endpoints or create new one

**UI Components to Build:**
1. **Payment History Page** (`/tenant/payments`)
   - List of all payments (in-app and external)
   - Show payment status (verified, pending, rejected)
   - Show payment method
   - Show amount and deductions breakdown
   - Show escrow status

2. **Payment Detail Card**
   - Total amount paid
   - Deductions breakdown:
     - Subscription fee
     - Processing fee
     - Insurance premium
   - Net rent amount
   - Escrow status (pending, held, distributed)
   - Distribution date (if distributed)

**Payment Status Indicators:**
- ✅ **Verified** (green) - Payment confirmed, in escrow
- ⏳ **Pending** (yellow) - Awaiting admin approval
- ❌ **Rejected** (red) - Payment request rejected
- 💰 **Distributed** (blue) - Funds distributed to landlord

---

### 2.2 Landlord: View Escrow Status

**Endpoint:** `GET /api/escrow/landlord/:landlordId`

**Response:**
```json
{
  "success": true,
  "data": {
    "pendingAmount": 1500,
    "heldAmount": 3000,
    "distributedAmount": 5000,
    "transactions": [
      {
        "_id": "...",
        "tenantId": { "firstName": "John", "lastName": "Doe" },
        "propertyId": { "title": "2 Bedroom Apartment" },
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
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ]
  }
}
```

**UI Components to Build:**
1. **Escrow Dashboard** (`/landlord/escrow`)
   - Summary cards:
     - Total Pending (awaiting verification)
     - Total Held (in escrow, ready for distribution)
     - Total Distributed (already paid out)
   - Transaction list with filters
   - Show deduction breakdown for each transaction

2. **Escrow Transaction Card**
   - Tenant name
   - Property name
   - Total payment amount
   - Deductions breakdown (expandable)
   - Net amount (landlord portion)
   - Status badge
   - Date

---

### 2.3 Display Deduction Breakdown

**Component:** Reusable deduction breakdown card

**Props:**
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

**UI Design:**
```
┌─────────────────────────────────┐
│ Payment Breakdown               │
├─────────────────────────────────┤
│ Total Amount:        $500.00    │
│                                   │
│ Deductions:                      │
│   • Subscription Fee:  $5.00     │
│   • Processing Fee:    $10.00     │
│   • Insurance:          $0.00    │
│   ────────────────────────────   │
│   Total Deductions:   $15.00     │
│                                   │
│ Net Amount:          $485.00     │
└─────────────────────────────────┘
```

---

## Phase 3: Distribution Management (Admin Only)

### 3.1 Admin: View Pending Distribution

**Endpoint:** `GET /api/distribution/pending`

**Query Parameters:**
- `landlordId` (optional): Filter by landlord
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [ /* array of escrow transactions */ ],
    "summary": {
      "count": 25,
      "totalAmount": 12500,
      "totalLandlordAmount": 12125,
      "totalKhayalamiAmount": 375
    }
  }
}
```

**UI Components to Build:**
1. **Distribution Dashboard** (`/admin/distribution`)
   - Summary cards:
     - Total Transactions Pending
     - Total Amount to Distribute
     - Total Landlord Payouts
     - Total Khayalami Payouts
   - Filter options (date range, landlord)
   - "Distribute Now" button (manual trigger)

---

### 3.2 Admin: Manual Distribution

**Endpoint:** `POST /api/distribution/manual`

**Request Body:**
```json
{
  "landlordId": "507f1f77bcf86cd799439011", // optional
  "startDate": "2025-01-01T00:00:00Z", // optional
  "endDate": "2025-01-31T23:59:59Z" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Distribution completed successfully",
  "data": {
    "totalDistributed": 12500,
    "landlordPayouts": 20,
    "khayalamiPayouts": 1,
    "payoutIds": ["...", "..."]
  }
}
```

**UI Flow:**
1. Admin views pending distribution summary
2. Clicks "Distribute Now" button
3. Show confirmation dialog:
   ```
   Are you sure you want to distribute funds?
   
   Summary:
   - Transactions: 25
   - Total Amount: $12,500
   - Landlord Payouts: 20
   - Khayalami Payout: 1
   
   This action cannot be undone.
   ```
4. On confirm, call API
5. Show loading state
6. On success, show success message with distribution summary
7. Refresh the distribution dashboard

**UI Components to Build:**
1. **Distribution Confirmation Modal**
   - Show distribution summary
   - Warning message
   - Confirm/Cancel buttons

2. **Distribution Success Toast/Modal**
   - Show distribution results
   - Download receipt option (if implemented)

---

### 3.3 Admin: Distribution History

**Endpoint:** `GET /api/distribution/summary`

**Response:**
```json
{
  "success": true,
  "data": {
    "account": {
      "totalHeld": 5000,
      "totalDistributed": 25000,
      "totalLandlordPayouts": 24000,
      "totalKhayalamiPayouts": 1000,
      "lastDistributionDate": "2025-01-31T00:00:00Z",
      "lastDistributionMethod": "scheduled"
    }
  }
}
```

**UI Components to Build:**
1. **Distribution History Page** (`/admin/distribution/history`)
   - Show last distribution date
   - Show distribution method (scheduled/manual)
   - Show total distributed amounts
   - Chart/graph of distribution over time (optional)

---

## Phase 4: Revenue Analytics (Admin)

### 4.1 Revenue Dashboard

**Endpoints to Use:**
- Revenue source endpoints (to be created or use existing)
- Escrow summary endpoint

**UI Components to Build:**
1. **Revenue Dashboard** (`/admin/revenue`)
   - Revenue by source:
     - Subscription fees
     - Processing fees
     - Agreement fees
     - Premium boosts
     - Insurance commissions
   - Revenue over time (chart)
   - Top revenue sources
   - Monthly/yearly comparisons

---

## API Service Functions (TypeScript Examples)

### Payment Request Service

```typescript
// services/paymentRequestService.ts

export const paymentRequestService = {
  // Submit payment request (tenant)
  async submitPaymentRequest(data: {
    rentalId: string;
    amount: number;
    proofOfPayment: string;
    paymentMethod: 'bank_transfer' | 'cash' | 'mobile_money' | 'other';
    notes?: string;
  }) {
    const response = await fetch('/api/payment-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Get pending requests (admin)
  async getPendingRequests(filters?: {
    startDate?: string;
    endDate?: string;
    tenantId?: string;
    landlordId?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.tenantId) params.append('tenantId', filters.tenantId);
    if (filters?.landlordId) params.append('landlordId', filters.landlordId);

    const response = await fetch(`/api/payment-requests/pending?${params}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  // Approve payment request (admin)
  async approveRequest(requestId: string) {
    const response = await fetch(`/api/payment-requests/${requestId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  // Reject payment request (admin)
  async rejectRequest(requestId: string, rejectionReason: string) {
    const response = await fetch(`/api/payment-requests/${requestId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ rejectionReason })
    });
    return response.json();
  }
};
```

### Distribution Service

```typescript
// services/distributionService.ts

export const distributionService = {
  // Get pending distribution
  async getPendingDistribution(filters?: {
    landlordId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.landlordId) params.append('landlordId', filters.landlordId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await fetch(`/api/distribution/pending?${params}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  // Manual distribution (admin)
  async manualDistribution(filters?: {
    landlordId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await fetch('/api/distribution/manual', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(filters || {})
    });
    return response.json();
  },

  // Get distribution summary
  async getSummary() {
    const response = await fetch('/api/distribution/summary', {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  }
};
```

---

## UI/UX Best Practices

### 1. Payment Status Indicators
- Use consistent color coding:
  - 🟢 Green: Verified/Approved
  - 🟡 Yellow: Pending
  - 🔴 Red: Rejected/Failed
  - 🔵 Blue: Distributed

### 2. Loading States
- Show skeleton loaders while fetching data
- Disable buttons during API calls
- Show progress indicators for file uploads

### 3. Error Handling
- Display user-friendly error messages
- Show validation errors inline on forms
- Provide retry options for failed requests

### 4. Confirmation Dialogs
- Always confirm destructive actions (approve/reject, distribute)
- Show summary of what will happen
- Allow cancellation

### 5. Notifications
- Show success toasts after actions
- Send email notifications (handled by backend)
- Update UI immediately after successful actions

---

## Testing Checklist

### Phase 1: Payment Request System
- [ ] Tenant can submit payment request with receipt
- [ ] Admin can view pending payment requests
- [ ] Admin can approve payment request
- [ ] Admin can reject payment request with reason
- [ ] Tenant receives email on approval/rejection
- [ ] Payment request status updates correctly

### Phase 2: Payment Display
- [ ] Tenant can view payment history
- [ ] Deduction breakdown displays correctly
- [ ] Landlord can view escrow status
- [ ] Escrow transactions show correct amounts

### Phase 3: Distribution
- [ ] Admin can view pending distribution
- [ ] Admin can trigger manual distribution
- [ ] Distribution confirmation works
- [ ] Distribution summary displays correctly

---

## Important Notes

1. **File Upload**: Use multipart/form-data for receipt uploads
2. **Authentication**: All endpoints require JWT token in Authorization header
3. **Admin Only**: Distribution endpoints require admin role
4. **Email Notifications**: Handled automatically by backend
5. **Auto Distribution**: Runs monthly via cron job (no frontend action needed)

---

## Next Steps

1. Start with Phase 1 (Payment Request System) - highest priority
2. Test thoroughly before moving to Phase 2
3. Implement Phase 2 (Payment Display) for user visibility
4. Add Phase 3 (Distribution) for admin control
5. Phase 4 (Analytics) can be added later as needed

---

## Support

For API issues or questions, refer to:
- `docs/REVENUE_MODEL_IMPLEMENTATION_SRD.md` - Full system documentation
- `docs/ESCROW_SYSTEM.md` - Escrow system details
- Backend API documentation (if available)

