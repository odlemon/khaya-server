# 🚀 Execution Plan - Revenue Model Integration

## 📋 **Implementation Order (Best Practice)**

### **Why This Order?**
1. **Foundation First**: Build data models and core calculation logic
2. **Core Flow**: Implement main payment flow (in-app)
3. **External Flow**: Add external payment handling
4. **Enhancements**: Add notifications and status updates
5. **Additional Features**: Subscription, fees, etc.

---

## 🏗️ **PHASE 1: Foundation Layer**

### **Step 1.1: Create RevenueSource Model**
**File:** `src/models/RevenueSource.ts`

**Purpose:** Track all revenue sources separately

**Fields:**
```typescript
{
  sourceType: "subscription" | "agreement_fee" | "processing_fee" | 
              "premium_boost" | "insurance_commission" | "service_fee",
  amount: number,
  payerId: ObjectId, // Who paid (tenant/landlord)
  recipientId: ObjectId | "khayalami", // Who receives
  paymentId: ObjectId, // Link to payment
  escrowTransactionId: ObjectId, // Link to escrow
  rentalId: ObjectId,
  status: "pending" | "collected" | "distributed",
  collectedAt: Date,
  distributedAt: Date
}
```

**Why First:** Needed by all other services to track revenue

---

### **Step 1.2: Create Subscription Model**
**File:** `src/models/Subscription.ts`

**Purpose:** Track tenant subscriptions

**Fields:**
```typescript
{
  tenantId: ObjectId,
  planType: "premium" | "premium_plus",
  price: number, // 4.99-7.99
  billingCycle: "monthly",
  status: "active" | "cancelled" | "expired",
  startDate: Date,
  endDate: Date,
  autoRenew: boolean,
  rentalId: ObjectId, // Which rental this covers
  propertyValueBracket: "low" | "medium" | "high" // For pricing
}
```

**Why Second:** Needed for payment calculations

---

### **Step 1.3: Create PaymentRequest Model**
**File:** `src/models/PaymentRequest.ts`

**Purpose:** Track external payment requests

**Fields:**
```typescript
{
  tenantId: ObjectId,
  rentalId: ObjectId,
  amount: number,
  paymentMethod: "bank_transfer" | "cash" | "mobile_money",
  proofOfPayment: string, // URL
  status: "pending_admin_approval" | "approved" | "rejected" | "processed",
  submittedAt: Date,
  reviewedBy: ObjectId, // Admin
  reviewedAt: Date,
  rejectionReason: string,
  paymentId: ObjectId, // Created after approval
  escrowTransactionId: ObjectId // Created after approval
}
```

**Why Third:** Needed for external payment flow

---

### **Step 1.4: Update EscrowTransaction Model**
**File:** `src/models/Escrow.ts` (already exists, need to enhance)

**Add Fields:**
```typescript
{
  // ... existing fields ...
  
  // Deductions breakdown
  deductions: {
    subscriptionFee: number,
    processingFee: number,
    insurancePremium: number,
    totalDeductions: number
  },
  
  // Revenue source tracking
  revenueSourceIds: [ObjectId], // Links to RevenueSource records
  
  // Payment source
  paymentSource: "in_app" | "external_deposit"
}
```

**Why Fourth:** Enhance existing model to support new features

---

## 🔧 **PHASE 2: Core Services**

### **Step 2.1: Create PaymentCalculationService**
**File:** `src/services/PaymentCalculationService.ts`

**Purpose:** Calculate all deductions and fees

**Methods:**
```typescript
class PaymentCalculationService {
  // Main calculation method
  async calculateRentDeductions(
    rentAmount: number,
    tenantId: string,
    landlordId: string,
    rentalId: string
  ): Promise<{
    totalAmount: number,
    subscriptionFee: number,
    processingFee: number,
    insurancePremium: number,
    netRentAmount: number,
    khayalamiTotal: number,
    breakdown: {...}
  }>
  
  // Individual fee calculators
  async calculateSubscriptionFee(tenantId: string, rentalId: string): Promise<number>
  async calculateProcessingFee(rentAmount: number): Promise<number>
  async calculateInsurancePremium(landlordId: string, rentalId: string): Promise<number>
}
```

**Integration Points:**
- Called by PaymentService before creating payment
- Called by PaymentRequestService when admin approves
- Uses SubscriptionService to check subscription status

---

### **Step 2.2: Create RevenueSourceService**
**File:** `src/services/RevenueSourceService.ts`

**Purpose:** Manage revenue source records

**Methods:**
```typescript
class RevenueSourceService {
  async createRevenueSource(data: {
    sourceType: string,
    amount: number,
    payerId: string,
    recipientId: string,
    paymentId: string,
    rentalId: string
  }): Promise<IRevenueSource>
  
  async linkToEscrowTransaction(
    revenueSourceId: string,
    escrowTransactionId: string
  ): Promise<void>
  
  async getRevenueBySource(sourceType: string): Promise<number>
  async getRevenueByPeriod(startDate: Date, endDate: Date): Promise<any>
}
```

