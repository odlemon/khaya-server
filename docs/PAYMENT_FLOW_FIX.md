# 🔧 Payment Flow - Frontend Fix

## ❌ The Error

```json
{
  "success": false,
  "message": "Resource not found",
  "originalError": "Cast to ObjectId failed for value \"null\" (type string) at path \"_id\" for model \"Payment\""
}
```

**Cause:** Frontend is sending `paymentId: "null"` instead of the actual payment ID.

---

## ✅ How It Should Work

### **Step 1: Get Rental with Payments**

When viewing a rental, the backend returns all payments for that rental:

```
GET /api/rentals/:rentalId

Response:
{
  "success": true,
  "data": {
    "_id": "rental_123",
    "monthlyRent": 5000,
    ...
    // Payments are NOT included in rental object
  }
}
```

### **Step 2: Get Payments Separately**

```
GET /api/rentals/:rentalId/payments

Response:
{
  "success": true,
  "data": [
    {
      "_id": "payment_001",  // ← Use this ID!
      "rentalId": "rental_123",
      "amount": 5000,
      "dueDate": "2025-11-01",
      "status": "pending",
      "paymentType": "rent"
    },
    {
      "_id": "payment_002",
      "rentalId": "rental_123",
      "amount": 5000,
      "dueDate": "2025-12-01",
      "status": "pending",
      "paymentType": "rent"
    }
  ]
}
```

### **Step 3: Submit Payment with Correct ID**

```
POST /api/payments/payment_001/submit  // ← Use actual payment ID from Step 2

{
  "amount": 5000,
  "paymentMethod": "cash",
  "proofOfPayment": "https://..."
}
```

---

## 💻 Frontend Fix

### **Before (WRONG):**

```vue
<script setup>
// ❌ WRONG - Using null or hardcoded ID
const paymentId = ref(null);

const submitPayment = async () => {
  await axios.post(`/api/payments/${paymentId.value}/submit`, {
    amount: amount.value,
    paymentMethod: 'cash'
  });
};
</script>
```

### **After (CORRECT):**

```vue
<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const rentalId = ref('rental_123'); // from route params
const payments = ref([]);
const selectedPayment = ref(null);

// 1. Fetch all payments for this rental
onMounted(async () => {
  const response = await axios.get(
    `/api/rentals/${rentalId.value}/payments`,
    { headers: { Authorization: `Bearer ${token}` }}
  );
  payments.value = response.data.data;
});

// 2. Let user select which payment to pay
const selectPayment = (payment) => {
  selectedPayment.value = payment;
  showPaymentModal.value = true;
};

// 3. Submit with correct payment ID
const submitPayment = async () => {
  if (!selectedPayment.value) {
    alert('Please select a payment');
    return;
  }
  
  await axios.post(
    `/api/payments/${selectedPayment.value._id}/submit`,  // ✅ Correct ID
    {
      amount: amount.value,
      paymentMethod: paymentMethod.value,
      proofOfPayment: receiptUrl.value
    },
    { headers: { Authorization: `Bearer ${token}` }}
  );
};
</script>

<template>
  <div class="rental-payments">
    <!-- Show all payments -->
    <div 
      v-for="payment in payments" 
      :key="payment._id"
      class="payment-card"
    >
      <div class="payment-info">
        <strong>{{ formatAmount(payment.amount) }}</strong>
        <span>Due: {{ formatDate(payment.dueDate) }}</span>
        <span :class="payment.status">{{ payment.status }}</span>
      </div>
      
      <!-- Pay button only for pending/overdue -->
      <button 
        v-if="['pending', 'overdue'].includes(payment.status)"
        @click="selectPayment(payment)"
        class="btn-primary"
      >
        Pay Now
      </button>
    </div>
  </div>
</template>
```

---

## 🎯 Complete Payment Flow Example

### **Component: RentalPayments.vue**

