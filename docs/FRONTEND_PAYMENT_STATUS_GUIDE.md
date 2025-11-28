# 💳 Frontend Payment Status Guide - Agreement Signing

## Overview

When a tenant signs an agreement, the payment status determines whether the agreement is **fully signed** or **pending payment approval**.

---

## Payment Status Values

### For Tenant Signature

The `tenantSignature.paymentStatus` field can have these values:

| Status | Meaning | Agreement Status | Action Required |
|--------|---------|------------------|-----------------|
| `"no_payment"` | No payment submitted yet | `"pending"` or `"draft"` | Tenant needs to submit payment |
| `"pending_payment"` | Payment request submitted, waiting for admin approval | `"pending"` | Wait for admin to approve payment |
| `"payment_approved"` | Payment approved, processing | `"pending"` | Wait for processing to complete |
| `"verified"` | Payment verified and complete | `"signed"` | Agreement is fully signed ✅ |
| `undefined` | No payment status (backward compatibility) | `"signed"` | Treat as verified |

---

## Payment Methods & Status

### 1. Online Payment (In-App)

**Flow:**
1. Tenant pays via payment gateway
2. Payment processed immediately
3. Tenant signs agreement
4. **Payment Status: `"verified"` immediately** ✅
5. Agreement Status: `"signed"` (if both parties signed)

**No approval needed** - Payment is verified instantly.

**Frontend Display:**
```
✅ Signature Status: Verified
✅ Payment: Paid and verified
✅ Agreement: Fully signed
```

---

### 2. External Payment (Payment Request)

**Flow:**
1. Tenant signs agreement first
2. Payment Status: `"pending_payment"` ⏳
3. Agreement Status: `"pending"` (not fully signed yet)
4. Tenant uploads proof of payment
5. Payment request created: `status: "pending_admin_approval"`
6. Admin reviews and approves
7. Payment Status updates to: `"verified"` ✅
8. Agreement Status updates to: `"signed"` (if both parties signed)

**Approval required** - Must wait for admin to approve.

**Frontend Display (No Payment):**
```
❌ Signature Status: No Payment Submitted
❌ Payment: Not yet paid
⏳ Agreement: Not fully signed (payment required)
```

**Frontend Display (Before Approval):**
```
⏳ Signature Status: Pending Payment Approval
⏳ Payment: Waiting for admin approval
⏳ Agreement: Not fully signed (payment pending)
```

**Frontend Display (After Approval):**
```
✅ Signature Status: Verified
✅ Payment: Approved and verified
✅ Agreement: Fully signed
```

---

## Agreement Status Logic

### Agreement is "signed" ONLY when:

✅ **Both parties have signed** (landlord + tenant)  
✅ **Payment is verified** (`paymentStatus: "verified"` or `undefined`)

### Agreement is "pending" when:

⏳ Both parties signed BUT payment is pending (`paymentStatus: "pending_payment"`)

---

## Frontend Implementation

### 1. Check Payment Status

