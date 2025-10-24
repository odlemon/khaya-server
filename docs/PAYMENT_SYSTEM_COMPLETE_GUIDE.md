# 💰 Payment System - Complete Guide

## 🎯 Overview

A comprehensive payment system with **2 payment methods**: **Online (In-App)** and **Cash**. The system features landlord balance accounts, withdrawal capabilities, and flexible payment amounts.

### **Key Features**
- ✅ **2 Payment Methods**: Online (in-app) and Cash
- ✅ **Flexible Amounts**: Users choose how much to pay
- ✅ **Optional Receipt**: Cash payments don't require receipt upload
- ✅ **Landlord Balance**: Track earnings, pending, and withdrawals
- ✅ **Auto-Verification**: Online payments verified instantly
- ✅ **Manual Verification**: Cash payments verified by landlord

---

## 📖 User Stories

### **Story 1: Tenant Pays with Online Payment**

**As a tenant**, I want to pay rent online through the app, so it's instant and verified automatically.

**Flow:**
1. Tenant sees pending payment (e.g., K5,000 rent due)
2. Clicks "Pay Now"
3. Enters amount to pay (can pay partial: K2,000 or full: K5,000)
4. Selects "Pay Online"
5. Completes payment via gateway (Stripe/Paystack/Flutterwave)
6. Payment auto-verified instantly
7. Landlord's balance credited immediately
8. Both parties receive confirmation

**Acceptance Criteria:**
- ✅ Can choose any amount up to total due
- ✅ Payment processed through gateway
- ✅ Auto-verification (no landlord action needed)
- ✅ Instant balance credit to landlord
- ✅ Transaction ID saved

---

### **Story 2: Tenant Pays with Cash**

**As a tenant**, I want to pay rent in cash, so I have flexibility in payment method.

**Flow:**
1. Tenant sees pending payment (e.g., K5,000 rent due)
2. Clicks "Pay Now"
3. Enters amount paid in cash (e.g., K5,000)
4. Selects "Cash Payment"
5. **Optional:** Uploads receipt photo
6. Submits payment
7. Status: "Paid" (pending landlord verification)
8. Landlord reviews and verifies
9. Status: "Verified"
10. Landlord's balance credited

**Acceptance Criteria:**
- ✅ Can choose any amount up to total due
- ✅ Receipt upload is **optional**
- ✅ Status shows "Paid" until verified
- ✅ Landlord can verify without receipt
- ✅ Balance updates after verification

---

### **Story 3: Tenant Makes Partial Payment**

**As a tenant**, I want to pay part of my rent now and the rest later.

**Example:**
- Rent due: K5,000
- Tenant pays K2,000 cash first
- Later pays K3,000 online
- Both payments tracked separately

**Acceptance Criteria:**
- ✅ Can pay any amount ≤ total due
- ✅ Multiple payments allowed
- ✅ Each payment tracked independently
- ✅ Total paid visible to both parties

---

### **Story 4: Landlord Verifies Cash Payment**

**As a landlord**, I want to verify cash payments from tenants, even without a receipt.

**Flow:**
1. Landlord sees notification of new payment
2. Opens payment details
   - Amount: K5,000
   - Method: Cash
   - Receipt: (may or may not be uploaded)
3. Clicks "Verify Payment"
4. Optionally adds notes: "Received in person"
5. Payment status: "Verified"
6. Amount credited to available balance

**Acceptance Criteria:**
- ✅ Can verify with or without receipt
- ✅ Can add verification notes
- ✅ Payment reflects in available balance
- ✅ Transaction history updated

---

### **Story 5: Landlord Views Balance**

**As a landlord**, I want to see my earnings and balance, so I know how much I can withdraw.

**Balance Dashboard Shows:**
- **Available Balance** - K45,000 (can withdraw)
- **Pending Balance** - K10,000 (awaiting verification)
- **Total Earnings** - K120,000 (lifetime)
- **Total Withdrawn** - K65,000 (lifetime)
- **Stats:**
  - 24 payments received
  - K100,000 total rent collected
  - K10,000 average monthly income

**Acceptance Criteria:**
- ✅ Real-time balance updates
- ✅ Clear separation of available vs pending
- ✅ Comprehensive transaction history
- ✅ Payment statistics

---

### **Story 6: Landlord Withdraws Earnings**

