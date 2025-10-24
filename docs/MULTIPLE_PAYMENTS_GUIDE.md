# 💰 Multiple Payments Per Rental - Guide

## 🎯 Overview

The system **fully supports multiple payments** for a single rental. Tenants can:
- Pay rent in **installments** (e.g., K2,000 today, K3,000 next week)
- Make **multiple rent payments** throughout the rental period
- Pay **different types** (rent, utilities, services)
- Use **different payment methods** for each payment

---

## ✅ How It Works

### **Database Structure**

Each payment is a **separate document** in the database:

```typescript
Payment {
  _id: "payment_001",
  rentalId: "rental_123",  // Multiple payments share same rental
  amount: 2000,
  paymentType: "rent",
  paymentMethod: "cash",
  status: "verified"
}

Payment {
  _id: "payment_002",
  rentalId: "rental_123",  // Same rental, different payment
  amount: 3000,
  paymentType: "rent",
  paymentMethod: "in_app",
  status: "verified"
}
```

**No restrictions** on number of payments per rental! ✅

---

## 📊 Example Scenarios

### **Scenario 1: Installment Payments**

**Situation:** Tenant owes K5,000 rent but can only pay K2,000 now.

**Payment 1 (Today):**
```json
POST /api/payments/:paymentId/submit
{
  "amount": 2000,
  "paymentMethod": "cash",
  "notes": "First installment"
}
```

**Payment 2 (Next Week):**
```json
POST /api/payments/:paymentId/submit
{
  "amount": 3000,
  "paymentMethod": "in_app"
}
```

**Result:**
- Total paid: K5,000 ✅
- 2 separate payment records
- Each tracked independently
- Each with own receipt number

---

### **Scenario 2: Monthly Rent Payments**

**Month 1 (November):**
```json
{
  "rentalId": "rental_123",
  "amount": 5000,
  "paymentType": "rent",
  "dueDate": "2025-11-01",
  "status": "verified"
}
```

**Month 2 (December):**
```json
{
  "rentalId": "rental_123",
  "amount": 5000,
  "paymentType": "rent",
  "dueDate": "2025-12-01",
  "status": "verified"
}
```

**Month 3 (January):**
```json
{
  "rentalId": "rental_123",
  "amount": 5000,
  "paymentType": "rent",
  "dueDate": "2026-01-01",
  "status": "paid"
}
```

Each month has **its own payment record**! ✅

---

### **Scenario 3: Different Payment Types**

**Same Rental, Multiple Payment Types:**

```json
// Rent payment
{
  "rentalId": "rental_123",
  "paymentType": "rent",
  "amount": 5000
}

// Utility payment
{
  "rentalId": "rental_123",
  "paymentType": "utility",
  "amount": 500
}

// Service payment
{
  "rentalId": "rental_123",
  "paymentType": "service",
  "amount": 1000
}
```

All payments tracked under **one rental**! ✅

---

## 💻 Frontend Implementation

### **Payment List (Tenant View)**

