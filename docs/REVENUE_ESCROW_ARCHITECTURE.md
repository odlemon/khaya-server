# 🏗️ Revenue Model & Escrow Architecture
## Visual Flow & Service Architecture

---

## 📊 **System Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────┐
│                    REVENUE SOURCES LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Subscription│  │ Agreement    │  │ Processing   │         │
│  │ Service     │  │ Fee Service  │  │ Fee Service  │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                  │
│         └─────────────────┼─────────────────┘                 │   
│                           │                                    │
│                  ┌────────▼─────────┐                          │
│                  │ Payment          │                          │
│                  │ Calculation      │                          │
│                  │ Service          │                          │
│                  └────────┬─────────┘                          │
└───────────────────────────┼────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT PROCESSING LAYER                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │ In-App Payment   │         │ External Payment │            │
│  │ Service          │         │ Request Service  │            │
│  │                  │         │                  │            │
│  │ • Calculate fees │         │ • Create request │            │
│  │ • Process payment│         │ • Admin review   │            │
│  │ • Auto-verify    │         │ • Approve/Reject │            │
│  └────────┬─────────┘         └────────┬─────────┘            │
│           │                            │                       │
│           └────────────┬────────────────┘                      │
│                        │                                       │
│                 ┌──────▼───────┐                               │
│                 │ Payment      │                               │
│                 │ Service      │                               │
│                 │ (Updated)    │                               │
│                 └──────┬───────┘                               │
└────────────────────────┼───────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ESCROW LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              EscrowService                               │ │
│  │                                                           │ │
│  │  • addToEscrow() - Add payment with deductions           │ │
│  │  • updateEscrowStatus() - Update status                  │ │
│  │  • distributeEscrow() - Monthly/manual distribution     │ │
│  │  • getEscrowSummary() - Account overview                 │ │
│  └───────────────────────┬──────────────────────────────────┘ │
│                          │                                     │
│  ┌───────────────────────▼──────────────────────────────────┐ │
│  │           EscrowTransaction Model                        │ │
│  │                                                           │ │
│  │  • totalAmount: 500                                      │ │
│  │  • landlordAmount: 485 (net rent)                        │ │
│  │  • khayalamiAmount: 15 (fees)                            │ │
│  │  • deductions: {                                         │ │
│  │      subscriptionFee: 5,                                │ │
│  │      processingFee: 10,                                  │ │
│  │      insurancePremium: 0                                 │ │
│  │    }                                                     │ │
│  │  • revenueSources: [ref1, ref2, ref3]                   │ │
│  └───────────────────────┬──────────────────────────────────┘ │
└───────────────────────────┼────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DISTRIBUTION LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │         DistributionService                              │ │
│  │                                                           │ │
│  │  • runMonthlyDistribution() - Scheduled                  │ │
│  │  • Manual distribution via button                        │ │
│  └───────────────────────┬──────────────────────────────────┘ │
│                          │                                     │
│           ┌──────────────┼──────────────┐                     │
│           │              │              │                     │
│    ┌──────▼──────┐  ┌────▼────┐  ┌─────▼─────┐              │
│    │ Landlord    │  │Khayalami│  │  Payout   │              │
│    │ Payout      │  │ Payout  │  │  Records  │              │
│    │ (95%)       │  │ (5%)    │  │           │              │
│    └─────────────┘  └─────────┘  └───────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 **Complete Payment Flow Visualization**

### **FLOW 1: In-App Payment (Tenant pays via platform)**

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Tenant Initiates Payment                                │
└─────────────────────────────────────────────────────────────────┘
POST /api/payments/rental/:rentalId/create
{
  "amount": 500,
  "paymentMethod": "in_app"
}
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: PaymentCalculationService Calculates Deductions         │
└─────────────────────────────────────────────────────────────────┘
Input: rentAmount = 500, tenantId, landlordId
                    │
                    ▼
Calculation:
  • Subscription fee: 5 (if due)
  • Processing fee: 10 (2% of 500)
  • Insurance premium: 0 (if applicable)
  • Net rent: 485
                    │
                    ▼
Output:
{
  totalAmount: 500,
  subscriptionFee: 5,
  processingFee: 10,
  insurancePremium: 0,
  netRentAmount: 485,
  khayalamiTotal: 15
}
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Create RevenueSource Records                           │
└─────────────────────────────────────────────────────────────────┘
RevenueSource 1:
  - type: "subscription"
  - amount: 5
  - payerId: tenantId
  - recipientId: "khayalami"
                    │
RevenueSource 2:
  - type: "processing_fee"
  - amount: 10
  - payerId: tenantId
  - recipientId: "khayalami"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: PaymentService Creates Payment Record                  │
