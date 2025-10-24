# 💰 Payment Status Guide - Frontend Implementation

## 🎯 Overview

Payments have different statuses, and the frontend must show appropriate actions for each status.

---

## 📊 Payment Statuses

| Status | Meaning | Tenant Action | Landlord Action |
|--------|---------|---------------|-----------------|
| **pending** | Not paid yet | ✅ Can pay | - |
| **overdue** | Past due date, not paid | ✅ Can pay | - |
| **paid** | Paid, awaiting verification | ❌ Cannot pay again | ✅ Can verify/reject |
| **verified** | Landlord confirmed | ❌ Already complete | - |
| **rejected** | Landlord rejected | ✅ Can pay again | - |
| **cancelled** | Payment cancelled | ❌ Cannot pay | - |

---

## ❌ The Error

```json
{
  "success": false,
  "message": "Payment already completed",
  "originalError": "Payment already completed"
}
```

**Cause:** Tenant tried to pay a payment that has status `"paid"` or `"verified"`

**Backend Validation:**
```typescript
if (payment.status === "verified" || payment.status === "paid") {
  throw new Error("Payment already completed");
}
```

---

## ✅ Frontend Fix

### **Show "Pay Now" Button ONLY for:**
- ✅ `status === "pending"`
- ✅ `status === "overdue"`
- ✅ `status === "rejected"`

### **Hide "Pay Now" Button for:**
- ❌ `status === "paid"` (awaiting verification)
- ❌ `status === "verified"` (already complete)
- ❌ `status === "cancelled"`

---

## 💻 Correct Implementation

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
      <div class="payment-info">
        <h3>{{ formatAmount(payment.amount) }}</h3>
        <p>Due: {{ formatDate(payment.dueDate) }}</p>
        <span :class="['status-badge', payment.status]">
          {{ formatStatus(payment.status) }}
        </span>
      </div>
      
      <!-- Actions Based on Status -->
      <div class="payment-actions">
        
        <!-- 1. PENDING/OVERDUE/REJECTED - Show Pay Button -->
        <button 
          v-if="canPay(payment)"
          @click="payNow(payment)"
          :class="['btn-primary', { urgent: payment.status === 'overdue' }]"
        >
          {{ payment.status === 'overdue' ? '⚠️ Pay Now (Overdue)' : '💰 Pay Now' }}
        </button>
        
        <!-- 2. PAID - Awaiting Verification -->
        <div v-else-if="payment.status === 'paid'" class="status-message waiting">
          ⏳ Awaiting landlord verification
          <button @click="viewPayment(payment)" class="btn-link">
            View Details
          </button>
        </div>
        
        <!-- 3. VERIFIED - Already Paid -->
        <div v-else-if="payment.status === 'verified'" class="status-message success">
          ✓ Paid on {{ formatDate(payment.paymentDate) }}
          <button @click="viewReceipt(payment)" class="btn-link">
            View Receipt
          </button>
        </div>
        
        <!-- 4. CANCELLED -->
        <div v-else-if="payment.status === 'cancelled'" class="status-message cancelled">
          Payment cancelled
        </div>
        
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const payments = ref([]);

// Helper: Check if payment can be paid
const canPay = (payment) => {
  return ['pending', 'overdue', 'rejected'].includes(payment.status);
};

const payNow = (payment) => {
  // Only allow if status is pending, overdue, or rejected
  if (!canPay(payment)) {
    alert('This payment has already been completed or is awaiting verification');
    return;
  }
  
  selectedPayment.value = payment;
  showPaymentModal.value = true;
};

const formatStatus = (status) => {
  const statusMap = {
    'pending': 'Pending',
    'overdue': 'Overdue',
    'paid': 'Awaiting Verification',
    'verified': 'Paid ✓',
    'rejected': 'Rejected - Resubmit',
    'cancelled': 'Cancelled'
  };
  return statusMap[status] || status;
};

const formatAmount = (amount) => `K${amount?.toLocaleString()}`;
const formatDate = (date) => new Date(date).toLocaleDateString();

onMounted(async () => {
  const response = await axios.get(
    `/api/rentals/${rentalId}/payments`,
    { headers: { Authorization: `Bearer ${token}` }}
  );
  payments.value = response.data.data;
});
</script>

<style scoped>
.payment-card {
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  background: white;
}

