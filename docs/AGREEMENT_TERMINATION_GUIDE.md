# 🛑 Agreement Termination - 2-Step Process Guide

## 🎯 Overview

The agreement termination process requires **both parties** (landlord and tenant) to agree before the agreement is terminated. This prevents unilateral termination and ensures mutual consent.

---

## 🔄 Termination Workflow

```
Step 1: Request Termination
    ↓
  pending_termination
    ↓
Step 2: Confirm or Reject
    ├─→ Confirm → terminated
    └─→ Reject  → active (back to normal)
```

---

## 📊 Agreement Status Flow

| Current Status | Action | New Status |
|---------------|--------|------------|
| `active` | Landlord/Tenant requests termination | `pending_termination` |
| `pending_termination` | Other party confirms | `terminated` |
| `pending_termination` | Other party rejects | `active` |
| `pending_termination` | Requester cancels | `active` |

---

## 🚀 Step-by-Step Implementation

### **Step 1: Request Termination**

**Endpoint:** `POST /api/agreements/:id/request-termination`  
**Role:** Both Landlord & Tenant  
**Who:** Either party can initiate termination

**Request:**
```bash
POST http://localhost:3001/api/agreements/68f3a66fb3fd40065698ba44/request-termination
Authorization: Bearer {token}
Content-Type: application/json
```

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
  "message": "Termination request sent successfully. Waiting for other party to confirm.",
  "data": {
    "_id": "68f3a66fb3fd40065698ba44",
    "status": "pending_termination",
    "terminationRequest": {
      "requestedBy": "68e3bac894186666e663924a",
      "requestedByRole": "tenant",
      "reason": "Tenant relocating for work",
      "terminationDate": "2025-12-31T00:00:00Z",
      "notes": "Early termination with mutual agreement. Final inspection scheduled for Dec 30.",
      "requestedAt": "2025-10-19T06:00:00Z"
    }
  }
}
```

**Error Responses:**
```json
// If reason is missing
{
  "success": false,
  "message": "Termination reason is required"
}

// If termination date is missing
{
  "success": false,
  "message": "Termination date is required"
}

// If agreement is not active
{
  "success": false,
  "message": "Only active agreements can be terminated"
}

// If already pending termination
{
  "success": false,
  "message": "Agreement already has a pending termination request"
}
```

**What Happens:**
- Agreement status changes to `pending_termination`
- `terminationRequest` object is created with requester details
- Other party receives notification: "Landlord/Tenant has requested to terminate the agreement. Please review and confirm."
- Requester can cancel their request anytime before it's confirmed/rejected

---

### **Step 2A: Confirm Termination**

**Endpoint:** `POST /api/agreements/:id/confirm-termination`  
**Role:** Both Landlord & Tenant  
**Who:** Only the **other party** (not the one who requested) can confirm

**Request:**
```bash
POST http://localhost:3001/api/agreements/68f3a66fb3fd40065698ba44/confirm-termination
Authorization: Bearer {other_party_token}
Content-Type: application/json
```

**No Request Body Required**

**Success Response:**
```json
{
  "success": true,
  "message": "Agreement terminated successfully",
  "data": {
    "_id": "68f3a66fb3fd40065698ba44",
    "status": "terminated",
    "terminatedAt": "2025-10-19T06:05:00Z",
    "terminatedBy": "68a81dfe039be06c6062ea2f",
    "terminationRequest": {
      "requestedBy": "68e3bac894186666e663924a",
      "requestedByRole": "tenant",
      "reason": "Tenant relocating for work",
      "terminationDate": "2025-12-31T00:00:00Z",
      "requestedAt": "2025-10-19T06:00:00Z"
    }
  }
}
```

**Error Responses:**
```json
// If trying to confirm own request
{
  "success": false,
  "message": "You cannot confirm your own termination request"
}

// If no pending termination
{
  "success": false,
  "message": "No pending termination request found"
}
```

**What Happens:**
- Agreement status changes to `terminated`
- `terminatedAt` and `terminatedBy` fields are set
- Requester receives notification: "Agreement terminated. The other party has confirmed your termination request."
- Both parties can no longer modify the agreement

---

### **Step 2B: Reject Termination**

**Endpoint:** `POST /api/agreements/:id/reject-termination`  
**Role:** Both Landlord & Tenant  
**Who:** Only the **other party** (not the one who requested) can reject

**Request:**
```bash
POST http://localhost:3001/api/agreements/68f3a66fb3fd40065698ba44/reject-termination
Authorization: Bearer {other_party_token}
Content-Type: application/json
```

**Request Body (Optional):**
```json
{
  "rejectionReason": "I would like to discuss alternative arrangements before terminating"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Termination request rejected",
  "data": {
    "_id": "68f3a66fb3fd40065698ba44",
    "status": "active",
    "terminationRequest": null
  }
}
```

**Error Responses:**
```json
// If trying to reject own request
{
  "success": false,
  "message": "You cannot reject your own termination request"
}

