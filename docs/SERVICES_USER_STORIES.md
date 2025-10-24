# 🛠️ Khayalami Services - User Stories & Workflow

> **Note:** Admin functionality will be implemented in a separate Next.js admin portal project.

---

## 👤 User Stories

### **Story 1: Tenant Requests Plumbing Service (Landlord Pays)**

**Scenario:** Sarah's kitchen tap is leaking. She wants the landlord to fix it.

#### **Steps:**

1. **Sarah (Tenant) Books Service:**
   - Opens "My Rental" → "Services" → "Request Service"
   - Selects: 🔧 **Plumbing**
   - Title: "Fix leaking kitchen tap"
   - Description: "Kitchen tap has been leaking for 2 days. Getting worse."
   - Uploads photo of the leak
   - Urgency: **High** (🟠 Within 24 hours)
   - Who pays: **Landlord**
   - Clicks "Submit Request"
   
   **✅ Result:** Service created with status `"pending_landlord_approval"`
   
   **Notification sent to landlord:**
   > "🔧 Sarah requested plumbing service: Fix leaking kitchen tap (High urgency). Please review and approve."

---

2. **John (Landlord) Reviews Request:**
   - Gets push notification
   - Opens "Services" → "Pending Approval"
   - Sees Sarah's request with:
     - Photo of the leak
     - Description
     - Urgency: High
     - Requested date: Tomorrow, 9 AM
   
   **Option A: Landlord Approves Without Vendor**
   - Clicks "Approve"
   - Adds note: "Approved. Please send vendor ASAP"
   - Clicks "Confirm"
   
   **✅ Result:** Status changes to `"pending_assignment"`
   
   **Notifications sent:**
   - **Sarah (Tenant):** "✅ Landlord approved your plumbing service. A vendor will be assigned soon."
   - **Admin Portal:** "New service approved. Please assign vendor."

---

   **Option B: Landlord Provides Own Plumber**
   - Clicks "Approve & Select Vendor"
   - Enters vendor details:
     - Name: "Mike the Plumber"
     - Phone: "+260971234567"
     - Company: "Quick Fix Plumbers"
   - Adds note: "Using our usual plumber Mike"
   - Clicks "Confirm"
   
   **✅ Result:** Status changes to `"scheduled"`
   - Vendor: Mike the Plumber
   - Scheduled Date: Tomorrow, 9 AM
   
   **Notifications sent:**
   - **Sarah (Tenant):** "✅ Service scheduled! Mike the Plumber (+260971234567) will arrive tomorrow at 9 AM."
   - **Mike (Vendor):** SMS sent with job details

---

   **Option C: Landlord Rejects Request**
   - Clicks "Reject"
   - Reason: "This is minor. Please tighten the tap yourself. YouTube has tutorials."
   - Clicks "Confirm"
   
   **✅ Result:** Status changes to `"rejected"`
   
   **Notification sent to Sarah:**
   > "❌ Service request rejected. Reason: This is minor. Please tighten the tap yourself. YouTube has tutorials."

---

3. **Vendor Arrives & Completes Work:** *(If approved)*
   - Mike arrives at 9 AM
   - **Admin updates status** in admin portal: `"in_progress"`
   - Mike fixes the tap
   - Takes "before & after" photos
   - **Admin updates status:** `"completed"`
   
   **Notifications sent:**
   - **Sarah:** "✅ Plumbing service completed!"
   - **John (Landlord):** "✅ Service completed. Bill: K150. Please review invoice."

---

4. **Landlord Receives & Pays Bill:**
   - **Admin creates bill** in admin portal:
     - Items:
       - Tap replacement: K80
       - Labor: K50
       - Transport: K20
     - **Total: K150**
   - Invoice PDF generated
   
   - **John (Landlord) opens app:**
     - Gets notification: "Bill ready: K150"
     - Views service details
     - Downloads invoice PDF
     - Clicks "Pay Now"
     - Selects: **Pay with card** (in-app payment)
     - Enters card details
     - Confirms payment
   
   **✅ Result:** Payment successful, status: `"paid"`
   
   **Notifications sent:**
   - **John:** "Payment successful! Receipt #REC-1729350000-123"
   - **Sarah:** "Service paid by landlord. You can now rate the service."

