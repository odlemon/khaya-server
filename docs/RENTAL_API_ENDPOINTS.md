# 🏠 Rental System API Endpoints

Complete API reference for the Rental Management System.

---

## 📋 Table of Contents

1. [Rentals](#rentals)
2. [Condition Logs](#condition-logs)
3. [Payments](#payments)
4. [Maintenance Requests](#maintenance-requests)
5. [Service Bookings](#service-bookings)

---

## 🏠 Rentals

### **1. Get User's Rentals**

**Endpoint:** `GET /api/rentals`

**Authentication:** Required

**Description:** Get all rentals for the authenticated user (landlord or tenant)

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
        "address": { "street": "123 Main St", "city": "Harare" },
        "images": { "mainImage": "https://..." }
      },
      "landlordId": { "firstName": "John", "lastName": "Smith" },
      "tenantId": { "firstName": "Jane", "lastName": "Doe" },
      "startDate": "2025-11-01",
      "endDate": "2026-10-31",
      "monthlyRent": 1500,
      "stats": {
        "totalPaymentsDue": 12,
        "paidPayments": 3,
        "overduePayments": 0,
        "conditionLogsUploaded": 1,
        "conditionLogsPending": 4,
        "maintenanceRequests": 2,
        "serviceBookings": 1
      }
    }
  ]
}
```

---

### **2. Get Rental Dashboard**

**Endpoint:** `GET /api/rentals/:id`

**Authentication:** Required

**Description:** Get detailed rental dashboard with payments, condition logs, and next action

**Response:**
```json
{
  "success": true,
  "data": {
    "rental": { /* rental details */ },
    "payments": [ /* payment array */ ],
    "conditionLogs": [ /* condition log array */ ],
    "nextAction": {
      "type": "payment_due_soon",
      "message": "Rent due in 3 days",
      "dueDate": "2026-02-01"
    }
  }
}
```

---

## 📹 Condition Logs

### **1. Get Condition Logs**

**Endpoint:** `GET /api/rentals/:rentalId/condition-logs`

**Authentication:** Required

**Description:** Get all condition logs for a rental

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "log_id",
      "logType": "move-in",
      "dueDate": "2025-11-01",
      "status": "uploaded",
      "videoUrls": ["https://firebase.../video1.mp4"],
      "photoUrls": ["https://firebase.../photo1.jpg"],
      "uploadedBy": "tenant",
      "uploadedAt": "2025-11-01T10:00:00Z",
      "notes": "All in good condition"
    },
    {
      "_id": "log_id_2",
      "logType": "month-3",
      "dueDate": "2026-02-01",
      "status": "pending"
    }
  ]
}
```

---

### **2. Upload Condition Log**

**Endpoint:** `POST /api/rentals/condition-logs/:conditionLogId/upload`

**Authentication:** Required (Tenant or Landlord)

**Description:** Upload videos and photos for a condition log

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
  "notes": "Everything in good condition. Minor scratch on kitchen cabinet."
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
    "uploadedBy": "tenant",
    "uploadedAt": "2025-11-01T10:00:00Z"
  }
}
```

---

## 💰 Payments

### **1. Get Payments**

**Endpoint:** `GET /api/rentals/:rentalId/payments`

**Authentication:** Required

**Description:** Get all payments for a rental

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "payment_id",
      "paymentType": "rent",
      "amount": 1500,
      "dueDate": "2026-01-01",
      "paymentDate": "2025-12-30",
      "status": "paid",
      "proofOfPayment": "https://firebase.../receipt.pdf",
      "paymentMethod": "bank_transfer",
      "utilityReceipts": [
        {
          "type": "electricity",
          "amount": 50,
          "receiptUrl": "https://..."
        }
      ]
    },
    {
      "_id": "payment_id_2",
      "paymentType": "rent",
      "amount": 1500,
      "dueDate": "2026-02-01",
      "status": "pending"
    }
  ]
}
```

