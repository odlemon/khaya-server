# 🔧 **Service System - Simple Workflow & Endpoints**

## **📋 System Overview**

The service system allows tenants to request services (plumbing, electrical, etc.) and landlords to approve them. The key is a simple boolean: does the landlord have a vendor or not?

**No vendor management** - just a true/false question!

---

## **🎯 Complete Workflow**

### **Step 1: Tenant Requests Service**
```http
POST /api/services/book
Authorization: Bearer TENANT_TOKEN

{
  "rentalId": "rental_123",
  "serviceType": "plumbing",
  "title": "Fix leaking tap",
  "description": "Kitchen tap is leaking",
  "urgency": "high",
  "requestedDate": "2025-10-25T09:00:00.000Z",
  "paidBy": "landlord"
}
```

**Result:** Service status = `pending_landlord_approval`

---

### **Step 2: Landlord Reviews Request**
```http
GET /api/services/landlord/pending
Authorization: Bearer LANDLORD_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "service_123",
      "title": "Fix leaking tap",
      "serviceType": "plumbing",
      "description": "Kitchen tap is leaking",
      "urgency": "high",
      "status": "pending_landlord_approval",
      "tenantId": {
        "firstName": "Sarah",
        "lastName": "Johnson"
      },
      "propertyId": {
        "title": "2 Bedroom Apartment"
      }
    }
  ]
}
```

---

### **Step 3: Landlord Takes Action**

#### **Option A: Landlord Has Vendor**
```http
POST /api/services/:serviceId/approve
Authorization: Bearer LANDLORD_TOKEN

{
  "approvalNotes": "I'll arrange my plumber",
  "hasVendor": true
}
```

**Result:**
- ✅ Service status: `scheduled`
- ✅ Service gets scheduled immediately
- ✅ No admin involvement needed

#### **Option B: Landlord Has No Vendor**
```http
POST /api/services/:serviceId/approve
Authorization: Bearer LANDLORD_TOKEN

{
  "approvalNotes": "Please assign a vendor",
  "hasVendor": false
}
```

**Result:**
- ✅ Service status: `approved`
- ⏳ Admin assigns vendor later
- ⏳ Admin changes status to `scheduled`

#### **Option C: Landlord Rejects**
```http
POST /api/services/:serviceId/reject
Authorization: Bearer LANDLORD_TOKEN

{
  "rejectionReason": "Not necessary at this time"
}
```

**Result:**
- ❌ Service status: `rejected`
- 📧 Tenant gets notified

---

### **Step 4: Admin Assigns Vendor (If Needed)**

#### **Admin Sees Services Needing Vendor Assignment**
```http
GET /api/services/admin/needing-vendor
Authorization: Bearer ADMIN_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "service_123",
      "title": "Fix leaking tap",
      "status": "approved",
      "landlordId": {
        "firstName": "John",
        "lastName": "Smith"
      },
      "tenantId": {
        "firstName": "Sarah",
        "lastName": "Johnson"
      }
    }
  ]
}
```

#### **Admin Assigns Vendor**
```http
POST /api/services/admin/:serviceId/assign-vendor
Authorization: Bearer ADMIN_TOKEN

{
  "name": "Mike the Plumber",
  "phoneNumber": "+260971234567",
  "company": "Quick Fix Plumbers",
  "scheduledDate": "2025-10-25T09:00:00.000Z"
}
```

**Result:**
- ✅ Service status: `scheduled`
- ✅ Vendor assigned
- ✅ Service scheduled

---

### **Step 5: Service Completion**
```http
POST /api/services/:serviceId/complete
Authorization: Bearer USER_TOKEN

{
  "completionNotes": "Service completed successfully",
  "finalCost": 150,
  "photos": ["https://firebase.../completed.jpg"]
}
```

**Result:**
- ✅ Service status: `completed`
- 💰 Payment tracking begins

---

## **📊 Service Status Flow**

```
pending_landlord_approval
    ↓
    ├─ APPROVE (hasVendor: true) → scheduled → in_progress → completed
    ├─ APPROVE (hasVendor: false) → approved → scheduled → in_progress → completed
    └─ REJECT → rejected
```

---

## **💰 Payment Tracking**

