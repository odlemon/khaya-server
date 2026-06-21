# 📄 Tenant Agreement Processing Fee Frontend Implementation Guide

## Overview

When a tenant signs a rental agreement, a **one-time Agreement Processing Fee** (USD 30–50) applies. By default the fee is **deferred to the first rent installment** — tenants sign without paying upfront.

The fee covers:
- Digital lease contract creation
- E-signature processing
- Agreement digitalization

The fee amount depends on the property value:
- **Low/Medium Value Properties**: USD 30–40
- **High Value Properties** (over USD 100,000): USD 50

**Default flow:** Sign → first rent payment = rent + insurance (if any) + agreement fee.

**Legacy optional flow:** Pay fee upfront via online (`POST /api/agreements/:id/pay-fee`) or external payment request before or after signing.

---

## Payment Flow

### Flow 1: Deferred Fee (Default — First Rent)

```
1. Landlord signs agreement
2. Tenant signs (no payment required; paymentStatus: "deferred")
3. Agreement status → "signed"; rental created
4. First scheduled rent payment includes agreement fee
5. Tenant pays first installment
6. agreement_fee revenue created; agreementFeeStatus → "charged"
```

### Flow 2: Online Upfront Payment (Legacy)

```
1. Tenant optionally pays fee before signing
2. POST /api/agreements/:id/pay-fee
3. agreementFeeStatus → "charged"; fee NOT added to first rent
4. Tenant signs; paymentStatus → "verified"
```

### Flow 3: External Payment (Deposit)

```
1. Tenant signs agreement
2. System calculates agreement fee based on property value
3. Tenant selects "Pay via Deposit/External"
4. Tenant uploads proof of payment (Firebase URL)
5. Frontend creates payment request
6. Payment request status: "pending_admin_approval"
7. Admin reviews proof of payment
8. Admin approves/rejects
9. If approved:
   - Agreement fee payment processed
   - Revenue source created (status: "collected")
   - Agreement status updated
   - Tenant notified
10. If rejected:
   - Payment request rejected
   - Tenant notified with reason
```

---

## API Endpoints

### 1. Pay Agreement Fee Online (Optional Upfront)

**Endpoint:**
```
POST /api/agreements/:agreementId/pay-fee
Authorization: Bearer <tenant_token>
```

**URL Parameters:**
- `agreementId` (required) - The agreement ID to pay fee for

**Request Body:**
```json
{
  "paymentMethod": "in_app",
  "gatewayResponse": {
    "provider": "paystack",
    "transactionId": "TXN123456",
    "transactionRef": "REF789012",
    "paidAt": "2025-01-15T10:30:00.000Z",
    "rawResponse": {
      "status": "success",
      "message": "Transaction successful"
    }
  },
  "notes": "Agreement processing fee"
}
```

**Field Descriptions:**
- `paymentMethod` (required) - Must be `"in_app"` for online payments
- `gatewayResponse` (required) - Payment gateway response after successful payment
- `notes` (optional) - Additional notes