└─────────────────────────────────────────────────────────────────┘
Payment {
  amount: 500,
  status: "verified",
  paymentMethod: "in_app",
  gatewayResponse: {...}
}
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: EscrowService.addToEscrow()                            │
└─────────────────────────────────────────────────────────────────┘
EscrowTransaction {
  totalAmount: 500,
  landlordAmount: 485,
  khayalamiAmount: 15,
  deductions: {
    subscriptionFee: 5,
    processingFee: 10,
    insurancePremium: 0
  },
  revenueSources: [rev1, rev2],
  status: "held",
  paymentSource: "in_app"
}
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: Email Notifications Sent                                │
└─────────────────────────────────────────────────────────────────┘
✅ Tenant: "Payment Confirmed - K500 processed"
✅ Landlord: "Rent K485 deposited in escrow"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: Status Updates                                          │
└─────────────────────────────────────────────────────────────────┘
✅ Tenant dashboard: "Payment processed successfully"
✅ Landlord dashboard: "Rent deposited in escrow"
✅ Escrow account: totalHeld += 500
```

---

### **FLOW 2: External Payment (Tenant pays outside platform)**

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Tenant Submits External Payment                         │
└─────────────────────────────────────────────────────────────────┘
POST /api/payments/external/deposit
{
  "amount": 500,
  "proofOfPayment": "https://...",
  "paymentMethod": "bank_transfer",
  "notes": "Paid via bank transfer"
}
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: PaymentRequestService.createPaymentRequest()            │
└─────────────────────────────────────────────────────────────────┘
PaymentRequest {
  tenantId: "tenant123",
  rentalId: "rental456",
  amount: 500,
  proofOfPayment: "https://...",
  status: "pending_admin_approval",
  submittedAt: NOW
}
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Email Notification                                      │
└─────────────────────────────────────────────────────────────────┘
✅ Tenant: "Payment request submitted - Awaiting review"
✅ Admin: "New payment request - Review required"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Admin Reviews in Dashboard                              │
└─────────────────────────────────────────────────────────────────┘
GET /api/payments/external/pending
                    │
Admin sees:
  - Tenant: John Doe
  - Amount: K500
  - Proof: [View Receipt]
  - Submitted: 2 hours ago
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5A: Admin APPROVES                                         │
└─────────────────────────────────────────────────────────────────┘
POST /api/payments/external/:requestId/approve
                    │
                    ▼
PaymentCalculationService.calculateRentDeductions()
  • Subscription fee: 5
  • Processing fee: 10
  • Net rent: 485
                    │
                    ▼
Create Payment Record
  Payment {
    amount: 500,
    status: "verified",
    paymentMethod: "external_deposit",
    proofOfPayment: "..."
  }
                    │
                    ▼
Create RevenueSource Records
  • Subscription fee
  • Processing fee
                    │
                    ▼
EscrowService.addToEscrow()
  EscrowTransaction {
    totalAmount: 500,
    landlordAmount: 485,
    khayalamiAmount: 15,
    status: "held",
    paymentSource: "external_deposit"
  }
                    │
                    ▼
Update PaymentRequest
  status: "approved" → "processed"
                    │   
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6A: Email Notifications (Approved)                         │
└─────────────────────────────────────────────────────────────────┘
✅ Tenant: "Payment Approved - K500 processed successfully"
✅ Landlord: "Rent K485 deposited in escrow"
✅ Admin: "Payment approved and processed"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 7A: Status Updates                                         │
└─────────────────────────────────────────────────────────────────┘
✅ Tenant: "Payment processed successfully"
✅ Landlord: "Rent deposited in escrow"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5B: Admin REJECTS (Alternative Path)                       │
└─────────────────────────────────────────────────────────────────┘
POST /api/payments/external/:requestId/reject
{
  "rejectionReason": "Receipt is unclear. Please upload a clearer image."
}
                    │
                    ▼
Update PaymentRequest
  status: "rejected"
  rejectionReason: "..."
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6B: Email Notification (Rejected)                          │
└─────────────────────────────────────────────────────────────────┘
✅ Tenant: "Payment Rejected - [Reason]"
✅ Admin: "Payment rejected"
                    │
                    ▼
Tenant can resubmit with new proof
```

---