### **View Services with Payment Status**
```http
GET /api/services/payment-status?paymentStatus=unpaid&status=completed
Authorization: Bearer USER_TOKEN
```

### **Payment Flow:**
- **If `paidBy: "tenant"`** → Tenant sees "Pay Now" button
- **If `paidBy: "landlord"`** → Landlord sees "Pay Now" button
- **If `paidBy: "split"`** → Both see payment options

---

## **🎯 Complete Endpoint List**

### **📱 Landlord Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/services/landlord/pending` | GET | View pending service requests |
| `/api/services/landlord/all` | GET | View all services |
| `/api/services/:serviceId/approve` | POST | Approve service (with hasVendor boolean) |
| `/api/services/:serviceId/reject` | POST | Reject service |
| `/api/services/payment-status` | GET | View services with payment status |

### **👨‍💼 Admin Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/services/admin/needing-vendor` | GET | Get services needing vendor assignment |
| `/api/services/admin/:serviceId/assign-vendor` | POST | Assign vendor to service |

### **👥 General Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/services/:serviceId` | GET | Get service details |
| `/api/services/:serviceId/complete` | POST | Mark service as completed |

---

## **💡 Key Features**

### **✅ Simple Boolean Logic:**
- `hasVendor: true` → Landlord has vendor → Service scheduled
- `hasVendor: false` → Landlord has no vendor → Admin assigns vendor

### **✅ No Vendor Management:**
- No vendor database
- No vendor profiles
- Just simple yes/no question

### **✅ Payment Tracking:**
- Separate from rent payments
- Tracks who pays (tenant/landlord/split)
- Shows payment status for each service

### **✅ Admin Oversight:**
- Admin sees services needing vendor assignment
- Admin assigns vendors to approved services
- Admin can mark services as completed

---

## **📋 Request Examples**

### **Landlord Approves with Vendor:**
```json
{
  "approvalNotes": "I'll arrange my plumber",
  "hasVendor": true
}
```

### **Landlord Approves without Vendor:**
```json
{
  "approvalNotes": "Please assign a vendor",
  "hasVendor": false
}
```

### **Landlord Rejects:**
```json
{
  "rejectionReason": "Not necessary at this time"
}
```

### **Admin Assigns Vendor:**
```json
{
  "name": "Mike the Plumber",
  "phoneNumber": "+260971234567",
  "company": "Quick Fix Plumbers",
  "scheduledDate": "2025-10-25T09:00:00.000Z"
}
```

---

## **🔄 Complete User Journey**

### **Scenario 1: Landlord Has Vendor**
1. **Tenant requests service** → `pending_landlord_approval`
2. **Landlord approves with `hasVendor: true`** → `scheduled`
3. **Service gets completed** → `completed`
4. **Payment processed** → Based on `paidBy` field

### **Scenario 2: Landlord Has No Vendor**
1. **Tenant requests service** → `pending_landlord_approval`
2. **Landlord approves with `hasVendor: false`** → `approved`
3. **Admin assigns vendor** → `scheduled`
4. **Service gets completed** → `completed`
5. **Payment processed** → Based on `paidBy` field

### **Scenario 3: Landlord Rejects**
1. **Tenant requests service** → `pending_landlord_approval`
2. **Landlord rejects** → `rejected`
3. **Tenant can request again** → New service request

---

## **🎯 Quick Reference**

| Action | Endpoint | Role | Status Change |
|--------|----------|------|---------------|
| View Pending | `GET /api/services/landlord/pending` | Landlord | - |
| Approve (has vendor) | `POST /api/services/:id/approve` | Landlord | `scheduled` |
| Approve (no vendor) | `POST /api/services/:id/approve` | Landlord | `approved` |
| Reject | `POST /api/services/:id/reject` | Landlord | `rejected` |
| Assign Vendor | `POST /api/services/admin/:id/assign-vendor` | Admin | `scheduled` |
| Complete Service | `POST /api/services/:id/complete` | Any | `completed` |
| View Payment Status | `GET /api/services/payment-status` | Tenant/Landlord | - |

---

**The service system is now complete with simple boolean logic and proper payment tracking!** 🚀

**No complex vendor management - just a simple true/false question!** ✅



