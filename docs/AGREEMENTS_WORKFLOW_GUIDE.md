# 📋 Agreements System - Complete Workflow Guide

## 🎯 Overview

The Agreements System manages the complete lifecycle of rental agreements between landlords and tenants. This guide covers user stories, workflows, endpoints, and implementation details.

---

## 👥 User Stories

### **Story 1: Landlord Creates Agreement**
> "As a landlord, I want to create a rental agreement for my tenant so that we have a formal contract in place."

**Acceptance Criteria:**
- Landlord can create agreement for any property they own
- Landlord must select a tenant from their accepted connections
- Agreement starts in "draft" status
- All required fields must be filled (rent amount, dates, property, tenant)
- Optional fields: deposit, utilities, payment schedule, protection plan

---

### **Story 2: Landlord/Tenant Deletes Agreement**
> "As a landlord or tenant, I want to delete a draft or pending agreement if I made a mistake, changed my mind, or no longer want to proceed."

**Acceptance Criteria:**
- Both landlord and tenant can delete agreements in "draft" status
- Both landlord and tenant can delete agreements in "pending" status
- Cannot delete "signed", "active", "expired", or "terminated" agreements
- If deleting a "pending" agreement, the other party receives notification that agreement was withdrawn
- If deleting a "draft" agreement, no notification is sent (other party never saw it)
- Notification message indicates who deleted the agreement (landlord or tenant)
- Deleted agreements are permanently removed from the database

---

### **Story 3: Landlord Sends Agreement for Review**
> "As a landlord, I want to send the draft agreement to my tenant for review and signing."

**Acceptance Criteria:**
- Only draft agreements can be sent for review
- Agreement status changes to "pending"
- Tenant receives notification (email/in-app)
- Tenant can view the agreement details
- Landlord can add a custom message with the review request

---

### **Story 4: Tenant Reviews Agreement**
> "As a tenant, I want to review the agreement details before signing it."

**Acceptance Criteria:**
- Tenant can view all agreement terms
- Tenant can see rent amount, dates, deposit, terms, conditions
- Tenant can see attached documents
- Tenant can download a PDF copy
- Tenant can see if landlord has signed already

---

### **Story 5: Tenant Signs Agreement**
> "As a tenant, I want to digitally sign the agreement to accept the terms."

**Acceptance Criteria:**
- Tenant can draw/upload their signature
- Signature is saved as an image in Firebase Storage
- System records signature timestamp and IP address
- Agreement shows tenant signature status
- If landlord hasn't signed yet, agreement remains "pending"
- If landlord already signed, agreement becomes "signed" immediately

---

### **Story 6: Landlord Signs Agreement**
> "As a landlord, I want to sign the agreement to formalize the contract."

**Acceptance Criteria:**
- Landlord can draw/upload their signature
- Signature is saved as an image in Firebase Storage
- System records signature timestamp and IP address
- Agreement shows landlord signature status
- If tenant hasn't signed yet, agreement remains "pending"
- If tenant already signed, agreement becomes "signed" immediately
- Both parties receive notification when agreement is fully signed

---

### **Story 7: Agreement Activation**
> "As a landlord, I want the agreement to become active when the tenant moves in."

**Acceptance Criteria:**
- Agreement automatically activates on the start date if both parties signed
- Landlord can manually activate agreement if needed
- Agreement status changes from "signed" to "active"
- Both parties receive activation notification
- System records activation timestamp

---

### **Story 8: View Active Agreements**
> "As a landlord/tenant, I want to see all my active agreements."

**Acceptance Criteria:**
- User can filter agreements by status (draft, pending, signed, active, expired, terminated)
- Active agreements show next payment due date
- User can see counterparty details (landlord/tenant info)
- User can see property details
- User can download agreement PDF

---

### **Story 9: Agreement Termination**
> "As a landlord/tenant, I want to terminate an active agreement early."

