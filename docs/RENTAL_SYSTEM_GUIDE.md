# 🏠 Rental System - Complete Implementation Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Database Models](#database-models)
4. [API Endpoints](#api-endpoints)
5. [Frontend Implementation](#frontend-implementation)
6. [User Flows](#user-flows)
7. [Example Code](#example-code)

---

## 🎯 Overview

The **Rental System** is the central hub for managing active rentals after an agreement is signed. It automatically creates a rental workspace when both landlord and tenant sign the agreement, enabling:

✅ **Automatic Payment Tracking** - Monthly rent payments with proof uploads  
✅ **Condition Logs** - Move-in, periodic, and move-out video documentation  
✅ **Deposit Protection** - Video evidence protects both parties  
✅ **Transparent Dashboard** - Both parties see the same rental data  

---

## 🔄 How It Works

### **Automatic Rental Creation**

```
1. Landlord creates agreement
2. Tenant reviews & signs agreement
3. Landlord signs agreement
   ↓
🎉 RENTAL AUTO-CREATED
   ↓
4. Both parties see "My Rental" section
5. System creates:
   - 5 condition log placeholders
   - Monthly payment schedule
   - Rental dashboard
```

### **Rental Lifecycle**

```
ACTIVE → rental is live, tenant paying rent
SUSPENDED → rental paused (payment issues, etc.)
ENDED → rental terminated/expired
```

---

## 📊 Database Models

### **Rental Model**
```typescript
{
  _id: ObjectId,
  agreementId: ObjectId,
  propertyId: ObjectId,
  landlordId: ObjectId,
  tenantId: ObjectId,
  
  status: "active" | "suspended" | "ended",
  startDate: Date,
  endDate: Date,
  monthlyRent: number,
  depositAmount: number,
  
  nextPaymentDue: Date,
  
  stats: {
    totalPaymentsDue: number,
    paidPayments: number,
    overduePayments: number,
    conditionLogsUploaded: number,
    conditionLogsPending: number,
    maintenanceRequests: number,
    serviceBookings: number
  },
  
  moveInConfirmed: boolean,
  moveInConfirmedAt: Date,
  
  createdAt: Date,
  updatedAt: Date
}
```

### **ConditionLog Model**
```typescript
{
  _id: ObjectId,
  rentalId: ObjectId,
  agreementId: ObjectId,
  propertyId: ObjectId,
  tenantId: ObjectId,
  
  logType: "move-in" | "month-3" | "month-6" | "month-9" | "move-out",
  
  videoUrls: string[],
  photoUrls: string[],
  notes: string,
  
  uploadedBy: "tenant" | "landlord",
  uploadedAt: Date,
  
  dueDate: Date,
  status: "pending" | "uploaded" | "overdue",
  
  createdAt: Date,
  updatedAt: Date
}
```

### **Payment Model**
```typescript
{
  _id: ObjectId,
  rentalId: ObjectId,
  agreementId: ObjectId,
  propertyId: ObjectId,
  landlordId: ObjectId,
  tenantId: ObjectId,
  
  paymentType: "rent" | "deposit" | "utility" | "service" | "other",
  amount: number,
  
  dueDate: Date,
  paymentDate: Date,
  
  paymentMethod: "bank_transfer" | "card" | "cash" | "mobile_money" | "other",
  proofOfPayment: string, // Firebase URL
  
  utilityReceipts: [{
    type: string, // electricity, water, gas
    amount: number,
    receiptUrl: string
  }],
  
  status: "pending" | "paid" | "overdue" | "disputed" | "cancelled",
  
  notes: string,
  
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔌 API Endpoints

### **1. Get User's Rentals**

**Endpoint:** `GET /api/rentals`

**Description:** Get all rentals for the authenticated user (landlord or tenant)

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "rental_id",
      "status": "active",
      "propertyId": {
        "title": "Modern 2BR Apartment",
        "address": {
          "street": "123 Main St",
          "city": "Harare"
        },
        "images": {
          "mainImage": "https://..."
        }
      },
      "landlordId": {
        "firstName": "John",
        "lastName": "Smith",
        "email": "john@example.com"
      },
      "tenantId": {
        "firstName": "Jane",
        "lastName": "Doe",
        "email": "jane@example.com"
      },
      "startDate": "2025-11-01T00:00:00.000Z",
      "endDate": "2026-10-31T00:00:00.000Z",
      "monthlyRent": 1500,
      "nextPaymentDue": "2026-01-01T00:00:00.000Z",
      "stats": {
        "totalPaymentsDue": 12,
        "paidPayments": 3,
        "overduePayments": 0,
        "conditionLogsUploaded": 1,
        "conditionLogsPending": 4
      },
      "moveInConfirmed": true,
      "createdAt": "2025-10-18T12:00:00.000Z"
    }
  ]
}
```

---

### **2. Get Rental Dashboard**

**Endpoint:** `GET /api/rentals/:id`

**Description:** Get detailed rental dashboard with payments and condition logs

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "rental": {
      "_id": "rental_id",
      "status": "active",
      "propertyId": { /* property details */ },
      "landlordId": { /* landlord details */ },
      "tenantId": { /* tenant details */ },
      "startDate": "2025-11-01T00:00:00.000Z",
      "endDate": "2026-10-31T00:00:00.000Z",
      "monthlyRent": 1500,
      "stats": { /* stats */ },
      "moveInConfirmed": true
    },
    "payments": [
      {
        "_id": "payment_id",
        "paymentType": "rent",
        "amount": 1500,
        "dueDate": "2026-01-01T00:00:00.000Z",
        "paymentDate": "2025-12-30T00:00:00.000Z",
        "status": "paid",
        "proofOfPayment": "https://firebase.../receipt.pdf",
        "paymentMethod": "bank_transfer"
      },
      {
        "_id": "payment_id_2",
        "paymentType": "rent",
        "amount": 1500,
        "dueDate": "2026-02-01T00:00:00.000Z",
        "status": "pending"
      }
    ],
    "conditionLogs": [
      {
        "_id": "log_id",
        "logType": "move-in",
        "dueDate": "2025-11-01T00:00:00.000Z",
        "status": "uploaded",
        "videoUrls": ["https://firebase.../video1.mp4"],
        "photoUrls": ["https://firebase.../photo1.jpg"],
        "uploadedAt": "2025-11-01T10:00:00.000Z",
        "notes": "Everything looks good"
      },
      {
        "_id": "log_id_2",
        "logType": "month-3",
        "dueDate": "2026-02-01T00:00:00.000Z",
        "status": "pending"
      }
    ],
    "nextAction": {
      "type": "payment_due_soon",
      "message": "Rent due in 3 days",
      "dueDate": "2026-02-01T00:00:00.000Z"
    }
  }
}
```

---

### **3. Upload Condition Log**

**Endpoint:** `POST /api/rentals/condition-logs/:conditionLogId/upload`

**Description:** Tenant uploads videos/photos for a condition log

**Authentication:** Required (Tenant only)

**Request Body:**
```json
{
  "videoUrls": [
    "https://firebasestorage.googleapis.com/.../bedroom.mp4",
    "https://firebasestorage.googleapis.com/.../kitchen.mp4"
  ],
  "photoUrls": [
    "https://firebasestorage.googleapis.com/.../photo1.jpg",
    "https://firebasestorage.googleapis.com/.../photo2.jpg"
  ],
  "notes": "All rooms in good condition. Minor scratch on kitchen cabinet."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Condition log uploaded successfully",
  "data": {
    "_id": "log_id",
    "logType": "move-in",
    "status": "uploaded",
    "videoUrls": ["https://..."],
    "photoUrls": ["https://..."],
    "uploadedBy": "tenant",
    "uploadedAt": "2025-11-01T10:00:00.000Z"
  }
}
```

**Note:** Videos and photos must be uploaded to Firebase Storage first, then URLs passed to this endpoint.

---

### **4. Submit Payment Proof**

**Endpoint:** `POST /api/rentals/payments/:paymentId/submit`

**Description:** Tenant submits proof of rent payment

**Authentication:** Required (Tenant only)

**Request Body:**
```json
{
  "proofOfPayment": "https://firebasestorage.googleapis.com/.../receipt.pdf",
  "paymentMethod": "bank_transfer",
  "paymentDate": "2025-12-30T00:00:00.000Z",
  "utilityReceipts": [
    {
      "type": "electricity",
      "amount": 50,
      "receiptUrl": "https://firebasestorage.googleapis.com/.../electricity.pdf"
    },
    {
      "type": "water",
      "amount": 30,
      "receiptUrl": "https://firebasestorage.googleapis.com/.../water.pdf"
    }
  ],
  "notes": "Rent for January 2026"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment proof submitted successfully",
  "data": {
    "_id": "payment_id",
    "status": "paid",
    "paymentDate": "2025-12-30T00:00:00.000Z",
    "proofOfPayment": "https://...",
    "paymentMethod": "bank_transfer"
  }
}
```

---

## 💻 Frontend Implementation

### **1. Rental List Page (Both Landlord & Tenant)**

**Route:** `/rentals` or `/my-rental`

**Component:** `RentalListPage.vue`

```vue
<template>
  <div class="rental-list">
    <h1>My Rentals</h1>
    
    <!-- No rentals -->
    <div v-if="rentals.length === 0" class="empty-state">
      <p>You don't have any active rentals</p>
    </div>
    
    <!-- Rental cards -->
    <div v-else class="rental-cards">
      <div 
        v-for="rental in rentals" 
        :key="rental._id"
        class="rental-card"
        @click="goToRentalDashboard(rental._id)"
      >
        <img :src="rental.propertyId.images.mainImage" alt="Property" />
        
        <div class="rental-info">
          <h3>{{ rental.propertyId.title }}</h3>
          <p class="address">
            {{ rental.propertyId.address.street }}, 
            {{ rental.propertyId.address.city }}
          </p>
          
          <div class="rental-details">
            <div class="detail">
              <span class="label">Rent:</span>
              <span class="value">${{ rental.monthlyRent }}/month</span>
            </div>
            
            <div class="detail">
              <span class="label">Period:</span>
              <span class="value">
                {{ formatDate(rental.startDate) }} - {{ formatDate(rental.endDate) }}
              </span>
            </div>
            
            <div class="detail">
              <span class="label">Status:</span>
              <span :class="['status', rental.status]">
                {{ rental.status }}
              </span>
            </div>
          </div>
          
          <!-- Stats -->
          <div class="stats">
            <div class="stat">
              <span class="stat-label">Payments</span>
              <span class="stat-value">
                {{ rental.stats.paidPayments }}/{{ rental.stats.totalPaymentsDue }}
              </span>
            </div>
            <div class="stat">
              <span class="stat-label">Condition Logs</span>
              <span class="stat-value">
                {{ rental.stats.conditionLogsUploaded }}/5
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();
const rentals = ref([]);

onMounted(async () => {
  await fetchRentals();
});

const fetchRentals = async () => {
  try {
    const response = await axios.get('/api/rentals', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    rentals.value = response.data.data;
  } catch (error) {
    console.error('Failed to fetch rentals:', error);
  }
};

const goToRentalDashboard = (rentalId: string) => {
  router.push(`/rentals/${rentalId}`);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
</script>
```

---

### **2. Rental Dashboard Page**

**Route:** `/rentals/:id`

**Component:** `RentalDashboardPage.vue`

```vue
<template>
  <div class="rental-dashboard">
    <div v-if="loading">Loading...</div>
    
    <div v-else-if="dashboard">
      <!-- Header -->
      <div class="dashboard-header">
        <h1>{{ dashboard.rental.propertyId.title }}</h1>
        <span :class="['status-badge', dashboard.rental.status]">
          {{ dashboard.rental.status }}
        </span>
      </div>
      
      <!-- Info cards -->
      <div class="info-cards">
        <div class="info-card">
          <h3>{{ userRole === 'landlord' ? 'Tenant' : 'Landlord' }}</h3>
          <p>
            {{ userRole === 'landlord' 
              ? dashboard.rental.tenantId.firstName + ' ' + dashboard.rental.tenantId.lastName
              : dashboard.rental.landlordId.firstName + ' ' + dashboard.rental.landlordId.lastName
            }}
          </p>
        </div>
        
        <div class="info-card">
          <h3>Rental Period</h3>
          <p>
            {{ formatDate(dashboard.rental.startDate) }} - 
            {{ formatDate(dashboard.rental.endDate) }}
          </p>
          <small>{{ remainingDays }} days remaining</small>
        </div>
        
        <div class="info-card">
          <h3>Monthly Rent</h3>
          <p>${{ dashboard.rental.monthlyRent }}</p>
        </div>
      </div>
      
      <!-- Next action alert -->
      <div v-if="dashboard.nextAction" class="next-action-alert">
        <span class="icon">⚠️</span>
        <span>{{ dashboard.nextAction.message }}</span>
      </div>
      
      <!-- Tabs -->
      <div class="tabs">
        <button 
          :class="{ active: activeTab === 'payments' }"
          @click="activeTab = 'payments'"
        >
          💰 Payments
        </button>
        <button 
          :class="{ active: activeTab === 'conditionLogs' }"
          @click="activeTab = 'conditionLogs'"
        >
          📹 Condition Logs
        </button>
      </div>
      
      <!-- Payments Tab -->
      <div v-if="activeTab === 'payments'" class="tab-content">
        <h2>Payment History</h2>
        
        <div 
          v-for="payment in dashboard.payments" 
          :key="payment._id"
          class="payment-card"
        >
          <div class="payment-header">
            <h3>{{ formatDate(payment.dueDate) }}</h3>
            <span :class="['payment-status', payment.status]">
              {{ payment.status }}
            </span>
          </div>
          
          <p class="payment-amount">${{ payment.amount }}</p>
          
          <div v-if="payment.status === 'paid'" class="payment-details">
            <p>Paid on: {{ formatDate(payment.paymentDate) }}</p>
            <p>Method: {{ payment.paymentMethod }}</p>
            <a :href="payment.proofOfPayment" target="_blank">View Receipt</a>
          </div>
          
          <div v-else-if="payment.status === 'pending' && userRole === 'tenant'" class="payment-actions">
            <button @click="openPaymentModal(payment)">
              Upload Payment Proof
            </button>
          </div>
        </div>
      </div>
      
      <!-- Condition Logs Tab -->
      <div v-if="activeTab === 'conditionLogs'" class="tab-content">
        <h2>Condition Logs</h2>
        
        <div 
          v-for="log in dashboard.conditionLogs" 
          :key="log._id"
          class="condition-log-card"
        >
          <div class="log-header">
            <h3>{{ formatLogType(log.logType) }}</h3>
            <span :class="['log-status', log.status]">
              {{ log.status }}
            </span>
          </div>
          
          <p class="log-due-date">Due: {{ formatDate(log.dueDate) }}</p>
          
          <div v-if="log.status === 'uploaded'" class="log-details">
            <p>Uploaded: {{ formatDate(log.uploadedAt) }}</p>
            <div class="media-grid">
              <video 
                v-for="(video, idx) in log.videoUrls" 
                :key="idx"
                :src="video"
                controls
                class="video-preview"
              ></video>
              <img 
                v-for="(photo, idx) in log.photoUrls" 
                :key="idx"
                :src="photo"
                class="photo-preview"
              />
            </div>
            <p v-if="log.notes" class="log-notes">{{ log.notes }}</p>
          </div>
          
          <div v-else-if="log.status === 'pending' && userRole === 'tenant'" class="log-actions">
            <button @click="openConditionLogModal(log)">
              📹 Upload Now
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Payment Modal -->
    <PaymentModal 
      v-if="showPaymentModal"
      :payment="selectedPayment"
      @close="showPaymentModal = false"
      @submitted="onPaymentSubmitted"
    />
    
    <!-- Condition Log Modal -->
    <ConditionLogModal 
      v-if="showConditionLogModal"
      :log="selectedLog"
      @close="showConditionLogModal = false"
      @uploaded="onConditionLogUploaded"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import PaymentModal from '@/components/PaymentModal.vue';
import ConditionLogModal from '@/components/ConditionLogModal.vue';

const route = useRoute();
const dashboard = ref(null);
const loading = ref(true);
const activeTab = ref('payments');
const userRole = ref(localStorage.getItem('userRole'));

const showPaymentModal = ref(false);
const selectedPayment = ref(null);

const showConditionLogModal = ref(false);
const selectedLog = ref(null);

onMounted(async () => {
  await fetchDashboard();
});

const fetchDashboard = async () => {
  try {
    loading.value = true;
    const response = await axios.get(`/api/rentals/${route.params.id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    dashboard.value = response.data.data;
  } catch (error) {
    console.error('Failed to fetch dashboard:', error);
  } finally {
    loading.value = false;
  }
};

const remainingDays = computed(() => {
  if (!dashboard.value) return 0;
  const endDate = new Date(dashboard.value.rental.endDate);
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

const openPaymentModal = (payment: any) => {
  selectedPayment.value = payment;
  showPaymentModal.value = true;
};

const openConditionLogModal = (log: any) => {
  selectedLog.value = log;
  showConditionLogModal.value = true;
};

const onPaymentSubmitted = () => {
  showPaymentModal.value = false;
  fetchDashboard();
};

const onConditionLogUploaded = () => {
  showConditionLogModal.value = false;
  fetchDashboard();
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatLogType = (type: string) => {
  return type.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};
</script>
```

---

### **3. Payment Upload Modal**

**Component:** `PaymentModal.vue`

```vue
<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h2>Upload Payment Proof</h2>
      
      <form @submit.prevent="submitPayment">
        <div class="form-group">
          <label>Amount Due</label>
          <p class="amount">${{ payment.amount }}</p>
        </div>
        
        <div class="form-group">
          <label>Due Date</label>
          <p>{{ formatDate(payment.dueDate) }}</p>
        </div>
        
        <div class="form-group">
          <label for="paymentMethod">Payment Method *</label>
          <select v-model="formData.paymentMethod" required>
            <option value="">Select method</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="paymentDate">Payment Date *</label>
          <input 
            type="date" 
            v-model="formData.paymentDate"
            required
          />
        </div>
        
        <div class="form-group">
          <label>Payment Receipt * (PDF/Image)</label>
          <input 
            type="file" 
            @change="uploadReceipt"
            accept="image/*,application/pdf"
            required
          />
          <p v-if="uploading" class="upload-status">Uploading...</p>
          <p v-if="formData.proofOfPayment" class="upload-success">✓ Uploaded</p>
        </div>
        
        <div class="form-group">
          <label>Utility Receipts (Optional)</label>
          <button type="button" @click="addUtilityReceipt">+ Add Utility</button>
          
          <div 
            v-for="(receipt, idx) in formData.utilityReceipts" 
            :key="idx"
            class="utility-receipt-row"
          >
            <input 
              type="text" 
              v-model="receipt.type"
              placeholder="Type (e.g. electricity)"
            />
            <input 
              type="number" 
              v-model="receipt.amount"
              placeholder="Amount"
            />
            <input 
              type="file" 
              @change="(e) => uploadUtilityReceipt(e, idx)"
              accept="image/*,application/pdf"
            />
            <button type="button" @click="removeUtilityReceipt(idx)">Remove</button>
          </div>
        </div>
        
        <div class="form-group">
          <label for="notes">Notes (Optional)</label>
          <textarea 
            v-model="formData.notes"
            rows="3"
            placeholder="Any additional notes..."
          ></textarea>
        </div>
        
        <div class="modal-actions">
          <button type="button" @click="$emit('close')" class="btn-secondary">
            Cancel
          </button>
          <button type="submit" class="btn-primary" :disabled="!canSubmit">
            Submit Payment
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import axios from 'axios';
import { uploadToFirebase } from '@/utils/firebaseUpload';

const props = defineProps<{
  payment: any
}>();

const emit = defineEmits(['close', 'submitted']);

const uploading = ref(false);
const formData = ref({
  paymentMethod: '',
  paymentDate: new Date().toISOString().split('T')[0],
  proofOfPayment: '',
  utilityReceipts: [],
  notes: ''
});

const canSubmit = computed(() => {
  return formData.value.paymentMethod && 
         formData.value.paymentDate && 
         formData.value.proofOfPayment;
});

const uploadReceipt = async (event: any) => {
  const file = event.target.files[0];
  if (!file) return;
  
  uploading.value = true;
  try {
    const url = await uploadToFirebase(file, 'payments');
    formData.value.proofOfPayment = url;
  } catch (error) {
    console.error('Upload failed:', error);
    alert('Failed to upload receipt');
  } finally {
    uploading.value = false;
  }
};

const addUtilityReceipt = () => {
  formData.value.utilityReceipts.push({
    type: '',
    amount: 0,
    receiptUrl: ''
  });
};

const removeUtilityReceipt = (idx: number) => {
  formData.value.utilityReceipts.splice(idx, 1);
};

const uploadUtilityReceipt = async (event: any, idx: number) => {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const url = await uploadToFirebase(file, 'utilities');
    formData.value.utilityReceipts[idx].receiptUrl = url;
  } catch (error) {
    console.error('Upload failed:', error);
  }
};

const submitPayment = async () => {
  try {
    await axios.post(
      `/api/rentals/payments/${props.payment._id}/submit`,
      formData.value,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    
    alert('Payment submitted successfully!');
    emit('submitted');
  } catch (error: any) {
    console.error('Failed to submit payment:', error);
    alert(error.response?.data?.message || 'Failed to submit payment');
  }
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
</script>
```

---

### **4. Condition Log Upload Modal**

**Component:** `ConditionLogModal.vue`

```vue
<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h2>Upload {{ formatLogType(log.logType) }}</h2>
      
      <form @submit.prevent="submitLog">
        <div class="form-group">
          <label>Due Date</label>
          <p>{{ formatDate(log.dueDate) }}</p>
        </div>
        
        <div class="form-group">
          <label>Videos * (Max 3)</label>
          <input 
            type="file" 
            @change="uploadVideos"
            accept="video/*"
            multiple
            required
          />
          <p v-if="uploadingVideos" class="upload-status">Uploading videos...</p>
          <div v-if="formData.videoUrls.length > 0" class="uploaded-videos">
            <p>✓ {{ formData.videoUrls.length }} video(s) uploaded</p>
          </div>
        </div>
        
        <div class="form-group">
          <label>Photos (Optional)</label>
          <input 
            type="file" 
            @change="uploadPhotos"
            accept="image/*"
            multiple
          />
          <p v-if="uploadingPhotos" class="upload-status">Uploading photos...</p>
          <div v-if="formData.photoUrls.length > 0" class="uploaded-photos">
            <p>✓ {{ formData.photoUrls.length }} photo(s) uploaded</p>
          </div>
        </div>
        
        <div class="form-group">
          <label for="notes">Notes (Optional)</label>
          <textarea 
            v-model="formData.notes"
            rows="4"
            placeholder="Describe the condition of the property..."
          ></textarea>
        </div>
        
        <div class="modal-actions">
          <button type="button" @click="$emit('close')" class="btn-secondary">
            Cancel
          </button>
          <button type="submit" class="btn-primary" :disabled="!canSubmit">
            Upload Condition Log
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import axios from 'axios';
import { uploadToFirebase } from '@/utils/firebaseUpload';

const props = defineProps<{
  log: any
}>();

const emit = defineEmits(['close', 'uploaded']);

const uploadingVideos = ref(false);
const uploadingPhotos = ref(false);

const formData = ref({
  videoUrls: [],
  photoUrls: [],
  notes: ''
});

const canSubmit = computed(() => {
  return formData.value.videoUrls.length > 0;
});

const uploadVideos = async (event: any) => {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;
  
  if (files.length > 3) {
    alert('Maximum 3 videos allowed');
    return;
  }
  
  uploadingVideos.value = true;
  try {
    const uploadPromises = files.map(file => 
      uploadToFirebase(file, 'condition-logs/videos')
    );
    const urls = await Promise.all(uploadPromises);
    formData.value.videoUrls = urls;
  } catch (error) {
    console.error('Upload failed:', error);
    alert('Failed to upload videos');
  } finally {
    uploadingVideos.value = false;
  }
};

const uploadPhotos = async (event: any) => {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;
  
  uploadingPhotos.value = true;
  try {
    const uploadPromises = files.map(file => 
      uploadToFirebase(file, 'condition-logs/photos')
    );
    const urls = await Promise.all(uploadPromises);
    formData.value.photoUrls = urls;
  } catch (error) {
    console.error('Upload failed:', error);
    alert('Failed to upload photos');
  } finally {
    uploadingPhotos.value = false;
  }
};

const submitLog = async () => {
  try {
    await axios.post(
      `/api/rentals/condition-logs/${props.log._id}/upload`,
      formData.value,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    
    alert('Condition log uploaded successfully!');
    emit('uploaded');
  } catch (error: any) {
    console.error('Failed to upload log:', error);
    alert(error.response?.data?.message || 'Failed to upload condition log');
  }
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatLogType = (type: string) => {
  return type.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};
</script>
```

---

## 🎯 User Flows

### **Tenant Flow: Move-In**

```
1. Agreement signed by both parties
   ↓
2. Rental auto-created
   ↓
3. Tenant navigates to "My Rental"
   ↓
4. Sees alert: "Move-in video due today"
   ↓
5. Clicks "Upload Now" on move-in condition log
   ↓
6. Records/uploads videos of each room
   ↓
7. Adds photos (optional)
   ↓
8. Adds notes (optional)
   ↓
9. Submits condition log
   ↓
10. Move-in confirmed ✅
```

### **Tenant Flow: Monthly Payment**

```
1. Tenant receives notification: "Rent due in 3 days"
   ↓
2. Makes payment via bank transfer
   ↓
3. Goes to "My Rental" → "Payments" tab
   ↓
4. Clicks "Upload Payment Proof" on pending payment
   ↓
5. Selects payment method
   ↓
6. Uploads receipt (PDF or image)
   ↓
7. (Optional) Uploads utility receipts
   ↓
8. Submits payment proof
   ↓
9. Payment marked as "paid" ✅
```

### **Landlord Flow: View Rental**

```
1. Landlord navigates to "My Rental"
   ↓
2. Sees all active rentals
   ↓
3. Clicks on a rental
   ↓
4. Views rental dashboard:
   - Payment history
   - Condition logs
   - Upcoming actions
   ↓
5. Checks payment proof receipts
   ↓
6. Views tenant's condition log videos
   ↓
7. Has evidence for deposit return decisions
```

---

## 🚀 Quick Start Checklist

### **Backend (Already Done!)**
- ✅ Rental model created
- ✅ ConditionLog model created
- ✅ Payment model created
- ✅ Auto-creation on agreement signing
- ✅ 4 API endpoints implemented

### **Frontend (To Implement)**
- [ ] Create rental list page
- [ ] Create rental dashboard page
- [ ] Create payment upload modal
- [ ] Create condition log upload modal
- [ ] Add Firebase upload utility
- [ ] Add navigation link to "My Rental"
- [ ] Test end-to-end flow

---

## 📝 Notes

### **Firebase Storage Structure**
```
/payments/
  - {rentalId}_{timestamp}_receipt.pdf
  
/condition-logs/
  /videos/
    - {rentalId}_{logType}_{timestamp}_video1.mp4
  /photos/
    - {rentalId}_{logType}_{timestamp}_photo1.jpg
    
/utilities/
  - {rentalId}_{type}_{timestamp}_receipt.pdf
```

### **Status Updates**
- Payments auto-update to "overdue" after due date
- Condition logs auto-update to "overdue" after due date
- Rental stats update automatically when logs/payments are submitted

### **Notifications** (Future Enhancement)
- Send email/push when payment due
- Send email/push when condition log due
- Send email/push when payment/log overdue

---

## 🎉 Summary

The rental system provides a **complete workspace** for managing active rentals:

✅ **Auto-created** when both parties sign  
✅ **Payment tracking** with proof uploads  
✅ **Condition logs** for deposit protection  
✅ **Transparent** for both landlord and tenant  
✅ **Simple API** - only 4 endpoints!  

**That's it! Your rental management system is ready to go.** 🚀



