# 💳 Frontend Payment Methods Implementation Guide

## Overview

Tenants have **2 payment options** when paying rent:

1. **Online Payment** - Pay directly via payment gateway (instant, goes to escrow immediately)
2. **Deposit/External Payment** - Pay outside platform, upload proof, admin reviews and approves

---

## Payment Method Selection Flow

### Step 1: Tenant Chooses Payment Method

When a tenant wants to pay rent, they must first choose their payment method:

**UI Flow:**
```
┌─────────────────────────────────────┐
│ Pay Rent - K500                     │
├─────────────────────────────────────┤
│                                     │
│ Choose Payment Method:              │
│                                     │
│ ○ Pay Online                        │
│   Pay directly via payment gateway  │
│   Instant processing                │
│                                     │
│ ○ Pay via Deposit/External         │
│   Pay outside platform              │
│   Upload proof for review           │
│                                     │
│ [Continue]                          │
└─────────────────────────────────────┘
```

---

## Option 1: Online Payment (In-App)

### What Happens

1. Tenant selects "Pay Online"
2. Frontend integrates with payment gateway (Stripe, Paystack, Flutterwave, etc.)
3. Payment gateway processes payment
4. On success, frontend calls API with gateway response
5. Payment goes directly to escrow (status: "verified")
6. Tenant sees confirmation immediately

### Frontend Steps

**Step 1: Initialize Payment Gateway**
- Integrate payment gateway SDK
- Get payment gateway response after successful payment

**Step 2: Call Payment API**

**API Endpoint:**
```
POST /api/payments/rental/:rentalId/create
Authorization: Bearer <tenant_token>
```

