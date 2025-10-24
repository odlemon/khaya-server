# 💰 Payment API Responses - Complete Guide

## 🎯 Overview

This guide shows **exactly** what the frontend receives from the payment APIs, including all status fields for cash transactions.

---

## 📊 Payment Status System

### **For CASH Payments:**
```
pending → paid (awaiting verification) → verified ✓
                    ↓
                 rejected → (can pay again)
```

### **For ONLINE Payments:**
```
pending → verified ✓ (instant, auto-verified)
```

---

## 🔌 API Response Examples

### **1. Get All Payments for a Rental**

**Endpoint:** `GET /api/rentals/:rentalId/payments`

**Full Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "671234567890abcdef123456",
      "rentalId": "671234567890abcdef123400",
      "agreementId": "671234567890abcdef123401",
      "propertyId": "671234567890abcdef123402",
      "landlordId": "671234567890abcdef123403",
      "tenantId": "671234567890abcdef123404",
      
      // Payment Details
      "receiptNumber": "REC-1698765432-123",
      "paymentType": "rent",
      "amount": 5000,
      "lateFee": 0,
      "daysLate": 0,
      "totalAmount": 5000,
      
      // Dates
      "dueDate": "2025-11-01T00:00:00.000Z",
      "paymentDate": "2025-11-05T14:30:00.000Z",
      "verifiedAt": null,
      
      // Payment Method & Proof
      "paymentMethod": "cash",
      "proofOfPayment": "https://firebasestorage.googleapis.com/.../receipt.jpg",
      
      // Status (IMPORTANT!)
      "status": "paid",  // ← Cash payment awaiting verification
      
      // Verification Details
      "verifiedBy": null,
      "verificationNotes": null,
      "rejectionReason": null,
      
      // Notes
      "notes": "Paid in person at landlord's office",
      
      // Timestamps
      "createdAt": "2025-10-25T10:00:00.000Z",
      "updatedAt": "2025-11-05T14:30:00.000Z"
    },
    {
      "_id": "671234567890abcdef123457",
      "rentalId": "671234567890abcdef123400",
      "agreementId": "671234567890abcdef123401",
      "propertyId": "671234567890abcdef123402",
      "landlordId": "671234567890abcdef123403",
      "tenantId": "671234567890abcdef123404",
      
      // Payment Details
      "receiptNumber": "REC-1698765433-456",
      "paymentType": "rent",
      "amount": 5000,
      "lateFee": 0,
      "daysLate": 0,
      "totalAmount": 5000,
      
      // Dates
      "dueDate": "2025-12-01T00:00:00.000Z",
      "paymentDate": "2025-12-02T09:15:00.000Z",
      "verifiedAt": "2025-12-02T09:15:00.000Z",
      
      // Payment Method
      "paymentMethod": "in_app",
      "proofOfPayment": null,
      
      // Gateway Response (Online Payment)
      "gatewayResponse": {
        "provider": "paystack",
        "transactionId": "TXN_1698765433789",
        "transactionRef": "PSK_abc123def456",
        "paidAt": "2025-12-02T09:15:00.000Z",
        "rawResponse": {}
      },
      
      // Status (IMPORTANT!)
      "status": "verified",  // ← Online payment, auto-verified
      
      // Verification Details
      "verifiedBy": null,  // Auto-verified, no manual verification
      "verificationNotes": null,
      "rejectionReason": null,
      
      // Notes
      "notes": "Paid online via card",
      
      // Timestamps
      "createdAt": "2025-11-25T10:00:00.000Z",
      "updatedAt": "2025-12-02T09:15:00.000Z"
    },
    {
      "_id": "671234567890abcdef123458",
      "rentalId": "671234567890abcdef123400",
      "agreementId": "671234567890abcdef123401",
      "propertyId": "671234567890abcdef123402",
      "landlordId": "671234567890abcdef123403",
      "tenantId": "671234567890abcdef123404",
      
      // Payment Details
      "receiptNumber": null,  // Not generated yet (not verified)
      "paymentType": "rent",
      "amount": 2000,
      "lateFee": 0,
      "daysLate": 0,
      "totalAmount": 2000,
      
      // Dates
      "dueDate": "2026-01-01T00:00:00.000Z",
      "paymentDate": null,  // Not paid yet
      "verifiedAt": null,
      
      // Payment Method
      "paymentMethod": null,  // Not paid yet
      "proofOfPayment": null,
      
      // Status (IMPORTANT!)
      "status": "pending",  // ← Not paid yet
      
      // Verification Details
      "verifiedBy": null,
      "verificationNotes": null,
      "rejectionReason": null,
      
      // Notes
      "notes": null,
      
      // Timestamps
      "createdAt": "2025-12-25T10:00:00.000Z",
      "updatedAt": "2025-12-25T10:00:00.000Z"
    },
    {
      "_id": "671234567890abcdef123459",
      "rentalId": "671234567890abcdef123400",
      "agreementId": "671234567890abcdef123401",
      "propertyId": "671234567890abcdef123402",
      "landlordId": "671234567890abcdef123403",
      "tenantId": "671234567890abcdef123404",
      
      // Payment Details
      "receiptNumber": "REC-1698765434-789",
      "paymentType": "rent",
      "amount": 5000,
      "lateFee": 0,
      "daysLate": 0,
      "totalAmount": 5000,
      
      // Dates
      "dueDate": "2025-10-01T00:00:00.000Z",
      "paymentDate": "2025-10-10T16:45:00.000Z",
      "verifiedAt": "2025-10-11T10:30:00.000Z",
      
      // Payment Method
      "paymentMethod": "cash",
      "proofOfPayment": "https://firebasestorage.googleapis.com/.../receipt2.jpg",
      
      // Status (IMPORTANT!)
      "status": "verified",  // ← Cash payment, landlord verified
      
      // Verification Details
      "verifiedBy": "671234567890abcdef123403",
      "verificationNotes": "Payment received and verified. Thank you!",
      "rejectionReason": null,
      
      // Notes
      "notes": "Paid in cash",
      
      // Timestamps
      "createdAt": "2025-09-25T10:00:00.000Z",
      "updatedAt": "2025-10-11T10:30:00.000Z"
    },
    {
      "_id": "671234567890abcdef123460",
      "rentalId": "671234567890abcdef123400",
      "agreementId": "671234567890abcdef123401",
      "propertyId": "671234567890abcdef123402",
      "landlordId": "671234567890abcdef123403",
      "tenantId": "671234567890abcdef123404",
      
      // Payment Details
      "receiptNumber": null,
      "paymentType": "rent",
      "amount": 3000,
      "lateFee": 250,  // Late fee calculated
      "daysLate": 5,
      "totalAmount": 3250,
      
      // Dates
      "dueDate": "2025-09-01T00:00:00.000Z",
      "paymentDate": "2025-09-10T12:00:00.000Z",
      "verifiedAt": null,
      
      // Payment Method
      "paymentMethod": "cash",
      "proofOfPayment": "https://firebasestorage.googleapis.com/.../receipt3.jpg",
      
      // Status (IMPORTANT!)
      "status": "rejected",  // ← Landlord rejected the payment
      
      // Verification Details
      "verifiedBy": null,
      "verificationNotes": null,
      "rejectionReason": "Receipt image is too blurry. Please upload a clearer photo.",
      
      // Notes
      "notes": "Paid late due to emergency",
      
      // Timestamps
      "createdAt": "2025-08-25T10:00:00.000Z",
      "updatedAt": "2025-09-11T14:20:00.000Z"
    }
  ]
}
```

---

## 📊 Payment Status Details

### **Status Field Values**

| Status | Description | Frontend Display | Action Available |
|--------|-------------|------------------|------------------|
| `pending` | Not paid yet | "Not Paid" | ✅ Can pay |
| `overdue` | Past due, not paid | "Overdue" | ✅ Can pay |
| `paid` | Cash payment awaiting verification | "Awaiting Verification" | ✅ Can pay again (make another payment) |
| `verified` | Landlord verified OR online auto-verified | "Paid ✓" | ✅ Can pay again (make another payment) |
| `rejected` | Landlord rejected cash payment | "Rejected" | ✅ Can pay again |

---

## 🔄 Multiple Payments - How It Works

### **Scenario: Tenant Makes Multiple Payments**

**Month 1 - First Payment (Cash):**
```json
POST /api/payments/payment_001/submit
{
  "amount": 2000,
  "paymentMethod": "cash"
}

