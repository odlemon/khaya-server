# 🏠 **Landlord Service Management - Complete Workflow**

## **📋 What Landlords Need to Do**

When a tenant requests a service, the landlord has 3 simple options:

1. **✅ Approve with their own vendor** (`hasVendor: true`)
2. **✅ Approve without vendor** (`hasVendor: false`) 
3. **❌ Reject the service**

---

## **🎯 Step-by-Step Landlord Workflow**

### **Step 1: View Pending Service Requests**
```http
GET /api/services/landlord/pending
Authorization: Bearer LANDLORD_TOKEN
```

**What you'll see:**
- Service title and description
- Urgency level (low, medium, high, emergency)
- Tenant details (name, phone)
- Property details
- Requested date
- Photos/videos (if provided)

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
        "lastName": "Johnson",
        "phoneNumber": "+260971234568"
      },
      "propertyId": {
        "title": "2 Bedroom Apartment",
        "address": "123 Main Street, Lusaka"
      },
      "createdAt": "2025-10-20T10:30:00.000Z"
    }
  ]
}
```

---

### **Step 2: Make Your Decision**

#### **Option A: Approve with Your Own Vendor**
```http
POST /api/services/:serviceId/approve
Authorization: Bearer LANDLORD_TOKEN

{
  "approvalNotes": "I'll arrange my plumber",
  "hasVendor": true
}
```

**What happens:**
- ✅ Service status: `scheduled`
- ✅ Service gets scheduled immediately
- ✅ No admin involvement needed
- ✅ Tenant gets notified

#### **Option B: Approve without Vendor (Let Admin Find One)**
```http
POST /api/services/:serviceId/approve
Authorization: Bearer LANDLORD_TOKEN

{
  "approvalNotes": "Please assign a vendor",
  "hasVendor": false
}
```

**What happens:**
- ✅ Service status: `approved`
- ⏳ Admin assigns vendor later
- ⏳ Admin changes status to `scheduled`
- ✅ Tenant gets notified

#### **Option C: Reject the Service**
```http
POST /api/services/:serviceId/reject
Authorization: Bearer LANDLORD_TOKEN

{
  "rejectionReason": "Not necessary at this time"
}
```

**What happens:**
- ❌ Service status: `rejected`
- 📧 Tenant gets notified with reason
- 🔄 Tenant can request again if needed

---

### **Step 3: Monitor Your Services**
```http
GET /api/services/landlord/all
Authorization: Bearer LANDLORD_TOKEN
```

**Track services through their lifecycle:**
- `approved` → `scheduled` → `in_progress` → `completed`

---

### **Step 4: View Payment Status (If You Need to Pay)**
```http
GET /api/services/payment-status?paymentStatus=unpaid&status=completed
Authorization: Bearer LANDLORD_TOKEN
```

**What you'll see:**
- Services where you need to pay
- Payment status for each service
- Amount due and payment method

---

## **💡 Landlord Decision Guide**

### **✅ When to Approve with Vendor (`hasVendor: true`):**
- You have a trusted vendor for this type of service
- You want to control the quality and timing
- You have an existing relationship with the vendor
- You want to handle it yourself

**Example:**
```json
{
  "approvalNotes": "I'll arrange my plumber",
  "hasVendor": true
}
```

### **✅ When to Approve without Vendor (`hasVendor: false`):**
- You don't have a vendor for this service type
- You want admin to find the best vendor
- You want to leverage admin's vendor network
- You're not sure who to call

**Example:**
```json
{
  "approvalNotes": "Please assign a vendor",
  "hasVendor": false
}
```

### **❌ When to Reject:**
- The service is not necessary
- The timing is not good
- The request is unreasonable
- You want to handle it yourself

**Example:**
```json
{
  "rejectionReason": "Not necessary at this time"
}
```

---

## **🔄 Service Status Flow (Landlord View)**

```
pending_landlord_approval
    ↓
    ├─ APPROVE (hasVendor: true) → scheduled → in_progress → completed
    ├─ APPROVE (hasVendor: false) → approved → scheduled → in_progress → completed
    └─ REJECT → rejected
```

---

## **📱 Landlord Dashboard Actions**

### **Quick Actions:**
1. **View pending requests** → `GET /api/services/landlord/pending`
2. **Approve with vendor** → `POST /api/services/:id/approve` (hasVendor: true)
3. **Approve without vendor** → `POST /api/services/:id/approve` (hasVendor: false)
4. **Reject service** → `POST /api/services/:id/reject`
5. **View all services** → `GET /api/services/landlord/all`
6. **View payment status** → `GET /api/services/payment-status`

---

## **💰 Payment Tracking (Landlord Side)**

### **If You Need to Pay:**
- Services where `paidBy: "landlord"`
- Services where `paidBy: "split"`
- You'll see "Pay Now" button
- Payment status: `unpaid`, `pending_approval`, `paid`

### **If Tenant Pays:**
- Services where `paidBy: "tenant"`
- No payment required from you
- Just monitor completion

---

## **🎯 Quick Reference**

| Action | Endpoint | Request Body |
|--------|----------|--------------|
| View Pending | `GET /api/services/landlord/pending` | - |
| Approve (has vendor) | `POST /api/services/:id/approve` | `{"hasVendor": true}` |
| Approve (no vendor) | `POST /api/services/:id/approve` | `{"hasVendor": false}` |
| Reject | `POST /api/services/:id/reject` | `{"rejectionReason": "..."}` |
| View All | `GET /api/services/landlord/all` | - |
| View Payments | `GET /api/services/payment-status` | - |

---

## **📋 Complete Request Examples**

### **Approve with Vendor:**
```http
POST /api/services/service_123/approve
Authorization: Bearer LANDLORD_TOKEN

{
  "approvalNotes": "I'll arrange my plumber",
  "hasVendor": true
}
```

### **Approve without Vendor:**
```http
POST /api/services/service_123/approve
Authorization: Bearer LANDLORD_TOKEN

{
  "approvalNotes": "Please assign a vendor",
  "hasVendor": false
}
```

### **Reject Service:**
```http
POST /api/services/service_123/reject
Authorization: Bearer LANDLORD_TOKEN

{
  "rejectionReason": "Not necessary at this time"
}
```

---

## **🎯 Landlord Best Practices**

### **✅ Quick Decision Making:**
- **Plumbing/Electrical** → Usually approve with vendor (you have trusted contacts)
- **Cleaning** → Usually approve with vendor (you have regular cleaner)
- **AC Servicing** → Usually approve without vendor (let admin find specialist)
- **Unnecessary requests** → Reject with clear reason

### **✅ Communication:**
- Always provide approval notes
- Be clear about rejection reasons
- Respond promptly to service requests

### **✅ Payment Management:**
- Check payment status regularly
- Pay for services you're responsible for
- Monitor service completion

---

**That's it! Simple 3-step process for landlords: View → Decide → Act** 🚀

**No complex vendor management - just a simple true/false question!** ✅



