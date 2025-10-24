# 🛠️ Khayalami Services - CORRECTED Workflow (Aligned with Requirements)

## 🔴 Key Difference from Current Implementation

### **Your Requirement:**
> **"Maintenance Approval: (Landlord) Approve before KhayalamiFix dispatch"**

This means landlord must approve tenant's service request BEFORE admin dispatches vendor.

---

## ✅ CORRECTED Workflow

### **Scenario 1: Tenant Books Service (Landlord Pays)**

```
1. Tenant books service
   - Service Type: Plumbing
   - Who pays: Landlord
   - Status: "pending_landlord_approval"
   ↓
2. Landlord receives notification
   - "Tenant requested plumbing service. Approve?"
   ↓
3A. Landlord APPROVES
    - Status: "approved" → "pending_assignment"
    - Landlord can optionally select vendor or let admin choose
    ↓
4. Admin assigns vendor (or landlord chose vendor)
   - Status: "scheduled"
   - Vendor details added
   - ETA provided
   ↓
5. Vendor arrives
   - Status: "in_progress"
   ↓
6. Work completed
   - Status: "completed"
   ↓
7. Admin creates bill
   - Landlord receives invoice
   - Payment Status: "pending_approval"
   ↓
8. Landlord pays
   - Payment Status: "paid"
   ↓
9. Tenant rates service
   - Rating: 1-5 stars

OR

3B. Landlord REJECTS
    - Status: "rejected"
    - Rejection reason sent to tenant
    - Service cancelled
```

---

### **Scenario 2: Tenant Books Service (Tenant Pays)**

```
1. Tenant books service
   - Service Type: Aircon Servicing
   - Who pays: Tenant
   - Status: "pending_landlord_approval" (still needs approval!)
   ↓
2. Landlord receives notification
   - "Tenant requested aircon service (tenant paying). Approve?"
   ↓
3A. Landlord APPROVES
    - Status: "approved" → "pending_assignment"
    ↓
4. Admin assigns vendor
   - Status: "scheduled"
   ↓
5. Service completed
   ↓
6. Admin creates bill
   - Tenant receives invoice
   - Payment Status: "pending_approval"
   ↓
7. Tenant pays
   - Payment Status: "paid"

OR

3B. Landlord REJECTS
    - Status: "rejected"
    - Service cancelled
```

---

### **Scenario 3: Landlord Books Service (Landlord Pays)**

```
1. Landlord books service
   - Service Type: Pest Control
   - Who pays: Landlord
   - Status: "approved" (auto-approved, landlord is booking)
   ↓
2. Landlord can choose vendor OR let admin choose
   ↓
3. Admin assigns vendor (if landlord didn't choose)
   - Status: "scheduled"
   ↓
4. Service completed
   ↓
5. Admin creates bill
   - Landlord receives invoice
   ↓
6. Landlord pays
   - Payment Status: "paid"
```

---

## 🔧 Required Changes

### **1. Update Status Enum**

**Current:**
```typescript
status: "pending" | "approved" | "rejected" | "scheduled" 
        | "in_progress" | "completed" | "cancelled"
```

**Should be:**
```typescript
status: "pending_landlord_approval" | "approved" | "rejected" 
        | "pending_assignment" | "scheduled" | "in_progress" 
        | "completed" | "cancelled"
```

---

### **2. Add Landlord Approval Endpoints**

**New Endpoints Needed:**

```http
POST /api/services/:serviceId/approve
Authorization: Bearer LANDLORD_TOKEN

{
  "approvalNotes": "Approved. Please send vendor ASAP",
  "preferredVendor"?: {
    "name": "John Plumber",
    "phoneNumber": "+260971234567"
  }
}
```

```http
POST /api/services/:serviceId/reject
Authorization: Bearer LANDLORD_TOKEN

{
  "rejectionReason": "Too expensive. Tenant should fix it themselves."
}
```

---

### **3. Update Service Booking Logic**

**In `ServiceBookingService.bookService()`:**

```typescript
// Current
const service = await ServiceBooking.create({
  ...
  status: "pending", // ❌ Wrong
  ...
});

// Should be
const service = await ServiceBooking.create({
  ...
  status: userRole === "landlord" && data.paidBy === "landlord" 
    ? "approved"  // Auto-approve if landlord books and pays
    : "pending_landlord_approval", // Requires landlord approval
  ...
});
```

---

### **4. Vendor Selection**

Your requirement says **"landlord can look for the plumber"**