```javascript
// Get agreement details
const agreement = await fetch(`/api/agreements/${agreementId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

const tenantSignature = agreement.data.tenantSignature;
const paymentStatus = tenantSignature?.paymentStatus;

// Determine if agreement is fully signed
const isFullySigned = 
  agreement.data.status === "signed" && 
  (paymentStatus === "verified" || paymentStatus === undefined);
```

### 2. Display Payment Status

```javascript
function getPaymentStatusBadge(paymentStatus) {
  switch (paymentStatus) {
    case "verified":
    case undefined: // Backward compatibility
      return {
        text: "✅ Verified",
        color: "green",
        message: "Payment verified. Agreement is fully signed."
      };
    
    case "pending_payment":
      return {
        text: "⏳ Pending Approval",
        color: "orange",
        message: "Waiting for admin to approve payment. Agreement not fully signed yet."
      };
    
    case "no_payment":
      return {
        text: "❌ No Payment",
        color: "red",
        message: "Payment not yet submitted. Please pay the agreement fee."
      };
    
    case "payment_approved":
      return {
        text: "⏳ Processing",
        color: "blue",
        message: "Payment approved. Processing..."
      };
    
    default:
      return {
        text: "❓ Unknown",
        color: "gray",
        message: "Payment status unknown"
      };
  }
}
```

### 3. Display Agreement Status

```javascript
function getAgreementStatus(agreement) {
  const { status, landlordSignature, tenantSignature } = agreement;
  const paymentStatus = tenantSignature?.paymentStatus;
  
  // Both signed and payment verified
  if (status === "signed" && (paymentStatus === "verified" || !paymentStatus)) {
    return {
      text: "✅ Fully Signed",
      color: "green",
      message: "Both parties signed and payment verified. Agreement is complete."
    };
  }
  
  // Both signed but payment pending
  if (status === "pending" && landlordSignature?.signedAt && tenantSignature?.signedAt) {
    if (paymentStatus === "pending_payment") {
      return {
        text: "⏳ Pending Payment Approval",
        color: "orange",
        message: "Both parties signed, but payment is waiting for admin approval."
      };
    }
  }
  
  // Other statuses
  return {
    text: status.charAt(0).toUpperCase() + status.slice(1),
    color: "gray",
    message: `Agreement status: ${status}`
  };
}
```

### 4. UI Component Example

```jsx
function AgreementStatusCard({ agreement }) {
  const tenantSignature = agreement.tenantSignature;
  const paymentStatus = tenantSignature?.paymentStatus;
  const isFullySigned = agreement.status === "signed" && 
                        (paymentStatus === "verified" || !paymentStatus);
  
  return (
    <div className="agreement-status-card">
      <h3>Agreement Status</h3>
      
      {/* Landlord Signature */}
      <div className="signature-status">
        <span>Landlord:</span>
        {agreement.landlordSignature?.signedAt ? (
          <span className="badge success">✅ Signed</span>
        ) : (
          <span className="badge pending">⏳ Not Signed</span>
        )}
      </div>
      
      {/* Tenant Signature */}
      <div className="signature-status">
        <span>Tenant:</span>
        {tenantSignature?.signedAt ? (
          <>
            <span className="badge success">✅ Signed</span>
            {paymentStatus === "pending_payment" && (
              <span className="badge warning">
                ⏳ Waiting for Payment Approval
              </span>
            )}
            {(paymentStatus === "verified" || !paymentStatus) && (
              <span className="badge success">✅ Payment Verified</span>
            )}
          </>
        ) : (
          <span className="badge pending">⏳ Not Signed</span>
        )}
      </div>
      
      {/* Overall Status */}
      <div className="agreement-status">
        {isFullySigned ? (
          <div className="status-badge success">
            ✅ Agreement Fully Signed
          </div>
        ) : (
          <div className="status-badge warning">
            ⏳ Agreement Pending
            {paymentStatus === "pending_payment" && (
              <p className="status-message">
                Waiting for admin to approve payment
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Key Rules for Frontend

### ✅ DO:

1. **Check `paymentStatus`** before showing "Fully Signed"
2. **Show "Pending Payment Approval"** when `paymentStatus: "pending_payment"`
3. **Poll for updates** when payment is pending (check every 30 seconds)
4. **Show different UI** for online vs external payment flows
5. **Disable actions** that require fully signed agreement when payment is pending

### ❌ DON'T:

1. **Don't show "Fully Signed"** if `paymentStatus: "pending_payment"`
2. **Don't allow agreement activation** if payment is pending
3. **Don't show payment as verified** until `paymentStatus: "verified"`
4. **Don't assume online payment needs approval** (it's instant)

---

## Payment Status Flow Diagram

### Online Payment
```
Tenant Pays → Payment Verified → Tenant Signs → Agreement: "signed" ✅
```

### External Payment
```
Tenant Signs → Payment Status: "pending_payment" → Agreement: "pending" ⏳
     ↓
Upload Proof → Payment Request: "pending_admin_approval"
     ↓
Admin Approves → Payment Status: "verified" → Agreement: "signed" ✅
```

---

## API Response Examples

### Agreement with Pending Payment

```json
{
  "success": true,
  "data": {
    "_id": "69240448387aea43d1f8a96f",
    "status": "pending",
    "landlordSignature": {
      "signedAt": "2025-11-24T10:00:00.000Z"
    },
    "tenantSignature": {
      "signedAt": "2025-11-24T10:30:00.000Z",
      "paymentStatus": "pending_payment"
    }
  }
}
```

**Frontend Action:** Show "⏳ Waiting for payment approval" and poll for updates.

---

### Agreement with Verified Payment

```json
{
  "success": true,
  "data": {
    "_id": "69240448387aea43d1f8a96f",
    "status": "signed",
    "landlordSignature": {
      "signedAt": "2025-11-24T10:00:00.000Z"
    },
    "tenantSignature": {
      "signedAt": "2025-11-24T10:30:00.000Z",
      "paymentStatus": "verified"
    }
  }
}
```

**Frontend Action:** Show "✅ Agreement fully signed" and enable all actions.

---

## Polling for Payment Status Updates

```javascript
// Poll for payment status updates when pending
function pollPaymentStatus(agreementId, onUpdate) {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/agreements/${agreementId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const agreement = await response.json();
    
    const paymentStatus = agreement.data.tenantSignature?.paymentStatus;
    
    // Stop polling if payment is verified
    if (paymentStatus === "verified" || !paymentStatus) {
      clearInterval(interval);
      onUpdate(agreement.data);
    } else {
      // Still pending, continue polling
      onUpdate(agreement.data);
    }
  }, 30000); // Poll every 30 seconds
  
  return interval; // Return so it can be cleared
}

// Usage
const pollInterval = pollPaymentStatus(agreementId, (agreement) => {
  // Update UI with latest status
  updateAgreementStatus(agreement);
});
```

---

## Summary for Frontend Team

### Critical Points:

1. **Online Payment = Instant Verification**
   - No approval needed
   - `paymentStatus: "verified"` immediately
   - Agreement can be "signed" right away

2. **External Payment = Requires Approval**
   - `paymentStatus: "pending_payment"` initially
   - Agreement is **NOT fully signed** until payment approved
   - Must poll for status updates

3. **Agreement is "signed" ONLY when:**
   - Both parties signed ✅
   - Payment verified ✅ (`paymentStatus: "verified"` or `undefined`)

4. **Agreement is "pending" when:**
   - Both signed but payment pending ⏳

5. **Always check `paymentStatus`** before showing "Fully Signed"

---

## Quick Reference

| Payment Method | Payment Status | Agreement Status | Fully Signed? |
|----------------|----------------|------------------|----------------|
| Not Paid | `"no_payment"` | `"pending"` or `"draft"` | ❌ No |
| Online | `"verified"` | `"signed"` | ✅ Yes |
| External (Pending) | `"pending_payment"` | `"pending"` | ❌ No |
| External (Approved) | `"verified"` | `"signed"` | ✅ Yes |