.payment-card.overdue {
  border-color: #f44336;
  background: #ffebee;
}

.payment-card.verified {
  border-color: #4CAF50;
  background: #f1f8f4;
}

.payment-card.paid {
  border-color: #FFC107;
  background: #fffbf0;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  margin-top: 8px;
}

.status-badge.pending {
  background: #2196F3;
  color: white;
}

.status-badge.overdue {
  background: #f44336;
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
  background: #FF5722;
  color: white;
}

.status-message {
  padding: 12px;
  border-radius: 6px;
  text-align: center;
}

.status-message.waiting {
  background: #fff9c4;
  color: #f57f17;
}

.status-message.success {
  background: #c8e6c9;
  color: #2e7d32;
}

.status-message.cancelled {
  background: #ffcdd2;
  color: #c62828;
}

.btn-primary {
  background: #4CAF50;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  width: 100%;
}

.btn-primary.urgent {
  background: #f44336;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.btn-link {
  background: none;
  border: none;
  color: #2196F3;
  cursor: pointer;
  text-decoration: underline;
  margin-top: 8px;
}
</style>
```

---

## 🎨 Visual Status Indicators

### **Pending Payment**
```
┌─────────────────────────────────────┐
│ K5,000                     [Pending]│
│ Due: Nov 1, 2025                    │
│                                     │
│ [💰 Pay Now]                        │
└─────────────────────────────────────┘
```

### **Overdue Payment**
```
┌─────────────────────────────────────┐
│ K5,000 + K250 Late      [⚠️ Overdue]│
│ Due: Oct 1, 2025                    │
│                                     │
│ [⚠️ Pay Now (Overdue)]              │
└─────────────────────────────────────┘
```

### **Paid (Awaiting Verification)**
```
┌─────────────────────────────────────┐
│ K5,000      [Awaiting Verification] │
│ Submitted: Nov 5, 2025              │
│                                     │
│ ⏳ Awaiting landlord verification   │
│ [View Details]                      │
└─────────────────────────────────────┘
```

### **Verified (Complete)**
```
┌─────────────────────────────────────┐
│ K5,000                      [Paid ✓]│
│ Paid: Nov 5, 2025                   │
│                                     │
│ ✓ Verified by landlord              │
│ [View Receipt]                      │
└─────────────────────────────────────┘
```

### **Rejected**
```
┌─────────────────────────────────────┐
│ K5,000          [Rejected - Resubmit│
│ Reason: Receipt unclear             │
│                                     │
│ [💰 Resubmit Payment]               │
└─────────────────────────────────────┘
```

---

## 🔍 Payment Details View

When user clicks "View Details" on a paid payment:

```vue
<template>
  <div class="payment-details-modal">
    <h2>Payment Details</h2>
    
    <div class="detail-section">
      <h3>Payment Information</h3>
      <div class="detail-row">
        <span>Amount:</span>
        <strong>{{ formatAmount(payment.amount) }}</strong>
      </div>
      <div class="detail-row">
        <span>Method:</span>
        <strong>{{ payment.paymentMethod === 'cash' ? 'Cash' : 'Online' }}</strong>
      </div>
      <div class="detail-row">
        <span>Submitted:</span>
        <strong>{{ formatDate(payment.paymentDate) }}</strong>
      </div>
      <div class="detail-row">
        <span>Status:</span>
        <span :class="['status', payment.status]">
          {{ formatStatus(payment.status) }}
        </span>
      </div>
    </div>
    
    <!-- Receipt if uploaded -->
    <div v-if="payment.proofOfPayment" class="detail-section">
      <h3>Receipt</h3>
      <img :src="payment.proofOfPayment" class="receipt-image" />
    </div>
    
    <!-- Notes -->
    <div v-if="payment.notes" class="detail-section">
      <h3>Notes</h3>
      <p>{{ payment.notes }}</p>
    </div>
    
    <!-- Verification info if verified -->
    <div v-if="payment.status === 'verified'" class="detail-section success">
      <h3>✓ Verified</h3>
      <div class="detail-row">
        <span>Verified on:</span>
        <strong>{{ formatDate(payment.verifiedAt) }}</strong>
      </div>
      <div v-if="payment.verificationNotes" class="detail-row">
        <span>Landlord Notes:</span>
        <p>{{ payment.verificationNotes }}</p>
      </div>
    </div>
    
    <!-- Rejection info if rejected -->
    <div v-if="payment.status === 'rejected'" class="detail-section error">
      <h3>✗ Payment Rejected</h3>
      <div class="detail-row">
        <span>Reason:</span>
        <p>{{ payment.rejectionReason }}</p>
      </div>
      <button @click="resubmit" class="btn-primary">
        Resubmit Payment
      </button>
    </div>
  </div>
</template>
```

---

## 🚫 Prevent Double Payment

### **Option 1: Disable Button**
```vue
<button 
  @click="payNow(payment)"
  :disabled="!canPay(payment)"
  class="btn-primary"
>
  Pay Now
</button>
```

### **Option 2: Don't Show Button**
```vue
<button 
  v-if="canPay(payment)"
  @click="payNow(payment)"
  class="btn-primary"
>
  Pay Now
</button>
```

### **Option 3: Show Different Message**
```vue
<div v-if="canPay(payment)">
  <button @click="payNow(payment)">Pay Now</button>
</div>
<div v-else-if="payment.status === 'paid'">
  ⏳ Awaiting verification
</div>
<div v-else-if="payment.status === 'verified'">
  ✓ Already paid
</div>
```

---

## 📋 Payment Filter/Tabs

Help users find payments by status:

```vue
<template>
  <div class="payments-page">
    <!-- Filter Tabs -->
    <div class="filter-tabs">
      <button 
        @click="filter = 'all'"
        :class="{ active: filter === 'all' }"
      >
        All ({{ payments.length }})
      </button>
      <button 
        @click="filter = 'pending'"
        :class="{ active: filter === 'pending' }"
      >
        Pending ({{ pendingCount }})
      </button>
      <button 
        @click="filter = 'paid'"
        :class="{ active: filter === 'paid' }"
      >
        Awaiting Verification ({{ paidCount }})
      </button>
      <button 
        @click="filter = 'verified'"
        :class="{ active: filter === 'verified' }"
      >
        Completed ({{ verifiedCount }})
      </button>
    </div>
    
    <!-- Filtered Payments -->
    <div class="payments-list">
      <div v-for="payment in filteredPayments" :key="payment._id">
        <!-- Payment card -->
      </div>
    </div>
  </div>
</template>

<script setup>
const filter = ref('all');

const filteredPayments = computed(() => {
  if (filter.value === 'all') return payments.value;
  if (filter.value === 'pending') {
    return payments.value.filter(p => ['pending', 'overdue'].includes(p.status));
  }
  return payments.value.filter(p => p.status === filter.value);
});

const pendingCount = computed(() => 
  payments.value.filter(p => ['pending', 'overdue'].includes(p.status)).length
);

const paidCount = computed(() => 
  payments.value.filter(p => p.status === 'paid').length
);

const verifiedCount = computed(() => 
  payments.value.filter(p => p.status === 'verified').length
);
</script>
```

---

## ✅ Complete Status Handling

```vue
<script setup>
// Helper function: Can this payment be paid?
const canPay = (payment) => {
  return ['pending', 'overdue', 'rejected'].includes(payment.status);
};

// Helper function: Is payment awaiting verification?
const isAwaiting = (payment) => {
  return payment.status === 'paid';
};

// Helper function: Is payment complete?
const isComplete = (payment) => {
  return payment.status === 'verified';
};

// Helper function: Is payment rejected?
const isRejected = (payment) => {
  return payment.status === 'rejected';
};

// Action: Pay now
const payNow = (payment) => {
  if (!canPay(payment)) {
    alert('This payment cannot be paid at this time');
    return;
  }
  
  selectedPayment.value = payment;
  showPaymentModal.value = true;
};

// Action: Resubmit rejected payment
const resubmit = (payment) => {
  if (payment.status !== 'rejected') {
    alert('Only rejected payments can be resubmitted');
    return;
  }
  
  selectedPayment.value = payment;
  showPaymentModal.value = true;
};
</script>
```

---

## 🎯 Key Takeaways

1. **Always check status** before showing "Pay Now" button
2. **Only allow payment** for: `pending`, `overdue`, `rejected`
3. **Show clear messages** for: `paid`, `verified`, `cancelled`
4. **Filter payments** by status to help users navigate
5. **Display appropriate actions** for each status

---

**Last Updated:** October 19, 2025  
**Version:** 1.0