```vue
<template>
  <div class="payments-section">
    <h2>Payments for This Rental</h2>
    
    <!-- Summary -->
    <div class="payment-summary">
      <div class="stat">
        <span>Total Paid:</span>
        <strong>{{ formatAmount(totalPaid) }}</strong>
      </div>
      <div class="stat">
        <span>Total Due:</span>
        <strong>{{ formatAmount(totalDue) }}</strong>
      </div>
      <div class="stat">
        <span>Remaining:</span>
        <strong>{{ formatAmount(totalDue - totalPaid) }}</strong>
      </div>
    </div>
    
    <!-- Payment History -->
    <div class="payment-history">
      <h3>Payment History</h3>
      <div 
        v-for="payment in payments" 
        :key="payment._id"
        class="payment-item"
      >
        <div class="payment-header">
          <span class="receipt-number">{{ payment.receiptNumber }}</span>
          <span :class="['status', payment.status]">
            {{ formatStatus(payment.status) }}
          </span>
        </div>
        
        <div class="payment-details">
          <div class="detail">
            <span>Amount:</span>
            <strong>{{ formatAmount(payment.amount) }}</strong>
          </div>
          <div class="detail">
            <span>Method:</span>
            <strong>{{ formatMethod(payment.paymentMethod) }}</strong>
          </div>
          <div class="detail">
            <span>Date:</span>
            <strong>{{ formatDate(payment.paymentDate) }}</strong>
          </div>
        </div>
        
        <!-- Show receipt if uploaded -->
        <div v-if="payment.proofOfPayment" class="receipt-preview">
          <img :src="payment.proofOfPayment" @click="viewReceipt(payment)" />
        </div>
      </div>
    </div>
    
    <!-- Make Another Payment Button -->
    <button @click="makePayment" class="btn-primary">
      + Make Another Payment
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const props = defineProps({
  rentalId: String
});

const payments = ref([]);

const totalPaid = computed(() => {
  return payments.value
    .filter(p => p.status === 'verified')
    .reduce((sum, p) => sum + p.amount, 0);
});

const totalDue = computed(() => {
  // Get from rental schedule
  return 60000; // Example: 12 months × K5,000
});

onMounted(async () => {
  await fetchPayments();
});

const fetchPayments = async () => {
  const response = await axios.get(
    `/api/rentals/${props.rentalId}/payments`,
    { headers: { Authorization: `Bearer ${token}` }}
  );
  payments.value = response.data.data;
};

const makePayment = () => {
  // Open payment modal
  showPaymentModal.value = true;
};

const formatAmount = (amt) => `K${amt?.toLocaleString()}`;
const formatStatus = (status) => {
  const map = {
    'pending': 'Pending',
    'paid': 'Awaiting Verification',
    'verified': 'Verified ✓',
    'rejected': 'Rejected',
    'overdue': 'Overdue'
  };
  return map[status] || status;
};

const formatMethod = (method) => {
  return method === 'in_app' ? 'Online' : 'Cash';
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
</script>

<style scoped>
.payment-summary {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

.stat {
  flex: 1;
  text-align: center;
}

.payment-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
}

.payment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status.verified {
  background: #4CAF50;
  color: white;
}

.status.paid {
  background: #FFC107;
  color: white;
}

.status.pending {
  background: #2196F3;
  color: white;
}

.receipt-preview img {
  max-width: 150px;
  cursor: pointer;
  border-radius: 4px;
  margin-top: 10px;
}
</style>
```

---

### **Landlord View (Multiple Payments)**

```vue
<template>
  <div class="landlord-payments">
    <h2>All Payments for This Rental</h2>
    
    <!-- Filter -->
    <div class="filters">
      <button 
        v-for="filter in ['all', 'verified', 'paid', 'pending']"
        :key="filter"
        @click="selectedFilter = filter"
        :class="{ active: selectedFilter === filter }"
      >
        {{ capitalize(filter) }}
      </button>
    </div>
    
    <!-- Payments Requiring Action -->
    <div v-if="pendingPayments.length > 0" class="pending-section">
      <h3>⚠️ Payments Awaiting Verification ({{ pendingPayments.length }})</h3>
      <div 
        v-for="payment in pendingPayments" 
        :key="payment._id"
        class="payment-card pending"
      >
        <div class="payment-info">
          <strong>{{ formatAmount(payment.amount) }}</strong>
          <span>{{ payment.paymentMethod === 'cash' ? 'Cash' : 'Online' }}</span>
          <span>{{ formatDate(payment.paymentDate) }}</span>
        </div>
        <button @click="verifyPayment(payment)" class="btn-success">
          Verify
        </button>
      </div>
    </div>
    
    <!-- All Payments -->
    <div class="all-payments">
      <h3>Payment History</h3>
      <table class="payments-table">
        <thead>
          <tr>
            <th>Receipt #</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="payment in filteredPayments" 
            :key="payment._id"
          >
            <td>{{ payment.receiptNumber }}</td>
            <td>{{ formatAmount(payment.amount) }}</td>
            <td>{{ payment.paymentMethod === 'in_app' ? 'Online' : 'Cash' }}</td>
            <td>{{ formatDate(payment.paymentDate) }}</td>
            <td>
              <span :class="['badge', payment.status]">
                {{ formatStatus(payment.status) }}
              </span>
            </td>
            <td>
              <button 
                v-if="payment.status === 'paid'"
                @click="viewPayment(payment)"
                class="btn-sm"
              >
                Review
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Payment Summary Stats -->
    <div class="payment-stats">
      <div class="stat-card">
        <div class="stat-value">{{ verifiedPayments.length }}</div>
        <div class="stat-label">Verified Payments</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatAmount(totalReceived) }}</div>
        <div class="stat-label">Total Received</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatAmount(totalPending) }}</div>
        <div class="stat-label">Pending Verification</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const props = defineProps({
  rentalId: String
});

const payments = ref([]);
const selectedFilter = ref('all');

const pendingPayments = computed(() => {
  return payments.value.filter(p => p.status === 'paid');
});

const verifiedPayments = computed(() => {
  return payments.value.filter(p => p.status === 'verified');
});

const filteredPayments = computed(() => {
  if (selectedFilter.value === 'all') return payments.value;
  return payments.value.filter(p => p.status === selectedFilter.value);
});

const totalReceived = computed(() => {
  return verifiedPayments.value.reduce((sum, p) => sum + p.amount, 0);
});

const totalPending = computed(() => {
  return pendingPayments.value.reduce((sum, p) => sum + p.amount, 0);
});

onMounted(async () => {
  await fetchPayments();
});

const fetchPayments = async () => {
  const response = await axios.get(
    `/api/rentals/${props.rentalId}/payments`,
    { headers: { Authorization: `Bearer ${token}` }}
  );
  payments.value = response.data.data;
};

const verifyPayment = (payment) => {
  // Open verify modal
  showVerifyModal.value = true;
  selectedPayment.value = payment;
};
</script>
```