**As a landlord**, I want to withdraw my earnings to my bank or mobile money account.

**Flow:**
1. Landlord goes to "Balance" section
2. Clicks "Withdraw Funds"
3. First time: Sets up bank/mobile money details
4. Enters withdrawal amount (min: K100)
5. Selects method (Bank Transfer or Mobile Money)
6. Confirms withdrawal
7. Amount deducted from available balance
8. Withdrawal status: Pending
9. Admin processes withdrawal
10. Landlord receives funds

**Acceptance Criteria:**
- ✅ Minimum withdrawal: K100
- ✅ Cannot exceed available balance
- ✅ Must setup withdrawal details first
- ✅ Withdrawal history tracked
- ✅ Status updates (Pending → Completed)

---

## 🔌 API Endpoints

### **1. Submit Payment (Tenant)**

**Endpoint:** `POST /api/payments/:paymentId/submit`

**Role:** Tenant

**Description:** Tenant submits payment with chosen amount and method

**Request Body (Cash):**
```json
{
  "amount": 5000,
  "paymentMethod": "cash",
  "proofOfPayment": "https://firebase.../receipt.jpg",  // OPTIONAL
  "notes": "Paid in cash at landlord's office"
}
```

**Request Body (Cash - No Receipt):**
```json
{
  "amount": 5000,
  "paymentMethod": "cash",
  "notes": "Paid in cash, no receipt"
}
```

**Request Body (Online Payment):**
```json
{
  "amount": 5000,
  "paymentMethod": "in_app",
  "gatewayResponse": {
    "provider": "paystack",
    "transactionId": "TXN_123456789",
    "transactionRef": "PSK_abcdef123",
    "paidAt": "2025-11-01T14:30:00Z",
    "rawResponse": { ... }
  }
}
```

**Request Body (Partial Payment):**
```json
{
  "amount": 2000,  // Pay only K2,000 of K5,000 due
  "paymentMethod": "in_app"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment submitted successfully",
  "data": {
    "_id": "payment_id",
    "receiptNumber": "REC-1698765432-123",
    "status": "paid",  // or "verified" for in_app
    "paymentMethod": "cash",
    "amount": 5000,
    "totalAmount": 5000,
    "proofOfPayment": "https://...",  // or null
    "paymentDate": "2025-11-01T14:30:00Z"
  }
}
```

**Validation:**
- `amount` - Required, must be > 0
- `amount` - Cannot exceed total due
- `paymentMethod` - Required ("in_app" or "cash")
- `proofOfPayment` - Optional (for cash)

---

### **2. Verify Payment (Landlord)**

**Endpoint:** `POST /api/payments/:paymentId/verify`

**Role:** Landlord

**Description:** Landlord confirms payment received (with or without receipt)

**Request Body:**
```json
{
  "verificationNotes": "Payment received in person, verified."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "_id": "payment_id",
    "status": "verified",
    "verifiedAt": "2025-11-02T10:00:00Z",
    "verifiedBy": "landlord_id",
    "verificationNotes": "Payment received in person, verified."
  }
}
```

---

### **3. Reject Payment (Landlord)**

**Endpoint:** `POST /api/payments/:paymentId/reject`

**Role:** Landlord

**Description:** Landlord rejects payment (e.g., incorrect amount)

**Request Body:**
```json
{
  "rejectionReason": "Amount doesn't match what I received. Please resubmit."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment rejected",
  "data": {
    "_id": "payment_id",
    "status": "rejected",
    "rejectionReason": "Amount doesn't match what I received. Please resubmit."
  }
}
```

---

### **4. Get Landlord Balance**

**Endpoint:** `GET /api/payments/balance`

**Role:** Landlord

**Description:** Get current balance and stats

**Response:**
```json
{
  "success": true,
  "data": {
    "availableBalance": 45000,
    "pendingBalance": 10000,
    "totalEarnings": 120000,
    "totalWithdrawn": 65000,
    "bankDetails": {
      "accountName": "John Doe",
      "accountNumber": "1234567890",
      "bankName": "First National Bank",
      "branchCode": "250655"
    },
    "mobileMoneyDetails": {
      "provider": "MTN",
      "phoneNumber": "+260970123456",
      "accountName": "John Doe"
    },
    "stats": {
      "totalPaymentsReceived": 24,
      "totalRentCollected": 100000,
      "totalDepositsCollected": 20000,
      "averageMonthlyIncome": 10000
    },
    "transactions": [
      {
        "type": "credit",
        "amount": 5000,
        "description": "Payment from tenant - rent (REC-123)",
        "date": "2025-11-01T14:30:00Z",
        "balanceAfter": 45000
      }
    ]
  }
}
```