## 🏦 **Escrow Integration Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESCROW ACCOUNT                               │
│                  (Central Holding)                             │
└─────────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Transaction 1 │  │ Transaction 2 │  │ Transaction 3 │
│ K500          │  │ K1,000        │  │ K750          │
│               │  │               │  │               │
│ Landlord: 485 │  │ Landlord: 970 │  │ Landlord: 728 │
│ Khaya: 15     │  │ Khaya: 30     │  │ Khaya: 22     │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Monthly Distribution (1st of Month)                │
└─────────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Landlord A    │  │ Landlord B    │  │ Khayalami     │
│ Payout        │  │ Payout        │  │ Payout        │
│               │  │               │  │               │
│ Amount: 485   │  │ Amount: 970   │  │ Amount: 67     │
│ Status: paid  │  │ Status: paid  │  │ Status: paid  │
└───────────────┘  └───────────────┘  └───────────────┘
```

---

## 🔧 **Service Architecture**

### **Core Services Required**

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 1. PaymentCalculationService                              │ │
│  │    • calculateRentDeductions()                            │ │
│  │    • calculateSubscriptionFee()                         │ │
│  │    • calculateProcessingFee()                            │ │
│  │    • calculateInsurancePremium()                         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 2. SubscriptionService                                   │ │
│  │    • createSubscription()                                │ │
│  │    • renewSubscription()                                 │ │
│  │    • cancelSubscription()                                │ │
│  │    • checkSubscriptionStatus()                           │ │
│  │    • enforceSubscription()                               │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 3. PaymentRequestService                                  │ │
│  │    • createPaymentRequest()                              │ │
│  │    • getPendingRequests()                                │ │
│  │    • approvePaymentRequest()                             │ │
│  │    • rejectPaymentRequest()                              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 4. RevenueSourceService                                   │ │
│  │    • createRevenueSource()                               │ │
│  │    • getRevenueBySource()                                │ │
│  │    • getRevenueByPeriod()                                │ │
│  │    • linkToEscrowTransaction()                           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 5. EmailNotificationService                               │ │
│  │    • sendPaymentConfirmed()                              │ │
│  │    • sendPaymentRequestSubmitted()                       │ │
│  │    • sendPaymentApproved()                               │ │
│  │    • sendPaymentRejected()                               │ │
│  │    • sendRentDepositedEscrow()                           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 6. PaymentService (UPDATED)                               │ │
│  │    • createNewPayment() - Uses escrow                    │ │
│  │    • submitPayment() - Uses escrow                       │ │
│  │    • verifyPayment() - Updates escrow                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 7. EscrowService (EXISTING - ENHANCED)                    │ │
│  │    • addToEscrow() - Accepts deductions                  │ │
│  │    • updateEscrowStatus()                                │ │
│  │    • distributeEscrow() - Distributes with fees          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 8. DistributionService (EXISTING)                        │ │
│  │    • runMonthlyDistribution()                            │ │
│  │    • checkAndDistribute()                                │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 **Data Flow Diagram**

```
┌─────────────┐
│   Tenant    │
└──────┬──────┘
       │
       │ 1. Initiates Payment
       ▼
┌─────────────────────────────────┐
│  PaymentCalculationService      │
│  • Calculate deductions         │
│  • Get subscription status      │
│  • Calculate fees               │
└──────┬──────────────────────────┘
       │
       │ 2. Returns breakdown
       ▼
┌─────────────────────────────────┐
│  PaymentService                 │
│  • Create payment record        │
│  • Process payment              │
└──────┬──────────────────────────┘
       │
       │ 3. Create revenue sources
       ▼
┌─────────────────────────────────┐
│  RevenueSourceService           │
│  • Create subscription fee      │
│  • Create processing fee        │
│  • Link to payment              │
└──────┬──────────────────────────┘
       │
       │ 4. Add to escrow
       ▼
┌─────────────────────────────────┐
│  EscrowService                  │
│  • addToEscrow()                │
│  • Track deductions             │
│  • Update account balance       │
└──────┬──────────────────────────┘
       │
       │ 5. Send notifications
       ▼
┌─────────────────────────────────┐
│  EmailNotificationService       │
│  • Tenant notification          │
│  • Landlord notification        │
│  • Admin notification           │
└─────────────────────────────────┘
```

---

## 🎯 **Execution Strategy**

### **Phase 1: Foundation (Week 1)**
1. Create data models (Subscription, RevenueSource, PaymentRequest)
2. Create PaymentCalculationService
3. Update EscrowTransaction model with deductions

### **Phase 2: Core Payment Flow (Week 2)**
1. Update PaymentService to use escrow
2. Integrate PaymentCalculationService
3. Create RevenueSourceService
4. Test in-app payment flow

### **Phase 3: External Payments (Week 3)**
1. Create PaymentRequestService
2. Build admin review endpoints
3. Integrate with escrow
4. Test external payment flow

### **Phase 4: Notifications & Status (Week 4)**
1. Create EmailNotificationService
2. Add email templates
3. Integrate status updates
4. Test all notifications

### **Phase 5: Additional Features (Week 5)**
1. Subscription system
2. Agreement fee integration
3. Premium boosts
4. Insurance commission

---

## 🔗 **Service Dependencies**

```
PaymentService
    ├── PaymentCalculationService
    ├── EscrowService
    ├── RevenueSourceService
    └── EmailNotificationService

PaymentRequestService
    ├── PaymentCalculationService
    ├── EscrowService
    ├── RevenueSourceService
    └── EmailNotificationService

EscrowService
    ├── RevenueSourceService (for tracking)
    └── DistributionService (for payouts)

DistributionService
    └── EscrowService
```

---

## ✅ **Key Integration Points**

1. **Payment → Escrow**: All payments go through escrow
2. **Deductions → Revenue Sources**: Every fee creates a RevenueSource record
3. **Escrow → Distribution**: Monthly distribution handles all fees
4. **Notifications → All Actions**: Email sent at every step
5. **Status Updates → Dashboards**: Real-time updates for all parties

---

This architecture ensures:
- ✅ All money flows through escrow
- ✅ All revenue sources are tracked
- ✅ Proper deductions are calculated
- ✅ Clear audit trail
- ✅ Automated distribution
- ✅ Complete notifications

Ready to implement! 🚀

