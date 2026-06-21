# 💰 Tenant Rent Payment Frontend Implementation Guide

## Overview

This guide covers **rent payments only**. For other payments, see:
- **Agreement Processing Fee**: See `TENANT_AGREEMENT_FEE_FRONTEND_GUIDE.md`
- **Zero-Deposit Subscriptions**: See `TENANT_SUBSCRIPTION_FRONTEND_GUIDE.md`

Tenants can pay rent using **2 payment methods**:

1. **Online Payment** - Pay directly via payment gateway (instant, goes to escrow immediately)
2. **External Payment** - Pay outside platform, upload proof, admin reviews and approves

All payments go to **escrow** first, then are distributed to landlords and Khayalami at month-end (or manually by admin).

---

## Payment Flow

### Flow 1: Online Payment (EcoCash via ContiPay)

```
1. Tenant selects "Pay Online" and enters EcoCash phone number
2. Frontend calls POST /api/payments/rental/:rentalId/create with phone + amount
3. Backend initiates ContiPay EcoCash USSD push to tenant's phone
4. Tenant enters PIN on phone
5. ContiPay webhook confirms payment to backend
6. Frontend polls GET /api/webhooks/payment-status/:paymentId until paid: true
7. Payment goes to escrow (status: "verified")
8. Deductions calculated (subscription fee, processing fee, insurance)
9. Tenant sees confirmation
```

See [CONTIPAY_INTEGRATION.md](./CONTIPAY_INTEGRATION.md) for full gateway details.

### Flow 2: External Payment (Deposit)

```
1. Tenant selects "Pay via Deposit/External"
2. Tenant uploads proof of payment (Firebase URL)
3. Frontend creates payment request
4. Payment request status: "pending_admin_approval"
5. Admin reviews proof of payment
6. Admin approves/rejects
7. If approved:
   - Payment created
   - Added to escrow
   - Deductions calculated
   - Tenant notified
8. If rejected:
   - Payment request rejected
   - Tenant notified with reason
```

---

## API Endpoints

### 1. Pay Rent Online (In-App Payment)

**Endpoint:**
```
POST /api/payments/rental/:rentalId/create
Authorization: Bearer <tenant_token>
```

**URL Parameters:**
- `rentalId` (required) - The rental ID to pay rent for

**Request Body:**
```json
{
  "amount": 500,
  "paymentMethod": "contipay",
  "paymentType": "rent",
  "phone": "0771234567",
  "notes": "Rent for January 2025"
}
```

**Field Descriptions:**
- `amount` (required) - Payment amount
- `phone` (required) - EcoCash number (`077...` or `26377...`)
- `paymentMethod` (optional) - `"contipay"` or `"paynow"`
- `paymentType` (optional) - Default: `"rent"`
- `notes` (optional) - Additional notes

**Response (Initiated — poll for completion):**
```json
{
  "success": true,
  "message": "Payment initiated. Check your phone for EcoCash payment instructions.",
  "data": {
    "paymentId": "payment_123",
    "reference": "RENT-userId-1234567890",
    "instructions": "Please check your phone for the EcoCash payment prompt...",
    "statusCheckUrl": "/api/webhooks/payment-status/payment_123",
    "gateway": "contipay"
  }
}
```

Poll `GET /api/webhooks/payment-status/:paymentId` until `data.paid === true`. See [CONTIPAY_INTEGRATION.md](./CONTIPAY_INTEGRATION.md).

**Response (Completed — after poll):**
```json
{
  "success": true,
  "data": {
    "paid": true,
    "status": "completed",
    "payment": {
      "_id": "payment_123",
      "rentalId": "rental_123",
      "agreementId": "agreement_123",
      "propertyId": "property_123",
      "landlordId": "landlord_123",
      "tenantId": "tenant_123",
      "paymentType": "rent",
      "amount": 500,
      "totalAmount": 500,
      "dueDate": "2025-01-15T10:30:00.000Z",
      "paymentDate": "2025-01-15T10:30:00.000Z",
      "paymentMethod": "in_app",
      "status": "verified",
      "verifiedAt": "2025-01-15T10:30:00.000Z",
      "receiptNumber": "REC-2025-001234",
      "notes": "Rent for January 2025",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    },
    "escrowTransaction": {
      "_id": "escrow_123",
      "paymentId": "payment_123",
      "totalAmount": 500,
      "landlordAmount": 485.01,
      "khayalamiAmount": 14.99,
      "deductions": {
        "subscriptionFee": 4.99,
        "processingFee": 10,
        "insurancePremium": 0,
        "totalDeductions": 14.99
      },
      "status": "held",
      "paymentMethod": "in_app",
      "paymentType": "rent"
    },
    "revenueSources": [
      {
        "_id": "revenue_123",
        "sourceType": "subscription",
        "amount": 4.99,
        "status": "collected"
      },
      {
        "_id": "revenue_124",
        "sourceType": "processing_fee",
        "amount": 10,
        "status": "collected"
      }
    ]
  }
}
```