---

5. **Sarah Rates Service:**
   - Opens service history
   - Clicks "Rate Service"
   - Gives: ⭐⭐⭐⭐⭐ (5 stars)
   - Feedback: "Mike was professional and fixed it quickly!"
   - Clicks "Submit"
   
   **✅ Result:** Service complete with rating

---

### **Story 2: Landlord Books Aircon Servicing (Recurring)**

**Scenario:** John (Landlord) wants to maintain the aircon every 6 months.

#### **Steps:**

1. **John (Landlord) Books Service:**
   - Opens "My Properties" → Property → "Services" → "Book Service"
   - Selects: 🧊 **Aircon Servicing**
   - Title: "Aircon chemical cleaning - 2 units"
   - Description: "Both bedroom aircons need chemical cleaning"
   - Who pays: **Landlord** (me)
   - Preferred date: Next Saturday, 10 AM
   - ✅ **Recurring service** (every 6 months)
   - Clicks "Submit"
   
   **✅ Result:** Service created with status `"approved"` (auto-approved because landlord books and pays)
   
   **Notification sent to tenant:**
   > "📅 Landlord scheduled aircon servicing on Saturday at 10 AM. Please ensure someone is home."

---

2. **Admin Assigns Vendor:** *(or John provided vendor)*
   - **Admin opens portal:** Sees approved service
   - Assigns "Cool Air Services"
   - Estimated cost: K300
   - Confirms scheduling
   
   **✅ Result:** Status `"scheduled"`
   
   **Notifications sent:**
   - **John (Landlord):** "Vendor assigned: Cool Air Services. ETA: Saturday 10 AM. Cost: ~K300"
   - **Sarah (Tenant):** "Cool Air Services will service aircons on Saturday at 10 AM"

---

3. **Service Completed → Bill → Payment:**
   - Vendor completes work
   - Admin creates bill: **K350** (slightly over estimate)
   - John reviews and pays in-app
   
   **✅ Result:** Payment successful

---

4. **Automatic Reminder in 6 Months:**
   - **6 months later:**
   - John gets notification:
     > "⏰ Aircon servicing due in 7 days. Last service was 6 months ago. Book now?"
   
   - John clicks "Book Again"
   - Form pre-filled with previous details
   - Clicks "Submit"
   
   **✅ Result:** New recurring service created

---

### **Story 3: Tenant Books Cleaning Service (Tenant Pays)**

**Scenario:** Sarah wants a deep cleaning before her parents visit. She'll pay for it.

#### **Steps:**

1. **Sarah (Tenant) Books Cleaning:**
   - Selects: 🧹 **Cleaning**
   - Title: "Deep cleaning - full apartment"
   - Description: "Parents visiting next week. Need deep cleaning including windows and fridge."
   - Who pays: **Tenant** (me)
   - Preferred date: Friday, 2 PM
   - Clicks "Submit"
   
   **✅ Result:** Status `"pending_landlord_approval"` (landlord still needs to approve even though tenant pays!)
   
   **Notification to John (Landlord):**
   > "Sarah requested cleaning service (she's paying). Please approve."

---

2. **John (Landlord) Approves:**
   - Reviews request
   - Clicks "Approve"
   - Note: "Approved. Good tenant!"
   
   **✅ Result:** Status `"pending_assignment"`
   
   **Notification to Sarah:**
   > "✅ Landlord approved your cleaning request. Vendor will be assigned soon."

---

3. **Admin Assigns Cleaner:**
   - Assigns "Sparkle Clean Services"
   - Cost: K200
   - Status: `"scheduled"`

---

