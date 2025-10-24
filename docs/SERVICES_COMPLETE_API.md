# 🛠️ Khayalami Services - Complete API Documentation

> **Note:** Admin endpoints will be implemented in a separate Next.js admin portal project.

---

## 🔌 API Endpoints Summary

### **Mobile App APIs (Tenant/Landlord):**
| # | Method | Endpoint | Role | Purpose |
|---|--------|----------|------|---------|
| 1 | POST | `/api/services/book` | Tenant/Landlord | Book a new service |
| 2 | GET | `/api/services/rental/:rentalId` | Tenant/Landlord | Get all services for rental |
| 3 | GET | `/api/services/:serviceId` | Tenant/Landlord | Get service details |
| 4 | **POST** | **`/api/services/:serviceId/approve`** | **Landlord** | **Approve service request** |
| 5 | **POST** | **`/api/services/:serviceId/reject`** | **Landlord** | **Reject service request** |
| 6 | PUT | `/api/services/:serviceId/cancel` | Tenant/Landlord | Cancel service |
| 7 | POST | `/api/services/:serviceId/rate` | Tenant/Landlord | Rate completed service |
| 8 | GET | `/api/services/history` | Tenant/Landlord | Get all user services |
| 9 | GET | `/api/services/reminders` | Tenant/Landlord | Get service reminders |
| 10 | POST | `/api/services/:serviceId/pay` | Tenant/Landlord | Pay for service |

### **Admin Portal APIs:**
| # | Method | Endpoint | Role | Purpose |
|---|--------|----------|------|---------|
| 1 | GET | `/api/admin/services/all` | Admin | Get all service requests |
| 2 | PUT | `/api/admin/services/:serviceId/assign` | Admin | Assign vendor |
| 3 | PUT | `/api/admin/services/:serviceId/status` | Admin | Update status |
| 4 | POST | `/api/admin/services/:serviceId/bill` | Admin | Create bill |

---

## 📱 Mobile App APIs

### **1. Book Service**

**Endpoint:** `POST /api/services/book`

**Role:** Tenant | Landlord

**Request:**
```json
{
  "rentalId": "rental_123",
  "serviceType": "plumbing",
  "title": "Fix leaking kitchen tap",
  "description": "Kitchen tap has been leaking for 2 days",
  "urgency": "high",
  "requestedDate": "2025-10-25T09:00:00.000Z",
  "paidBy": "landlord",
  "photoUrls": ["https://firebase.../leak.jpg"],
  "videoUrls": [],
  "isRecurring": false,
  "tenantNotes": "Please call before arriving",
  "landlordNotes": "",
  "landlordProvidedVendor": {
    "name": "Mike the Plumber",
    "phoneNumber": "+260971234567",
    "company": "Quick Fix Plumbers"
  }
}
```

**Response (Tenant books):**
```json
{
  "success": true,
  "message": "Service request created successfully",
  "data": {
    "_id": "service_001",
    "rentalId": "rental_123",
    "serviceType": "plumbing",
    "title": "Fix leaking kitchen tap",
    "description": "Kitchen tap has been leaking for 2 days",
    "urgency": "high",
    "status": "pending_landlord_approval",
    "requestedDate": "2025-10-25T09:00:00.000Z",
    "paidBy": "landlord",
    "paymentStatus": "unpaid",
    "requestedBy": "tenant_id",
    "requestedByRole": "tenant",
    "photoUrls": ["https://firebase.../leak.jpg"],
    "createdAt": "2025-10-19T10:00:00.000Z"
  }
}
```

**Response (Landlord books + provides vendor):**
```json
{
  "success": true,
  "message": "Service request created successfully",
  "data": {
    "_id": "service_002",
    "status": "scheduled",
    "serviceProvider": {
      "name": "Mike the Plumber",
      "phoneNumber": "+260971234567",
      "company": "Quick Fix Plumbers"
    },
    "scheduledDate": "2025-10-25T09:00:00.000Z",
    "approvedBy": "landlord_id",
    "approvedAt": "2025-10-19T10:00:00.000Z"
  }
}
```

---

### **2. Get Services for Rental**

**Endpoint:** `GET /api/services/rental/:rentalId?status=pending_landlord_approval`

**Role:** Tenant | Landlord

