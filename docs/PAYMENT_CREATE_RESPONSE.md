# 💰 Payment Creation - Complete Response Examples

## 🔌 NEW Endpoint: Create Payment

**Endpoint:** `POST /api/payments/rental/:rentalId/create`

---

## 📊 Response Examples

### **Example 1: Cash Payment (K12)**

**Request:**
```http
POST /api/payments/rental/671234567890abcdef123400/create
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "amount": 12,
  "paymentMethod": "cash",
  "notes": "First installment"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment created successfully",
  "data": {
    "_id": "671234567890abcdef999001",
    "rentalId": "671234567890abcdef123400",
    "agreementId": "671234567890abcdef123401",
    "propertyId": "671234567890abcdef123402",
    "landlordId": "671234567890abcdef123403",
    "tenantId": "671234567890abcdef123404",
    
    "receiptNumber": null,
    "paymentType": "rent",
    "amount": 12,
    "lateFee": 0,
    "daysLate": 0,
    "totalAmount": 12,
    
    "dueDate": "2025-10-19T13:03:06.511Z",
    "paymentDate": "2025-10-19T13:03:06.511Z",
    "verifiedAt": null,
    
    "paymentMethod": "cash",
    "proofOfPayment": null,
    "gatewayResponse": null,
    "utilityReceipts": [],
    
    "status": "paid",
    
    "verifiedBy": null,
    "verificationNotes": null,
    "rejectionReason": null,
    
    "notes": "First installment",
    
    "createdAt": "2025-10-19T13:03:06.511Z",
    "updatedAt": "2025-10-19T13:03:06.511Z"
  }
}
```

---

### **Example 2: Second Cash Payment (K40)**

**Request:**
```http
POST /api/payments/rental/671234567890abcdef123400/create
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "amount": 40,
  "paymentMethod": "cash",
  "proofOfPayment": "https://firebasestorage.googleapis.com/.../receipt.jpg",
  "notes": "Second installment with receipt"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment created successfully",
  "data": {
    "_id": "671234567890abcdef999002",
    "rentalId": "671234567890abcdef123400",
    "agreementId": "671234567890abcdef123401",
    "propertyId": "671234567890abcdef123402",
    "landlordId": "671234567890abcdef123403",
    "tenantId": "671234567890abcdef123404",
    
    "receiptNumber": null,
    "paymentType": "rent",
    "amount": 40,
    "lateFee": 0,
    "daysLate": 0,
    "totalAmount": 40,
    
    "dueDate": "2025-10-19T13:10:22.000Z",
    "paymentDate": "2025-10-19T13:10:22.000Z",
    "verifiedAt": null,
    
    "paymentMethod": "cash",
    "proofOfPayment": "https://firebasestorage.googleapis.com/.../receipt.jpg",
    "gatewayResponse": null,
    "utilityReceipts": [],
    
    "status": "paid",
    
    "verifiedBy": null,
    "verificationNotes": null,
    "rejectionReason": null,
    
    "notes": "Second installment with receipt",
    
    "createdAt": "2025-10-19T13:10:22.000Z",
    "updatedAt": "2025-10-19T13:10:22.000Z"
  }
}
```

---

### **Example 3: Online Payment (K100)**

