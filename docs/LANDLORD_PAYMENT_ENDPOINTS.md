# 🏠 Landlord Payment Management - Complete Guide

## 🎯 Overview

As a landlord, you can:
1. **View all transactions** for your rentals
2. **See payment details** (amount, proof, notes)
3. **Verify cash payments** (approve)
4. **Reject cash payments** (decline)
5. **View your balance** and transaction history

---

## 🔌 Landlord Endpoints

### **1. View All Payments for a Rental**

**Endpoint:** `GET /api/rentals/:rentalId/payments`

**Purpose:** See all payments (verified, pending verification, rejected) for a specific rental

**Request:**
```http
GET /api/rentals/rental_123/payments
Authorization: Bearer LANDLORD_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "payment_001",
      "amount": 12,
      "paymentMethod": "cash",
      "paymentDate": "2025-10-19T13:03:06.511Z",
      "status": "paid",
      "proofOfPayment": null,
      "notes": "First installment",
      "verifiedAt": null,
      "verifiedBy": null
    },
    {
      "_id": "payment_002",
      "amount": 40,
      "paymentMethod": "cash",
      "paymentDate": "2025-10-19T13:10:22.000Z",
      "status": "paid",
      "proofOfPayment": "https://firebase.../receipt.jpg",
      "notes": "Second installment",
      "verifiedAt": null,
      "verifiedBy": null
    },
    {
      "_id": "payment_003",
      "amount": 100,
      "paymentMethod": "in_app",
      "paymentDate": "2025-10-19T13:15:00.000Z",
      "status": "verified",
      "proofOfPayment": null,
      "notes": "Online payment",
      "verifiedAt": "2025-10-19T13:15:00.000Z",
      "receiptNumber": "REC-1729345200-789"
    }
  ]
}
```

**Filter by Status:**
```javascript
// In your frontend, filter by status
const pendingPayments = payments.filter(p => p.status === 'paid');
const verifiedPayments = payments.filter(p => p.status === 'verified');
const rejectedPayments = payments.filter(p => p.status === 'rejected');
```

---

### **2. Verify Payment (Approve)**

**Endpoint:** `POST /api/payments/:paymentId/verify`

**Purpose:** Confirm that you received the cash payment

**Request:**
```http
POST /api/payments/payment_001/verify
Authorization: Bearer LANDLORD_TOKEN
Content-Type: application/json

{
  "verificationNotes": "Payment received in person. Thank you!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "_id": "payment_001",
    "amount": 12,
    "status": "verified",
    "verifiedAt": "2025-10-19T14:30:00.000Z",
    "verifiedBy": "landlord_id_123",
    "verificationNotes": "Payment received in person. Thank you!",
    "receiptNumber": "REC-1729346200-123"
  }
}
```

**What Happens:**
- ✅ Status changes from `"paid"` → `"verified"`
- ✅ Receipt number generated
- ✅ Amount credited to your **available balance**
- ✅ Tenant notified of verification

---

### **3. Reject Payment (Decline)**

**Endpoint:** `POST /api/payments/:paymentId/reject`

**Purpose:** Reject a payment if proof is invalid or incorrect amount

**Request:**
```http
POST /api/payments/payment_002/reject
Authorization: Bearer LANDLORD_TOKEN
Content-Type: application/json

{
  "rejectionReason": "Receipt image is too blurry. Please upload a clearer photo."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment rejected",
  "data": {
    "_id": "payment_002",
    "amount": 40,
    "status": "rejected",
    "rejectionReason": "Receipt image is too blurry. Please upload a clearer photo.",
    "proofOfPayment": null
  }
}
```

**What Happens:**
- ✅ Status changes from `"paid"` → `"rejected"`
- ✅ Proof of payment cleared
- ✅ Tenant notified with rejection reason
- ✅ Tenant can make a new payment

---

### **4. View Your Balance**

**Endpoint:** `GET /api/payments/balance`

**Purpose:** See your earnings, available balance, pending balance, and transaction history

**Request:**
```http
GET /api/payments/balance
Authorization: Bearer LANDLORD_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "availableBalance": 100,
    "pendingBalance": 52,
    "totalEarnings": 152,
    "totalWithdrawn": 0,
    
    "bankDetails": {
      "accountName": "John Doe",
      "accountNumber": "1234567890",
      "bankName": "First National Bank"
    },
    
    "stats": {
      "totalPaymentsReceived": 3,
      "totalRentCollected": 152,
      "averageMonthlyIncome": 0
    },
    
    "transactions": [
      {
        "type": "credit",
        "amount": 100,
        "description": "Payment verified - rent (REC-1729345200-789)",
        "date": "2025-10-19T13:15:00.000Z",
        "balanceAfter": 100
      }
    ]
  }
}
```

**Balance Breakdown:**
- **Available Balance (K100):** Can withdraw anytime
- **Pending Balance (K52):** Cash payments awaiting verification (K12 + K40)
- **Total Earnings (K152):** Lifetime income

---

### **5. Get Transaction History**

**Endpoint:** `GET /api/payments/transactions?limit=50`

**Purpose:** View complete transaction history