Response:
{
  "success": true,
  "data": {
    "_id": "payment_001",
    "status": "paid",  // Awaiting verification
    "amount": 2000
  }
}
```

**Month 1 - Second Payment (While First is Pending):**
```json
POST /api/payments/payment_002/submit
{
  "amount": 3000,
  "paymentMethod": "in_app"
}

Response:
{
  "success": true,
  "data": {
    "_id": "payment_002",
    "status": "verified",  // Auto-verified (online)
    "amount": 3000
  }
}
```

**✅ Both payments exist!** No error, no restriction.

---

## 💻 Frontend Implementation

### **Payment List Component**

```vue
<template>
  <div class="payments-list">
    <div 
      v-for="payment in payments" 
      :key="payment._id"
      :class="['payment-card', payment.status]"
    >
      <!-- Payment Info -->
      <div class="payment-header">
        <h3>{{ formatPaymentTitle(payment) }}</h3>
        <span :class="['status-badge', payment.status]">
          {{ getStatusLabel(payment.status) }}
        </span>
      </div>
      
      <div class="payment-details">
        <div class="detail-row">
          <span>Amount:</span>
          <strong>{{ formatAmount(payment.amount) }}</strong>
        </div>
        
        <div class="detail-row">
          <span>Due Date:</span>
          <strong>{{ formatDate(payment.dueDate) }}</strong>
        </div>
        
        <!-- Payment Method (if paid) -->
        <div v-if="payment.paymentMethod" class="detail-row">
          <span>Method:</span>
          <strong>{{ payment.paymentMethod === 'cash' ? '💵 Cash' : '💳 Online' }}</strong>
        </div>
        
        <!-- Payment Date (if paid) -->
        <div v-if="payment.paymentDate" class="detail-row">
          <span>Paid On:</span>
          <strong>{{ formatDate(payment.paymentDate) }}</strong>
        </div>
        
        <!-- Verification Status (for cash) -->
        <div v-if="payment.paymentMethod === 'cash' && payment.status === 'paid'" class="verification-status">
          <span class="waiting-icon">⏳</span>
          <span>Awaiting landlord verification</span>
        </div>
        
        <!-- Verified Details -->
        <div v-if="payment.status === 'verified' && payment.verifiedBy" class="verification-status verified">
          <span class="check-icon">✓</span>
          <span>Verified by landlord</span>
          <p v-if="payment.verificationNotes" class="notes">
            "{{ payment.verificationNotes }}"
          </p>
        </div>
        
        <!-- Rejection Details -->
        <div v-if="payment.status === 'rejected'" class="rejection-status">
          <span class="error-icon">✗</span>
          <strong>Rejected</strong>
          <p class="rejection-reason">{{ payment.rejectionReason }}</p>
        </div>
        
        <!-- Receipt Number (if verified) -->
        <div v-if="payment.receiptNumber" class="detail-row">
          <span>Receipt #:</span>
          <strong>{{ payment.receiptNumber }}</strong>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="payment-actions">
        <!-- Always show "Make Payment" button -->
        <button 
          @click="openPaymentModal(payment)"
          class="btn-primary"
        >
          💰 Make Payment
        </button>
        
        <!-- View Details for paid/verified -->
        <button 
          v-if="payment.paymentDate"
          @click="viewPaymentDetails(payment)"
          class="btn-outline"
        >
          View Details
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const payments = ref([]);