**Request:**
```http
POST /api/payments/rental/671234567890abcdef123400/create
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "amount": 100,
  "paymentMethod": "in_app",
  "gatewayResponse": {
    "provider": "paystack",
    "transactionId": "TXN_1698765432789",
    "transactionRef": "PSK_abc123def456",
    "paidAt": "2025-10-19T13:15:00.000Z",
    "rawResponse": {}
  },
  "notes": "Online payment via Paystack"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment created successfully",
  "data": {
    "_id": "671234567890abcdef999003",
    "rentalId": "671234567890abcdef123400",
    "agreementId": "671234567890abcdef123401",
    "propertyId": "671234567890abcdef123402",
    "landlordId": "671234567890abcdef123403",
    "tenantId": "671234567890abcdef123404",
    
    "receiptNumber": "REC-1729345200-789",
    "paymentType": "rent",
    "amount": 100,
    "lateFee": 0,
    "daysLate": 0,
    "totalAmount": 100,
    
    "dueDate": "2025-10-19T13:15:00.000Z",
    "paymentDate": "2025-10-19T13:15:00.000Z",
    "verifiedAt": "2025-10-19T13:15:00.000Z",
    
    "paymentMethod": "in_app",
    "proofOfPayment": null,
    "gatewayResponse": {
      "provider": "paystack",
      "transactionId": "TXN_1698765432789",
      "transactionRef": "PSK_abc123def456",
      "paidAt": "2025-10-19T13:15:00.000Z",
      "rawResponse": {}
    },
    "utilityReceipts": [],
    
    "status": "verified",
    
    "verifiedBy": null,
    "verificationNotes": null,
    "rejectionReason": null,
    
    "notes": "Online payment via Paystack",
    
    "createdAt": "2025-10-19T13:15:00.000Z",
    "updatedAt": "2025-10-19T13:15:00.000Z"
  }
}
```

---

### **Example 4: View All Payments (Complete Trail)**

**Request:**
```http
GET /api/rentals/671234567890abcdef123400/payments
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "671234567890abcdef999001",
      "rentalId": "671234567890abcdef123400",
      "agreementId": "671234567890abcdef123401",
      "propertyId": "671234567890abcdef123402",
      "landlordId": "671234567890abcdef123403",
      "tenantId": "671234567890abcdef123404",
      
      "receiptNumber": null,
      "paymentType": "rent",
      "amount": 12,
      "lateFee": 0,
      "daysLate": 0,
      "totalAmount": 12,
      
      "dueDate": "2025-10-19T13:03:06.511Z",
      "paymentDate": "2025-10-19T13:03:06.511Z",
      "verifiedAt": null,
      
      "paymentMethod": "cash",
      "proofOfPayment": null,
      "gatewayResponse": null,
      "utilityReceipts": [],
      
      "status": "paid",
      
      "verifiedBy": null,
      "verificationNotes": null,
      "rejectionReason": null,
      
      "notes": "First installment",
      
      "createdAt": "2025-10-19T13:03:06.511Z",
      "updatedAt": "2025-10-19T13:03:06.511Z"
    },
    {
      "_id": "671234567890abcdef999002",
      "rentalId": "671234567890abcdef123400",
      "agreementId": "671234567890abcdef123401",
      "propertyId": "671234567890abcdef123402",
      "landlordId": "671234567890abcdef123403",
      "tenantId": "671234567890abcdef123404",
      
      "receiptNumber": null,
      "paymentType": "rent",
      "amount": 40,
      "lateFee": 0,
      "daysLate": 0,
      "totalAmount": 40,
      
      "dueDate": "2025-10-19T13:10:22.000Z",
      "paymentDate": "2025-10-19T13:10:22.000Z",
      "verifiedAt": null,
      
      "paymentMethod": "cash",
      "proofOfPayment": "https://firebasestorage.googleapis.com/.../receipt.jpg",
      "gatewayResponse": null,
      "utilityReceipts": [],
      
      "status": "paid",
      
      "verifiedBy": null,
      "verificationNotes": null,
      "rejectionReason": null,
      
      "notes": "Second installment with receipt",
      
      "createdAt": "2025-10-19T13:10:22.000Z",
      "updatedAt": "2025-10-19T13:10:22.000Z"
    },
    {
      "_id": "671234567890abcdef999003",
      "rentalId": "671234567890abcdef123400",
      "agreementId": "671234567890abcdef123401",
      "propertyId": "671234567890abcdef123402",
      "landlordId": "671234567890abcdef123403",
      "tenantId": "671234567890abcdef123404",
      
      "receiptNumber": "REC-1729345200-789",
      "paymentType": "rent",
      "amount": 100,
      "lateFee": 0,
      "daysLate": 0,
      "totalAmount": 100,
      
      "dueDate": "2025-10-19T13:15:00.000Z",
      "paymentDate": "2025-10-19T13:15:00.000Z",
      "verifiedAt": "2025-10-19T13:15:00.000Z",
      
      "paymentMethod": "in_app",
      "proofOfPayment": null,
      "gatewayResponse": {
        "provider": "paystack",
        "transactionId": "TXN_1698765432789",
        "transactionRef": "PSK_abc123def456",
        "paidAt": "2025-10-19T13:15:00.000Z",
        "rawResponse": {}
      },
      "utilityReceipts": [],
      
      "status": "verified",
      
      "verifiedBy": null,
      "verificationNotes": null,
      "rejectionReason": null,
      
      "notes": "Online payment via Paystack",
      
      "createdAt": "2025-10-19T13:15:00.000Z",
      "updatedAt": "2025-10-19T13:15:00.000Z"
    }
  ]
}
```

