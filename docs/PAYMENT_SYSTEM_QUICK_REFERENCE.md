# 💰 Payment System - Quick Reference

## 🎯 Simplified System

### **2 Payment Methods Only**
1. **Online (in_app)** - Pay through the app (Stripe/Paystack/Flutterwave)
2. **Cash** - Pay in person

### **Key Features**
- ✅ **User chooses amount** - Pay full or partial
- ✅ **Receipt optional** - Cash payments don't require receipt upload
- ✅ **Instant online** - Online payments auto-verified
- ✅ **Manual cash** - Cash needs landlord verification

---

## 📊 Quick Endpoints

### **For Tenants**

**Submit Payment:**
```
POST /api/payments/:paymentId/submit

// Cash (with receipt)
{
  "amount": 5000,
  "paymentMethod": "cash",
  "proofOfPayment": "https://...",
  "notes": "Paid in person"
}

// Cash (without receipt)
{
  "amount": 5000,
  "paymentMethod": "cash",
  "notes": "No receipt available"
}

// Online
{
  "amount": 5000,
  "paymentMethod": "in_app",
  "gatewayResponse": { ... }
}

// Partial Payment
{
  "amount": 2000,  // Only K2,000 of K5,000 due
  "paymentMethod": "in_app"
}
```

---

### **For Landlords**

| Endpoint | Purpose |
|----------|---------|
| `GET /api/payments/balance` | View balance & stats |
| `POST /api/payments/:paymentId/verify` | Verify cash payment |
| `POST /api/payments/:paymentId/reject` | Reject payment |
| `POST /api/payments/balance/bank-details` | Setup bank account |
| `POST /api/payments/balance/mobile-money` | Setup mobile money |
| `POST /api/payments/withdrawals` | Request withdrawal |
| `GET /api/payments/withdrawals` | View withdrawals |
| `GET /api/payments/transactions` | View transaction history |

---

## 💡 Payment Flows

### **Online Payment (Instant)**
```
1. Tenant enters amount: K5,000
2. Selects "Pay Online"
3. Gateway processes payment
4. ✓ Auto-verified
5. ✓ Landlord balance credited immediately
```

### **Cash Payment (With Receipt)**
```
1. Tenant enters amount: K5,000
2. Selects "Cash"
3. Uploads receipt photo
4. Status: "Paid" (pending)
5. Landlord reviews & verifies
6. ✓ Balance credited
```

### **Cash Payment (No Receipt)**
```
1. Tenant enters amount: K5,000
2. Selects "Cash"
3. Skips receipt upload
4. Adds note: "Paid in person, no receipt"
5. Status: "Paid" (pending)
6. Landlord verifies without receipt
7. ✓ Balance credited
```

### **Partial Payment**
```
Example: K5,000 rent due

Payment 1: K2,000 cash (today)
Payment 2: K3,000 online (next week)

Both tracked separately ✓
```

---

## 🏦 Landlord Balance

**Balance Types:**
- **Available** - Can withdraw now
- **Pending** - Awaiting cash payment verification
- **Total Earnings** - Lifetime income
- **Total Withdrawn** - Lifetime withdrawals

**Transaction Types:**
- **Credit** - Payment received (verified)
- **Withdrawal** - Money withdrawn

---

## 🎨 Frontend UI Components

### **1. Payment Modal (Tenant)**
```
┌─────────────────────────────────────┐
│ Pay Rent                       [✕]  │
├─────────────────────────────────────┤
│                                     │
│ Total Due: K5,000                   │
│                                     │
│ Amount to Pay: [___________]        │
│ [Pay Full Amount (K5,000)]          │
│                                     │
│ Payment Method:                     │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 💳  Pay Online                  │ │
│ │     Card, Mobile Money          │ │
│ │     • Instant verification      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 💵  Cash Payment                │ │
│ │     Pay in person               │ │
│ │     • Optional receipt          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Upload Receipt (Optional)]         │
│ Notes: [________________]           │
│                                     │
│ [Submit Payment]                    │
│                                     │
└─────────────────────────────────────┘
```