**Request Body:**
```json
{
  "amount": 500,
  "paymentMethod": "in_app",
  "paymentType": "rent",
  "gatewayResponse": {
    "provider": "paystack",
    "transactionId": "TXN123456",
    "transactionRef": "REF789012",
    "paidAt": "2025-01-15T10:30:00.000Z",
    "rawResponse": { ... }
  },
  "notes": "Rent for January 2025"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment created successfully",
  "data": {
    "_id": "payment_123",
    "amount": 500,
    "status": "verified",
    "paymentMethod": "in_app",
    "verifiedAt": "2025-01-15T10:30:00.000Z",
    "receiptNumber": "RCP-2025-001234",
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Step 3: Show Success Message**
- Display payment confirmation
- Show receipt number
- Update payment status in UI

### Important Notes

- ✅ Payment goes directly to escrow (no admin review needed)
- ✅ Status is immediately "verified"
- ✅ Tenant gets instant confirmation
- ✅ Landlord is notified automatically
- ✅ Email notifications sent to both tenant and landlord

---

## Option 2: Deposit/External Payment (With Proof Upload)

### What Happens

1. Tenant selects "Pay via Deposit/External"
2. Tenant makes payment outside platform (bank transfer, cash, mobile money, etc.)
3. Tenant uploads proof of payment (PDF or image) to Firebase
4. Tenant submits payment request with proof URL
5. Admin reviews payment request
6. Admin approves or rejects (with reason if rejected)
7. If approved, payment goes to escrow
8. Tenant and landlord are notified

### Frontend Steps

**Step 1: Upload Proof to Firebase (Frontend Only)**

⚠️ **IMPORTANT:** The backend does NOT handle file uploads. The frontend must:
1. Upload the file to Firebase Storage
2. Get the download URL from Firebase
3. Send only the URL to the backend (not the file)

**Frontend Firebase Upload Process:**
1. User selects file (PDF or image)
2. Frontend uploads file to Firebase Storage
3. Firebase returns download URL
4. Frontend stores URL temporarily
5. Frontend sends URL to backend API

**Firebase Upload Details:**
- Accept file types: PDF, JPG, PNG
- Max file size: 5MB (recommended)
- Upload path: `payments/proofs/{tenantId}/{timestamp}_{filename}`
- Get download URL from Firebase after upload

**Step 2: Submit Payment Request (Send URL Only)**

**API Endpoint:**
```
POST /api/payment-requests
Authorization: Bearer <tenant_token>
```

**Request Body:**
```json
{
  "rentalId": "rental_123",
  "amount": 500,
  "paymentMethod": "bank_transfer",
  "proofOfPayment": "https://firebasestorage.googleapis.com/.../receipt.pdf",
  "notes": "Rent payment for January 2025. Transaction ref: TXN789"
}
```

**⚠️ Important:** 
- `proofOfPayment` must be a **Firebase Storage URL** (string)
- Do NOT send the file itself - only the URL
- The backend expects a valid URL string, not a file upload

**Payment Method Options:**
- `"bank_transfer"` - Bank transfer
- `"cash"` - Cash payment
- `"mobile_money"` - Mobile money (Ecocash, OneMoney, etc.)
- `"other"` - Other payment method

**Response:**
```json
{
  "success": true,
  "message": "Payment request submitted successfully",
  "data": {
    "_id": "request_123",
    "amount": 500,
    "paymentMethod": "bank_transfer",
    "proofOfPayment": "https://firebasestorage.googleapis.com/.../receipt.pdf",
    "status": "pending_admin_approval",
    "submittedAt": "2025-01-15T10:30:00.000Z",
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Step 3: Show Pending Status**
- Display "Payment Request Submitted" message
- Show status: "Pending Admin Review"
- Explain that admin will review and approve/reject
- Show estimated review time (e.g., "Usually reviewed within 24 hours")

**Step 4: Check Payment Request Status**

Tenant can check the status of their payment request.

**API Endpoint:**
```
GET /api/payment-requests/:id
Authorization: Bearer <tenant_token>
```

**Response (Pending):**
```json
{
  "success": true,
  "data": {
    "_id": "request_123",
    "amount": 500,
    "status": "pending_admin_approval",
    "submittedAt": "2025-01-15T10:30:00.000Z",
    "proofOfPayment": "https://firebasestorage.googleapis.com/.../receipt.pdf"
  }
}
```

**Response (Approved):**
```json
{
  "success": true,
  "data": {
    "_id": "request_123",
    "amount": 500,
    "status": "processed",
    "submittedAt": "2025-01-15T10:30:00.000Z",
    "reviewedAt": "2025-01-15T14:00:00.000Z",
    "paymentId": "payment_456",
    "escrowTransactionId": "escrow_789"
  }
}
```

**Response (Rejected):**
```json
{
  "success": true,
  "data": {
    "_id": "request_123",
    "amount": 500,
    "status": "rejected",
    "submittedAt": "2025-01-15T10:30:00.000Z",
    "reviewedAt": "2025-01-15T14:00:00.000Z",
    "rejectionReason": "Receipt shows incorrect amount. Please resubmit with correct proof showing K500.",
    "reviewedBy": "admin_123"
  }
}
```

**Step 5: Handle Approval/Rejection**

**If Approved:**
- Show success message: "Payment approved! Funds added to escrow."
- Update payment status in UI
- Show payment record details
- Notify tenant (email already sent by backend)

**If Rejected:**
- Show rejection message with reason
- Allow tenant to resubmit with new proof
- Display rejection reason clearly
- Provide option to upload new proof

---

## Admin Review Flow (For Admin Dashboard)

### View Pending Payment Requests

**API Endpoint:**
```
GET /api/payment-requests/pending
Authorization: Bearer <admin_token>
```

**Query Parameters (Optional):**
- `startDate` - Filter from date
- `endDate` - Filter to date
- `tenantId` - Filter by tenant
- `landlordId` - Filter by landlord

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
      "amount": 500,
      "paymentMethod": "bank_transfer",
      "proofOfPayment": "https://firebasestorage.googleapis.com/.../receipt.pdf",
      "status": "pending_admin_approval",
      "submittedAt": "2025-01-15T10:30:00.000Z",
      "notes": "Rent payment for January 2025"
    }
  ]
}
```

### Approve Payment Request

**API Endpoint:**
```
POST /api/payment-requests/:id/approve
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{}
```

(No body required - approval is automatic)

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
      "escrowTransactionId": "escrow_789"
    },
    "payment": {
      "_id": "payment_456",
      "amount": 500,
      "status": "verified",
      "paymentMethod": "cash"
    },
    "escrowTransaction": {
      "_id": "escrow_789",
      "totalAmount": 500,
      "status": "held"
    }
  }
}
```

**What Happens:**
- ✅ Payment record created
- ✅ Payment added to escrow (status: "held")
- ✅ Email sent to tenant (payment approved)
- ✅ Email sent to landlord (rent deposited in escrow)
- ✅ Revenue sources created (subscription fees, processing fees, etc.)