const getStatusLabel = (status) => {
  const labels = {
    'pending': 'Not Paid',
    'overdue': 'Overdue',
    'paid': 'Awaiting Verification',
    'verified': 'Paid ✓',
    'rejected': 'Rejected'
  };
  return labels[status] || status;
};

const formatPaymentTitle = (payment) => {
  const date = new Date(payment.dueDate);
  const month = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  return `${payment.paymentType} - ${month}`;
};

const formatAmount = (amount) => `K${amount?.toLocaleString()}`;
const formatDate = (date) => new Date(date).toLocaleDateString();

onMounted(async () => {
  const response = await axios.get(
    `/api/rentals/${rentalId}/payments`,
    { headers: { Authorization: `Bearer ${token}` }}
  );
  
  payments.value = response.data.data;
  console.log('Payments loaded:', payments.value);
});
</script>

<style scoped>
.status-badge.pending {
  background: #2196F3;
  color: white;
}

.status-badge.paid {
  background: #FFC107;
  color: white;
}

.status-badge.verified {
  background: #4CAF50;
  color: white;
}

.status-badge.rejected {
  background: #f44336;
  color: white;
}

.verification-status {
  padding: 10px;
  background: #fff9c4;
  border-radius: 6px;
  margin-top: 10px;
}

.verification-status.verified {
  background: #c8e6c9;
}