**Query Params:**
- `status` (optional): `pending_landlord_approval`, `approved`, `rejected`, `pending_assignment`, `scheduled`, `in_progress`, `completed`, `cancelled`
- `serviceType` (optional): `plumbing`, `electrical`, etc.
- `paidBy` (optional): `tenant`, `landlord`, `split`
- `urgency` (optional): `low`, `medium`, `high`, `emergency`

**Request:**
```http
GET /api/services/rental/rental_123?status=pending_landlord_approval
Authorization: Bearer TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "service_001",
      "serviceType": "plumbing",
      "title": "Fix leaking kitchen tap",
      "urgency": "high",
      "status": "pending_landlord_approval",
      "requestedDate": "2025-10-25T09:00:00.000Z",
      "paidBy": "landlord",
      "requestedBy": {
        "firstName": "Sarah",
        "lastName": "Johnson"
      },
      "photoUrls": ["https://..."],
      "createdAt": "2025-10-19T10:00:00.000Z"
    }
  ]
}
```

---

### **3. Get Service Details**

**Endpoint:** `GET /api/services/:serviceId`

**Role:** Tenant | Landlord

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "service_001",
    "rentalId": "rental_123",
    "propertyId": "property_123",
    "landlordId": "landlord_123",
    "tenantId": "tenant_123",
    
    "serviceType": "plumbing",
    "title": "Fix leaking kitchen tap",
    "description": "Kitchen tap has been leaking for 2 days",
    "urgency": "high",
    
    "photoUrls": ["https://firebase.../leak.jpg"],
    "videoUrls": [],
    
    "requestedDate": "2025-10-25T09:00:00.000Z",
    "scheduledDate": null,
    "completedDate": null,
    
    "serviceProvider": null,
    
    "estimatedCost": null,
    "finalCost": null,
    "paidBy": "landlord",
    "paymentStatus": "unpaid",
    
    "status": "pending_landlord_approval",
    
    "requestedBy": {
      "_id": "tenant_123",
      "firstName": "Sarah",
      "lastName": "Johnson",
      "email": "sarah@example.com",
      "phoneNumber": "+260971234567"
    },
    "requestedByRole": "tenant",
    
    "approvedBy": null,
    "approvedAt": null,
    "approvalNotes": null,
    
    "tenantNotes": "Please call before arriving",
    "landlordNotes": null,
    
    "isRecurring": false,
    "nextServiceDue": null,
    
    "createdAt": "2025-10-19T10:00:00.000Z",
    "updatedAt": "2025-10-19T10:00:00.000Z"
  }
}
```

---

### **4. 🆕 Landlord Approves Service**

**Endpoint:** `POST /api/services/:serviceId/approve`

**Role:** Landlord ONLY

**Request (Approve without vendor):**
```json
{
  "approvalNotes": "Approved. Please send vendor ASAP"
}
```

**Request (Approve with landlord's vendor):**
```json
{
  "approvalNotes": "Using our usual plumber Mike",
  "landlordProvidedVendor": {
    "name": "Mike the Plumber",
    "phoneNumber": "+260971234567",
    "company": "Quick Fix Plumbers"
  }
}
```

**Response (Without vendor):**
```json
{
  "success": true,
  "message": "Service approved successfully",
  "data": {
    "_id": "service_001",
    "status": "pending_assignment",
    "approvedBy": "landlord_id",
    "approvedAt": "2025-10-19T11:00:00.000Z",
    "approvalNotes": "Approved. Please send vendor ASAP"
  }
}
```

**Response (With vendor):**
```json
{
  "success": true,
  "message": "Service approved successfully",
  "data": {
    "_id": "service_001",
    "status": "scheduled",
    "approvedBy": "landlord_id",
    "approvedAt": "2025-10-19T11:00:00.000Z",
    "approvalNotes": "Using our usual plumber Mike",
    "serviceProvider": {
      "name": "Mike the Plumber",
      "phoneNumber": "+260971234567",
      "company": "Quick Fix Plumbers"
    },
    "scheduledDate": "2025-10-25T09:00:00.000Z"
  }
}
```

---

### **5. 🆕 Landlord Rejects Service**

**Endpoint:** `POST /api/services/:serviceId/reject`

**Role:** Landlord ONLY

**Request:**
```json
{
  "rejectionReason": "This is minor. Please tighten the tap yourself."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Service rejected",
  "data": {
    "_id": "service_001",
    "status": "rejected",
    "rejectedBy": "landlord_id",
    "rejectedAt": "2025-10-19T11:00:00.000Z",
    "rejectionReason": "This is minor. Please tighten the tap yourself."
  }
}
```

---

### **6. Cancel Service**

**Endpoint:** `PUT /api/services/:serviceId/cancel`

**Role:** Tenant | Landlord

**Request:**
```json
{
  "reason": "Issue resolved on its own"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Service cancelled successfully",
  "data": {
    "_id": "service_001",
    "status": "cancelled",
    "landlordNotes": "Issue resolved on its own"
  }
}
```

---

### **7. Rate Service**

**Endpoint:** `POST /api/services/:serviceId/rate`

**Role:** Tenant | Landlord

**Request:**
```json
{
  "rating": 5,
  "feedback": "Excellent service! Mike was professional and fixed it quickly."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Thank you for your feedback!",
  "data": {
    "_id": "service_001",
    "rating": 5,
    "feedback": "Excellent service! Mike was professional and fixed it quickly."
  }
}
```

---

### **8. Get Service History**

**Endpoint:** `GET /api/services/history?status=completed`

**Role:** Tenant | Landlord

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "service_005",
      "serviceType": "plumbing",
      "title": "Fix leaking tap",
      "status": "completed",
      "rentalId": {
        "address": "123 Main St"
      },
      "propertyId": {
        "title": "2 Bedroom Apartment"
      },
      "completedDate": "2025-10-15T14:30:00.000Z",
      "finalCost": 150,
      "paymentStatus": "paid",
      "rating": 5
    }
  ]
}
```