**Acceptance Criteria:**
- Either party can request termination
- User must provide termination reason
- User must specify termination date
- System records who initiated termination
- Agreement status changes to "terminated"
- Both parties receive termination notification

---

### **Story 10: Agreement Expiration**
> "As the system, I want to automatically expire agreements when the end date is reached."

**Acceptance Criteria:**
- System checks agreements daily
- When end date is reached, status changes to "expired"
- Both parties receive expiration notification
- Expired agreements are archived but remain accessible

---

### **Story 11: View Agreement History**
> "As a landlord/tenant, I want to see all my past agreements."

**Acceptance Criteria:**
- User can view all agreements (current and past)
- Filter by property
- Filter by status
- Filter by date range
- View audit trail of all agreement actions

---

## 🔄 Workflow Diagrams

### **Basic Flow**
```
Landlord Creates → Landlord Sends for Review → Both Sign → Auto-Activate → Active → Expires/Terminates
    (draft)              (pending)              (signed)     (active)      (expired/terminated)
```

### **Signing Flow (Flexible Order)**
```
Option 1: Tenant Signs First
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Pending   │ --> │   Pending   │ --> │   Signed    │
│  (no sigs)  │     │ (tenant sig)│     │ (both sigs) │
└─────────────┘     └─────────────┘     └─────────────┘
                    Tenant signs        Landlord signs

Option 2: Landlord Signs First
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Pending   │ --> │   Pending   │ --> │   Signed    │
│  (no sigs)  │     │(landlord sig)│    │ (both sigs) │
└─────────────┘     └─────────────┘     └─────────────┘
                   Landlord signs       Tenant signs
```

---

## 🔌 API Endpoints

### **1. Create Agreement**
**Endpoint:** `POST /api/agreements`  
**Role:** Landlord only  
**Status Change:** → `draft`

**Request Body:**
```json
{
  "propertyId": "68dcea00e5de536938a77f4f",
  "tenantId": "68e3bac894186666e663924a",
  "type": "tenancy",
  "title": "1 Year Tenancy Agreement - 123 Main St",
  "description": "Standard rental agreement",
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2026-10-31T00:00:00Z",
  "rentAmount": 1500,
  "depositAmount": 3000,
  "zeroDeposit": false,
  "terms": [
    "Tenant must maintain property in good condition",
    "No subletting without landlord's written consent",
    "Rent due on 1st of each month"
  ],
  "specialConditions": [
    "Pets allowed with additional deposit of $500"
  ],
  "paymentSchedule": {
    "frequency": "monthly",
    "dueDay": 1,
    "lateFee": 50,
    "gracePeriod": 5
  },
  "utilitiesIncluded": true,
  "utilitiesList": ["Water", "Electricity", "Internet"],
  "maintenanceIncluded": false,
  "notifications": {
    "rentReminder": true,
    "maintenanceUpdates": true,
    "agreementAlerts": true
  },
  "khayalamiProtection": {
    "enabled": true,
    "planType": "premium",
    "monthlyFee": 99,
    "coverage": [
      "Legal protection",
      "Damage coverage",
      "Rent guarantee"
    ]
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Agreement created successfully",
  "data": {
    "_id": "68f378055d2cf79fe54a112c",
    "status": "draft",
    "propertyId": "68dcea00e5de536938a77f4f",
    "landlordId": "68a81dfe039be06c6062ea2f",
    "tenantId": "68e3bac894186666e663924a",
    "title": "1 Year Tenancy Agreement - 123 Main St",
    "rentAmount": 1500,
    "startDate": "2025-11-01T00:00:00Z",
    "endDate": "2026-10-31T00:00:00Z",
    "createdAt": "2025-10-18T12:00:00Z"
  }
}
```

---

### **2. Update Agreement (Draft Only)**
**Endpoint:** `PUT /api/agreements/:id`  
**Role:** Landlord only  
**Status:** Must be `draft`