**Response (Error - Missing Gateway Response):**
```json
{
  "success": false,
  "message": "Gateway response is required for online payments"
}
```

---

### 2. Pay Rent via External Payment (Deposit)

**Endpoint:**
```
POST /api/payments/rental/:rentalId/create
Authorization: Bearer <tenant_token>
```

**URL Parameters:**
- `rentalId` (required) - The rental ID to pay rent for

**Request Body:**
```json
{
  "amount": 500,
  "paymentMethod": "bank_transfer",
  "paymentType": "rent",
  "proofOfPayment": "https://firebasestorage.googleapis.com/v0/b/.../receipt.jpg?alt=media&token=...",
  "notes": "Rent for January 2025"
}
```

**Field Descriptions:**
- `amount` (required) - Payment amount
- `paymentMethod` (required) - `"bank_transfer"`, `"cash"`, `"mobile_money"`, or `"other"`
- `paymentType` (optional) - Default: `"rent"`
- `proofOfPayment` (required) - **Firebase URL** (not file) - Frontend must upload file to Firebase first
- `notes` (optional) - Additional notes

**Response (Success):**
```json
{
  "success": true,
  "message": "Payment request submitted successfully. Waiting for admin approval.",
  "data": {
    "paymentRequest": {
      "_id": "payment_request_123",
      "tenantId": "tenant_123",
      "rentalId": "rental_123",
      "agreementId": "agreement_123",
      "propertyId": "property_123",
      "landlordId": "landlord_123",
      "requestType": "rent",
      "amount": 500,
      "paymentMethod": "bank_transfer",
      "proofOfPayment": "https://firebasestorage.googleapis.com/...",
      "status": "pending_admin_approval",
      "submittedAt": "2025-01-15T10:30:00.000Z",
      "notes": "Rent for January 2025",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  }
}
```

**Response (Error - Missing Proof):**
```json
{
  "success": false,
  "message": "Proof of payment is required for external payments"
}
```

**Important Notes:**
- Frontend must upload the proof of payment file to Firebase Storage first
- Backend only receives the Firebase URL, not the file itself
- Payment request status will be `"pending_admin_approval"` until admin reviews
- After admin approval, payment is created and added to escrow

---

### 3. Get Payment Request Status

**Endpoint:**
```
GET /api/payment-requests/:requestId
Authorization: Bearer <tenant_token>
```

**URL Parameters:**
- `requestId` (required) - The payment request ID

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "payment_request_123",
    "tenantId": "tenant_123",
    "rentalId": "rental_123",
    "requestType": "rent",
    "amount": 500,
    "paymentMethod": "bank_transfer",
    "proofOfPayment": "https://firebasestorage.googleapis.com/...",
    "status": "pending_admin_approval",
    "submittedAt": "2025-01-15T10:30:00.000Z",
    "reviewedBy": null,
    "reviewedAt": null,
    "rejectionReason": null,
    "paymentId": null,
    "notes": "Rent for January 2025"
  }
}
```

**Status Values:**
- `pending_admin_approval` - Waiting for admin review
- `approved` - Admin approved, payment created
- `rejected` - Admin rejected (check `rejectionReason`)
- `processed` - Payment processed and added to escrow

---

### 4. Get All Payment Requests (Tenant)

**Endpoint:**
```
GET /api/payment-requests?tenantId=tenant_123
Authorization: Bearer <tenant_token>
```

**Query Parameters:**
- `tenantId` (optional) - If not provided, uses authenticated user's ID
- `status` (optional) - Filter by status: `pending_admin_approval`, `approved`, `rejected`, `processed`
- `requestType` (optional) - Filter by type: `rent`, `tenant_subscription`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "payment_request_123",
      "tenantId": "tenant_123",
      "rentalId": "rental_123",
      "requestType": "rent",
      "amount": 500,
      "paymentMethod": "bank_transfer",
      "status": "pending_admin_approval",
      "submittedAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

---

## Payment Deductions

When a tenant pays rent, the following deductions are automatically calculated:

### Deduction Types

1. **Subscription Fee** (if tenant has active subscription)
   - Amount: Based on subscription plan (USD 4.99-7.99/month)
   - Deducted from: Rent payment
   - Goes to: Khayalami

2. **Processing Fee**
   - Amount: 1.5-2% of rent amount
   - Deducted from: Rent payment
   - Goes to: Khayalami

3. **Insurance Premium** (if landlord opted in)
   - Amount: Varies
   - Deducted from: Rent payment
   - Goes to: Insurance provider (Khayalami gets commission)

### Example Calculation

**Rent Amount:** $500
**Subscription Fee:** $4.99 (if active)
**Processing Fee:** $10 (2% of $500)
**Insurance Premium:** $0 (if not applicable)

**Total Deductions:** $14.99
**Landlord Receives:** $485.01
**Khayalami Receives:** $14.99

---

## Frontend Implementation Flow

### Flow 1: Online Payment

```
1. Tenant navigates to "Pay Rent" screen
2. Tenant enters amount (or uses default rent amount)
3. Tenant selects "Pay Online"
4. Frontend shows payment gateway integration
5. Tenant enters payment details (card, etc.)
6. Payment gateway processes payment
7. On success, frontend receives gateway response
8. Frontend calls POST /api/payments/rental/:rentalId/create
9. Backend:
   - Creates payment (status: "verified")
   - Calculates deductions
   - Adds to escrow (status: "held")
   - Creates revenue sources