**Option A: Landlord Provides Vendor Details**
```http
POST /api/services/book

{
  "serviceType": "plumbing",
  "landlordProvidedVendor": {
    "name": "John Plumber",
    "phoneNumber": "+260971234567",
    "company": "Zambia Plumbers Ltd"
  }
}
```

**Option B: Landlord Chooses from List**
- Admin maintains a vendor directory
- Landlord selects from approved vendors
- Frontend shows dropdown of available plumbers

---

## 📊 Updated Status Flow

### **Tenant Books → Landlord Pays:**
```
pending_landlord_approval
  ↓ (Landlord approves)
approved
  ↓ (Admin/Landlord assigns vendor)
scheduled
  ↓ (Vendor working)
in_progress
  ↓ (Work done)
completed
  ↓ (Bill created)
Payment: pending_approval
  ↓ (Landlord pays)
Payment: paid
```

### **Landlord Books → Landlord Pays:**
```
approved (auto)
  ↓
scheduled
  ↓
in_progress
  ↓
completed
  ↓
paid
```

---

## 🔔 Updated Notifications

### **1. Tenant Books Service:**
- ✉️ **Landlord:** "Tenant requested plumbing service. Please approve or reject."

### **2. Landlord Approves:**
- ✉️ **Tenant:** "Landlord approved your service request. Vendor will be assigned soon."
- ✉️ **Admin:** "Service approved. Please assign vendor."

### **3. Landlord Rejects:**
- ✉️ **Tenant:** "Landlord rejected your service request. Reason: [reason]"

### **4. Vendor Assigned:**
- ✉️ **Tenant:** "Vendor assigned: John Plumber. ETA: Oct 25, 9 AM"
- ✉️ **Landlord:** "Vendor dispatched: John Plumber. ETA: Oct 25, 9 AM"

---

## 🎯 Key Business Rules

1. **Tenant books service → ALWAYS requires landlord approval** (even if tenant pays)
2. **Landlord books service → Auto-approved** (no approval needed)
3. **Landlord can select vendor** OR let admin choose from approved list
4. **Bills are sent to payer** (tenant or landlord based on `paidBy`)
5. **Service cannot be scheduled** until landlord approves
6. **Urgent/Emergency services** may bypass approval (optional setting)

---

## ❓ Questions for Clarification

### **1. Vendor Selection:**
**Who chooses the vendor?**
- [ ] Admin always chooses (current implementation)
- [ ] Landlord always chooses
- [ ] Landlord can choose OR let admin decide
- [ ] Landlord selects from approved vendor list

### **2. Emergency Services:**
**For "emergency" urgency, should approval be bypassed?**
- [ ] Yes - dispatch immediately, notify landlord after
- [ ] No - still requires approval (may delay response)

### **3. Split Payment:**
**How does approval work for split payment?**
- [ ] Landlord approves (since they're part-paying)
- [ ] Auto-approved (both parties agreed to split)

### **4. Maintenance Toggle:**
**You mentioned "Maintenance Approval (Landlord)"**
- [ ] Always ON (all services require approval)
- [ ] Landlord can toggle OFF (tenant can book without approval)

---

## 🚀 What Needs to Change

### **Files to Modify:**

1. **`src/models/ServiceBooking.ts`**
   - Update status enum
   - Add `landlordProvidedVendor` field
   - Add `approvalNotes` field

2. **`src/services/ServiceBookingService.ts`**
   - Add `approveLandlordService()` method
   - Add `rejectLandlordService()` method
   - Update `bookService()` logic for auto-approval

3. **`src/controllers/ServiceBookingController.ts`**
   - Add `approveLandlordService()` controller
   - Add `rejectLandlordService()` controller

4. **`src/routes/serviceRoutes.ts`**
   - Add `POST /services/:serviceId/approve` route
   - Add `POST /services/:serviceId/reject` route

5. **Update Documentation:**
   - All workflow diagrams
   - API endpoints
   - Frontend implementation guides

---

## 🎉 Summary

**The current implementation is 80% correct but missing:**

1. ❌ Landlord approval step
2. ❌ Landlord vendor selection option
3. ❌ `pending_landlord_approval` status
4. ❌ Approve/Reject endpoints

**Once these are added, it will be 100% aligned with your requirements!**

---

**Should I proceed with implementing these changes?** 🚀

---

**Last Updated:** October 19, 2025  
**Version:** 1.0 - Requires Approval Flow Fix