**Request Body:**
```json
{
  "rentAmount": 1600,
  "depositAmount": 3200,
  "terms": [
    "Updated term 1",
    "Updated term 2"
  ]
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Agreement updated successfully",
  "data": {
    "_id": "68f378055d2cf79fe54a112c",
    "status": "draft",
    "rentAmount": 1600,
    "depositAmount": 3200,
    "updatedAt": "2025-10-18T12:05:00Z"
  }
}
```

**Note:** Only fields provided will be updated. Cannot update once status is "pending" or higher.

---

### **3. Delete Agreement (Draft or Pending Only)**
**Endpoint:** `DELETE /api/agreements/:id`  
**Role:** Both Landlord & Tenant  
**Status:** Must be `draft` or `pending`

**No Request Body Required**

**Success Response:**
```json
{
  "success": true,
  "message": "Agreement deleted successfully"
}
```

**Error Response (Cannot Delete):**
```json
{
  "success": false,
  "message": "Cannot delete signed agreements. Only draft and pending agreements can be deleted."
}
```

**Business Rules:**
- Both landlords and tenants can delete agreements
- Can only delete `draft` or `pending` agreements
- Cannot delete `signed`, `active`, `expired`, or `terminated` agreements
- If deleting a `pending` agreement, the other party receives notification that agreement was withdrawn
- If deleting a `draft` agreement, no notification is sent (other party never saw it)
- Notification message indicates who deleted the agreement (landlord or tenant)

**Use Cases:**
- Landlord/Tenant made a mistake and wants to start over
- Landlord sent wrong agreement to tenant
- Tenant doesn't agree with terms and wants to reject
- Property is no longer available
- Either party wants to withdraw from the agreement before signing

---

### **4. Send for Review**
**Endpoint:** `POST /api/agreements/:id/review`  
**Role:** Landlord only  
**Status Change:** `draft` → `pending`

**Request Body:**
```json
{
  "notifyTenant": true,
  "message": "Hi, please review and sign the tenancy agreement at your earliest convenience."
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Agreement sent for review",
  "data": {
    "_id": "68f378055d2cf79fe54a112c",
    "status": "pending",
    "sentForReviewAt": "2025-10-18T12:05:00Z"
  }
}
```

---

### **5. Get Agreement by ID**
**Endpoint:** `GET /api/agreements/:id`  
**Role:** Both Landlord & Tenant (must be participant)

**Success Response:**
```json
{
  "success": true,
  "data": {
    "_id": "68f378055d2cf79fe54a112c",
    "status": "pending",
    "type": "tenancy",
    "title": "1 Year Tenancy Agreement - 123 Main St",
    "description": "Standard rental agreement",
    "property": {
      "_id": "68dcea00e5de536938a77f4f",
      "title": "Modern 2BR Apartment",
      "address": {
        "street": "123 Main St",
        "city": "Cape Town"
      }
    },
    "landlord": {
      "_id": "68a81dfe039be06c6062ea2f",
      "firstName": "John",
      "lastName": "Smith",
      "email": "landlord@example.com"
    },
    "tenant": {
      "_id": "68e3bac894186666e663924a",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "tenant@example.com"
    },
    "rentAmount": 1500,
    "depositAmount": 3000,
    "zeroDeposit": false,
    "startDate": "2025-11-01T00:00:00Z",
    "endDate": "2026-10-31T00:00:00Z",
    "terms": ["Term 1", "Term 2"],
    "specialConditions": ["Condition 1"],
    "paymentSchedule": {
      "frequency": "monthly",
      "dueDay": 1,
      "lateFee": 50,
      "gracePeriod": 5
    },
    "landlordSignature": null,
    "tenantSignature": null,
    "createdAt": "2025-10-18T12:00:00Z",
    "updatedAt": "2025-10-18T12:05:00Z"
  }
}
```

---

