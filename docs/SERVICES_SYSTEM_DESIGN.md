# 🛠️ Khayalami Services System - Complete Design

## 📋 Overview

The **Services System** allows tenants and landlords to:
1. **Book add-on services** (aircon servicing, cleaning, plumbing, etc.)
2. **Track service requests** and vendor ETAs
3. **Receive automated reminders** for recurring services
4. **Make in-app payments** for services
5. **View service history** and invoices

---

## 🎯 How It Works

### **User Journey: Tenant/Landlord Books a Service**

```
1. Tenant/Landlord opens "My Rental" or "Services" menu
   ↓
2. Clicks "Book Service"
   ↓
3. Selects service type:
   - 🧊 Aircon Servicing
   - 🧹 Cleaning Services
   - 🔧 Plumbing
   - ⚡ Electrical
   - 🪛 Handyman
   - 🪴 Gardening
   - 🐛 Pest Control
   - 📝 Custom/Other
   ↓
4. Fills in details:
   - Service date
   - Urgency level
   - Description
   - Photos/videos (optional)
   - Who pays (tenant/landlord)
   ↓
5. Submits request
   ↓
6. System creates service request with status "pending"
   ↓
7. Khayalami Admin assigns vendor/service provider
   ↓
8. Status updates: "pending" → "scheduled" → "in_progress" → "completed"
   ↓
9. Bill is generated and sent to the payer (tenant/landlord)
   ↓
10. Payer makes payment in-app
    ↓
11. Service marked as "paid"
```

---

## 🗂️ Database Schema

### **Service Model**

```typescript
interface IService {
  // Basic Info
  _id: ObjectId;
  rentalId: ObjectId;
  agreementId: ObjectId;
  propertyId: ObjectId;
  landlordId: ObjectId;
  tenantId: ObjectId;
  
  // Service Details
  serviceType: "aircon_servicing" | "cleaning" | "plumbing" | "electrical" 
                | "handyman" | "gardening" | "pest_control" | "custom";
  customServiceName?: string; // For "custom" type
  
  title: string;
  description: string;
  urgency: "low" | "medium" | "high" | "emergency";
  
  // Media
  photoUrls?: string[];
  videoUrls?: string[];
  
  // Scheduling
  requestedDate: Date;
  scheduledDate?: Date;
  completedDate?: Date;
  
  // Service Provider
  serviceProvider?: {
    name: string;
    phoneNumber: string;
    company?: string;
    rating?: number;
  };
  
  // Payment
  estimatedCost?: number;
  finalCost?: number;
  paidBy: "tenant" | "landlord" | "split";
  paymentStatus: "unpaid" | "pending_approval" | "paid" | "refunded";
  
  // Bill/Invoice
  billId?: ObjectId; // Link to Bill model
  invoiceUrl?: string; // PDF invoice
  
  // Status & Tracking
  status: "pending" | "approved" | "rejected" | "scheduled" 
          | "in_progress" | "completed" | "cancelled";
  
  // Who requested and approved
  requestedBy: ObjectId; // Tenant or Landlord
  requestedByRole: "tenant" | "landlord";
  
  approvedBy?: ObjectId; // If approval needed
  approvedAt?: Date;
  
  rejectedBy?: ObjectId;
  rejectionReason?: string;
  
  // Admin assignment
  assignedAdmin?: ObjectId;
  assignedVendor?: ObjectId;
  
  // Notes & Updates
  landlordNotes?: string;
  tenantNotes?: string;
  adminNotes?: string;
  completionNotes?: string;
  
  // Ratings & Feedback
  rating?: number; // 1-5 stars
  feedback?: string;
  
  // Recurring Service (for aircon, etc.)
  isRecurring: boolean;
  recurringInterval?: number; // In months (e.g., 3 or 6)
  lastServiceDate?: Date;
  nextServiceDue?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

---

### **ServiceReminder Model**

```typescript
interface IServiceReminder {
  _id: ObjectId;
  rentalId: ObjectId;
  tenantId: ObjectId;
  landlordId: ObjectId;
  