---

### **5. Update Bank Details (Landlord)**

**Endpoint:** `POST /api/payments/balance/bank-details`

**Role:** Landlord

**Request Body:**
```json
{
  "accountName": "John Doe",
  "accountNumber": "1234567890",
  "bankName": "First National Bank",
  "branchCode": "250655"
}
```

---

### **6. Update Mobile Money Details (Landlord)**

**Endpoint:** `POST /api/payments/balance/mobile-money`

**Role:** Landlord

**Request Body:**
```json
{
  "provider": "MTN",
  "phoneNumber": "+260970123456",
  "accountName": "John Doe"
}
```

**Providers:** `MTN`, `Airtel`, `Vodacom`, `other`

---

### **7. Request Withdrawal (Landlord)**

**Endpoint:** `POST /api/payments/withdrawals`

**Role:** Landlord

**Request Body:**
```json
{
  "amount": 10000,
  "withdrawalMethod": "bank_transfer"  // or "mobile_money"
}
```

**Validation:**
- Minimum: K100
- Cannot exceed available balance
- Must have setup bank/mobile money details

---

### **8. Get Withdrawal History (Landlord)**

**Endpoint:** `GET /api/payments/withdrawals`

**Role:** Landlord

---

### **9. Get Transaction History (Landlord)**

**Endpoint:** `GET /api/payments/transactions?limit=50`

**Role:** Landlord

**Query Params:**
- `limit` - Number of transactions (default: 50)

---

## 💻 Frontend Implementation

## 🔥 Firebase Upload (Frontend Only)

**Important:** Receipt uploads happen on the **frontend**, not the backend!

```vue
<script setup>
import { uploadToFirebase } from '@/utils/firebaseUpload';

const uploadReceipt = async (event) => {
  const file = event.target.files[0];
  uploading.value = true;
  
  try {
    // Frontend uploads to Firebase
    const url = await uploadToFirebase(file, 'payment-receipts');
    receiptUrl.value = url;  // Firebase URL
  } finally {
    uploading.value = false;
  }
};

// Backend only receives the URL
await axios.post(`/api/payments/${paymentId}/submit`, {
  amount: 5000,
  paymentMethod: 'cash',
  proofOfPayment: receiptUrl.value  // ← Firebase URL string
});
</script>
```

**Backend stores:**
- ✅ Firebase URL (string)
- ❌ NOT the actual file

---

### **Payment Modal (Tenant)**