---

### **2. Submit Payment Proof**

**Endpoint:** `POST /api/rentals/payments/:paymentId/submit`

**Authentication:** Required (Tenant only)

**Description:** Submit proof of rent payment

**Request Body:**
```json
{
  "proofOfPayment": "https://firebasestorage.googleapis.com/.../receipt.pdf",
  "paymentMethod": "bank_transfer",
  "paymentDate": "2025-12-30",
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
    "paymentDate": "2025-12-30",
    "proofOfPayment": "https://...",
    "paymentMethod": "bank_transfer"
  }
}
```

---

## 🔧 Maintenance Requests

### **1. Get Maintenance Requests**

**Endpoint:** `GET /api/rentals/:rentalId/maintenance`

**Authentication:** Required

**Description:** Get all maintenance requests for a rental

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "request_id",
      "issueType": "plumbing",
      "urgency": "high",
      "title": "Kitchen Sink Leaking",
      "description": "The kitchen sink has been leaking for 2 days...",
      "status": "pending",
      "photoUrls": ["https://..."],
      "videoUrls": [],
      "createdAt": "2025-12-15T10:00:00Z"
    },
    {
      "_id": "request_id_2",
      "issueType": "electrical",
      "urgency": "medium",
      "title": "Broken Light Fixture",
      "description": "Light fixture in bedroom not working",
      "status": "completed",
      "landlordResponse": "Fixed on Dec 1",
      "actualCost": 50,
      "completedAt": "2025-12-01T14:00:00Z"
    }
  ]
}
```

---

### **2. Create Maintenance Request**

**Endpoint:** `POST /api/rentals/:rentalId/maintenance`

**Authentication:** Required (Tenant only)

**Description:** Create a new maintenance request

**Request Body:**
```json
{
  "issueType": "plumbing",
  "urgency": "high",
  "title": "Kitchen Sink Leaking",
  "description": "The kitchen sink has been leaking for 2 days. Water pools under the sink.",
  "photoUrls": [
    "https://firebasestorage.googleapis.com/.../sink1.jpg",
    "https://firebasestorage.googleapis.com/.../sink2.jpg"
  ],
  "videoUrls": [
    "https://firebasestorage.googleapis.com/.../leak_video.mp4"
  ]
}
```

**Issue Types:**
- `plumbing`
- `electrical`
- `aircon`
- `appliance`
- `structural`
- `pest_control`
- `other`

**Urgency Levels:**
- `low` - Can wait a week or more
- `medium` - Should be addressed within a few days
- `high` - Needs attention within 24-48 hours
- `emergency` - Immediate attention required

**Response:**
```json
{
  "success": true,
  "message": "Maintenance request created successfully",
  "data": {
    "_id": "request_id",
    "issueType": "plumbing",
    "urgency": "high",
    "title": "Kitchen Sink Leaking",
    "status": "pending",
    "createdAt": "2025-12-15T10:00:00Z"
  }
}
```

---

## 🧹 Service Bookings

### **1. Get Service Bookings**

**Endpoint:** `GET /api/rentals/:rentalId/services`

**Authentication:** Required

**Description:** Get all service bookings for a rental

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "booking_id",
      "serviceType": "aircon_servicing",
      "title": "Aircon Servicing - 2 Units",
      "description": "Standard servicing for bedroom and living room units",
      "scheduledDate": "2026-01-15",
      "cost": 120,
      "paidBy": "landlord",
      "serviceProvider": "Cool Air Services",
      "status": "scheduled",
      "createdAt": "2025-12-20T10:00:00Z"
    },
    {
      "_id": "booking_id_2",
      "serviceType": "deep_cleaning",
      "title": "Deep Cleaning",
      "scheduledDate": "2025-11-01",
      "completedDate": "2025-11-01",
      "cost": 200,
      "paidBy": "tenant",
      "status": "completed",
      "receiptUrl": "https://..."
    }
  ]
}
```