10. Frontend shows success message with receipt
11. Frontend updates payment history
```

### Flow 2: External Payment

```
1. Tenant navigates to "Pay Rent" screen
2. Tenant enters amount (or uses default rent amount)
3. Tenant selects "Pay via Deposit/External"
4. Frontend shows file upload dialog
5. Tenant selects proof of payment file (PDF/image)
6. Frontend uploads file to Firebase Storage
7. Frontend gets Firebase URL
8. Frontend calls POST /api/payments/rental/:rentalId/create
9. Backend creates payment request (status: "pending_admin_approval")
10. Frontend shows "Payment request submitted" message
11. Frontend shows pending status
12. Admin reviews and approves/rejects
13. If approved:
    - Backend creates payment
    - Adds to escrow
    - Calculates deductions
14. Frontend receives notification (via WebSocket or polling)
15. Frontend updates UI to show approved status
16. If rejected:
    - Frontend receives notification with rejection reason
    - Frontend shows rejection message
```

---

## UI Components to Build

### 1. Payment Method Selection

```
┌─────────────────────────────────────┐
│ Pay Rent - $500                     │
├─────────────────────────────────────┤
│                                     │
│ Amount: $500                        │
│                                     │
│ Choose Payment Method:              │
│                                     │
│ ○ Pay Online                        │
│   Pay directly via payment gateway  │
│   Instant processing                │
│   Goes to escrow immediately        │
│                                     │
│ ○ Pay via Deposit/External         │
│   Pay outside platform              │
│   Upload proof for review           │
│   Admin approval required           │
│                                     │
│ [Continue]                          │
│ [Cancel]                            │
└─────────────────────────────────────┘
```

### 2. Online Payment Screen

```
┌─────────────────────────────────────┐
│ Pay Online - $500                   │
├─────────────────────────────────────┤
│                                     │
│ Amount: $500                        │
│                                     │
│ Payment Gateway Integration         │
│ [Card Input Form]                   │
│                                     │
│ Deductions Preview:                 │
│ • Subscription Fee: $4.99           │
│ • Processing Fee: $10.00            │
│ • Total Deductions: $14.99          │
│ • Landlord Receives: $485.01        │
│                                     │
│ [Pay $500]                          │
│ [Back]                              │
└─────────────────────────────────────┘
```

### 3. External Payment Upload

```
┌─────────────────────────────────────┐
│ Pay via Deposit - $500              │
├─────────────────────────────────────┤
│                                     │
│ Amount: $500                        │
│                                     │
│ Payment Method:                     │
│ [Bank Transfer ▼]                   │
│                                     │
│ Proof of Payment:                   │
│ ┌─────────────────────────────────┐ │
│ │                                   │ │
│ │   [Upload Receipt/Proof]          │ │
│ │                                   │ │
│ │   PDF, JPG, PNG (Max 5MB)         │ │
│ │                                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Notes (Optional):                    │
│ [Text Area]                          │
│                                     │
│ [Submit Payment Request]             │
│ [Back]                              │
└─────────────────────────────────────┘
```

### 4. Payment Success (Online)

```
┌─────────────────────────────────────┐
│ ✓ Payment Successful                │
├─────────────────────────────────────┤
│                                     │
│ Amount Paid: $500                   │
│ Receipt Number: REC-2025-001234     │
│                                     │
│ Payment Details:                    │
│ • Method: Online Payment           │
│ • Date: Jan 15, 2025 10:30 AM      │
│ • Status: Verified                  │
│                                     │
│ Deductions:                         │
│ • Subscription Fee: $4.99           │
│ • Processing Fee: $10.00            │
│ • Total: $14.99                     │
│                                     │
│ Landlord Receives: $485.01          │
│                                     │
│ Payment has been added to escrow.   │
│                                     │
│ [View Receipt]                      │
│ [Done]                              │
└─────────────────────────────────────┘
```

### 5. Payment Request Pending

```
┌─────────────────────────────────────┐
│ Payment Request Submitted            │
├─────────────────────────────────────┤
│                                     │
│ Amount: $500                        │
│ Method: Bank Transfer               │
│                                     │
│ Status: ⏳ Pending Admin Approval    │
│                                     │
│ Submitted: Jan 15, 2025 10:30 AM   │
│                                     │
│ Your payment request is being       │
│ reviewed by admin. You will be      │
│ notified once approved or rejected. │
│                                     │
│ [View Proof]                        │
│ [View Details]                      │
└─────────────────────────────────────┘
```

### 6. Payment Request Approved

```
┌─────────────────────────────────────┐
│ ✓ Payment Approved                  │
├─────────────────────────────────────┤
│                                     │
│ Amount: $500                        │
│ Receipt Number: REC-2025-001234     │
│                                     │
│ Payment Details:                    │
│ • Method: Bank Transfer             │
│ • Approved: Jan 15, 2025 11:00 AM  │
│ • Status: Verified                  │
│                                     │
│ Deductions:                         │
│ • Subscription Fee: $4.99           │
│ • Processing Fee: $10.00            │
│ • Total: $14.99                     │
│                                     │
│ Landlord Receives: $485.01          │
│                                     │
│ Payment has been added to escrow.   │
│                                     │
│ [View Receipt]                      │
│ [Done]                              │
└─────────────────────────────────────┘
```

### 7. Payment Request Rejected

```
┌─────────────────────────────────────┐
│ ✗ Payment Rejected                  │
├─────────────────────────────────────┤
│                                     │
│ Amount: $500                        │
│ Method: Bank Transfer               │
│                                     │
│ Status: Rejected                    │
│ Rejected: Jan 15, 2025 11:00 AM    │
│                                     │
│ Rejection Reason:                   │
│ "Receipt shows wrong amount.        │
│  Please resubmit correct proof."    │
│                                     │
│ [Resubmit Payment]                  │
│ [View Details]                      │
└─────────────────────────────────────┘
```

---

## Firebase Upload Flow

### Step 1: Upload File to Firebase

```javascript
// Frontend code example (pseudo-code)
const uploadProofToFirebase = async (file) => {
  // 1. Get Firebase Storage reference
  const storageRef = firebase.storage().ref();
  const fileRef = storageRef.child(`payments/${Date.now()}_${file.name}`);
  
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
const response = await fetch(`/api/payments/rental/${rentalId}/create`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 500,
    paymentMethod: 'bank_transfer',
    proofOfPayment: downloadURL, // Firebase URL, not file
    notes: 'Rent for January 2025'
  })
});
```

---

## Error Handling

### Common Errors

**1. Missing Gateway Response (Online Payment):**
```json
{
  "success": false,
  "message": "Gateway response is required for online payments"
}
```
**Frontend Action:** Show error and retry payment

**2. Missing Proof (External Payment):**
```json
{
  "success": false,
  "message": "Proof of payment is required for external payments"
}
```
**Frontend Action:** Highlight file upload field and show validation error

**3. Invalid Rental:**
```json
{
  "success": false,
  "message": "Rental not found"
}
```
**Frontend Action:** Show error and redirect to rentals list

**4. Access Denied:**
```json
{
  "success": false,
  "message": "Access denied"
}
```
**Frontend Action:** Show error and verify user authentication

---

## Important Notes

1. **Firebase Upload Required**: Frontend must upload proof of payment files to Firebase Storage. Backend only receives the URL.

2. **Payment Method Detection**: Backend automatically detects payment method:
   - If `paymentMethod: "in_app"` → Processes immediately
   - If `paymentMethod: "bank_transfer" | "cash" | "mobile_money" | "other"` → Creates payment request

3. **Escrow Integration**: All payments (online and external) go to escrow. Online payments go immediately with "held" status. External payments go after admin approval.

4. **Deductions**: Deductions are automatically calculated:
   - Subscription fee (if tenant has active subscription)
   - Processing fee (1.5-2% of rent)
   - Insurance premium (if applicable)

5. **Payment Request Status**: External payment requests go through admin review:
   - `pending_admin_approval` → Waiting for review
   - `approved` → Payment created, added to escrow
   - `rejected` → Payment not created, tenant notified with reason

6. **Receipt Numbers**: Receipt numbers are automatically generated when payment is verified (online) or approved (external).

---

## Next Steps

1. **Build Payment Method Selection UI** - Show online vs external options
2. **Integrate Payment Gateway** - For online payments
3. **Implement Firebase Upload** - For proof of payment
4. **Create Payment Request Flow** - For external payments
5. **Add Payment History Display** - Show all payments and requests
6. **Implement Status Updates** - Show pending/approved/rejected status
7. **Add Notifications** - Notify on approval/rejection