4. **Service Completed:**
   - Cleaner finishes work
   - Admin creates bill: **K200**
   - **Sarah (Tenant) receives notification:**
     > "Cleaning complete! Bill: K200. Please pay."
   
   - Sarah pays via mobile money in-app
   
   **✅ Result:** Payment successful
   
   **Notification to John:**
   > "Sarah paid for cleaning service. Service complete."

---

5. **Sarah Rates:**
   - ⭐⭐⭐⭐⭐ (5 stars)
   - "House is spotless! Thank you!"

---

### **Story 4: Emergency Electrical Issue**

**Scenario:** Sarah's power went out at night. Emergency!

#### **Steps:**

1. **Sarah Books Emergency Service:**
   - Selects: ⚡ **Electrical**
   - Title: "Power outage - no electricity"
   - Description: "Circuit breaker tripped. Can't reset. Need urgent help!"
   - Urgency: 🔴 **Emergency** (immediate attention)
   - Who pays: **Landlord**
   - Clicks "Submit"
   
   **✅ Result:** Status `"pending_landlord_approval"`
   
   **URGENT notification to John (Landlord):**
   > "🚨 EMERGENCY: Sarah reported power outage. Approve immediately!"

---

2. **John Approves Instantly:**
   - Gets urgent push notification (with sound)
   - Opens app immediately
   - Clicks "Approve & Select Vendor"
   - Selects his emergency electrician:
     - Name: "Lightning Fast Electric"
     - Phone: "+260977777777"
   - Clicks "Confirm"
   
   **✅ Result:** Status `"scheduled"` (electrician dispatched)
   
   **Notifications:**
   - **Sarah:** "Help is on the way! Lightning Fast Electric will call you shortly."
   - **Electrician:** SMS with address and Sarah's phone number

---

3. **Quick Resolution:**
   - Electrician arrives in 30 minutes
   - Fixes breaker issue
   - Admin marks: `"completed"`
   - Bill created: **K250**
   - John pays immediately
   
   **✅ Crisis resolved!**

---

## 📊 Status Flow Summary

### **Tenant Books → Landlord Pays:**
```
📝 pending_landlord_approval
  ↓ Landlord approves (without vendor)
🔄 pending_assignment
  ↓ Admin assigns vendor
📅 scheduled
  ↓ Vendor working
🔧 in_progress
  ↓ Work done
✅ completed
  ↓ Bill created
💰 Payment: pending_approval
  ↓ Landlord pays
💳 Payment: paid
  ↓ Tenant/Landlord rates
⭐ Rated & closed
```

### **Landlord Books → Landlord Pays:**
```
✅ approved (auto)
  ↓ Admin assigns vendor OR landlord provided vendor
📅 scheduled
  ↓ Vendor working
🔧 in_progress
  ↓ Work done
✅ completed
  ↓ Bill created & landlord pays
💳 paid
  ↓ Rating
⭐ Rated & closed
```

### **Landlord Rejects:**
```
📝 pending_landlord_approval
  ↓ Landlord rejects
❌ rejected (end)
```

---

## 🎯 Key User Experience Points

### **For Tenants:**
1. ✅ Easy to report issues (photos, descriptions)
2. ✅ Clear urgency levels (low, medium, high, emergency)
3. ✅ Real-time status updates
4. ✅ Know who's paying upfront
5. ✅ Can pay directly in-app
6. ✅ Rate service quality
7. ✅ View service history

### **For Landlords:**
1. ✅ Approve/reject all service requests
2. ✅ Choose own vendors (optional)
3. ✅ See cost estimates before approval
4. ✅ Track all services across properties
5. ✅ Pay bills in-app
6. ✅ Recurring services auto-remind
7. ✅ Emergency alerts with urgent notifications

### **For Vendors:**
- 📱 Receive job details via SMS
- 📍 Get property address and contact info
- ⏰ Know expected arrival time
- *(Full vendor app is separate project)*

---

## 🔔 Notifications Summary