---

### **2. Create Service Booking**

**Endpoint:** `POST /api/rentals/:rentalId/services`

**Authentication:** Required (Tenant only)

**Description:** Create a new service booking

**Request Body:**
```json
{
  "serviceType": "aircon_servicing",
  "title": "Aircon Servicing - 2 Units",
  "description": "Standard servicing for bedroom and living room units",
  "scheduledDate": "2026-01-15",
  "cost": 120,
  "paidBy": "landlord",
  "serviceProvider": "Cool Air Services",
  "notes": "Please call 30 minutes before arrival"
}
```

**Service Types:**
- `aircon_servicing`
- `deep_cleaning`
- `pest_control`
- `plumbing_maintenance`
- `electrical_inspection`
- `gardening`
- `painting`
- `other`

**Paid By Options:**
- `landlord` - Cost paid by landlord
- `tenant` - Cost paid by tenant
- `shared` - Cost shared between both parties

**Response:**
```json
{
  "success": true,
  "message": "Service booking created successfully",
  "data": {
    "_id": "booking_id",
    "serviceType": "aircon_servicing",
    "title": "Aircon Servicing - 2 Units",
    "scheduledDate": "2026-01-15",
    "cost": 120,
    "status": "scheduled",
    "createdAt": "2025-12-20T10:00:00Z"
  }
}
```

---

## 📊 Complete Endpoint Summary

| # | Method | Endpoint | Role | Description |
|---|--------|----------|------|-------------|
| 1 | GET | `/api/rentals` | Both | Get user's rentals |
| 2 | GET | `/api/rentals/:id` | Both | Get rental dashboard |
| 3 | GET | `/api/rentals/:rentalId/condition-logs` | Both | Get condition logs |
| 4 | POST | `/api/rentals/condition-logs/:conditionLogId/upload` | Both | Upload condition log |
| 5 | GET | `/api/rentals/:rentalId/payments` | Both | Get payments |
| 6 | POST | `/api/rentals/payments/:paymentId/submit` | Tenant | Submit payment proof |
| 7 | GET | `/api/rentals/:rentalId/maintenance` | Both | Get maintenance requests |
| 8 | POST | `/api/rentals/:rentalId/maintenance` | Tenant | Create maintenance request |
| 9 | GET | `/api/rentals/:rentalId/services` | Both | Get service bookings |
| 10 | POST | `/api/rentals/:rentalId/services` | Tenant | Create service booking |

---

## 🎯 Frontend Implementation Notes

### **Tab Structure**

Your rental dashboard should have these tabs:

```
┌─────────────────────────────────────────┐
│ 💰 Payments | 📹 Condition Logs |       │
│ 🔧 Maintenance | 🧹 Services             │
└─────────────────────────────────────────┘
```

### **API Calls for Each Tab**

**Payments Tab:**
```javascript
// Fetch payments
GET /api/rentals/:rentalId/payments

// Submit payment (tenant only)
POST /api/rentals/payments/:paymentId/submit
```

**Condition Logs Tab:**
```javascript
// Fetch condition logs
GET /api/rentals/:rentalId/condition-logs

// Upload log (tenant)
POST /api/rentals/condition-logs/:conditionLogId/upload
```

**Maintenance Tab:**
```javascript
// Fetch maintenance requests
GET /api/rentals/:rentalId/maintenance

// Create request (tenant only)
POST /api/rentals/:rentalId/maintenance
```

**Services Tab:**
```javascript
// Fetch service bookings
GET /api/rentals/:rentalId/services

// Create booking (tenant only)
POST /api/rentals/:rentalId/services
```

---

## 🔐 Authentication

All endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## ✅ Success Response Format

All successful responses follow this format:

```json
{
  "success": true,
  "data": { /* response data */ }
}
```

Or with a message:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ }
}
```

---

## ❌ Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

---

**Last Updated:** October 19, 2025  
**Version:** 1.0