---

## 🔄 Payment Tracking Flow

### **Monthly Rent Example**

```
Month 1 (Nov):
  Payment #1: K5,000 (verified) ✓

Month 2 (Dec):
  Payment #2: K2,000 (verified) ✓
  Payment #3: K3,000 (verified) ✓  [Paid in 2 installments]

Month 3 (Jan):
  Payment #4: K5,000 (paid) ⏳  [Awaiting verification]

Total Payments: 4 payments for 1 rental
Total Verified: K10,000
Total Pending: K5,000
```

---

## 📊 API Usage

### **Get All Payments for a Rental**

```
GET /api/rentals/:rentalId/payments

Response:
{
  "success": true,
  "data": [
    {
      "_id": "payment_001",
      "amount": 5000,
      "paymentMethod": "cash",
      "status": "verified",
      "receiptNumber": "REC-001"
    },
    {
      "_id": "payment_002",
      "amount": 3000,
      "paymentMethod": "in_app",
      "status": "verified",
      "receiptNumber": "REC-002"
    },
    {
      "_id": "payment_003",
      "amount": 5000,
      "paymentMethod": "cash",
      "status": "paid",
      "receiptNumber": "REC-003"
    }
  ]
}
```

### **Submit New Payment (Any Number)**

```
POST /api/payments/:paymentId/submit

// Payment 1
{ "amount": 2000, "paymentMethod": "cash" }

// Payment 2 (same rental)
{ "amount": 3000, "paymentMethod": "in_app" }

// Payment 3 (same rental)
{ "amount": 1000, "paymentMethod": "cash" }

// No limit on number of payments! ✅
```

---

## ✅ Key Points

1. **No Limits:** Make as many payments as needed per rental
2. **Independent Tracking:** Each payment tracked separately
3. **Unique Receipt:** Each payment gets own receipt number
4. **Flexible Amounts:** Pay any amount, any number of times
5. **Mixed Methods:** Use online for one payment, cash for another
6. **Firebase Uploads:** Frontend handles all receipt uploads to Firebase
7. **URL Only:** Backend only stores Firebase URL, not the file

---

## 🎯 Summary

**Multiple Payments Per Rental:** ✅ **FULLY SUPPORTED**

- ✅ Tenant can pay in installments
- ✅ Each payment is separate record
- ✅ Each has own receipt/proof
- ✅ Each tracked independently
- ✅ No database constraints preventing multiple payments
- ✅ Frontend uploads receipts to Firebase
- ✅ Backend stores Firebase URLs only

**Everything is already set up correctly!** 🎉

---

**Last Updated:** October 19, 2025  
**Version:** 1.0