```vue
<template>
  <div class="rental-payments-page">
    <h2>Payments</h2>
    
    <!-- Summary -->
    <div class="payment-summary">
      <div class="stat">
        <span>Total Due:</span>
        <strong>{{ formatAmount(totalDue) }}</strong>
      </div>
      <div class="stat">
        <span>Total Paid:</span>
        <strong>{{ formatAmount(totalPaid) }}</strong>
      </div>
      <div class="stat">
        <span>Outstanding:</span>
        <strong>{{ formatAmount(totalDue - totalPaid) }}</strong>
      </div>
    </div>
    
    <!-- Payments List -->
    <div class="payments-list">
      <div 
        v-for="payment in payments" 
        :key="payment._id"
        :class="['payment-card', payment.status]"
      >
        <!-- Payment Info -->
        <div class="payment-header">
          <div class="payment-details">
            <h3>{{ getPaymentTitle(payment) }}</h3>
            <p>Due: {{ formatDate(payment.dueDate) }}</p>
          </div>
          <div class="payment-amount">
            {{ formatAmount(payment.amount) }}
          </div>
        </div>
        
        <!-- Status Badge -->
        <div :class="['status-badge', payment.status]">
          {{ formatStatus(payment.status) }}
        </div>
        
        <!-- Actions -->
        <div class="payment-actions">
          <!-- Pending/Overdue - Show Pay Button -->
          <button 
            v-if="['pending', 'overdue'].includes(payment.status)"
            @click="openPaymentModal(payment)"
            class="btn-primary"
          >
            💰 Pay Now
          </button>
          
          <!-- Paid - Waiting for verification -->
          <div v-else-if="payment.status === 'paid'" class="waiting-verification">
            ⏳ Awaiting landlord verification
          </div>
          
          <!-- Verified - Show receipt -->
          <button 
            v-else-if="payment.status === 'verified'"
            @click="viewReceipt(payment)"
            class="btn-outline"
          >
            📄 View Receipt
          </button>
        </div>
      </div>
    </div>
    
    <!-- Payment Modal -->
    <PaymentModal 
      v-if="showPaymentModal"
      :payment="selectedPayment"
      :rentalId="rentalId"
      @close="closePaymentModal"
      @success="onPaymentSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { useRoute } from 'vue-router';

const route = useRoute();
const rentalId = ref(route.params.rentalId);

const payments = ref([]);
const showPaymentModal = ref(false);
const selectedPayment = ref(null);

// Computed
const totalDue = computed(() => {
  return payments.value.reduce((sum, p) => sum + p.amount, 0);
});

const totalPaid = computed(() => {
  return payments.value
    .filter(p => p.status === 'verified')
    .reduce((sum, p) => sum + p.amount, 0);
});

// Methods
const fetchPayments = async () => {
  try {
    const response = await axios.get(
      `/api/rentals/${rentalId.value}/payments`,
      { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
    );
    
    payments.value = response.data.data;
    console.log('Fetched payments:', payments.value);
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    alert('Failed to load payments');
  }
};

const openPaymentModal = (payment) => {
  console.log('Opening payment modal for:', payment._id);
  selectedPayment.value = payment;
  showPaymentModal.value = true;
};

const closePaymentModal = () => {
  showPaymentModal.value = false;
  selectedPayment.value = null;
};

const onPaymentSuccess = () => {
  closePaymentModal();
  fetchPayments(); // Refresh payments
  alert('Payment submitted successfully!');
};

const getPaymentTitle = (payment) => {
  const month = new Date(payment.dueDate).toLocaleString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });
  return `${payment.paymentType} - ${month}`;
};

const formatStatus = (status) => {
  const statusMap = {
    'pending': 'Pending',
    'paid': 'Awaiting Verification',
    'verified': 'Paid ✓',
    'overdue': 'Overdue',
    'rejected': 'Rejected'
  };
  return statusMap[status] || status;
};

const formatAmount = (amount) => `K${amount?.toLocaleString()}`;
const formatDate = (date) => new Date(date).toLocaleDateString();

// Lifecycle
onMounted(() => {
  fetchPayments();
});
</script>

<style scoped>
.rental-payments-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

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

.payments-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.payment-card {
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 20px;
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

.payment-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 15px;
}

.payment-amount {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.status-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 15px;
}

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

.status-badge.overdue {
  background: #f44336;
  color: white;
}

.btn-primary {
  background: #4CAF50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.btn-outline {
  background: white;
  color: #4CAF50;
  padding: 10px 20px;
  border: 2px solid #4CAF50;
  border-radius: 6px;
  cursor: pointer;
}

.waiting-verification {
  color: #FFC107;
  font-weight: bold;
}
</style>
```