  serviceType: string;
  message: string;
  dueDate: Date;
  
  status: "pending" | "sent" | "dismissed" | "booked";
  sentAt?: Date;
  
  // Link to booked service (if reminder was acted upon)
  bookedServiceId?: ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🔌 API Endpoints

### **Tenant/Landlord Endpoints**

| # | Method | Endpoint | Purpose | Role |
|---|--------|----------|---------|------|
| 1 | POST | `/api/services/book` | Book a new service | Tenant/Landlord |
| 2 | GET | `/api/services/rental/:rentalId` | Get all services for a rental | Tenant/Landlord |
| 3 | GET | `/api/services/:serviceId` | Get service details | Tenant/Landlord |
| 4 | PUT | `/api/services/:serviceId/cancel` | Cancel a service | Tenant/Landlord |
| 5 | POST | `/api/services/:serviceId/rate` | Rate completed service | Tenant/Landlord |
| 6 | GET | `/api/services/reminders` | Get service reminders | Tenant/Landlord |
| 7 | POST | `/api/services/:serviceId/pay` | Pay for service | Tenant/Landlord |
| 8 | GET | `/api/services/history` | Get all services (across all rentals) | Tenant/Landlord |

---

### **Admin Endpoints**

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | GET | `/api/admin/services` | Get all service requests |
| 2 | PUT | `/api/admin/services/:serviceId/assign` | Assign vendor to service |
| 3 | PUT | `/api/admin/services/:serviceId/schedule` | Update scheduled date |
| 4 | PUT | `/api/admin/services/:serviceId/status` | Update service status |
| 5 | POST | `/api/admin/services/:serviceId/bill` | Create bill for service |
| 6 | PUT | `/api/admin/services/:serviceId/complete` | Mark service as completed |

---

## 📊 Detailed Endpoint Examples

### **1. Book a Service**

**Endpoint:** `POST /api/services/book`

**Request:**
```json
{
  "rentalId": "rental_123",
  "serviceType": "aircon_servicing",
  "title": "Aircon Chemical Cleaning",
  "description": "Need chemical cleaning for 2 aircon units in bedrooms",
  "urgency": "medium",
  "requestedDate": "2025-10-25T10:00:00.000Z",
  "paidBy": "tenant",
  "photoUrls": [],
  "isRecurring": true,
  "recurringInterval": 6
}
```

**Response:**
```json
{
  "success": true,
  "message": "Service request created successfully",
  "data": {
    "_id": "service_001",
    "rentalId": "rental_123",
    "serviceType": "aircon_servicing",
    "title": "Aircon Chemical Cleaning",
    "description": "Need chemical cleaning for 2 aircon units in bedrooms",
    "urgency": "medium",
    "requestedDate": "2025-10-25T10:00:00.000Z",
    "status": "pending",
    "paidBy": "tenant",
    "paymentStatus": "unpaid",
    "requestedBy": "tenant_id_123",
    "requestedByRole": "tenant",
    "isRecurring": true,
    "recurringInterval": 6,
    "nextServiceDue": "2025-04-25T10:00:00.000Z",
    "createdAt": "2025-10-19T15:00:00.000Z"
  }
}
```

**What Happens Next:**
1. ✅ Landlord gets notification: "Tenant requested aircon servicing"
2. ✅ Admin sees request in admin panel
3. ✅ Admin assigns vendor
4. ✅ Status updates to "scheduled"
5. ✅ Tenant gets notification: "Service scheduled for Oct 25"

---

### **2. Get All Services for a Rental**

**Endpoint:** `GET /api/services/rental/:rentalId?status=pending`

**Query Params:**
- `status` (optional): Filter by status
- `serviceType` (optional): Filter by type
- `paidBy` (optional): Filter by payer

**Request:**
```http
GET /api/services/rental/rental_123?status=pending
Authorization: Bearer TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "service_001",
      "serviceType": "aircon_servicing",
      "title": "Aircon Chemical Cleaning",
      "status": "pending",
      "urgency": "medium",
      "requestedDate": "2025-10-25T10:00:00.000Z",
      "paidBy": "tenant",
      "paymentStatus": "unpaid",
      "requestedByRole": "tenant",
      "createdAt": "2025-10-19T15:00:00.000Z"
    },
    {
      "_id": "service_002",
      "serviceType": "plumbing",
      "title": "Fix Leaking Tap",
      "status": "scheduled",
      "urgency": "high",
      "scheduledDate": "2025-10-20T09:00:00.000Z",
      "serviceProvider": {
        "name": "John Plumber",
        "phoneNumber": "+260971234567",
        "company": "Zambia Plumbers Ltd",
        "rating": 4.5
      },
      "estimatedCost": 150,
      "paidBy": "landlord",
      "paymentStatus": "unpaid",
      "requestedByRole": "tenant",
      "createdAt": "2025-10-18T12:00:00.000Z"
    }
  ]
}
```

---

### **3. Get Service Details**

**Endpoint:** `GET /api/services/:serviceId`

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "service_002",
    "rentalId": "rental_123",
    "propertyId": "property_123",
    "landlordId": "landlord_123",
    "tenantId": "tenant_123",
    