**Summary:**
- ✅ Payment 1: K12 (cash, awaiting verification)
- ✅ Payment 2: K40 (cash, awaiting verification)
- ✅ Payment 3: K100 (online, verified)
- ✅ **Total: 3 separate payments showing complete trail!**

---

## 📋 Response Fields Explained

```typescript
{
  // Basic Info
  "_id": string,              // Unique payment ID
  "rentalId": string,         // Which rental this belongs to
  "agreementId": string,      // Associated agreement
  "propertyId": string,       // Associated property
  "landlordId": string,       // Landlord receiving payment
  "tenantId": string,         // Tenant making payment
  
  // Payment Details
  "receiptNumber": string | null,  // Generated after verification
  "paymentType": string,           // "rent", "deposit", etc.
  "amount": number,                // Amount paid
  "lateFee": number,               // Late fee (if any)
  "daysLate": number,              // Days late (if any)
  "totalAmount": number,           // amount + lateFee
  
  // Dates
  "dueDate": string,          // When it was due
  "paymentDate": string,      // When tenant paid
  "verifiedAt": string | null, // When landlord verified
  
  // Payment Method
  "paymentMethod": "cash" | "in_app",
  "proofOfPayment": string | null,     // Firebase URL (cash)
  "gatewayResponse": object | null,    // Gateway data (online)
  "utilityReceipts": array,            // Additional receipts
  
  // Status (IMPORTANT!)
  "status": "paid" | "verified",
  // "paid" = cash awaiting verification
  // "verified" = online (auto) or landlord verified cash
  
  // Verification Info (for cash)
  "verifiedBy": string | null,         // Landlord who verified
  "verificationNotes": string | null,  // Landlord's notes
  "rejectionReason": string | null,    // If rejected
  
  // Notes
  "notes": string | null,     // Tenant's notes
  
  // Timestamps
  "createdAt": string,        // When payment was created
  "updatedAt": string         // Last update
}
```

---

## 🎯 Key Points

### **For Cash Payments:**
```json
{
  "status": "paid",           // ← Awaiting verification
  "verifiedAt": null,         // ← Not verified yet
  "receiptNumber": null       // ← Generated after verification
}
```

### **For Online Payments:**
```json
{
  "status": "verified",       // ← Auto-verified instantly
  "verifiedAt": "2025-10-19T13:15:00.000Z",  // ← Verified now
  "receiptNumber": "REC-1729345200-789",     // ← Generated instantly
  "gatewayResponse": { ... }  // ← Gateway transaction data
}
```

---

## 💻 Frontend Usage

```typescript
// Create payment
const response = await axios.post(
  `/api/payments/rental/${rentalId}/create`,
  {
    amount: 12,
    paymentMethod: 'cash'
  }
);

// Response structure
const payment = response.data.data;

console.log(payment._id);           // "671234567890abcdef999001"
console.log(payment.amount);        // 12
console.log(payment.status);        // "paid"
console.log(payment.paymentMethod); // "cash"
console.log(payment.createdAt);     // "2025-10-19T13:03:06.511Z"

// Display to user
alert(`Payment of K${payment.amount} created successfully!`);
alert(`Status: ${payment.status}`);
if (payment.status === 'paid') {
  alert('Awaiting landlord verification');
} else if (payment.status === 'verified') {
  alert(`Receipt #: ${payment.receiptNumber}`);
}
```

---

**Last Updated:** October 19, 2025  
**Version:** 1.0