---

### **Component: PaymentModal.vue**

```vue
<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h2>Pay {{ formatAmount(payment.amount) }}</h2>
      
      <p class="due-date">Due: {{ formatDate(payment.dueDate) }}</p>
      
      <!-- Amount Input -->
      <div class="form-group">
        <label>Amount to Pay *</label>
        <input 
          type="number" 
          v-model="amount"
          :max="payment.amount"
          :min="1"
          class="amount-input"
        />
        <button @click="amount = payment.amount" class="btn-link">
          Pay Full Amount
        </button>
      </div>
      
      <!-- Payment Method -->
      <div class="form-group">
        <label>Payment Method *</label>
        <div class="method-buttons">
          <button 
            @click="method = 'in_app'"
            :class="['method-btn', { active: method === 'in_app' }]"
          >
            💳 Online
          </button>
          <button 
            @click="method = 'cash'"
            :class="['method-btn', { active: method === 'cash' }]"
          >
            💵 Cash
          </button>
        </div>
      </div>
      
      <!-- Receipt Upload (Cash only) -->
      <div v-if="method === 'cash'" class="form-group">
        <label>Receipt (Optional)</label>
        <input type="file" @change="uploadReceipt" accept="image/*,application/pdf" />
        <p v-if="uploading" class="upload-status">Uploading...</p>
        <p v-if="receiptUrl" class="success">✓ Receipt uploaded</p>
      </div>
      
      <!-- Notes -->
      <div class="form-group">
        <label>Notes (Optional)</label>
        <textarea v-model="notes" rows="3"></textarea>
      </div>
      
      <!-- Submit -->
      <div class="modal-actions">
        <button @click="$emit('close')" class="btn-secondary">
          Cancel
        </button>
        <button 
          @click="submitPayment" 
          :disabled="!amount || amount <= 0 || submitting"
          class="btn-primary"
        >
          {{ submitting ? 'Processing...' : 'Submit Payment' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { uploadToFirebase } from '@/utils/firebaseUpload';

const props = defineProps({
  payment: Object,
  rentalId: String
});

const emit = defineEmits(['close', 'success']);

const amount = ref(props.payment.amount);
const method = ref('in_app');
const receiptUrl = ref('');
const notes = ref('');
const uploading = ref(false);
const submitting = ref(false);

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

const submitPayment = async () => {
  if (!amount.value || amount.value <= 0) {
    alert('Please enter a valid amount');
    return;
  }
  
  submitting.value = true;
  
  try {
    const payload = {
      amount: amount.value,
      paymentMethod: method.value,
      notes: notes.value
    };
    
    if (method.value === 'cash' && receiptUrl.value) {
      payload.proofOfPayment = receiptUrl.value;
    }
    
    if (method.value === 'in_app') {
      // Simulate gateway response (replace with actual gateway integration)
      payload.gatewayResponse = {
        provider: 'paystack',
        transactionId: 'TXN_' + Date.now(),
        transactionRef: 'PSK_' + Math.random().toString(36).substr(2, 9),
        paidAt: new Date()
      };
    }
    
    console.log('Submitting payment:', props.payment._id, payload);
    
    await axios.post(
      `/api/payments/${props.payment._id}/submit`,
      payload,
      { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
    );
    
    emit('success');
  } catch (error) {
    console.error('Payment submission error:', error);
    alert(error.response?.data?.message || 'Failed to submit payment');
  } finally {
    submitting.value = false;
  }
};

const formatAmount = (amt) => `K${amt?.toLocaleString()}`;
const formatDate = (date) => new Date(date).toLocaleDateString();
</script>
```

---

## ✅ Key Points

1. **Always fetch payments first:**
   ```javascript
   GET /api/rentals/:rentalId/payments
   ```

2. **Use the `_id` from the payment object:**
   ```javascript
   POST /api/payments/{payment._id}/submit  // ✅ Correct
   POST /api/payments/null/submit           // ❌ Wrong
   ```

3. **Each payment has a unique ID** generated when rental is created

4. **Payments are created automatically** - you don't create them, just submit payment against existing payment records

---

**Last Updated:** October 19, 2025  
**Fix Status:** ✅ Complete