### **2. Verify Payment (Landlord)**
```
┌─────────────────────────────────────┐
│ Verify Payment                 [✕]  │
├─────────────────────────────────────┤
│                                     │
│ Amount Paid: K5,000                 │
│ Method: Cash                        │
│ Submitted: Nov 1, 2025              │
│                                     │
│ Receipt: [IMAGE or "No receipt"]    │
│                                     │
│ Tenant Notes:                       │
│ "Paid in person, no receipt"        │
│                                     │
│ Verification Notes:                 │
│ ┌─────────────────────────────────┐ │
│ │ Received in person...           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [✓ Verify Payment] [✗ Reject]      │
│                                     │
└─────────────────────────────────────┘
```

### **3. Balance Dashboard (Landlord)**
```
┌─────────────────────────────────────┐
│ Balance Dashboard                   │
├─────────────────────────────────────┤
│                                     │
│ ┌───────────┐  ┌───────────┐       │
│ │ Available │  │  Pending  │       │
│ │  K45,000  │  │  K10,000  │       │
│ └───────────┘  └───────────┘       │
│                                     │
│ [Withdraw Funds]                    │
│                                     │
│ Recent Transactions:                │
│ ─────────────────────────────────── │
│ 💰 Payment from tenant   +K5,000    │
│    Nov 1, 2025                      │
│                                     │
│ 💸 Withdrawal            -K10,000   │
│    Oct 25, 2025                     │
│                                     │
└─────────────────────────────────────┘
```

---

## 📋 Validation Rules

### **Amount**
- ✅ Required
- ✅ Must be > 0
- ✅ Cannot exceed total due
- ✅ Can be partial (e.g., K2,000 of K5,000)

### **Payment Method**
- ✅ Required
- ✅ Must be "in_app" or "cash"

### **Receipt (Cash)**
- ⚠️ Optional
- ✅ Landlord can verify without it

### **Withdrawal**
- ✅ Minimum: K100
- ✅ Cannot exceed available balance
- ✅ Must setup bank/mobile money first

---

## 🔄 Payment Status Flow

```
PENDING → (Tenant pays) → PAID → (Landlord verifies) → VERIFIED

                              ↓ (Online payment)
                           
                          VERIFIED (instant)
```

---

## 📱 Payment Methods Details

| Method | Code | Receipt | Verification | Available |
|--------|------|---------|--------------|-----------|
| **Online** | `in_app` | No | Instant ✓ | Future |
| **Cash** | `cash` | Optional | Manual | ✅ Now |

---

## ✅ Implementation Checklist

**Backend:** ✅ Complete
- [x] Payment submission with amount
- [x] Cash payments (receipt optional)
- [x] Online payments (gateway ready)
- [x] Landlord verification
- [x] Balance management
- [x] Withdrawal system

**Frontend Needed:**
- [ ] Payment amount input
- [ ] Payment method selector (2 options)
- [ ] Optional receipt upload for cash
- [ ] Online payment button (gateway integration)
- [ ] Landlord verify/reject modal
- [ ] Balance dashboard
- [ ] Withdrawal request form

---

## 🚀 Quick Start

### **Tenant Pays Rent**
```typescript
// Example: Pay K5,000 cash without receipt
await axios.post(`/api/payments/${paymentId}/submit`, {
  amount: 5000,
  paymentMethod: 'cash',
  notes: 'Paid in person, no receipt'
}, {
  headers: { Authorization: `Bearer ${token}` }
});
```

### **Landlord Verifies**
```typescript
await axios.post(`/api/payments/${paymentId}/verify`, {
  verificationNotes: 'Payment received'
}, {
  headers: { Authorization: `Bearer ${token}` }
});
```

---

**Last Updated:** October 19, 2025  
**Version:** 2.0 - Simplified (2 Methods, Flexible Amount, Optional Receipt)