```vue
<template>
  <div class="payment-modal">
    <h2>Pay Rent</h2>
    
    <div class="payment-info">
      <div class="info-row">
        <span>Total Due:</span>
        <strong>{{ formatAmount(payment.totalAmount) }}</strong>
      </div>
      <div v-if="payment.lateFee > 0" class="info-row warning">
        <span>Late Fee:</span>
        <strong>{{ formatAmount(payment.lateFee) }}</strong>
      </div>
    </div>
    
    <!-- Amount Input -->
    <div class="form-group">
      <label>Amount to Pay *</label>
      <input 
        type="number" 
        v-model="amount"
        :max="payment.totalAmount"
        :min="1"
        placeholder="Enter amount"
        class="amount-input"
      />
      <div class="amount-helper">
        <button @click="amount = payment.totalAmount" class="btn-link">
          Pay Full Amount ({{ formatAmount(payment.totalAmount) }})
        </button>
      </div>
    </div>
    
    <!-- Payment Method Selection -->
    <div class="payment-methods">
      <h3>Select Payment Method</h3>
      
      <div 
        @click="selectedMethod = 'in_app'"
        :class="['method-card', { active: selectedMethod === 'in_app' }]"
      >
        <div class="method-icon">💳</div>
        <div class="method-info">
          <strong>Pay Online</strong>
          <span>Card, Mobile Money • Instant verification</span>
        </div>
      </div>
      
      <div 
        @click="selectedMethod = 'cash'"
        :class="['method-card', { active: selectedMethod === 'cash' }]"
      >
        <div class="method-icon">💵</div>
        <div class="method-info">
          <strong>Cash Payment</strong>
          <span>Pay in person • Optional receipt</span>
        </div>
      </div>
    </div>
    
    <!-- Online Payment -->
    <div v-if="selectedMethod === 'in_app'" class="payment-section">
      <button 
        @click="processOnlinePayment" 
        :disabled="!amount || amount <= 0"
        class="btn-primary btn-large"
      >
        Pay {{ formatAmount(amount) }} Online
      </button>
      <p class="note">✓ Instant verification • Secure payment</p>
    </div>
    
    <!-- Cash Payment -->
    <div v-else-if="selectedMethod === 'cash'" class="payment-section">
      <div class="form-group">
        <label>Upload Receipt (Optional)</label>
        <input 
          type="file" 
          @change="uploadReceipt"
          accept="image/*,application/pdf"
        />
        <p class="helper-text">You can submit without a receipt</p>
        <p v-if="uploading" class="upload-status">Uploading...</p>
        <p v-if="receiptUrl" class="success">✓ Receipt uploaded</p>
      </div>
      
      <div class="form-group">
        <label>Notes (Optional)</label>
        <textarea 
          v-model="notes"
          placeholder="e.g., Paid in person, no receipt available"
          rows="3"
        ></textarea>
      </div>
      
      <button 
        @click="submitCashPayment" 
        :disabled="!amount || amount <= 0"
        class="btn-primary btn-large"
      >
        Submit Payment
      </button>
      <p class="note">⏳ Landlord will verify your payment</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { uploadToFirebase } from '@/utils/firebaseUpload';

const props = defineProps({
  payment: Object  // The payment record from rental
});

const emit = defineEmits(['success']);

const amount = ref(props.payment.totalAmount); // Default to full amount
const selectedMethod = ref('in_app');
const receiptUrl = ref('');
const notes = ref('');
const uploading = ref(false);

const uploadReceipt = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  uploading.value = true;
  try {
    const url = await uploadToFirebase(file, 'payment-receipts');
    receiptUrl.value = url;
  } catch (error) {
    alert('Failed to upload receipt');
  } finally {
    uploading.value = false;
  }
};

const submitCashPayment = async () => {
  try {
    const payload = {
      amount: amount.value,
      paymentMethod: 'cash',
      notes: notes.value
    };
    
    // Add receipt if uploaded (optional)
    if (receiptUrl.value) {
      payload.proofOfPayment = receiptUrl.value;
    }
    
    await axios.post(`/api/payments/${props.payment._id}/submit`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    emit('success');
    alert('Payment submitted! Waiting for landlord verification.');
  } catch (error) {
    alert(error.response?.data?.message || 'Failed to submit payment');
  }
};

const processOnlinePayment = async () => {
  // Future: Integrate with Stripe/Paystack/Flutterwave
  // For now, simulate successful payment
  
  try {
    await axios.post(`/api/payments/${props.payment._id}/submit`, {
      amount: amount.value,
      paymentMethod: 'in_app',
      gatewayResponse: {
        provider: 'paystack',
        transactionId: 'TXN_' + Date.now(),
        transactionRef: 'PSK_' + Math.random().toString(36).substr(2, 9),
        paidAt: new Date()
      }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    emit('success');
    alert('Payment successful!');
  } catch (error) {
    alert(error.response?.data?.message || 'Payment failed');
  }
};

const formatAmount = (amt) => `K${amt?.toLocaleString()}`;
</script>

<style scoped>
.payment-modal {
  max-width: 500px;
  margin: 0 auto;
}

.payment-info {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.amount-input {
  font-size: 24px;
  font-weight: bold;
  padding: 12px;
  text-align: center;
  border: 2px solid #ddd;
  border-radius: 8px;
}

.amount-helper {
  text-align: center;
  margin-top: 8px;
}

.payment-methods {
  margin: 20px 0;
}

.method-card {
  display: flex;
  align-items: center;
  padding: 15px;
  border: 2px solid #ddd;
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.method-card:hover {
  border-color: #4CAF50;
}

.method-card.active {
  border-color: #4CAF50;
  background: #f0f8f0;
}

.method-icon {
  font-size: 32px;
  margin-right: 15px;
}

.method-info {
  flex: 1;
}

.method-info strong {
  display: block;
  margin-bottom: 4px;
}

.method-info span {
  color: #666;
  font-size: 14px;
}

.btn-large {
  width: 100%;
  padding: 15px;
  font-size: 18px;
  font-weight: bold;
}

.note {
  text-align: center;
  color: #666;
  font-size: 14px;
  margin-top: 10px;
}

.helper-text {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}
</style>
```