**Request:**
```http
GET /api/payments/transactions?limit=50
Authorization: Bearer LANDLORD_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "credit",
      "amount": 100,
      "description": "Payment verified - rent (REC-1729345200-789)",
      "paymentId": "payment_003",
      "date": "2025-10-19T13:15:00.000Z",
      "balanceAfter": 100
    },
    {
      "type": "credit",
      "amount": 12,
      "description": "Payment verified - rent (REC-1729346200-123)",
      "paymentId": "payment_001",
      "date": "2025-10-19T14:30:00.000Z",
      "balanceAfter": 112
    }
  ]
}
```

---

## 💻 Frontend Implementation

### **Payment Management Dashboard**

```vue
<template>
  <div class="landlord-payments">
    <h1>Payment Management</h1>
    
    <!-- Balance Card -->
    <div class="balance-card">
      <div class="balance-item">
        <span>Available Balance</span>
        <strong>{{ formatAmount(balance.availableBalance) }}</strong>
      </div>
      <div class="balance-item pending">
        <span>Pending Verification</span>
        <strong>{{ formatAmount(balance.pendingBalance) }}</strong>
      </div>
      <div class="balance-item">
        <span>Total Earnings</span>
        <strong>{{ formatAmount(balance.totalEarnings) }}</strong>
      </div>
    </div>
    
    <!-- Filter Tabs -->
    <div class="filter-tabs">
      <button 
        @click="filter = 'all'"
        :class="{ active: filter === 'all' }"
      >
        All ({{ payments.length }})
      </button>
      <button 
        @click="filter = 'paid'"
        :class="{ active: filter === 'paid' }"
      >
        Pending Verification ({{ pendingCount }})
      </button>
      <button 
        @click="filter = 'verified'"
        :class="{ active: filter === 'verified' }"
      >
        Verified ({{ verifiedCount }})
      </button>
      <button 
        @click="filter = 'rejected'"
        :class="{ active: filter === 'rejected' }"
      >
        Rejected ({{ rejectedCount }})
      </button>
    </div>
    
    <!-- Payments List -->
    <div class="payments-list">
      <div 
        v-for="payment in filteredPayments" 
        :key="payment._id"
        :class="['payment-card', payment.status]"
      >
        <!-- Payment Header -->
        <div class="payment-header">
          <div class="payment-info">
            <h3>{{ formatAmount(payment.amount) }}</h3>
            <span :class="['status-badge', payment.status]">
              {{ getStatusLabel(payment.status) }}
            </span>
          </div>
          <div class="payment-date">
            {{ formatDate(payment.paymentDate) }}
          </div>
        </div>
        
        <!-- Payment Details -->
        <div class="payment-details">
          <div class="detail-row">
            <span>Method:</span>
            <strong>{{ payment.paymentMethod === 'cash' ? '💵 Cash' : '💳 Online' }}</strong>
          </div>
          
          <!-- Receipt (if uploaded) -->
          <div v-if="payment.proofOfPayment" class="detail-row">
            <span>Receipt:</span>
            <a :href="payment.proofOfPayment" target="_blank" class="view-receipt">
              📄 View Receipt
            </a>
          </div>
          
          <!-- Tenant Notes -->
          <div v-if="payment.notes" class="detail-row">
            <span>Tenant Notes:</span>
            <p>{{ payment.notes }}</p>
          </div>
          
          <!-- Verification Info (if verified) -->
          <div v-if="payment.status === 'verified'" class="verified-info">
            <span class="check-icon">✓</span>
            <span>Verified on {{ formatDate(payment.verifiedAt) }}</span>
            <p v-if="payment.verificationNotes">{{ payment.verificationNotes }}</p>
          </div>
          
          <!-- Rejection Info (if rejected) -->
          <div v-if="payment.status === 'rejected'" class="rejected-info">
            <span class="error-icon">✗</span>
            <strong>Rejection Reason:</strong>
            <p>{{ payment.rejectionReason }}</p>
          </div>
        </div>
        
        <!-- Actions (only for pending payments) -->
        <div v-if="payment.status === 'paid'" class="payment-actions">
          <button @click="verifyPayment(payment)" class="btn-success">
            ✓ Verify Payment
          </button>
          <button @click="showRejectModal(payment)" class="btn-danger">
            ✗ Reject Payment
          </button>
        </div>
      </div>
    </div>
    
    <!-- Reject Modal -->
    <RejectPaymentModal 
      v-if="rejectModalVisible"
      :payment="selectedPayment"
      @close="rejectModalVisible = false"
      @rejected="onPaymentRejected"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { useRoute } from 'vue-router';

const route = useRoute();
const rentalId = route.params.rentalId;

const payments = ref([]);
const balance = ref({});
const filter = ref('all');
const rejectModalVisible = ref(false);
const selectedPayment = ref(null);

// Computed
const pendingCount = computed(() => 
  payments.value.filter(p => p.status === 'paid').length
);

const verifiedCount = computed(() => 
  payments.value.filter(p => p.status === 'verified').length
);

const rejectedCount = computed(() => 
  payments.value.filter(p => p.status === 'rejected').length
);

const filteredPayments = computed(() => {
  if (filter.value === 'all') return payments.value;
  return payments.value.filter(p => p.status === filter.value);
});

// Methods
const loadPayments = async () => {
  try {
    const response = await axios.get(
      `/api/rentals/${rentalId}/payments`,
      { headers: { Authorization: `Bearer ${token}` }}
    );
    
    payments.value = response.data.data;
    console.log('Loaded payments:', payments.value);
  } catch (error) {
    console.error('Failed to load payments:', error);
  }
};

const loadBalance = async () => {
  try {
    const response = await axios.get(
      `/api/payments/balance`,
      { headers: { Authorization: `Bearer ${token}` }}
    );
    
    balance.value = response.data.data;
  } catch (error) {
    console.error('Failed to load balance:', error);
  }
};

const verifyPayment = async (payment) => {
  const notes = prompt('Verification notes (optional):');
  
  try {
    await axios.post(
      `/api/payments/${payment._id}/verify`,
      { verificationNotes: notes },
      { headers: { Authorization: `Bearer ${token}` }}
    );
    
    alert('Payment verified successfully!');
    await loadPayments();
    await loadBalance();
  } catch (error) {
    alert('Failed to verify payment');
  }
};

const showRejectModal = (payment) => {
  selectedPayment.value = payment;
  rejectModalVisible.value = true;
};

const onPaymentRejected = async () => {
  rejectModalVisible.value = false;
  await loadPayments();
  await loadBalance();
};

const getStatusLabel = (status) => {
  const labels = {
    'paid': '⏳ Pending Verification',
    'verified': '✓ Verified',
    'rejected': '✗ Rejected'
  };
  return labels[status] || status;
};

const formatAmount = (amount) => `K${amount?.toLocaleString()}`;
const formatDate = (date) => new Date(date).toLocaleDateString();

// Lifecycle
onMounted(() => {
  loadPayments();
  loadBalance();
});
</script>

<style scoped>
.balance-card {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

.balance-item {
  flex: 1;
  text-align: center;
}

.balance-item strong {
  display: block;
  font-size: 24px;
  margin-top: 8px;
}

.balance-item.pending strong {
  color: #FFC107;
}

.filter-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.filter-tabs button {
  padding: 10px 20px;
  border: 2px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
}

.filter-tabs button.active {
  border-color: #4CAF50;
  background: #f0f8f0;
}

.payment-card {
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  background: white;
}

.payment-card.paid {
  border-color: #FFC107;
  background: #fffbf0;
}

.payment-card.verified {
  border-color: #4CAF50;
  background: #f1f8f4;
}

.payment-card.rejected {
  border-color: #f44336;
  background: #ffebee;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
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

.payment-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.btn-success {
  flex: 1;
  padding: 12px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.btn-danger {
  flex: 1;
  padding: 12px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.verified-info {
  padding: 10px;
  background: #c8e6c9;
  border-radius: 6px;
  margin-top: 10px;
}

.rejected-info {
  padding: 10px;
  background: #ffcdd2;
  border-radius: 6px;
  margin-top: 10px;
}
</style>
```