// If no pending termination
{
  "success": false,
  "message": "No pending termination request found"
}
```

**What Happens:**
- Agreement status reverts back to `active`
- `terminationRequest` object is cleared
- Requester receives notification: "Your termination request for [agreement title] was declined: [rejection reason]"
- Agreement continues as normal

---

### **Step 2C: Cancel Termination Request**

**Endpoint:** `POST /api/agreements/:id/cancel-termination`  
**Role:** Both Landlord & Tenant  
**Who:** Only the **requester** (person who requested termination) can cancel

**Request:**
```bash
POST http://localhost:3001/api/agreements/68f3a66fb3fd40065698ba44/cancel-termination
Authorization: Bearer {requester_token}
Content-Type: application/json
```

**No Request Body Required**

**Success Response:**
```json
{
  "success": true,
  "message": "Termination request cancelled",
  "data": {
    "_id": "68f3a66fb3fd40065698ba44",
    "status": "active",
    "terminationRequest": null
  }
}
```

**Error Responses:**
```json
// If not the requester
{
  "success": false,
  "message": "Only the requester can cancel their own termination request"
}

// If no pending termination
{
  "success": false,
  "message": "No pending termination request found"
}
```

**What Happens:**
- Agreement status reverts back to `active`
- `terminationRequest` object is cleared
- No notification sent (requester cancelled their own request)
- Agreement continues as normal

---

## 📝 Frontend Implementation Examples

### **Example 1: Request Termination (Either Party)**

```javascript
async function requestTermination(agreementId, reason, terminationDate, notes) {
  try {
    const response = await fetch(
      `http://localhost:3001/api/agreements/${agreementId}/request-termination`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason,
          terminationDate,
          notes
        })
      }
    );

    const result = await response.json();

    if (result.success) {
      showSuccess(result.message);
      // Refresh agreements list
      refreshAgreements();
    } else {
      showError(result.message);
    }
  } catch (error) {
    showError("Failed to request termination");
  }
}
```

### **Example 2: Confirm Termination (Other Party)**

```javascript
async function confirmTermination(agreementId) {
  try {
    const response = await fetch(
      `http://localhost:3001/api/agreements/${agreementId}/confirm-termination`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = await response.json();

    if (result.success) {
      showSuccess("Agreement terminated successfully");
      // Navigate to agreements list or show terminated status
      refreshAgreements();
    } else {
      showError(result.message);
    }
  } catch (error) {
    showError("Failed to confirm termination");
  }
}
```

### **Example 3: Reject Termination (Other Party)**

```javascript
async function rejectTermination(agreementId, rejectionReason) {
  try {
    const response = await fetch(
      `http://localhost:3001/api/agreements/${agreementId}/reject-termination`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rejectionReason: rejectionReason || undefined
        })
      }
    );

    const result = await response.json();

    if (result.success) {
      showSuccess("Termination request rejected");
      refreshAgreements();
    } else {
      showError(result.message);
    }
  } catch (error) {
    showError("Failed to reject termination");
  }
}
```

---

## 🎨 UI/UX Implementation

### **UI State 1: Active Agreement (No Termination Request)**

```
┌─────────────────────────────────────┐
│ Agreement Details                   │
├─────────────────────────────────────┤
│ Status: ● Active                    │
│                                     │
│ Property: Modern 2BR Apartment      │
│ Start: Nov 1, 2025                  │
│ End: Oct 31, 2026                   │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  🛑 Request Termination          │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### **UI State 2: Pending Termination (I Requested)**

```
┌─────────────────────────────────────┐
│ Agreement Details                   │
├─────────────────────────────────────┤
│ Status: ⏳ Pending Termination      │
│                                     │
│ ⚠️  You requested termination       │
│                                     │
│ Reason: Tenant relocating for work  │
│ Requested: Oct 19, 2025             │
│ Termination Date: Dec 31, 2025      │
│                                     │
│ Waiting for landlord to confirm...  │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  ❌ Cancel Request               │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### **UI State 3: Pending Termination (Other Party Requested)**

```
┌─────────────────────────────────────┐
│ Agreement Details                   │
├─────────────────────────────────────┤
│ Status: ⏳ Pending Termination      │
│                                     │
│ ⚠️  Tenant requested termination    │
│                                     │
│ Reason: Tenant relocating for work  │
│ Requested: Oct 19, 2025             │
│ Termination Date: Dec 31, 2025      │
│ Notes: Early termination with...    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  ✅ Confirm Termination          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  ❌ Reject Request               │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### **Request Termination Modal**