.rejection-status {
  padding: 10px;
  background: #ffcdd2;
  border-radius: 6px;
  margin-top: 10px;
}

.rejection-reason {
  margin-top: 5px;
  font-style: italic;
  color: #c62828;
}
</style>
```

---

## 🎯 Key Changes Made

### **1. Removed Payment Restriction**

**Before:**
```typescript
if (payment.status === "verified" || payment.status === "paid") {
  throw new Error("Payment already completed");
}
```

**After:**
```typescript
if (payment.status === "verified") {
  throw new Error("Payment already verified");
}
// Allows paying again if status is "paid"
```

### **2. Payment Status Flow**

**Cash Payments:**
- Submit → `status: "paid"` (awaiting verification)
- Landlord verifies → `status: "verified"`
- Can make another payment at any time ✅

**Online Payments:**
- Submit → `status: "verified"` (auto-verified)
- Landlord gets money instantly
- Can make another payment at any time ✅

---

## 📋 Complete Response Fields Reference

```typescript
interface Payment {
  // IDs
  _id: string;
  rentalId: string;
  agreementId: string;
  propertyId: string;
  landlordId: string;
  tenantId: string;
  
  // Payment Info
  receiptNumber: string | null;
  paymentType: "rent" | "deposit" | "utility" | "service" | "other";
  amount: number;
  lateFee: number;
  daysLate: number;
  totalAmount: number;
  
  // Dates
  dueDate: string;
  paymentDate: string | null;
  verifiedAt: string | null;
  
  // Payment Method
  paymentMethod: "in_app" | "cash" | null;
  proofOfPayment: string | null;  // Firebase URL
  
  // Gateway (Online Payment)
  gatewayResponse: {
    provider: string;
    transactionId: string;
    transactionRef: string;
    paidAt: string;
    rawResponse: object;
  } | null;
  
  // Status (MOST IMPORTANT!)
  status: "pending" | "overdue" | "paid" | "verified" | "rejected";
  
  // Verification (Cash Payment)
  verifiedBy: string | null;
  verificationNotes: string | null;
  rejectionReason: string | null;
  
  // Notes
  notes: string | null;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

---

## ✅ Summary

1. **Multiple Payments Allowed** - Tenant can make as many payments as needed
2. **Cash Payments** - Have full verification workflow with status tracking
3. **Online Payments** - Auto-verified instantly, landlord gets money immediately
4. **Status Field** - Shows exact state of every payment
5. **Complete Data** - All verification details included in response

**Frontend can always show "Make Payment" button** - No restrictions! 🎉

---

**Last Updated:** October 19, 2025  
**Version:** 2.0 - Multiple Payments Allowed



