# 💰 Complete Payment Flow - Khayalami System

## 📊 **System Overview**

The payment system connects **Tenants → Landlords → Khayalami** through a **5% commission model** that works differently for online vs cash payments.

---

## 🔄 **Complete Payment Flow**

### **FLOW 1: Online Payment (In-App) - Immediate Commission Collection**

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Tenant Creates Payment                                  │
└─────────────────────────────────────────────────────────────────┘
POST /api/payments/rental/:rentalId/create
{
  "amount": 1000,
  "paymentMethod": "in_app",
  "gatewayResponse": { ... }
}

┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: PaymentService.createNewPayment()                       │
└─────────────────────────────────────────────────────────────────┘
✅ Creates Payment record:
   - status: "verified" (auto-verified for in_app)
   - paymentMethod: "in_app"
   - amount: 1000
   - verifiedAt: NOW

┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Credit Landlord Balance (IMMEDIATE)                     │
└─────────────────────────────────────────────────────────────────┘
PaymentService.creditLandlordBalance()
   ↓
LandlordBalance.addTransaction("credit", 1000, ...)
   ↓
✅ availableBalance += 1000
✅ totalEarnings += 1000
✅ Transaction recorded in history

┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Record Commission (IMMEDIATE COLLECTION)                │
└─────────────────────────────────────────────────────────────────┘
CommissionService.recordOnlineCommission()
   ↓
✅ Creates Commission record:
   - totalAmount: 1000
   - commissionRate: 0.05 (5%)
   - commissionAmount: 50
   - paymentMethod: "in_app"
   - commissionStatus: "collected" ✅
   - isDebt: false
   - collectedAt: NOW
   - collectedFromPaymentId: paymentId

┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Update Rental Stats                                     │
└─────────────────────────────────────────────────────────────────┘
PaymentService.updateRentalPaymentStats()
   ↓
✅ Updates Rental.stats:
   - totalPayments: +1
   - paidPayments: +1

┌─────────────────────────────────────────────────────────────────┐
│ RESULT                                                           │
└─────────────────────────────────────────────────────────────────┘
✅ Tenant paid: K1,000
✅ Khayalami collected: K50 (5%) - IMMEDIATELY
✅ Landlord received: K950 (95%) - IN BALANCE NOW
✅ Commission Status: "collected"
```

---

### **FLOW 2: Cash Payment - Debt Tracking**

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Tenant Creates Payment                                  │
└─────────────────────────────────────────────────────────────────┘
POST /api/payments/rental/:rentalId/create
{
  "amount": 1000,
  "paymentMethod": "cash",
  "proofOfPayment": "https://..." (optional)
}

┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: PaymentService.createNewPayment()                       │
└─────────────────────────────────────────────────────────────────┘
✅ Creates Payment record:
   - status: "paid" (needs landlord verification)
   - paymentMethod: "cash"
   - amount: 1000
   - proofOfPayment: (optional)

┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Add to Pending Balance (NOT AVAILABLE YET)             │
└─────────────────────────────────────────────────────────────────┘
PaymentService.addToPendingBalance()
   ↓
✅ pendingBalance += 1000
❌ availableBalance: NO CHANGE (still 0)
⚠️ Landlord CANNOT withdraw yet

┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Record Commission (DEBT TRACKING)                       │
└─────────────────────────────────────────────────────────────────┘
CommissionService.recordCashCommission()
   ↓
✅ Creates Commission record:
   - totalAmount: 1000
   - commissionRate: 0.05 (5%)
   - commissionAmount: 50
   - paymentMethod: "cash"
   - commissionStatus: "owed" ⚠️
   - isDebt: true
   - debtAmount: 50
   - debtPaid: false
   - collectedAt: NULL

┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Landlord Verifies Payment                               │
└─────────────────────────────────────────────────────────────────┘
POST /api/payments/:paymentId/verify
{
  "verificationNotes": "Payment received"
}

┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: Move Pending to Available                               │
└─────────────────────────────────────────────────────────────────┘
PaymentService.movePendingToAvailable()
   ↓
✅ pendingBalance -= 1000
✅ availableBalance += 1000
✅ LandlordBalance.addTransaction("credit", 1000, ...)
✅ Transaction recorded

┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: Attempt Debt Collection (if landlord has balance)      │
└─────────────────────────────────────────────────────────────────┘
PaymentService.verifyPayment() → collectDebt()
   ↓
IF landlordBalance.availableBalance > 0:
   CommissionService.collectDebt(landlordId, paymentId, balance)
   ↓
   ✅ Finds all unpaid debts (oldest first)
   ✅ Collects from available balance
   ✅ Marks debts as paid
   ✅ Updates commissionStatus: "owed" → "collected"

┌─────────────────────────────────────────────────────────────────┐
│ RESULT                                                           │
└─────────────────────────────────────────────────────────────────┘
✅ Tenant paid: K1,000 (cash)
✅ Landlord received: K1,000 - IN BALANCE NOW
⚠️ Khayalami: K50 (5%) - OWED (debt)
✅ Commission Status: "owed" (until collected)
```