---

### **Landlord: Verify Payment Modal**

```vue
<template>
  <div class="verify-modal">
    <h2>Verify Payment</h2>
    
    <div class="payment-details">
      <div class="detail-row">
        <span>Amount Paid:</span>
        <strong class="amount-large">{{ formatAmount(payment.amount) }}</strong>
      </div>
      <div class="detail-row">
        <span>Method:</span>
        <strong>{{ payment.paymentMethod === 'cash' ? 'Cash' : 'Online' }}</strong>
      </div>
      <div class="detail-row">
        <span>Submitted:</span>
        <strong>{{ formatDate(payment.paymentDate) }}</strong>
      </div>
    </div>
    
    <!-- Receipt (if provided) -->
    <div v-if="payment.proofOfPayment" class="receipt-section">
      <h3>Receipt</h3>
      <img 
        v-if="isImage(payment.proofOfPayment)" 
        :src="payment.proofOfPayment" 
        @click="viewFullImage"
        class="receipt-image"
      />
      <a 
        v-else 
        :href="payment.proofOfPayment" 
        target="_blank"
        class="receipt-link"
      >
        📄 View Receipt (PDF)
      </a>
    </div>
    
    <div v-else class="no-receipt">
      <p>ℹ️ No receipt uploaded</p>
      <p class="helper-text">Tenant chose not to upload a receipt</p>
    </div>
    
    <!-- Tenant Notes -->
    <div v-if="payment.notes" class="notes-section">
      <h4>Tenant Notes:</h4>
      <p>{{ payment.notes }}</p>
    </div>
    
    <!-- Verification -->
    <div class="verification-section">
      <label>Verification Notes (Optional)</label>
      <textarea 
        v-model="verificationNotes"
        placeholder="e.g., Payment verified, received in person"
        rows="3"
      ></textarea>
      
      <div class="actions">
        <button @click="verifyPayment" class="btn-success">
          ✓ Verify Payment
        </button>
        <button @click="showRejectModal = true" class="btn-danger">
          ✗ Reject Payment
        </button>
      </div>
    </div>
    
    <!-- Reject Modal -->
    <div v-if="showRejectModal" class="reject-modal-overlay" @click="showRejectModal = false">
      <div class="reject-modal" @click.stop>
        <h3>Reject Payment</h3>
        <textarea 
          v-model="rejectionReason"
          placeholder="Reason for rejection *"
          rows="4"
          required
        ></textarea>
        <div class="actions">
          <button @click="showRejectModal = false">Cancel</button>
          <button @click="rejectPayment" :disabled="!rejectionReason" class="btn-danger">
            Reject
          </button>
        </div>
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

const emit = defineEmits(['success']);

const verificationNotes = ref('');
const rejectionReason = ref('');
const showRejectModal = ref(false);

const verifyPayment = async () => {
  try {
    await axios.post(`/api/payments/${props.payment._id}/verify`, {
      verificationNotes: verificationNotes.value
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    emit('success');
    alert('Payment verified! Amount credited to your balance.');
  } catch (error) {
    alert('Failed to verify payment');
  }
};

const rejectPayment = async () => {
  try {
    await axios.post(`/api/payments/${props.payment._id}/reject`, {
      rejectionReason: rejectionReason.value
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    emit('success');
    showRejectModal.value = false;
    alert('Payment rejected. Tenant has been notified.');
  } catch (error) {
    alert('Failed to reject payment');
  }
};

const isImage = (url) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
const formatAmount = (amt) => `K${amt?.toLocaleString()}`;
const formatDate = (date) => new Date(date).toLocaleDateString();
</script>
```

---

## 📊 Payment Flow Diagrams

### **Online Payment Flow**

```
Tenant Initiates Payment
    ↓
Enters Amount (e.g., K5,000)
    ↓
Selects "Pay Online"
    ↓
Clicks "Pay K5,000 Online"
    ↓
Gateway Processes Payment
    ↓
Payment Auto-Verified ✓
    ↓
Landlord Balance Credited Immediately
    ↓
Both Parties Notified
```