### **6. Sign Agreement**
**Endpoint:** `POST /api/agreements/:id/sign`  
**Role:** Both Landlord & Tenant  
**Status Change:** `pending` → `pending` (one sig) or `signed` (both sigs)

**Request Body:**
```json
{
  "signatureUrl": "https://firebasestorage.googleapis.com/v0/b/your-bucket/o/signatures%2Ftenant-68e3bac894186666e663924a-1697654400000.png?alt=media",
  "ipAddress": "127.0.0.1"
}
```

**Success Response (First Signature):**
```json
{
  "success": true,
  "message": "Agreement signed successfully. Waiting for other party to sign.",
  "data": {
    "_id": "68f378055d2cf79fe54a112c",
    "status": "pending",
    "tenantSignature": {
      "signedAt": "2025-10-18T12:10:00Z",
      "signatureUrl": "https://firebasestorage.googleapis.com/.../signature.png",
      "ipAddress": "127.0.0.1"
    },
    "landlordSignature": null
  }
}
```

**Success Response (Second Signature - Both Signed):**
```json
{
  "success": true,
  "message": "Agreement fully signed by both parties",
  "data": {
    "_id": "68f378055d2cf79fe54a112c",
    "status": "signed",
    "tenantSignature": {
      "signedAt": "2025-10-18T12:10:00Z",
      "signatureUrl": "https://firebasestorage.googleapis.com/.../tenant-sig.png",
      "ipAddress": "127.0.0.1"
    },
    "landlordSignature": {
      "signedAt": "2025-10-18T12:15:00Z",
      "signatureUrl": "https://firebasestorage.googleapis.com/.../landlord-sig.png",
      "ipAddress": "192.168.1.100"
    },
    "signedAt": "2025-10-18T12:15:00Z"
  }
}
```

**Important Notes:**
- **Signature must be uploaded to Firebase Storage first**
- Frontend must handle signature capture (canvas/touch)
- Frontend must upload signature image to Firebase
- Frontend sends Firebase Storage URL in the request
- Backend validates URL format
- System records timestamp and IP automatically

---

### **7. Get User's Agreements**
**Endpoint:** `GET /api/agreements`  
**Role:** Both Landlord & Tenant  
**Query Parameters:**
- `status` (optional): `draft`, `pending`, `signed`, `active`, `expired`, `terminated`

**Example:** `GET /api/agreements?status=active`