```
┌─────────────────────────────────────┐
│ 🛑 Request Agreement Termination    │
├─────────────────────────────────────┤
│                                     │
│ This will request the other party   │
│ to confirm termination.             │
│                                     │
│ Reason for Termination *            │
│ ┌─────────────────────────────────┐ │
│ │ [Select or type reason...]      │ │
│ │ - Tenant relocating             │ │
│ │ - Property sold                 │ │
│ │ - Breach of contract            │ │
│ │ - Mutual agreement              │ │
│ │ - Other                         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Termination Date *                  │
│ ┌─────────────────────────────────┐ │
│ │ [Date Picker]                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Additional Notes (Optional)         │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Cancel]  [Request Termination]     │
└─────────────────────────────────────┘
```

### **Confirm Termination Modal**

```
┌─────────────────────────────────────┐
│ ⚠️  Confirm Termination             │
├─────────────────────────────────────┤
│                                     │
│ Tenant has requested to terminate   │
│ this agreement.                     │
│                                     │
│ Reason: Tenant relocating for work  │
│ Termination Date: Dec 31, 2025      │
│                                     │
│ Are you sure you want to confirm?   │
│ This action cannot be undone.       │
│                                     │
│ [Go Back]  [Confirm Termination]    │
└─────────────────────────────────────┘
```

### **Reject Termination Modal**

```
┌─────────────────────────────────────┐
│ ❌ Reject Termination Request       │
├─────────────────────────────────────┤
│                                     │
│ Tenant requested to terminate       │
│ this agreement.                     │
│                                     │
│ Reason for Rejection (Optional)     │
│ ┌─────────────────────────────────┐ │
│ │ I would like to discuss         │ │
│ │ alternative arrangements...     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Cancel]  [Reject Request]          │
└─────────────────────────────────────┘
```

---

## 📊 Business Rules Summary

| Rule | Description |
|------|-------------|
| **Who can request?** | Both landlord and tenant |
| **When can request?** | Only when status is `active` |
| **Who can confirm?** | Only the **other party** (not the requester) |
| **Who can reject?** | Only the **other party** (not the requester) |
| **Who can cancel?** | Only the **requester** (person who made the request) |
| **Can change mind?** | Yes, requester can cancel before confirmation |
| **Required fields** | `reason` and `terminationDate` |
| **Optional fields** | `notes` and `rejectionReason` |
| **Final status** | `terminated` (cannot be undone) |

---

## 🔔 Notification Events

1. **Request Sent:** Other party receives: "Landlord/Tenant has requested to terminate the agreement. Please review and confirm."
2. **Confirmed:** Requester receives: "Agreement terminated. The other party has confirmed your termination request."
3. **Rejected:** Requester receives: "Your termination request was declined: [rejection reason]"
4. **Cancelled:** No notification (requester cancelled their own request)

---

## ✅ Testing Checklist

### **As Landlord:**
- [ ] Can request termination of active agreement
- [ ] Can see pending termination status (if I requested)
- [ ] Can cancel my own termination request
- [ ] Can confirm tenant's termination request
- [ ] Can reject tenant's termination request
- [ ] Cannot confirm my own request
- [ ] Cannot reject my own request

### **As Tenant:**
- [ ] Can request termination of active agreement
- [ ] Can see pending termination status (if I requested)
- [ ] Can cancel my own termination request
- [ ] Can confirm landlord's termination request
- [ ] Can reject landlord's termination request
- [ ] Cannot confirm my own request
- [ ] Cannot reject my own request

### **Edge Cases:**
- [ ] Cannot request termination if already pending
- [ ] Cannot request termination if already terminated
- [ ] Cannot request termination if agreement is not active
- [ ] Rejection reason is optional
- [ ] Notes are optional when requesting

---

## 🚨 Important Notes

1. **Both parties must agree** before termination is finalized
2. **Requester can cancel** their request anytime before confirmation/rejection
3. **Cannot confirm own request** - prevents unilateral termination
4. **Status tracking:** `active` → `pending_termination` → `terminated` or back to `active`
5. **Once terminated, cannot be undone** - status is permanent
6. **Old `/terminate` endpoint** is deprecated but kept for backward compatibility

---

## 🔄 Comparison: Old vs New

| Feature | Old (Direct) | New (2-Step) |
|---------|-------------|--------------|
| Process | Single-step | Two-step |
| Consent | One party | Both parties |
| Status | `active` → `terminated` | `active` → `pending_termination` → `terminated` |
| Reversible | No | Yes (before confirmation) |
| Endpoint | `/terminate` | `/request-termination`, `/confirm-termination` |

---

**Last Updated:** October 19, 2025  
**Version:** 2.0 (2-Step Termination Process)