### **Cash Payment Flow (With Receipt)**

```
Tenant Initiates Payment
    ↓
Enters Amount (e.g., K5,000)
    ↓
Selects "Cash Payment"
    ↓
Uploads Receipt Photo
    ↓
Adds Notes (optional)
    ↓
Submits Payment
    ↓
Status: "Paid" (pending verification)
    ↓
Landlord Reviews Receipt
    ↓
Landlord Verifies ✓
    ↓
Status: "Verified"
    ↓
Landlord Balance Credited
```

### **Cash Payment Flow (Without Receipt)**

```
Tenant Initiates Payment
    ↓
Enters Amount (e.g., K5,000)
    ↓
Selects "Cash Payment"
    ↓
Skips Receipt Upload
    ↓
Adds Note: "Paid in person, no receipt"
    ↓
Submits Payment
    ↓
Status: "Paid" (pending verification)
    ↓
Landlord Reviews (no receipt)
    ↓
Landlord Verifies ✓
    ↓
Status: "Verified"
    ↓
Landlord Balance Credited
```

---

## 💰 Multiple Payments Per Rental

**The system fully supports multiple payments for one rental!**

### **Example: Installment Payments**

```
Rent Due: K5,000

Payment 1 (Today):
POST /api/payments/:payment1Id/submit
{
  "amount": 2000,
  "paymentMethod": "cash"
}

Payment 2 (Next Week):
POST /api/payments/:payment2Id/submit
{
  "amount": 3000,
  "paymentMethod": "in_app"
}

Total Paid: K5,000 ✓
Number of Payments: 2
```

### **Example: Monthly Rent**

```
Same Rental, Different Months:

Month 1 (Nov): K5,000 verified ✓
Month 2 (Dec): K5,000 verified ✓
Month 3 (Jan): K5,000 paid ⏳

Total: 3 payments for 1 rental
```

### **Get All Payments for a Rental**

```
GET /api/rentals/:rentalId/payments

Response:
{
  "data": [
    { "_id": "pay1", "amount": 2000, "status": "verified" },
    { "_id": "pay2", "amount": 3000, "status": "verified" },
    { "_id": "pay3", "amount": 5000, "status": "paid" }
  ]
}
```

**Key Points:**
- ✅ No limit on number of payments
- ✅ Each payment tracked independently
- ✅ Each gets unique receipt number
- ✅ Can mix payment methods (cash + online)
- ✅ Can pay partial amounts

See `docs/MULTIPLE_PAYMENTS_GUIDE.md` for detailed examples and frontend code.

---

## ✅ Complete Endpoint Summary

| # | Method | Endpoint | Role | Description |
|---|--------|----------|------|-------------|
| 1 | POST | `/api/payments/:paymentId/submit` | Tenant | Submit payment (any amount) |
| 2 | POST | `/api/payments/:paymentId/verify` | Landlord | Verify payment |
| 3 | POST | `/api/payments/:paymentId/reject` | Landlord | Reject payment |
| 4 | GET | `/api/payments/balance` | Landlord | Get balance & stats |
| 5 | POST | `/api/payments/balance/bank-details` | Landlord | Update bank details |
| 6 | POST | `/api/payments/balance/mobile-money` | Landlord | Update mobile money |
| 7 | POST | `/api/payments/withdrawals` | Landlord | Request withdrawal |
| 8 | GET | `/api/payments/withdrawals` | Landlord | Get withdrawal history |
| 9 | GET | `/api/payments/transactions` | Landlord | Get transaction history |

---

## 🎯 Key Features Summary

### **Payment Methods (2 Only)**
1. **Online (in_app)** - Instant verification via gateway
2. **Cash** - Manual verification by landlord

### **Flexible Amounts**
- ✅ User chooses amount to pay
- ✅ Can pay partial amounts
- ✅ Can pay in multiple installments
- ✅ Cannot exceed total due

### **Optional Receipt**
- ✅ Cash payments don't require receipt
- ✅ Landlord can verify without receipt
- ✅ Receipt helps verification but isn't mandatory

### **Landlord Balance**
- ✅ Available balance (can withdraw)
- ✅ Pending balance (awaiting verification)
- ✅ Transaction history
- ✅ Withdrawal system

---

**Last Updated:** October 19, 2025  
**Version:** 2.0 - Simplified System (2 Methods, Flexible Amount, Optional Receipt)