**Success Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "68f378055d2cf79fe54a112c",
      "status": "active",
      "title": "1 Year Tenancy Agreement - 123 Main St",
      "property": { /* property details */ },
      "landlord": { /* landlord details */ },
      "tenant": { /* tenant details */ },
      "rentAmount": 1500,
      "startDate": "2025-11-01T00:00:00Z",
      "endDate": "2026-10-31T00:00:00Z",
      "nextPaymentDue": "2025-12-01T00:00:00Z"
    }
  ]
}
```

---

### **8. Get Landlord's Agreements**
**Endpoint:** `GET /api/agreements/landlord`  
**Role:** Landlord only  
**Query Parameters:** Same as above

Returns all agreements where user is the landlord.

---

### **9. Get Tenant's Agreements**
**Endpoint:** `GET /api/agreements/tenant`  
**Role:** Tenant only  
**Query Parameters:** Same as above

Returns all agreements where user is the tenant.

---

### **10. Get Pending Agreements**
**Endpoint:** `GET /api/agreements/pending`  
**Role:** Both Landlord & Tenant

Returns all agreements with status "pending" for the authenticated user.

---

### **11. Get Active Agreements**
**Endpoint:** `GET /api/agreements/active`  
**Role:** Both Landlord & Tenant

Returns all agreements with status "active" for the authenticated user.

---

### **12. Activate Agreement**
**Endpoint:** `POST /api/agreements/:id/activate`  
**Role:** Landlord only  
**Status Change:** `signed` → `active`

**Request Body:**
```json
{
  "activationNote": "Tenant has moved in, all keys handed over"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Agreement activated successfully",
  "data": {
    "_id": "68f378055d2cf79fe54a112c",
    "status": "active",
    "activatedAt": "2025-10-18T12:20:00Z"
  }
}
```

**Note:** Agreement can also auto-activate when `startDate` is reached (if status is "signed").

---

### **13. Terminate Agreement**
**Endpoint:** `POST /api/agreements/:id/terminate`  
**Role:** Both Landlord & Tenant  
**Status Change:** `active` → `terminated`

**Request Body:**
```json
{
  "reason": "Tenant relocating for work",
  "terminationDate": "2025-12-31T00:00:00Z",
  "notes": "Early termination with mutual agreement. Final inspection scheduled for Dec 30."
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Agreement terminated successfully",
  "data": {
    "_id": "68f378055d2cf79fe54a112c",
    "status": "terminated",
    "terminationReason": "Tenant relocating for work",
    "terminationDate": "2025-12-31T00:00:00Z",
    "terminatedAt": "2025-10-18T12:25:00Z",
    "terminatedBy": "68e3bac894186666e663924a"
  }
}
```

---

### **14. Generate Agreement PDF**
**Endpoint:** `GET /api/agreements/:id/pdf`  
**Role:** Both Landlord & Tenant  
**Response:** PDF file download

---

### **15. Get Agreement Statistics**
**Endpoint:** `GET /api/agreements/stats`  
**Role:** Landlord only

**Success Response:**
```json
{
  "success": true,
  "data": {
    "total": 25,
    "draft": 3,
    "pending": 5,
    "signed": 2,
    "active": 10,
    "expired": 4,
    "terminated": 1
  }
}
```

---

### **16. Get Agreement Signatures**
**Endpoint:** `GET /api/agreements/:id/signatures`  
**Role:** Both Landlord & Tenant

**Success Response:**
```json
{
  "success": true,
  "data": {
    "landlordSignature": {
      "signedAt": "2025-10-18T12:15:00Z",
      "signatureUrl": "https://firebasestorage.googleapis.com/.../landlord-sig.png",
      "ipAddress": "192.168.1.100"
    },
    "tenantSignature": {
      "signedAt": "2025-10-18T12:10:00Z",
      "signatureUrl": "https://firebasestorage.googleapis.com/.../tenant-sig.png",
      "ipAddress": "127.0.0.1"
    }
  }
}
```

---

### **17. Get Agreement Audit Trail**
**Endpoint:** `GET /api/agreements/:id/audit-trail`  
**Role:** Both Landlord & Tenant

**Success Response:**
```json
{
  "success": true,
  "data": [
    {
      "action": "created",
      "performedBy": {
        "_id": "68a81dfe039be06c6062ea2f",
        "name": "John Smith",
        "role": "landlord"
      },
      "timestamp": "2025-10-18T12:00:00Z"
    },
    {
      "action": "sent_for_review",
      "performedBy": {
        "_id": "68a81dfe039be06c6062ea2f",
        "name": "John Smith",
        "role": "landlord"
      },
      "timestamp": "2025-10-18T12:05:00Z"
    },
    {
      "action": "signed",
      "performedBy": {
        "_id": "68e3bac894186666e663924a",
        "name": "Jane Doe",
        "role": "tenant"
      },
      "timestamp": "2025-10-18T12:10:00Z"
    },
    {
      "action": "signed",
      "performedBy": {
        "_id": "68a81dfe039be06c6062ea2f",
        "name": "John Smith",
        "role": "landlord"
      },
      "timestamp": "2025-10-18T12:15:00Z"
    },
    {
      "action": "activated",
      "performedBy": "system",
      "timestamp": "2025-11-01T00:00:00Z",
      "note": "Auto-activated on start date"
    }
  ]
}
```

---

## 🔥 Firebase Integration (Signatures)

### **Frontend Signature Flow**

1. **Capture Signature:**
   - Use HTML5 Canvas or touch/mouse events
   - User draws signature on screen
   - Convert canvas to image blob

2. **Upload to Firebase:**
   - Upload image blob to Firebase Storage
   - Path format: `signatures/{userId}-{timestamp}.png`
   - Get download URL from Firebase

3. **Send to Backend:**
   - Use the Firebase Storage URL in the sign request
   - Backend validates URL format
   - Backend saves URL in database

### **Firebase Storage Structure**
```
your-firebase-bucket/
  └── signatures/
      ├── landlord-68a81dfe039be06c6062ea2f-1697654400000.png
      ├── tenant-68e3bac894186666e663924a-1697654500000.png
      └── ...
