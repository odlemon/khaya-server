# 🛠️ Services System - Quick Reference

## 📌 Overview

The Services System allows tenants and landlords to book add-on services like aircon servicing, cleaning, plumbing, electrical work, etc.

---

## 🔌 Main Endpoints (Tenant/Landlord)

### **1. Book Service**
```http
POST /api/services/book
Authorization: Bearer TOKEN

{
  "rentalId": "rental_123",
  "serviceType": "plumbing",
  "title": "Fix leaking tap",
  "description": "Kitchen tap leaking for 2 days",
  "urgency": "high",
  "requestedDate": "2025-10-25T09:00:00.000Z",
  "paidBy": "landlord",
  "photoUrls": ["https://..."],
  "isRecurring": false
}
```

**Response:** Service created with status `"pending"`

---

### **2. Get Services for Rental**
```http
GET /api/services/rental/:rentalId?status=pending
Authorization: Bearer TOKEN
```

**Response:** List of all services for that rental

---

### **3. Get Service Details**
```http
GET /api/services/:serviceId
Authorization: Bearer TOKEN
```

**Response:** Complete service details including vendor info

---

### **4. Cancel Service**
```http
PUT /api/services/:serviceId/cancel
Authorization: Bearer TOKEN

{
  "reason": "No longer needed"
}
```

---

### **5. Rate Service**
```http
POST /api/services/:serviceId/rate
Authorization: Bearer TOKEN

{
  "rating": 5,
  "feedback": "Excellent service!"
}
```

---

### **6. Pay for Service**
```http
POST /api/services/:serviceId/pay
Authorization: Bearer TOKEN

{
  "amount": 150,
  "paymentMethod": "in_app",
  "gatewayResponse": {...}
}
```

---

### **7. Get Service History**
```http
GET /api/services/history?status=completed
Authorization: Bearer TOKEN
```

**Response:** All services across all rentals for the user

---

### **8. Get Service Reminders**
```http
GET /api/services/reminders
Authorization: Bearer TOKEN
```

**Response:** Upcoming recurring service reminders

---

## 👨‍💼 Admin Endpoints

### **1. Get All Service Requests**
```http
GET /api/admin/services/all?status=pending&urgency=high
Authorization: Bearer ADMIN_TOKEN
```

---

### **2. Assign Vendor**
```http
PUT /api/admin/services/:serviceId/assign
Authorization: Bearer ADMIN_TOKEN

{
  "serviceProvider": {
    "name": "John Plumber",
    "phoneNumber": "+260971234567",
    "company": "Zambia Plumbers Ltd",
    "rating": 4.5
  },
  "scheduledDate": "2025-10-25T09:00:00.000Z",
  "estimatedCost": 150,
  "adminNotes": "Vendor dispatched"
}
```

**Status:** `"pending"` → `"scheduled"`

---

### **3. Update Service Status**
```http
PUT /api/admin/services/:serviceId/status
Authorization: Bearer ADMIN_TOKEN

{
  "status": "in_progress",
  "notes": "Vendor arrived on site"
}
```

---

### **4. Create Bill**
```http
POST /api/admin/services/:serviceId/bill
Authorization: Bearer ADMIN_TOKEN

{
  "finalCost": 180,
  "billDetails": {
    "items": [
      {"description": "Tap replacement", "amount": 100},
      {"description": "Labor", "amount": 50},
      {"description": "Transport", "amount": 30}
    ],
    "total": 180
  },
  "invoiceUrl": "https://.../invoice.pdf",
  "notes": "Service completed successfully"
}
```

**Payment Status:** `"unpaid"` → `"pending_approval"`

---

## 🎯 Service Types

| Type | Code | Recurring? |
|------|------|-----------|
| 🧊 Aircon Servicing | `aircon_servicing` | ✅ Yes (3-6 months) |
| 🧹 Cleaning | `cleaning` | ✅ Yes (weekly/monthly) |
| 🔧 Plumbing | `plumbing` | ❌ No |
| ⚡ Electrical | `electrical` | ❌ No |
| 🪛 Handyman | `handyman` | ❌ No |
| 🪴 Gardening | `gardening` | ✅ Yes (monthly) |
| 🐛 Pest Control | `pest_control` | ✅ Yes (quarterly) |
| 📝 Custom | `custom` | Optional |

---

## 📊 Service Status Flow

```
1. pending (User books service)
   ↓
2. scheduled (Admin assigns vendor)
   ↓
3. in_progress (Vendor working)
   ↓
4. completed (Work done)
   ↓
5. Bill created → Payment made → Rated
```

---

## 💡 Payment Status Flow

```
1. unpaid (Service not yet paid)
   ↓
2. pending_approval (Bill created, awaiting payer)
   ↓
3. paid (Payment completed)
```

---

## 🔔 Who Pays?

- **Tenant:** `paidBy: "tenant"`
- **Landlord:** `paidBy: "landlord"`
- **Split 50/50:** `paidBy: "split"`

---

## ⭐ Urgency Levels

- **🟢 Low:** Can wait a week
- **🟡 Medium:** Within 2-3 days
- **🟠 High:** Within 24 hours
- **🔴 Emergency:** Immediate attention

---

## 📱 Frontend Tips

### **Display Service Card**
```vue
<div class="service-card">
  <span class="urgency-badge" :class="service.urgency">
    {{ service.urgency }}
  </span>
  <h3>{{ service.title }}</h3>
  <p>{{ service.serviceType }}</p>
  <p>{{ service.status }}</p>
  <p>Who pays: {{ service.paidBy }}</p>
  <button v-if="service.status === 'completed' && !service.rating">
    Rate Service
  </button>
</div>
```

### **Book Service Form**
```javascript
const bookService = async () => {
  await axios.post('/api/services/book', {
    rentalId: rentalId,
    serviceType: 'plumbing',
    title: 'Fix leak',
    description: '...',
    urgency: 'high',
    requestedDate: new Date(),
    paidBy: 'landlord'
  });
};
```

---

## 🎉 Key Features

✅ **8 Service Types** + Custom  
✅ **Recurring Services** (aircon, cleaning, gardening)  
✅ **Automated Reminders** (for recurring services)  
✅ **In-App Payment**  
✅ **ETA Tracking** (vendor arrival)  
✅ **Bill Generation** (automatic invoices)  
✅ **Rating System** (1-5 stars)  
✅ **Photo/Video Upload** (document issues)  
✅ **Split Payments** (tenant/landlord cost sharing)  

---

**Last Updated:** October 19, 2025  
**Version:** 1.0