    "serviceType": "plumbing",
    "title": "Fix Leaking Tap",
    "description": "Kitchen tap has been leaking for 2 days",
    "urgency": "high",
    
    "photoUrls": [
      "https://firebase.../tap_leak.jpg"
    ],
    
    "requestedDate": "2025-10-20T09:00:00.000Z",
    "scheduledDate": "2025-10-20T09:00:00.000Z",
    
    "serviceProvider": {
      "name": "John Plumber",
      "phoneNumber": "+260971234567",
      "company": "Zambia Plumbers Ltd",
      "rating": 4.5
    },
    
    "estimatedCost": 150,
    "finalCost": null,
    "paidBy": "landlord",
    "paymentStatus": "unpaid",
    
    "status": "scheduled",
    
    "requestedBy": "tenant_123",
    "requestedByRole": "tenant",
    
    "tenantNotes": "Please call before arriving",
    "landlordNotes": "Use spare key under mat if tenant is away",
    
    "createdAt": "2025-10-18T12:00:00.000Z",
    "updatedAt": "2025-10-19T08:00:00.000Z"
  }
}
```

---

### **4. Admin Assigns Vendor**

**Endpoint:** `PUT /api/admin/services/:serviceId/assign`

**Request:**
```json
{
  "serviceProvider": {
    "name": "John Plumber",
    "phoneNumber": "+260971234567",
    "company": "Zambia Plumbers Ltd"
  },
  "scheduledDate": "2025-10-20T09:00:00.000Z",
  "estimatedCost": 150,
  "adminNotes": "Vendor dispatched. ETA 9:00 AM"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vendor assigned successfully",
  "data": {
    "_id": "service_002",
    "status": "scheduled",
    "serviceProvider": {
      "name": "John Plumber",
      "phoneNumber": "+260971234567",
      "company": "Zambia Plumbers Ltd"
    },
    "scheduledDate": "2025-10-20T09:00:00.000Z",
    "estimatedCost": 150
  }
}
```

**Notifications Sent:**
- ✅ Tenant: "Your plumbing service is scheduled for Oct 20 at 9:00 AM"
- ✅ Landlord: "Service assigned to John Plumber (ETA: Oct 20, 9 AM)"

---

### **5. Admin Creates Bill**

**Endpoint:** `POST /api/admin/services/:serviceId/bill`

**Request:**
```json
{
  "finalCost": 180,
  "billDetails": {
    "items": [
      {
        "description": "Tap replacement",
        "amount": 100
      },
      {
        "description": "Labor",
        "amount": 50
      },
      {
        "description": "Transport",
        "amount": 30
      }
    ],
    "subtotal": 180,
    "tax": 0,
    "total": 180
  },
  "notes": "Service completed successfully. New tap installed."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bill created successfully",
  "data": {
    "_id": "service_002",
    "finalCost": 180,
    "billId": "bill_001",
    "invoiceUrl": "https://khayalami.../invoice_bill_001.pdf",
    "paymentStatus": "pending_approval"
  }
}
```

**Notifications Sent:**
- ✅ Landlord: "Service completed. Bill: K180. Please review and pay."

---

### **6. Landlord/Tenant Pays for Service**

**Endpoint:** `POST /api/services/:serviceId/pay`

**Request:**
```json
{
  "amount": 180,
  "paymentMethod": "in_app",
  "gatewayResponse": {
    "provider": "paystack",
    "transactionId": "TXN_123456789",
    "transactionRef": "PSK_abc123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment successful",
  "data": {
    "_id": "service_002",
    "paymentStatus": "paid",
    "finalCost": 180,
    "receiptNumber": "REC-1729350000-456"
  }
}
```

---

### **7. Rate Service**

**Endpoint:** `POST /api/services/:serviceId/rate`

**Request:**
```json
{
  "rating": 5,
  "feedback": "Excellent service! Very professional and fixed the issue quickly."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Thank you for your feedback!",
  "data": {
    "_id": "service_002",
    "rating": 5,
    "feedback": "Excellent service! Very professional and fixed the issue quickly.",
    "status": "completed"
  }
}
```

---

### **8. Get Service Reminders**

**Endpoint:** `GET /api/services/reminders`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "reminder_001",
      "rentalId": "rental_123",
      "serviceType": "aircon_servicing",
      "message": "Your aircon is due for servicing in 7 days",
      "dueDate": "2025-10-27T00:00:00.000Z",
      "status": "pending",
      "createdAt": "2025-10-20T08:00:00.000Z"
    }
  ]
}
```

---

## 🔄 Service Status Flow

```
1. pending
   ↓ (Admin assigns vendor)
2. scheduled
   ↓ (Vendor arrives)
3. in_progress
   ↓ (Work completed)
4. completed
   ↓ (Bill generated)
5. Payment: unpaid → pending_approval → paid
   ↓ (User rates service)
6. Rated & Closed
```

---

## 🔔 Automated Reminders

### **Aircon Servicing Reminder (Every 6 Months)**

```javascript
// Cron job runs daily
if (service.isRecurring && service.nextServiceDue <= today + 7 days) {
  // Send reminder
  sendNotification({
    userId: service.tenantId,
    message: "Your aircon is due for servicing in 7 days. Book now!",
    action: "book_service"
  });
}
```

---

## 🎨 Frontend Implementation

### **Service Booking Form**

```vue
<template>
  <div class="book-service">
    <h1>Book a Service</h1>
    
    <form @submit.prevent="bookService">
      <!-- Service Type -->
      <div class="form-group">
        <label>Service Type *</label>
        <select v-model="form.serviceType" required>
          <option value="">-- Select Service --</option>
          <option value="aircon_servicing">🧊 Aircon Servicing</option>
          <option value="cleaning">🧹 Cleaning</option>
          <option value="plumbing">🔧 Plumbing</option>
          <option value="electrical">⚡ Electrical</option>
          <option value="handyman">🪛 Handyman</option>
          <option value="gardening">🪴 Gardening</option>
          <option value="pest_control">🐛 Pest Control</option>
          <option value="custom">📝 Other</option>
        </select>
      </div>
      
      <!-- Custom Service Name (if "Other") -->
      <div v-if="form.serviceType === 'custom'" class="form-group">
        <label>Service Name *</label>
        <input v-model="form.customServiceName" required />
      </div>
      
      <!-- Title -->
      <div class="form-group">
        <label>Title *</label>
        <input 
          v-model="form.title" 
          placeholder="e.g., Fix leaking tap"
          required 
        />
      </div>
      
      <!-- Description -->
      <div class="form-group">
        <label>Description *</label>
        <textarea 
          v-model="form.description"
          rows="4"
          placeholder="Describe the issue or service needed"
          required
        ></textarea>
      </div>
      
      <!-- Urgency -->
      <div class="form-group">
        <label>Urgency *</label>
        <select v-model="form.urgency" required>
          <option value="low">🟢 Low</option>
          <option value="medium">🟡 Medium</option>
          <option value="high">🟠 High</option>
          <option value="emergency">🔴 Emergency</option>
        </select>
      </div>
      
      <!-- Requested Date -->
      <div class="form-group">
        <label>Preferred Date *</label>
        <input 
          type="datetime-local" 
          v-model="form.requestedDate"
          required
        />
      </div>
      
      <!-- Who Pays -->
      <div class="form-group">
        <label>Who Pays? *</label>
        <select v-model="form.paidBy" required>
          <option value="tenant">Tenant</option>
          <option value="landlord">Landlord</option>
          <option value="split">Split 50/50</option>
        </select>
      </div>
      
      <!-- Recurring Service -->
      <div class="form-group">
        <label>
          <input type="checkbox" v-model="form.isRecurring" />
          Set as recurring service
        </label>
      </div>
      
      <div v-if="form.isRecurring" class="form-group">
        <label>Repeat Every (months)</label>
        <select v-model="form.recurringInterval">
          <option :value="3">3 months</option>
          <option :value="6">6 months</option>
          <option :value="12">12 months</option>
        </select>
      </div>
      
      <!-- Photos/Videos -->
      <div class="form-group">
        <label>Photos/Videos (optional)</label>
        <input 
          type="file" 
          multiple 
          accept="image/*,video/*"
          @change="uploadMedia"
        />
      </div>
      
      <!-- Submit -->
      <button type="submit" class="btn-primary">
        📤 Submit Request
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const rentalId = route.params.rentalId;

const form = ref({
  rentalId: rentalId,
  serviceType: '',
  customServiceName: '',
  title: '',
  description: '',
  urgency: 'medium',
  requestedDate: '',
  paidBy: 'tenant',
  isRecurring: false,
  recurringInterval: 6,
  photoUrls: [],
  videoUrls: []
});

const uploadMedia = async (event) => {
  const files = event.target.files;
  // Upload to Firebase Storage
  // ... implementation
};

const bookService = async () => {
  try {
    const response = await axios.post(
      '/api/services/book',
      form.value,
      { headers: { Authorization: `Bearer ${token}` }}
    );
    
    alert('Service request submitted successfully!');
    router.push(`/rentals/${rentalId}/services`);
  } catch (error) {
    alert('Failed to submit request');
  }
};
</script>
```

---

## ✅ Complete Service Types

| Service Type | Icon | Typical Cost Range | Recurring? |
|--------------|------|-------------------|------------|
| Aircon Servicing | 🧊 | K100 - K300 | Yes (3-6 months) |
| Cleaning | 🧹 | K50 - K200 | Yes (weekly/monthly) |
| Plumbing | 🔧 | K100 - K500 | No |
| Electrical | ⚡ | K100 - K800 | No |
| Handyman | 🪛 | K50 - K300 | No |
| Gardening | 🪴 | K100 - K400 | Yes (monthly) |
| Pest Control | 🐛 | K150 - K500 | Yes (quarterly) |
| Custom | 📝 | Varies | Optional |

---

## 🎯 Key Features Summary

✅ **Multi-Service Support** - 8 service types + custom  
✅ **Smart Reminders** - Automated recurring service alerts  
✅ **In-App Payment** - Pay directly in the app  
✅ **ETA Tracking** - See vendor arrival time  
✅ **Bill Generation** - Automatic invoices  
✅ **Rating System** - Rate service providers  
✅ **Photo/Video Upload** - Document the issue  
✅ **Landlord Approval** - Optional approval before dispatch  
✅ **Split Payments** - Tenant/landlord cost sharing  

---

**Last Updated:** October 19, 2025  
**Version:** 1.0 - Complete Services System Design