**Integration Points:**
- Called by PaymentService after payment created
- Called by EscrowService when adding to escrow
- Used for revenue reporting

---

### **Step 2.3: Create SubscriptionService**
**File:** `src/services/SubscriptionService.ts`

**Purpose:** Manage tenant subscriptions

**Methods:**
```typescript
class SubscriptionService {
  async createSubscription(data: {
    tenantId: string,
    rentalId: string,
    planType: string,
    propertyValueBracket: string
  }): Promise<ISubscription>
  
  async checkSubscriptionStatus(tenantId: string, rentalId: string): Promise<{
    isActive: boolean,
    subscription: ISubscription | null
  }>
  
  async calculateSubscriptionFee(
    tenantId: string,
    rentalId: string
  ): Promise<number>
  
  async renewSubscription(subscriptionId: string): Promise<ISubscription>
  async cancelSubscription(subscriptionId: string): Promise<void>
}
```

**Integration Points:**
- Called by PaymentCalculationService
- Called when agreement is signed (zero-deposit requirement)
- Used for subscription enforcement

---

## 💳 **PHASE 3: Payment Flow Integration**

### **Step 3.1: Update PaymentService**
**File:** `src/services/PaymentService.ts` (modify existing)

**Changes Needed:**

**In `createNewPayment()`:**
```typescript
// BEFORE creating payment:
const deductions = await paymentCalculationService.calculateRentDeductions(
  data.amount,
  userId,
  rental.landlordId.toString(),
  rentalId
);

// Create payment with total amount
const newPayment = await Payment.create({
  ...existingFields,
  amount: deductions.totalAmount, // Includes fees
  totalAmount: deductions.totalAmount
});

// Create revenue source records
await revenueSourceService.createRevenueSource({
  sourceType: "subscription",
  amount: deductions.subscriptionFee,
  payerId: userId,
  recipientId: "khayalami",
  paymentId: newPayment._id.toString(),
  rentalId
});

await revenueSourceService.createRevenueSource({
  sourceType: "processing_fee",
  amount: deductions.processingFee,
  payerId: userId,
  recipientId: "khayalami",
  paymentId: newPayment._id.toString(),
  rentalId
});

// Add to escrow with deductions
await escrowService.addToEscrow(newPayment, {
  deductions: deductions,
  revenueSourceIds: [rev1._id, rev2._id]
});
```

**Integration Flow:**
```
PaymentService.createNewPayment()
    ↓
PaymentCalculationService.calculateRentDeductions()
    ↓
RevenueSourceService.createRevenueSource() (multiple)
    ↓
EscrowService.addToEscrow() (with deductions)
    ↓
EmailNotificationService.sendPaymentConfirmed()
```

---

### **Step 3.2: Create PaymentRequestService**
**File:** `src/services/PaymentRequestService.ts`

**Purpose:** Handle external payment requests

**Methods:**
```typescript
class PaymentRequestService {
  // Tenant submits external payment
  async createPaymentRequest(data: {
    tenantId: string,
    rentalId: string,
    amount: number,
    proofOfPayment: string,
    paymentMethod: string,
    notes?: string
  }): Promise<IPaymentRequest>
  
  // Admin gets pending requests
  async getPendingRequests(filters?: {
    startDate?: Date,
    endDate?: Date,
    tenantId?: string
  }): Promise<IPaymentRequest[]>
  
  // Admin approves
  async approvePaymentRequest(
    requestId: string,
    adminId: string
  ): Promise<{
    paymentRequest: IPaymentRequest,
    payment: IPayment,
    escrowTransaction: IEscrowTransaction
  }>
  
  // Admin rejects
  async rejectPaymentRequest(
    requestId: string,
    adminId: string,
    rejectionReason: string
  ): Promise<IPaymentRequest>
}
```

**Integration Flow (Approve):**
```
PaymentRequestService.approvePaymentRequest()
    ↓
PaymentCalculationService.calculateRentDeductions()
    ↓
PaymentService.createNewPayment()
    ↓
RevenueSourceService.createRevenueSource() (multiple)
    ↓
EscrowService.addToEscrow()
    ↓
EmailNotificationService.sendPaymentApproved()
    ↓
Update tenant & landlord status
```

---

### **Step 3.3: Enhance EscrowService**
**File:** `src/services/EscrowService.ts` (modify existing)