### Reject Payment Request

**API Endpoint:**
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
    "reviewedAt": "2025-01-15T14:00:00.000Z"
  }
}
```

**What Happens:**
- ✅ Payment request status changed to "rejected"
- ✅ Rejection reason saved
- ✅ Email sent to tenant (payment rejected with reason)
- ✅ Tenant can resubmit with new proof

---

## UI Components to Build

### 1. Payment Method Selection Screen

**Location:** `/tenant/rentals/:rentalId/pay`

**Components:**
- Radio buttons for payment method selection
- "Pay Online" option with payment gateway integration
- "Pay via Deposit/External" option with file upload
- Amount display
- Continue button

### 2. Online Payment Screen

**Location:** `/tenant/rentals/:rentalId/pay/online`

**Components:**
- Payment gateway integration (Stripe, Paystack, etc.)
- Amount confirmation
- Payment form
- Processing indicator
- Success/error handling

### 3. External Payment Upload Screen

**Location:** `/tenant/rentals/:rentalId/pay/external`

**Components:**
- File upload component (PDF/image)
- Firebase upload integration (handles file upload to Firebase)
- Payment method selector (bank_transfer, cash, mobile_money, other)
- Amount input
- Notes field (optional)
- Submit button (sends URL to backend, not file)
- Upload progress indicator (for Firebase upload)
- URL display (show Firebase URL after upload)

**Implementation Flow:**
1. User selects file → Frontend validates file type/size
2. Frontend uploads to Firebase → Shows upload progress
3. Firebase returns URL → Frontend stores URL
4. User fills form → Payment method, amount, notes
5. User clicks Submit → Frontend sends URL (not file) to backend API

### 4. Payment Request Status Screen

**Location:** `/tenant/payments/requests/:id`

**Components:**
- Payment request details
- Status badge (Pending, Approved, Rejected)
- Proof of payment viewer (PDF/image)
- Approval/rejection details
- Rejection reason display (if rejected)
- Resubmit button (if rejected)

### 5. Admin Payment Review Screen

**Location:** `/admin/payments/requests`

**Components:**
- List of pending payment requests
- Payment request details card
- Proof of payment viewer
- Approve button
- Reject button (with reason input)
- Filter/search functionality

---

## Payment Status Flow

### Online Payment Status Flow

```
Pending → [Payment Gateway] → Verified → Escrow
```

**Statuses:**
- `pending` - Initial state (before gateway)
- `verified` - Payment successful, in escrow

### External Payment Status Flow

```
Pending Request → Admin Review → Approved → Escrow
                              ↓
                           Rejected → Resubmit
```

**Statuses:**
- `pending_admin_approval` - Waiting for admin review
- `approved` - Admin approved (temporary status)
- `processed` - Payment created, in escrow
- `rejected` - Admin rejected, needs resubmission

---

## Firebase Upload Implementation (Frontend Only)

### ⚠️ Important: Backend Does NOT Handle File Uploads

The backend **only accepts URLs**, not files. All file uploads must be handled by the frontend using Firebase Storage.

### Frontend File Upload Process

**Step 1: Validate File (Frontend)**
- Check file type: PDF, JPG, PNG
- Check file size: Max 5MB (recommended)
- Show error if invalid

**Step 2: Upload to Firebase (Frontend)**
- Use Firebase Storage SDK
- Upload to path: `payments/proofs/{tenantId}/{timestamp}_{filename}`
- Show upload progress to user
- Handle upload errors

**Step 3: Get Firebase URL (Frontend)**
- Firebase returns download URL after successful upload
- Store URL in component state
- Display URL to user (optional)

**Step 4: Send URL to Backend (Frontend)**
- Include Firebase URL in `proofOfPayment` field
- Send as string, not file
- Backend stores URL and uses it for admin review

### File Upload Requirements

**Accepted File Types:**
- PDF (`.pdf`)
- Images (`.jpg`, `.jpeg`, `.png`)

**File Size Limit:**
- Recommended: 5MB max
- Adjust based on your Firebase Storage rules

**Upload Path:**
```
payments/proofs/{tenantId}/{timestamp}_{filename}
```

**Example:**
```
payments/proofs/tenant_123/1705312200000_receipt.pdf
```

### Firebase Storage Rules

Make sure your Firebase Storage rules allow authenticated uploads:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /payments/proofs/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Example Frontend Upload Flow

```javascript
// 1. User selects file
const file = event.target.files[0];