---

### **9. Get Service Reminders**

**Endpoint:** `GET /api/services/reminders`

**Role:** Tenant | Landlord

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

### **10. Pay for Service**

**Endpoint:** `POST /api/services/:serviceId/pay`

**Role:** Tenant | Landlord (based on `paidBy`)

**Request:**
```json
{
  "amount": 150,
  "paymentMethod": "in_app",
  "gatewayResponse": {
    "provider": "paystack",
    "transactionId": "TXN_123456789",
    "transactionRef": "PSK_abc123def456",
    "paidAt": "2025-10-19T15:00:00.000Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment successful",
  "data": {
    "_id": "service_001",
    "paymentStatus": "paid",
    "receiptNumber": "REC-1729350000-456"
  }
}
```

---

## 🔐 Admin Portal APIs

> These endpoints will be used by the **separate Next.js admin portal** project.

### **1. Get All Service Requests**

**Endpoint:** `GET /api/admin/services/all?status=pending_assignment&urgency=high`

**Role:** Admin

**Query Params:**
- `status`
- `serviceType`
- `urgency`
- `assignedAdmin`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "service_001",
      "serviceType": "plumbing",
      "title": "Fix leaking tap",
      "urgency": "high",
      "status": "pending_assignment",
      "rentalId": {...},
      "propertyId": {...},
      "landlordId": {
        "firstName": "John",
        "lastName": "Smith",
        "phoneNumber": "+260971234567"
      },
      "tenantId": {
        "firstName": "Sarah",
        "lastName": "Johnson",
        "phoneNumber": "+260971234568"
      },
      "requestedDate": "2025-10-25T09:00:00.000Z",
      "createdAt": "2025-10-19T10:00:00.000Z"
    }
  ]
}
```

---

### **2. Assign Vendor**

**Endpoint:** `PUT /api/admin/services/:serviceId/assign`

**Role:** Admin

**Request:**
```json
{
  "serviceProvider": {
    "name": "Mike the Plumber",
    "phoneNumber": "+260971234567",
    "company": "Quick Fix Plumbers",
    "rating": 4.8
  },
  "scheduledDate": "2025-10-25T09:00:00.000Z",
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
    "_id": "service_001",
    "status": "scheduled",
    "serviceProvider": {
      "name": "Mike the Plumber",
      "phoneNumber": "+260971234567",
      "company": "Quick Fix Plumbers",
      "rating": 4.8
    },
    "scheduledDate": "2025-10-25T09:00:00.000Z",
    "estimatedCost": 150
  }
}
```

---

### **3. Update Service Status**

**Endpoint:** `PUT /api/admin/services/:serviceId/status`

**Role:** Admin

**Request:**
```json
{
  "status": "in_progress",
  "notes": "Vendor arrived on site"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Service status updated",
  "data": {
    "_id": "service_001",
    "status": "in_progress",
    "adminNotes": "Vendor arrived on site"
  }
}
```

---

### **4. Create Bill**

**Endpoint:** `POST /api/admin/services/:serviceId/bill`

**Role:** Admin

**Request:**
```json
{
  "finalCost": 180,
  "billDetails": {
    "items": [
      {"description": "Tap replacement", "amount": 100},
      {"description": "Labor", "amount": 50},
      {"description": "Transport", "amount": 30}
    ],
    "subtotal": 180,
    "tax": 0,
    "total": 180
  },
  "invoiceUrl": "https://khayalami.com/invoices/invoice_001.pdf",
  "notes": "Service completed successfully. New tap installed."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bill created successfully",
  "data": {
    "_id": "service_001",
    "finalCost": 180,
    "invoiceUrl": "https://khayalami.com/invoices/invoice_001.pdf",
    "receiptNumber": "SVC-1729350000-789",
    "paymentStatus": "pending_approval"
  }
}
```

---

## 📊 Service Status Reference

| Status | Meaning | Who Can See | Next Action |
|--------|---------|-------------|-------------|
| `pending_landlord_approval` | Waiting for landlord to approve/reject | Both | Landlord approves/rejects |
| `approved` | Landlord approved (legacy, replaced by pending_assignment) | Both | Admin assigns vendor |
| `pending_assignment` | Approved, waiting for vendor assignment | Both | Admin assigns vendor |
| `rejected` | Landlord rejected request | Both | None (end state) |
| `scheduled` | Vendor assigned, service scheduled | Both | Vendor arrives |
| `in_progress` | Vendor working on site | Both | Vendor completes work |
| `completed` | Work completed | Both | Admin creates bill |
| `cancelled` | Service cancelled by user | Both | None (end state) |

---

## 💰 Payment Status Reference

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `unpaid` | No payment required yet | Admin creates bill after completion |
| `pending_approval` | Bill created, awaiting payment | Payer makes payment |
| `paid` | Payment completed | User can rate service |
| `refunded` | Payment refunded | None |

---

## 🔔 Notification Events

| Event | Trigger | Tenant Notified | Landlord Notified | Admin Notified |
|-------|---------|----------------|-------------------|----------------|
| Service booked (tenant) | `POST /book` | ✅ Confirmation | ✅ Approval request | ❌ |
| Service booked (landlord) | `POST /book` | ✅ Scheduled notification | ✅ Confirmation | ✅ (if no vendor) |
| Service approved | `POST /:id/approve` | ✅ "Approved" | ✅ Confirmation | ✅ (if pending_assignment) |
| Service rejected | `POST /:id/reject` | ✅ Rejection reason | ✅ Confirmation | ❌ |
| Vendor assigned | `PUT /admin/:id/assign` | ✅ Vendor details & ETA | ✅ Vendor details | ❌ |
| Service in progress | `PUT /admin/:id/status` | ✅ Status update | ✅ Status update | ❌ |
| Service completed | `PUT /admin/:id/status` | ✅ "Completed" | ✅ "Completed" | ❌ |
| Bill created | `POST /admin/:id/bill` | ✅ (if tenant pays) | ✅ (if landlord pays) | ❌ |
| Payment made | `POST /:id/pay` | ✅ Receipt | ✅ Receipt | ❌ |
| Service rated | `POST /:id/rate` | ❌ | ✅ Rating | ✅ Rating |

---

## 🎯 Frontend Integration Checklist

### **Tenant Features:**
- [ ] Book service form
- [ ] View pending services (awaiting landlord approval)
- [ ] View scheduled services (with vendor ETA)
- [ ] View service history
- [ ] Upload photos/videos
- [ ] Pay for services (if tenant pays)
- [ ] Rate completed services
- [ ] View recurring service reminders

### **Landlord Features:**
- [ ] View pending approval requests
- [ ] Approve service (with/without vendor)
- [ ] Reject service (with reason)
- [ ] Provide own vendor details
- [ ] View all services across properties
- [ ] Pay for services (if landlord pays)
- [ ] View service history & invoices
- [ ] Manage recurring services

### **Admin Portal Features (Separate Project):**
- [ ] View all service requests (filterable)
- [ ] Assign vendors from approved list
- [ ] Update service status
- [ ] Create bills & invoices
- [ ] View service analytics
- [ ] Manage vendor directory

---

**Last Updated:** October 19, 2025  
**Version:** 2.0 - Complete API with Landlord Approval Flow