**Update `addToEscrow()` method:**
```typescript
async addToEscrow(
  payment: IPayment,
  options?: {
    deductions?: {
      subscriptionFee: number,
      processingFee: number,
      insurancePremium: number
    },
    revenueSourceIds?: string[]
  }
): Promise<IEscrowTransaction> {
  // Calculate amounts
  const totalAmount = payment.totalAmount || payment.amount;
  const deductions = options?.deductions || {
    subscriptionFee: 0,
    processingFee: 0,
    insurancePremium: 0
  };
  
  const totalDeductions = 
    deductions.subscriptionFee + 
    deductions.processingFee + 
    deductions.insurancePremium;
  
  const landlordAmount = totalAmount - totalDeductions;
  const khayalamiAmount = totalDeductions;
  
  // Create escrow transaction
  const escrowTransaction = await EscrowTransaction.create({
    ...existingFields,
    totalAmount,
    landlordAmount,
    khayalamiAmount,
    deductions: {
      subscriptionFee: deductions.subscriptionFee,
      processingFee: deductions.processingFee,
      insurancePremium: deductions.insurancePremium,
      totalDeductions
    },
    revenueSourceIds: options?.revenueSourceIds || [],
    paymentSource: payment.paymentMethod === "in_app" ? "in_app" : "external_deposit"
  });
  
  // Update escrow account
  await this.updateEscrowAccountBalance(totalAmount, "add");
  
  return escrowTransaction;
}
```

---

## 📧 **PHASE 4: Email Notifications**

### **Step 4.1: Create EmailNotificationService**
**File:** `src/services/EmailNotificationService.ts`

**Purpose:** Send all payment-related emails

**Methods:**
```typescript
class EmailNotificationService {
  // In-app payment confirmed
  async sendPaymentConfirmed(data: {
    tenantEmail: string,
    tenantName: string,
    amount: number,
    deductions: {...},
    escrowStatus: string
  }): Promise<void>
  
  // External payment request submitted
  async sendPaymentRequestSubmitted(data: {
    tenantEmail: string,
    tenantName: string,
    amount: number,
    requestId: string
  }): Promise<void>
  
  // External payment approved
  async sendPaymentApproved(data: {
    tenantEmail: string,
    tenantName: string,
    amount: number,
    deductions: {...}
  }): Promise<void>
  
  // External payment rejected
  async sendPaymentRejected(data: {
    tenantEmail: string,
    tenantName: string,
    amount: number,
    rejectionReason: string
  }): Promise<void>
  
  // Rent deposited in escrow (landlord)
  async sendRentDepositedEscrow(data: {
    landlordEmail: string,
    landlordName: string,
    tenantName: string,
    amount: number,
    netRentAmount: number,
    propertyTitle: string
  }): Promise<void>
  
  // Admin notification
  async sendAdminPaymentRequest(data: {
    adminEmail: string,
    tenantName: string,
    amount: number,
    requestId: string,
    proofUrl: string
  }): Promise<void>
}
```

**Integration:** Use existing ZeptoMail configuration from `EmailVerificationService`

---

## 🎯 **Complete Service Interaction Map**

```
┌─────────────────────────────────────────────────────────────┐
│                    API REQUEST                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              PaymentController                              │
│              (Route Handler)                                │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ In-App       │ │ External     │ │ Subscription│
│ Payment      │ │ Payment      │ │ Management  │
│ Flow         │ │ Flow         │ │             │
└──────┬───────┘ └──────┬───────┘ └──────┬──────┘
       │                │                 │
       │                │                 │
       ▼                ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│         PaymentCalculationService                           │
│         (Central Calculation Logic)                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Subscription │ │ Processing   │ │ Insurance    │
│ Fee Calc     │ │ Fee Calc     │ │ Premium Calc │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                 │
       └────────────────┼─────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│         RevenueSourceService                                │
│         (Create Revenue Records)                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│         EscrowService                                       │
│         (Add to Escrow with Deductions)                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Email        │ │ Status       │ │ Distribution │
│ Notifications│ │ Updates      │ │ Service      │
└──────────────┘ └──────────────┘ └──────────────┘
```

---

## ✅ **Implementation Checklist**

### **Week 1: Foundation**
- [ ] Create RevenueSource model
- [ ] Create Subscription model
- [ ] Create PaymentRequest model
- [ ] Update EscrowTransaction model
- [ ] Create PaymentCalculationService
- [ ] Create RevenueSourceService
- [ ] Create SubscriptionService

### **Week 2: Core Flow**
- [ ] Update PaymentService (in-app flow)
- [ ] Enhance EscrowService
- [ ] Integrate PaymentCalculationService
- [ ] Test in-app payment → escrow flow

### **Week 3: External Payments**
- [ ] Create PaymentRequestService
- [ ] Create PaymentRequestController
- [ ] Create admin review endpoints
- [ ] Integrate with escrow
- [ ] Test external payment flow

### **Week 4: Notifications**
- [ ] Create EmailNotificationService
- [ ] Create email templates
- [ ] Integrate notifications in all flows
- [ ] Test all email notifications

### **Week 5: Additional Features**
- [ ] Agreement fee integration
- [ ] Premium boost system
- [ ] Insurance commission
- [ ] Revenue reporting

---

## 🎯 **Key Success Factors**

1. **Escrow First**: All money must go through escrow
2. **Revenue Tracking**: Every fee creates a RevenueSource
3. **Deductions Calculated**: Before adding to escrow
4. **Notifications**: At every step
5. **Status Updates**: Real-time for all parties

This execution plan ensures everything integrates smoothly with the escrow workflow! 🚀