---

## 🔍 **Key Methods Breakdown**

### **1. PaymentService.createNewPayment()**

**Location:** `src/services/PaymentService.ts:13-100`

**What it does:**
1. Validates rental exists and user is tenant
2. Creates new Payment record
3. Sets status based on payment method:
   - `in_app` → `"verified"` (auto-verified)
   - `cash` → `"paid"` (needs verification)
4. **If in_app:**
   - Credits landlord balance immediately
   - Records commission (collected)
5. **If cash:**
   - Adds to pending balance
   - Records commission (owed/debt)
6. Updates rental stats

**Code Flow:**
```typescript
// Create payment
const newPayment = await Payment.create({ ... });

if (paymentMethod === "in_app") {
  await this.creditLandlordBalance(newPayment);  // ✅ Immediate
  await this.commissionService.recordOnlineCommission(...);  // ✅ Collected
} else {
  await this.addToPendingBalance(newPayment);  // ⏳ Pending
  await this.commissionService.recordCashCommission(...);  // ⚠️ Debt
}
```

---

### **2. PaymentService.creditLandlordBalance()**

**Location:** `src/services/PaymentService.ts:439-463`

**What it does:**
1. Gets or creates LandlordBalance record
2. Calls `balance.addTransaction("credit", amount, ...)`
3. Updates:
   - `availableBalance += amount`
   - `totalEarnings += amount`
   - Adds transaction to history
   - Updates stats (totalPaymentsReceived, totalRentCollected, etc.)

**Code:**
```typescript
balance.addTransaction(
  "credit",
  amount,
  `Payment from tenant - ${payment.paymentType} (${payment.receiptNumber})`,
  payment._id.toString()
);
```

---

### **3. PaymentService.addToPendingBalance()**

**Location:** `src/services/PaymentService.ts:468-478`