---

### **Reject Payment Modal**

```vue
<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h2>Reject Payment</h2>
      
      <div class="payment-info">
        <p>Amount: <strong>{{ formatAmount(payment.amount) }}</strong></p>
        <p>Method: <strong>{{ payment.paymentMethod }}</strong></p>
      </div>
      
      <div class="form-group">
        <label>Rejection Reason *</label>
        <textarea 
          v-model="rejectionReason"
          rows="4"
          placeholder="e.g., Receipt image is unclear, wrong amount, etc."
          required
        ></textarea>
      </div>
      
      <div class="modal-actions">
        <button @click="$emit('close')" class="btn-secondary">
          Cancel
        </button>
        <button 
          @click="rejectPayment"
          :disabled="!rejectionReason"
          class="btn-danger"
        >
          Reject Payment
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const props = defineProps({
  payment: Object
});

const emit = defineEmits(['close', 'rejected']);

const rejectionReason = ref('');

const rejectPayment = async () => {
  try {
    await axios.post(
      `/api/payments/${props.payment._id}/reject`,
      { rejectionReason: rejectionReason.value },
      { headers: { Authorization: `Bearer ${token}` }}
    );
    
    emit('rejected');
    alert('Payment rejected. Tenant has been notified.');
  } catch (error) {
    alert('Failed to reject payment');
  }
};

const formatAmount = (amount) => `K${amount?.toLocaleString()}`;
</script>
```

---

## ✅ Complete Landlord Endpoint Summary

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | GET | `/api/rentals/:rentalId/payments` | View all payments for a rental |
| 2 | POST | `/api/payments/:paymentId/verify` | Verify/approve a cash payment |
| 3 | POST | `/api/payments/:paymentId/reject` | Reject/decline a cash payment |
| 4 | GET | `/api/payments/balance` | View your balance and stats |
| 5 | GET | `/api/payments/transactions` | View transaction history |

---

**Last Updated:** October 19, 2025  
**Version:** 1.0 - Complete Landlord Payment Management