**Response (Success):**
```json
{
  "success": true,
  "message": "Agreement fee paid successfully",
  "data": {
    "payment": {
      "_id": "payment_123",
      "agreementId": "agreement_123",
      "propertyId": "property_123",
      "landlordId": "landlord_123",
      "tenantId": "tenant_123",
      "paymentType": "service",
      "amount": 40,
      "totalAmount": 40,
      "paymentMethod": "in_app",
      "status": "verified",
      "verifiedAt": "2025-01-15T10:30:00.000Z",
      "receiptNumber": "REC-2025-001234",
      "notes": "Agreement processing fee",
      "createdAt": "2025-01-15T10:30:00.000Z"
    },
    "revenueSource": {
      "_id": "revenue_123",
      "sourceType": "agreement_fee",
      "amount": 40,
      "status": "collected",
      "payerId": "tenant_123",
      "recipientId": "khayalami"
    },
    "agreement": {
      "_id": "agreement_123",
      "status": "signed",
      "feePaid": true,
      "feePaidAt": "2025-01-15T10:30:00.000Z"
    }
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

### 2. Pay Agreement Fee via External Payment (Deposit)

**Endpoint:**
```
POST /api/payment-requests
Authorization: Bearer <tenant_token>
```

**Request Body:**
```json
{
  "agreementId": "agreement_123",
  "amount": 40,
  "paymentMethod": "bank_transfer",
  "proofOfPayment": "https://firebasestorage.googleapis.com/v0/b/.../receipt.jpg?alt=media&token=...",
  "requestType": "agreement_fee",
  "notes": "Agreement processing fee payment"
}
```

**Field Descriptions:**
- `agreementId` (required) - The agreement ID to pay fee for
- `amount` (required) - Agreement fee amount (USD 30-50)
- `paymentMethod` (required) - `"bank_transfer"`, `"cash"`, `"mobile_money"`, or `"other"`
- `proofOfPayment` (required) - **Firebase URL** (not file) - Frontend must upload file to Firebase first
- `requestType` (required) - Must be `"agreement_fee"`
- `notes` (optional) - Additional notes

**Response (Success):**
```json
{
  "success": true,
  "message": "Payment request submitted successfully",
  "data": {
    "paymentRequest": {
      "_id": "payment_request_123",
      "tenantId": "tenant_123",
      "agreementId": "agreement_123",
      "propertyId": "property_123",
      "landlordId": "landlord_123",
      "requestType": "agreement_fee",
      "amount": 40,
      "paymentMethod": "bank_transfer",
      "proofOfPayment": "https://firebasestorage.googleapis.com/...",
      "status": "pending_admin_approval",
      "submittedAt": "2025-01-15T10:30:00.000Z",
      "notes": "Agreement processing fee payment",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  }
}
```

**Important Notes:**
- Frontend must upload the proof of payment file to Firebase Storage first
- Backend only receives the Firebase URL, not the file itself
- Payment request status will be `"pending_admin_approval"` until admin reviews
- After admin approval, agreement fee payment is processed and agreement status is updated

---

### 3. Get Agreement Fee Amount

**⚠️ Note:** This endpoint needs to be implemented. Frontend can calculate fee based on property value using the same logic as backend.

**Endpoint (To Be Implemented):**
```
GET /api/agreements/:agreementId/fee-amount
Authorization: Bearer <tenant_token>
```

**Calculation Logic (Frontend can use this until endpoint is implemented):**
```javascript
// Calculate agreement fee based on property value
const calculateAgreementFee = (propertyValue) => {
  if (propertyValue > 100000) return 50;
  if (propertyValue > 50000) return 40;
  return 30;
};
```

**Expected Response (Once Implemented):**
```json
{
  "success": true,
  "data": {
    "feeAmount": 40,
    "propertyValue": 75000,
    "currency": "USD",
    "description": "Agreement processing fee (one-time)"
  }
}
```

---

### 4. Get Payment Request Status

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
    "agreementId": "agreement_123",
    "requestType": "agreement_fee",
    "amount": 40,
    "paymentMethod": "bank_transfer",
    "proofOfPayment": "https://firebasestorage.googleapis.com/...",
    "status": "pending_admin_approval",
    "submittedAt": "2025-01-15T10:30:00.000Z",
    "reviewedBy": null,
    "reviewedAt": null,
    "rejectionReason": null,
    "paymentId": null,
    "notes": "Agreement processing fee payment"
  }
}
```

**Status Values:**
- `pending_admin_approval` - Waiting for admin review
- `approved` - Admin approved, payment processed
- `rejected` - Admin rejected (check `rejectionReason`)
- `processed` - Payment processed and agreement updated

---

## Fee Calculation

The agreement processing fee is calculated based on property value:

| Property Value | Fee Amount |
|----------------|------------|
| **< USD 50,000** | USD 30 |
| **USD 50,000 - USD 100,000** | USD 40 |
| **> USD 100,000** | USD 50 |

**Calculation Logic:**
```javascript
// Backend calculation (PaymentCalculationService)
calculateAgreementFee(propertyValue) {
  if (propertyValue > 100000) return 50;
  if (propertyValue > 50000) return 40;
  return 30;
}
```

---

## Frontend Implementation Flow

### Flow 1: Online Payment

```
1. Tenant completes agreement signing
2. Frontend calls GET /api/agreements/:agreementId/fee-amount
3. Frontend displays fee amount to tenant
4. Tenant selects "Pay Online"
5. Frontend shows payment gateway integration
6. Tenant enters payment details (card, etc.)
7. Payment gateway processes payment
8. On success, frontend receives gateway response
9. Frontend calls POST /api/agreements/:agreementId/pay-fee
10. Backend:
    - Creates payment (status: "verified")
    - Creates revenue source (status: "collected")
    - Updates agreement (feePaid: true)
11. Frontend shows success message
12. Frontend updates agreement status
```

### Flow 2: External Payment

```
1. Tenant completes agreement signing
2. Frontend calls GET /api/agreements/:agreementId/fee-amount
3. Frontend displays fee amount to tenant
4. Tenant selects "Pay via Deposit/External"
5. Frontend shows file upload dialog
6. Tenant selects proof of payment file (PDF/image)
7. Frontend uploads file to Firebase Storage
8. Frontend gets Firebase URL
9. Frontend calls POST /api/payment-requests
10. Backend creates payment request (status: "pending_admin_approval")
11. Frontend shows "Payment request submitted" message
12. Frontend shows pending status
13. Admin reviews and approves/rejects
14. If approved:
    - Backend creates payment
    - Creates revenue source
    - Updates agreement (feePaid: true)
15. Frontend receives notification (via WebSocket or polling)
16. Frontend updates UI to show approved status
17. If rejected:
    - Frontend receives notification with rejection reason
    - Frontend shows rejection message
```

---

## UI Components to Build

### 1. Agreement Fee Payment Screen

```
┌─────────────────────────────────────┐
│ Agreement Processing Fee            │
├─────────────────────────────────────┤
│                                     │
│ Agreement: 1 Year Tenancy           │
│ Property: 2 Bedroom Apartment       │
│                                     │
│ Fee Amount: USD 40                 │
│ (One-time payment)                  │
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
│ [Cancel]                            │
└─────────────────────────────────────┘
```

### 2. Online Payment Screen

```
┌─────────────────────────────────────┐
│ Pay Agreement Fee - USD 40          │
├─────────────────────────────────────┤
│                                     │
│ Amount: USD 40                      │
│                                     │
│ Payment Gateway Integration         │
│ [Card Input Form]                   │
│                                     │
│ [Pay USD 40]                        │
│ [Back]                              │
└─────────────────────────────────────┘
```

### 3. External Payment Upload

```
┌─────────────────────────────────────┐
│ Pay via Deposit - USD 40           │
├─────────────────────────────────────┤
│                                     │
│ Amount: USD 40                      │
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
│ ✓ Fee Paid Successfully             │
├─────────────────────────────────────┤
│                                     │
│ Amount Paid: USD 40                 │
│ Receipt Number: REC-2025-001234     │
│                                     │
│ Payment Details:                    │
│ • Method: Online Payment           │
│ • Date: Jan 15, 2025 10:30 AM      │
│ • Status: Verified                 │
│                                     │
│ Agreement Status: Signed            │
│                                     │
│ [View Receipt]                      │
│ [Continue]                          │
└─────────────────────────────────────┘
```

### 5. Payment Request Pending

```
┌─────────────────────────────────────┐
│ Payment Request Submitted            │
├─────────────────────────────────────┤
│                                     │
│ Amount: USD 40                      │
│ Method: Bank Transfer               │
│                                     │
│ Status: ⏳ Pending Admin Approval    │
│                                     │
│ Submitted: Jan 15, 2025 10:30 AM   │
│                                     │
│ Your payment request is being       │
│ reviewed by admin. You will be      │
│ notified once approved.             │
│                                     │
│ [View Proof]                        │
│ [View Details]                      │
└─────────────────────────────────────┘
```

### 6. Payment Request Approved

```
┌─────────────────────────────────────┐
│ ✓ Fee Payment Approved               │
├─────────────────────────────────────┤
│                                     │
│ Amount: USD 40                      │
│ Receipt Number: REC-2025-001234     │
│                                     │
│ Payment Details:                    │
│ • Method: Bank Transfer             │
│ • Approved: Jan 15, 2025 11:00 AM  │
│ • Status: Verified                  │
│                                     │
│ Agreement Status: Signed            │
│                                     │
│ [View Receipt]                      │
│ [Continue]                          │
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
  const fileRef = storageRef.child(`agreement-fees/${Date.now()}_${file.name}`);
  
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
const response = await fetch('/api/payment-requests', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    agreementId: 'agreement_123',
    amount: 40,
    paymentMethod: 'bank_transfer',
    proofOfPayment: downloadURL, // Firebase URL, not file
    requestType: 'agreement_fee',
    notes: 'Agreement processing fee payment'
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

**3. Invalid Agreement:**
```json
{
  "success": false,
  "message": "Agreement not found"
}
```
**Frontend Action:** Show error and redirect to agreements list

**4. Fee Already Paid:**
```json
{
  "success": false,
  "message": "Agreement fee has already been paid"
}
```
**Frontend Action:** Show message and disable payment button

---

## Important Notes

1. **Firebase Upload Required**: Frontend must upload proof of payment files to Firebase Storage. Backend only receives the URL.

2. **One-Time Fee**: Agreement processing fee is paid only once per agreement. Check if fee is already paid before showing payment screen.

3. **Fee Calculation**: Fee amount is calculated based on property value. Frontend should fetch the fee amount from the backend before displaying.

4. **Agreement Status**: After fee is paid (online or approved external), agreement status should be updated to reflect that the fee has been paid.

5. **Payment Request Status**: External payment requests go through admin review:
   - `pending_admin_approval` → Waiting for review
   - `approved` → Payment processed, agreement updated
   - `rejected` → Payment not processed, tenant notified with reason

6. **Revenue Source**: Agreement fees are tracked as `"agreement_fee"` revenue source type, going to Khayalami.

---

## Integration with Agreement Signing Flow

The agreement fee payment should be integrated into the agreement signing workflow:

```
1. Tenant reviews agreement
2. Tenant signs agreement (e-signature)
3. System calculates agreement fee
4. Tenant pays agreement fee (online or external)
5. If online: Agreement status → "signed", feePaid → true
6. If external: Agreement status → "pending_fee", feePaid → false
7. After admin approval (external): Agreement status → "signed", feePaid → true
8. Agreement is complete
```

---

## Next Steps

1. **Build Agreement Fee Payment UI** - Show fee amount and payment options
2. **Integrate Payment Gateway** - For online payments
3. **Implement Firebase Upload** - For proof of payment
4. **Create Payment Request Flow** - For external payments
5. **Add Fee Status Display** - Show if fee is paid/pending
6. **Implement Status Updates** - Show pending/approved/rejected status
7. **Add Notifications** - Notify on approval/rejection