**What it does:**
1. Gets or creates LandlordBalance record
2. Adds amount to `pendingBalance` only
3. **Does NOT** add to `availableBalance` (landlord can't withdraw yet)

**Code:**
```typescript
balance.pendingBalance += amount;
// availableBalance stays the same!
```

---

### **4. PaymentService.movePendingToAvailable()**

**Location:** `src/services/PaymentService.ts:483-510`

**What it does:**
1. Called when landlord verifies cash payment
2. Removes from `pendingBalance`
3. Adds to `availableBalance` via `addTransaction("credit", ...)`
4. Updates stats

**Code:**
```typescript
balance.pendingBalance -= amount;  // Remove from pending
balance.addTransaction("credit", amount, ...);  // Add to available
```

---

### **5. CommissionService.recordOnlineCommission()**

**Location:** `src/services/CommissionService.ts:15-45`

**What it does:**
1. Calculates commission: `amount * 0.05`
2. Creates Commission record with:
   - `commissionStatus: "collected"` ✅
   - `isDebt: false`
   - `collectedAt: NOW`
   - `debtPaid: true`

**Code:**
```typescript
const commissionAmount = this.calculateCommission(totalAmount, 0.05);
const commission = new Commission({
  commissionStatus: "collected",  // ✅ Collected immediately
  isDebt: false,
  collectedAt: new Date()
});
```

---

### **6. CommissionService.recordCashCommission()**

**Location:** `src/services/CommissionService.ts:50-78`

**What it does:**
1. Calculates commission: `amount * 0.05`
2. Creates Commission record with:
   - `commissionStatus: "owed"` ⚠️
   - `isDebt: true`
   - `debtAmount: commissionAmount`
   - `debtPaid: false`

**Code:**
```typescript
const commission = new Commission({
  commissionStatus: "owed",  // ⚠️ Owed (debt)
  isDebt: true,
  debtAmount: commissionAmount,
  debtPaid: false
});
```

---

### **7. CommissionService.collectDebt()**

**Location:** `src/services/CommissionService.ts:107-141`

**What it does:**
1. Finds all unpaid debts for landlord (oldest first - FIFO)
2. Collects from payment amount:
   - Takes oldest debt first
   - Collects up to available amount
   - Marks debt as paid
   - Updates commission status to "collected"
3. Returns: `{ collected: amount, remaining: amount }`

**Code Flow:**
```typescript
const unpaidDebts = await Commission.find({
  landlordId,
  isDebt: true,
  debtPaid: false
}).sort({ createdAt: 1 });  // Oldest first

for (const debt of unpaidDebts) {
  if (remaining <= 0) break;
  
  const debtToCollect = Math.min(debt.debtAmount, remaining);
  debt.debtPaid = true;
  debt.commissionStatus = "collected";
  debt.collectedAt = new Date();
  await debt.save();
  
  collected += debtToCollect;
  remaining -= debtToCollect;
}
```

---

## 📈 **Balance States**

### **LandlordBalance Model**

```typescript
{
  availableBalance: 0,      // Can withdraw NOW
  pendingBalance: 0,         // Waiting for verification
  totalEarnings: 0,          // Lifetime total
  totalWithdrawn: 0,         // Lifetime withdrawals
  transactions: []           // Full history
}
```

### **State Transitions**

#### **Online Payment:**
```
availableBalance: 0 → 950 ✅ (immediate)
pendingBalance: 0 → 0 (no change)
totalEarnings: 0 → 950 ✅
```

#### **Cash Payment (Before Verification):**
```
availableBalance: 0 → 0 (no change)
pendingBalance: 0 → 1000 ⏳
totalEarnings: 0 → 0 (no change)
```

#### **Cash Payment (After Verification):**
```
availableBalance: 0 → 1000 ✅
pendingBalance: 1000 → 0 ✅
totalEarnings: 0 → 1000 ✅
```

---

## 🔄 **Debt Collection Scenarios**

### **Scenario 1: Landlord Has Multiple Cash Payments**

```
Cash Payment 1: K1,000 → Debt: K50
Cash Payment 2: K2,000 → Debt: K100
Cash Payment 3: K1,500 → Debt: K75
Total Debt: K225

Landlord receives online payment: K500
   ↓
System collects:
   - K50 (oldest debt) ✅
   - K100 (next debt) ✅
   - K75 (next debt) ✅
   - Remaining: K275 → Landlord gets this
   
Result:
   ✅ All debts collected
   ✅ Landlord gets K275
```

### **Scenario 2: Partial Debt Collection**

```
Total Debt: K500
Landlord receives online payment: K200
   ↓
System collects:
   - K200 (partial from oldest debt)
   - Remaining debt: K300 still owed
   
Result:
   ⚠️ K200 debt collected
   ⚠️ K300 still owed
   ✅ Landlord gets: K0 (all went to debt)
```

---

## 🎯 **Commission Tracking**

### **Commission Statuses**

| Status | Meaning | When |
|--------|---------|------|
| `"collected"` | ✅ Khayalami got the money | Online payment OR debt paid |
| `"owed"` | ⚠️ Landlord owes us | Cash payment (not yet collected) |
| `"pending"` | ⏳ Not yet processed | Rare, system default |

### **Commission Record Fields**

```typescript
{
  totalAmount: 1000,           // Original payment amount
  commissionRate: 0.05,         // 5%
  commissionAmount: 50,         // Calculated: 1000 * 0.05
  paymentMethod: "in_app" | "cash",
  commissionStatus: "collected" | "owed",
  isDebt: true | false,
  debtAmount: 50,               // If cash payment
  debtPaid: true | false,       // If debt was collected
  collectedAt: Date,            // When collected
  collectedFromPaymentId: string // Which payment collected it
}
```

---

## 🔗 **Integration Points**

### **When Payment is Created:**
1. ✅ Payment record created
2. ✅ Commission recorded (collected or owed)
3. ✅ Landlord balance updated (available or pending)

### **When Payment is Verified:**
1. ✅ Payment status: "paid" → "verified"
2. ✅ Pending balance → Available balance
3. ✅ Attempt debt collection (if balance > 0)

### **When Landlord Receives Online Payment:**
1. ✅ Balance credited immediately
2. ✅ Commission collected immediately
3. ✅ System attempts to collect any existing debts

---

## 📊 **Summary**

### **Online Payment Flow:**
```
Tenant pays K1,000 online
    ↓
Payment created (verified)
    ↓
Landlord balance: +K950 ✅
Khayalami commission: +K50 ✅ (collected)
```

### **Cash Payment Flow:**
```
Tenant pays K1,000 cash
    ↓
Payment created (paid, needs verification)
    ↓
Landlord pending balance: +K1,000 ⏳
Khayalami commission: K50 owed ⚠️
    ↓
Landlord verifies
    ↓
Landlord available balance: +K1,000 ✅
Khayalami commission: K50 still owed ⚠️
    ↓
When landlord gets online payment:
    ↓
System collects K50 debt ✅
```

---

## 🎯 **Key Takeaways**

1. **Online payments:** Commission collected immediately, landlord gets 95% right away
2. **Cash payments:** Commission becomes debt, collected when landlord gets online payment
3. **Debt collection:** Automatic, FIFO (oldest first), happens when landlord has available balance
4. **Balance tracking:** Two balances - available (can withdraw) and pending (needs verification)
5. **Commission tracking:** Every payment creates a commission record, status shows if collected or owed

This is the complete payment flow that connects tenants, landlords, and Khayalami! 🚀