// 2. Validate file
if (!file.type.match(/\.(pdf|jpg|jpeg|png)$/i)) {
  alert("Invalid file type");
  return;
}

// 3. Upload to Firebase
const storageRef = firebase.storage().ref();
const fileRef = storageRef.child(`payments/proofs/${userId}/${Date.now()}_${file.name}`);
const uploadTask = fileRef.put(file);

uploadTask.on('state_changed', 
  (progress) => {
    // Show upload progress
    const percent = (progress.bytesTransferred / progress.totalBytes) * 100;
    setUploadProgress(percent);
  },
  (error) => {
    // Handle upload error
    console.error("Upload error:", error);
  },
  async () => {
    // 4. Get download URL
    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
    
    // 5. Store URL in state
    setProofURL(downloadURL);
    
    // 6. Ready to submit to backend
  }
);
```

### Backend API Expects URL Only

When calling the backend API, send the URL as a string:

```javascript
// ✅ CORRECT - Send URL string
const response = await fetch('/api/payment-requests', {
  method: 'POST',
  body: JSON.stringify({
    rentalId: 'rental_123',
    amount: 500,
    paymentMethod: 'bank_transfer',
    proofOfPayment: downloadURL, // Firebase URL string
    notes: 'Rent payment'
  })
});

// ❌ WRONG - Don't send file
const response = await fetch('/api/payment-requests', {
  method: 'POST',
  body: formData // Don't do this!
});
```

---

## Error Handling

### Common Errors

**1. Missing Required Fields**
```json
{
  "success": false,
  "message": "Missing required fields: rentalId, amount, proofOfPayment, paymentMethod"
}
```

**2. Invalid Payment Amount**
```json
{
  "success": false,
  "message": "Invalid payment amount"
}
```

**3. Payment Already Verified**
```json
{
  "success": false,
  "message": "Payment already verified"
}
```

**4. Rejection Reason Required**
```json
{
  "success": false,
  "message": "Rejection reason is required"
}
```

**5. Payment Request Not Found**
```json
{
  "success": false,
  "message": "Payment request not found"
}
```

---

## Email Notifications

The backend automatically sends emails for:

1. **Payment Request Submitted** - Sent to tenant
2. **Payment Approved** - Sent to tenant and landlord
3. **Payment Rejected** - Sent to tenant (with reason)

No need to implement email sending on frontend - it's handled by the backend.

---

## Summary

### Online Payment Flow
1. Tenant selects "Pay Online"
2. Payment gateway processes payment
3. Frontend calls `POST /api/payments/rental/:rentalId/create` with `gatewayResponse`
4. Payment goes directly to escrow (verified)
5. Tenant sees confirmation

### External Payment Flow
1. Tenant selects "Pay via Deposit/External"
2. Tenant uploads proof to Firebase
3. Frontend calls `POST /api/payment-requests` with proof URL
4. Admin reviews payment request
5. Admin approves (`POST /api/payment-requests/:id/approve`) or rejects (`POST /api/payment-requests/:id/reject` with reason)
6. If approved, payment goes to escrow
7. Tenant and landlord are notified

### Key Points
- ✅ Online payments go directly to escrow (instant)
- ✅ External payments require admin approval
- ✅ Rejection requires a reason (mandatory)
- ✅ Proof must be uploaded to Firebase first
- ✅ All payments end up in escrow (when approved)
- ✅ Email notifications are automatic

---

## API Endpoints Summary

### Tenant Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/payments/rental/:rentalId/create` | Create online payment |
| `POST` | `/api/payment-requests` | Submit external payment request |
| `GET` | `/api/payment-requests/:id` | Get payment request status |

### Admin Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/payment-requests/pending` | Get pending payment requests |
| `POST` | `/api/payment-requests/:id/approve` | Approve payment request |
| `POST` | `/api/payment-requests/:id/reject` | Reject payment request (requires reason) |

---

## Next Steps for Frontend

1. ✅ Build payment method selection screen
2. ✅ Integrate payment gateway for online payments
3. ✅ Implement Firebase file upload for proof
4. ✅ Build external payment submission form
5. ✅ Create payment request status page
6. ✅ Build admin review dashboard
7. ✅ Add error handling and loading states
8. ✅ Implement real-time status updates (optional)