```

### **Security Rules (Firebase Storage)**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /signatures/{signatureFile} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && signatureFile.matches('.*-' + request.auth.uid + '-[0-9]+\\.png$');
    }
  }
}
```

---

## 📊 Agreement Status Definitions

| Status | Description | Who Can Change | Next Status |
|--------|-------------|----------------|-------------|
| `draft` | Agreement created, not yet sent | Landlord | `pending` |
| `pending` | Sent for review, awaiting signatures | System (when both sign) | `signed` |
| `signed` | Both parties signed | System (on start date) or Landlord | `active` |
| `active` | Currently in effect | System (on end date) or Either party | `expired` or `terminated` |
| `expired` | End date reached | Cannot change | N/A |
| `terminated` | Early termination | Cannot change | N/A |

---

## 🔔 Notification Events

The system sends notifications for these events:

1. **Agreement Sent for Review** → Notify Tenant
2. **First Signature Added** → Notify Other Party
3. **Agreement Fully Signed** → Notify Both Parties
4. **Agreement Activated** → Notify Both Parties
5. **Agreement Termination Request** → Notify Other Party
6. **Agreement Expiring Soon** (7 days before) → Notify Both Parties
7. **Agreement Expired** → Notify Both Parties
8. **Rent Payment Due** → Notify Tenant

---

## ✅ Validation Rules

### **Create Agreement**
- ✅ `propertyId` must exist and belong to landlord
- ✅ `tenantId` must be a valid user with role "tenant"
- ✅ Landlord and tenant must have an "accepted" connection
- ✅ `startDate` must be in the future or today
- ✅ `endDate` must be after `startDate`
- ✅ `rentAmount` must be > 0
- ✅ `depositAmount` must be >= 0
- ✅ If `zeroDeposit` is true, `depositAmount` must be 0

### **Send for Review**
- ✅ Agreement must be in "draft" status
- ✅ User must be the landlord

### **Sign Agreement**
- ✅ Agreement must be in "pending" status
- ✅ User must be either landlord or tenant
- ✅ User must not have already signed
- ✅ `signatureUrl` must be a valid Firebase Storage URL

### **Activate Agreement**
- ✅ Agreement must be in "signed" status
- ✅ User must be the landlord
- ✅ Both parties must have signed

### **Terminate Agreement**
- ✅ Agreement must be in "active" status
- ✅ User must be either landlord or tenant
- ✅ `terminationDate` must be provided

---

## 🎨 Frontend Implementation Tips

### **Agreement List View**
- Show status badges with colors:
  - `draft` → Gray
  - `pending` → Yellow/Orange
  - `signed` → Blue
  - `active` → Green
  - `expired` → Gray
  - `terminated` → Red

### **Agreement Detail View**
- Show progress indicator (draft → pending → signed → active)
- Show signature status for both parties
- Show next action required (e.g., "Waiting for landlord to sign")
- Show all terms and conditions clearly
- Provide "Download PDF" button

### **Signature Capture**
- Use a modal/dialog for signature capture
- Provide "Clear" and "Save" buttons
- Preview signature before submitting
- Show loading state while uploading to Firebase
- Show success/error messages

### **Notifications**
- Show unread count for pending agreements
- Highlight agreements requiring action
- Push notifications for signature requests