| Event | Tenant Notified | Landlord Notified | Admin Notified |
|-------|----------------|-------------------|----------------|
| Tenant books service | ✅ Confirmation | ✅ Approval request | ❌ |
| Landlord approves | ✅ Approved | ✅ Confirmation | ✅ (if pending_assignment) |
| Landlord rejects | ✅ Rejection reason | ✅ Confirmation | ❌ |
| Vendor assigned | ✅ Vendor details & ETA | ✅ Vendor details | ❌ |
| Service in progress | ✅ Status update | ✅ Status update | ❌ |
| Service completed | ✅ Completed | ✅ Completed | ❌ |
| Bill created | ✅ (if tenant pays) | ✅ (if landlord pays) | ❌ |
| Payment made | ✅ Receipt | ✅ Receipt | ❌ |
| Service rated | ❌ | ✅ Rating notification | ✅ Rating |

---

## 🚨 Emergency Service Special Rules

For services marked as **🔴 Emergency**:

1. **Priority Notifications:**
   - Landlord gets urgent push notification (with sound)
   - SMS backup sent
   - Email sent

2. **Fast-Track Approval:**
   - Landlord has **30 minutes** to respond
   - If no response, admin can dispatch emergency vendor automatically

3. **Premium Vendors:**
   - 24/7 availability
   - Faster response times
   - May have higher costs

---

## 🎨 UI/UX Recommendations

### **Service Booking Form:**
```
┌─────────────────────────────────────┐
│  📝 Request Service                 │
├─────────────────────────────────────┤
│                                      │
│  Service Type *                      │
│  [Dropdown: Plumbing ▼]             │
│                                      │
│  What needs fixing? *                │
│  [Text: Fix leaking tap...]         │
│                                      │
│  Description *                       │
│  [Textarea: Kitchen tap leaking...] │
│                                      │
│  Urgency *                           │
│  [ ] 🟢 Low    [ ] 🟡 Medium        │
│  [✓] 🟠 High   [ ] 🔴 Emergency     │
│                                      │
│  Upload Photos (optional)            │
│  [📷 Add Photos]                    │
│                                      │
│  Who pays? *                         │
│  ( ) Tenant    (•) Landlord         │
│                                      │
│  Preferred Date & Time *             │
│  [📅 Tomorrow, 9:00 AM]             │
│                                      │
│  [Cancel]     [Submit Request]       │
└─────────────────────────────────────┘
```

### **Landlord Approval Screen:**
```
┌─────────────────────────────────────┐
│  ← Service Request #SR-001          │
├─────────────────────────────────────┤
│  🔧 Plumbing                         │
│  Fix leaking kitchen tap             │
│                                      │
│  Requested by: Sarah (Tenant)       │
│  Urgency: 🟠 High                    │
│  Preferred: Tomorrow, 9:00 AM       │
│  Who pays: Landlord                 │
│                                      │
│  Description:                        │
│  Kitchen tap has been leaking       │
│  for 2 days. Getting worse.         │
│                                      │
│  Photos:                             │
│  [🖼️ Tap leak photo]                │
│                                      │
├─────────────────────────────────────┤
│                                      │
│  Approval Notes (optional)           │
│  [Textarea: Approved...]            │
│                                      │
│  Do you have a preferred vendor?    │
│  ( ) No, let admin assign           │
│  (•) Yes, I'll provide details      │
│                                      │
│  ┌───────────────────────────────┐ │
│  │ Vendor Name: Mike the Plumber │ │
│  │ Phone: +260971234567          │ │
│  │ Company: Quick Fix Plumbers   │ │
│  └───────────────────────────────┘ │
│                                      │
│  [✅ Approve]    [❌ Reject]        │
└─────────────────────────────────────┘
```

---

## 📝 Admin Portal Note

> **Admin functionality** (assigning vendors, creating bills, updating status) will be implemented in a **separate Next.js admin portal project**.
> 
> The admin portal will:
> - View all service requests across all properties
> - Assign vendors from approved vendor list
> - Update service status in real-time
> - Create and send bills
> - Generate invoices
> - View service analytics

---

**Last Updated:** October 19, 2025  
**Version:** 2.0 - User Story Format with Landlord Approval Flow