---

## 🚀 Implementation Priority

### **Phase 1: Core Functionality**
1. Create agreement (landlord)
2. Send for review
3. View agreement details
4. Sign agreement (both parties)
5. View agreements list

### **Phase 2: Enhanced Features**
6. Manual activation
7. PDF generation
8. Agreement termination
9. Audit trail

### **Phase 3: Advanced Features**
10. Statistics dashboard
11. Agreement templates
12. Automated expiration handling
13. Rent payment reminders

---

## ❓ Common Questions

**Q: Can a landlord sign before the tenant?**  
A: Yes, either party can sign first. The agreement becomes "signed" only when both have signed.

**Q: Can an agreement be edited after being sent for review?**  
A: No, once status is "pending" or higher, the agreement cannot be edited. Landlord must create a new one.

**Q: What happens if the agreement is not signed by the start date?**  
A: The agreement remains in "pending" status. It will not auto-activate until both parties sign.

**Q: Can a tenant reject an agreement?**  
A: Currently, tenant can simply not sign. Future: Add explicit "reject" action.

**Q: How are signatures stored?**  
A: Signatures are uploaded to Firebase Storage as PNG images. Only the Firebase Storage URL is saved in the database.

**Q: What if Firebase is down?**  
A: Frontend should handle Firebase upload errors gracefully and show appropriate error messages. User can retry later.

---

## 📝 Notes for Development Team

1. **Firebase is already configured** in the project
2. Signature URLs must follow format: `https://firebasestorage.googleapis.com/...`
3. Backend validates Firebase URL format but does not store the actual image
4. Frontend is responsible for signature capture and Firebase upload
5. IP address is captured automatically by backend
6. Timestamps are managed by backend (do not send from frontend)
7. Use proper error handling for Firebase upload failures
8. Test signature capture on both desktop and mobile devices

---

## 🎯 Success Metrics

- Time to create and send agreement: < 5 minutes
- Time to sign agreement: < 2 minutes
- Signature capture success rate: > 95%
- PDF generation time: < 5 seconds
- Agreement activation accuracy: 100%

---

---

## 🎯 Quick Endpoints Reference

| # | Action | Endpoint | Method | Role | Can Delete Status? |
|---|--------|----------|--------|------|-------------------|
| 1 | Create | `/api/agreements` | POST | Landlord | - |
| 2 | Update | `/api/agreements/:id` | PUT | Landlord | draft only |
| 3 | **Delete** | `/api/agreements/:id` | **DELETE** | **Both** | **draft, pending** |
| 4 | Send for Review | `/api/agreements/:id/review` | POST | Landlord | - |
| 5 | Get by ID | `/api/agreements/:id` | GET | Both | - |
| 6 | Sign | `/api/agreements/:id/sign` | POST | Both | - |
| 7 | Get User's | `/api/agreements` | GET | Both | - |
| 8 | Get Landlord's | `/api/agreements/landlord` | GET | Landlord | - |
| 9 | Get Tenant's | `/api/agreements/tenant` | GET | Tenant | - |
| 10 | Get Pending | `/api/agreements/pending` | GET | Both | - |
| 11 | Get Active | `/api/agreements/active` | GET | Both | - |
| 12 | Activate | `/api/agreements/:id/activate` | POST | Landlord | - |
| 13 | Terminate | `/api/agreements/:id/terminate` | POST | Both | - |
| 14 | Get PDF | `/api/agreements/:id/pdf` | GET | Both | - |
| 15 | Get Stats | `/api/agreements/stats` | GET | Landlord | - |
| 16 | Get Signatures | `/api/agreements/:id/signatures` | GET | Both | - |
| 17 | Get Audit Trail | `/api/agreements/:id/audit-trail` | GET | Both | - |

---

**Last Updated:** October 19, 2025  
**Version:** 1.2 (Updated Delete Endpoint - Both parties can now delete)

