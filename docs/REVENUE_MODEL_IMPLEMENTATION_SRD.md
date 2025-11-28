# 📋 Software Requirements Document (SRD)
## Revenue Model & Payment Flow Implementation - Khayalami

---

## 🎯 **Overview**

This document outlines the step-by-step implementation plan for the complete revenue model and payment flow system, including escrow integration, revenue source tracking, and email notifications.

---

## 📊 **Revenue Sources Summary**

### **1. Tenant Revenue Streams**
- **Membership Subscription**: USD 4.99-7.99/month (Zero-Deposit Access)
- **Agreement Processing Fee**: USD 30-50 one-time (at signing)

### **2. Landlord Revenue Streams**
- **Premium Boosts**: USD 10-25 per property (optional)
- **Monthly Rent Processing Fee**: 1.5-2% per transaction
- **Insurance Commission**: ~15% of premium (if landlord opts in)

### **3. Additional Revenue**
- **Add-on Services**: Cleaning, moving, Wi-Fi setup, furniture hire

---

## 🔄 **Payment Flow Models**

### **FLOW 1: In-App Payment (Tenant pays via platform)**

```
1. Tenant initiates rent payment via app
    ↓
2. System calculates deductions:
   - Subscription fee (if due)
   - Processing fee (1.5-2% of rent)
   - Insurance premium (if applicable)
    ↓
3. Tenant pays total amount (rent + fees)
    ↓
4. Money goes to ESCROW
    ↓
5. Escrow holds:
   - Net rent (for landlord)
   - Processing fee (for Khayalami)
   - Subscription fee (for Khayalami)
   - Insurance premium (if applicable)
    ↓
6. Email notifications sent:
   - Tenant: Payment confirmed
   - Landlord: Rent deposited in escrow
    ↓
7. At month end: Distribution
   - Landlord receives net rent
   - Khayalami receives fees
```

### **FLOW 2: Outside Platform Payment (Tenant pays externally)**

```
1. Tenant selects "Deposit" option
    ↓
2. Tenant uploads proof of payment (receipt/bank statement)
    ↓
3. Payment request created:
   - Status: "pending_admin_approval"
   - Proof attached
   - Amount specified
    ↓
4. Admin sees payment request in dashboard
    ↓
5. Admin reviews proof of payment
    ↓
6A. Admin APPROVES:
    ↓
    - Calculate deductions:
      * Subscription fee (if due)
      * Processing fee (1.5-2%)
      * Insurance premium (if applicable)
    ↓
    - Add to ESCROW
    ↓
    - Update tenant status: "Payment processed successfully"
    ↓
    - Update landlord: "Rent deposited in escrow"
    ↓
    - Send email notifications:
      * Tenant: Payment approved & processed
      * Landlord: Rent deposited in escrow
      * Admin: Payment approved confirmation
    ↓
6B. Admin REJECTS:
    ↓
    - Update status: "rejected"
    - Add rejection reason
    ↓
    - Send email notifications:
      * Tenant: Payment rejected (with reason)
      * Admin: Payment rejected confirmation
```

---

## 📝 **Step-by-Step Implementation Plan**

### **PHASE 1: Data Models & Revenue Tracking**

#### **Step 1.1: Create Subscription Model**
- [ ] Create `Subscription` model
  - Fields: `tenantId`, `planType` (Premium/Premium+), `price`, `billingCycle`, `status`, `startDate`, `endDate`, `autoRenew`
  - Track subscription status per tenant
  - Link to rental agreements

#### **Step 1.2: Create Revenue Source Model**
- [ ] Create `RevenueSource` model
  - Fields: `sourceType`, `amount`, `payerId`, `recipientId`, `paymentId`, `escrowTransactionId`, `status`
  - Types: `subscription`, `agreement_fee`, `processing_fee`, `premium_boost`, `insurance_commission`, `service_fee`
  - Track all revenue sources separately

#### **Step 1.3: Create Payment Request Model (For Outside Payments)**
- [ ] Create `PaymentRequest` model
  - Fields: `tenantId`, `rentalId`, `amount`, `paymentMethod`, `proofOfPayment`, `status`, `submittedAt`, `reviewedBy`, `reviewedAt`, `rejectionReason`
  - Status: `pending_admin_approval`, `approved`, `rejected`, `processed`
  - Admin can approve/reject

#### **Step 1.4: Update EscrowTransaction Model**
- [ ] Add revenue source tracking
  - Add `revenueSources` array (references to RevenueSource)
  - Add `deductions` breakdown:
    - `subscriptionFee`
    - `processingFee`
    - `insurancePremium`
    - `netRentAmount`
  - Add `paymentSource`: `in_app` | `external_deposit`

---

### **PHASE 2: Subscription System**

#### **Step 2.1: Subscription Service**
- [ ] Create `SubscriptionService`
  - `createSubscription()` - When tenant signs up for zero-deposit
  - `renewSubscription()` - Auto-renewal logic
  - `cancelSubscription()` - Handle cancellation
  - `checkSubscriptionStatus()` - Verify if active
  - `calculateSubscriptionFee()` - Based on property value bracket

#### **Step 2.2: Subscription Enforcement**
- [ ] Add subscription check to rental agreements
  - Tenant must have active subscription to access zero-deposit
  - If subscription cancelled → notify landlord + risk of eviction
  - Block certain features if subscription inactive

#### **Step 2.3: Subscription API Endpoints**
- [ ] `POST /api/subscriptions/create` - Tenant creates subscription
- [ ] `GET /api/subscriptions/status` - Check subscription status
- [ ] `POST /api/subscriptions/cancel` - Cancel subscription
- [ ] `GET /api/subscriptions/history` - Subscription history

---

### **PHASE 3: Payment Processing & Deductions**

#### **Step 3.1: Payment Calculation Service**
- [ ] Create `PaymentCalculationService`
  - `calculateRentDeductions(rentAmount, tenantId, landlordId)`
    - Calculate subscription fee (if due)
    - Calculate processing fee (1.5-2% of rent)
    - Calculate insurance premium (if landlord opted in)
    - Calculate net rent for landlord
  - Return breakdown:
    ```typescript
    {
      totalAmount: 500,
      subscriptionFee: 5,
      processingFee: 10, // 2% of 500
      insurancePremium: 0, // if applicable
      netRentAmount: 485,
      khayalamiTotal: 15
    }
    ```

#### **Step 3.2: Update PaymentService**
- [ ] Modify `createNewPayment()` to:
  - Call `PaymentCalculationService` to get deductions
  - Create `RevenueSource` records for each fee
  - Add to escrow with full breakdown
  - Track `paymentSource`: `in_app` or `external_deposit`

#### **Step 3.3: Escrow Integration with Deductions**
- [ ] Update `EscrowService.addToEscrow()`
  - Accept deductions breakdown
  - Create separate escrow entries or track in single entry
  - Link revenue sources to escrow transaction

---

### **PHASE 4: Outside Platform Payment Flow**

#### **Step 4.1: Payment Request Service**
- [ ] Create `PaymentRequestService`
  - `createPaymentRequest()` - Tenant submits external payment
  - `getPendingRequests()` - Admin sees all pending
  - `approvePaymentRequest()` - Admin approves
  - `rejectPaymentRequest()` - Admin rejects

#### **Step 4.2: Payment Request API Endpoints**
- [ ] `POST /api/payments/external/deposit` - Tenant submits external payment
  - Body: `{ amount, proofOfPayment, paymentMethod, notes }`
  - Creates PaymentRequest with status: `pending_admin_approval`
  
- [ ] `GET /api/payments/external/pending` - Admin gets all pending requests
  - Shows: tenant, amount, proof, submitted date
  
- [ ] `POST /api/payments/external/:requestId/approve` - Admin approves
  - Calculates deductions
  - Adds to escrow
  - Updates tenant & landlord status
  - Sends email notifications
  
- [ ] `POST /api/payments/external/:requestId/reject` - Admin rejects
  - Adds rejection reason
  - Updates status
  - Sends email notification to tenant

#### **Step 4.3: Admin Dashboard Integration**
- [ ] Add payment request review section
  - List of pending requests
  - View proof of payment
  - Approve/Reject buttons
  - Filter by date, tenant, amount

---

### **PHASE 5: Email Notifications**

#### **Step 5.1: Email Notification Service**
- [ ] Create `EmailNotificationService`
  - Use existing ZeptoMail configuration
  - Create email templates for each notification type

#### **Step 5.2: Payment Notification Templates**
- [ ] **Tenant - Payment Confirmed (In-App)**
  - Subject: "Payment Confirmed - Rent Processed"
  - Content: Amount paid, deductions breakdown, escrow status
  
- [ ] **Tenant - Payment Request Submitted (External)**
  - Subject: "Payment Request Submitted - Awaiting Review"
  - Content: Amount, proof uploaded, estimated processing time
  
- [ ] **Tenant - Payment Approved (External)**
  - Subject: "Payment Approved - Processed Successfully"
  - Content: Amount approved, deductions, escrow status
  
- [ ] **Tenant - Payment Rejected (External)**
  - Subject: "Payment Request Rejected"
  - Content: Rejection reason, next steps
  
- [ ] **Landlord - Rent Deposited in Escrow**
  - Subject: "Rent Deposited in Escrow"
  - Content: Amount, tenant name, property, escrow status
  
- [ ] **Admin - Payment Request Received**
  - Subject: "New Payment Request - Review Required"
  - Content: Tenant, amount, proof link, review link

#### **Step 5.3: Integrate Email Notifications**
- [ ] Add email sending to:
  - `PaymentService.createNewPayment()` - In-app payment confirmed
  - `PaymentRequestService.createPaymentRequest()` - Request submitted
  - `PaymentRequestService.approvePaymentRequest()` - Approved & processed
  - `PaymentRequestService.rejectPaymentRequest()` - Rejected
  - `EscrowService.addToEscrow()` - Landlord notification

---

### **PHASE 6: Status Updates & Tracking**

#### **Step 6.1: Tenant Payment Status**
- [ ] Update tenant dashboard/payment status
  - Show: "Payment processed successfully" when approved
  - Show: "Payment pending review" when submitted
  - Show: "Payment rejected" with reason
  - Show: Deductions breakdown

#### **Step 6.2: Landlord Escrow Status**
- [ ] Update landlord dashboard
  - Show: "Rent deposited in escrow" notification
  - Show: Amount, tenant, property, date
  - Show: Net rent amount (after deductions)
  - Link to escrow transaction details

#### **Step 6.3: Payment Status Model Updates**
- [ ] Add new payment statuses:
  - `pending_admin_approval` - External payment awaiting review
  - `approved` - External payment approved
  - `rejected` - External payment rejected
  - `processed` - Payment processed and in escrow

---

### **PHASE 7: Agreement Processing Fee**

#### **Step 7.1: Agreement Fee Integration**
- [ ] Add fee collection when agreement is signed
  - Trigger: When both parties sign agreement
  - Amount: USD 30-50 (one-time)
  - Paid by: Tenant
  - Create RevenueSource record
  - Add to escrow (Khayalami receives 100%)

#### **Step 7.2: Agreement Service Update**
- [ ] Update `AgreementService.createAgreement()`
  - Check if tenant has paid agreement fee
  - If not, require payment before agreement activation
  - Create revenue source record

---

### **PHASE 8: Premium Boosts (Landlord)**

#### **Step 8.1: Premium Boost Service**
- [ ] Create `PremiumBoostService`
  - `purchaseBoost()` - Landlord buys boost
  - `activateBoost()` - Apply to property listing
  - `getActiveBoosts()` - List active boosts

#### **Step 8.2: Premium Boost API**
- [ ] `POST /api/properties/:propertyId/boost` - Purchase boost
  - Body: `{ boostType, duration, amount }`
  - Creates RevenueSource
  - Updates property visibility

---

### **PHASE 9: Insurance Commission**

#### **Step 9.1: Insurance Integration**
- [ ] Add insurance premium tracking
  - When landlord opts in for insurance
  - Calculate commission (15% of premium)
  - Track in RevenueSource
  - Add to escrow deductions

#### **Step 9.2: Insurance Service**
- [ ] Create `InsuranceService`
  - `calculatePremium()` - Based on property/rent
  - `calculateCommission()` - 15% of premium
  - `trackInsurancePayment()` - Link to payment

---

### **PHASE 10: Distribution Updates**

#### **Step 10.1: Update Distribution Logic**
- [ ] Modify `EscrowService.distributeEscrow()`
  - Distribute net rent to landlords
  - Distribute all fees to Khayalami:
    - Subscription fees
    - Processing fees
    - Agreement fees
    - Premium boosts
    - Insurance commissions
    - Service fees

#### **Step 10.2: Revenue Reporting**
- [ ] Create revenue reports
  - Total revenue by source
  - Revenue by time period
  - Revenue by property/tenant
  - Commission breakdown

---

### **PHASE 11: Testing & Validation**

#### **Step 11.1: Unit Tests**
- [ ] Test payment calculation logic
- [ ] Test subscription enforcement
- [ ] Test escrow integration
- [ ] Test email notifications

#### **Step 11.2: Integration Tests**
- [ ] Test complete in-app payment flow
- [ ] Test complete external payment flow
- [ ] Test distribution logic
- [ ] Test revenue tracking

#### **Step 11.3: End-to-End Tests**
- [ ] Test tenant subscription → payment → escrow → distribution
- [ ] Test external payment → approval → escrow → distribution
- [ ] Test all email notifications
- [ ] Test status updates

---

## 📋 **Implementation Checklist Summary**

### **Data Models**
- [ ] Subscription Model
- [ ] RevenueSource Model
- [ ] PaymentRequest Model
- [ ] Updated EscrowTransaction Model

### **Services**
- [ ] SubscriptionService
- [ ] PaymentCalculationService
- [ ] PaymentRequestService
- [ ] EmailNotificationService
- [ ] PremiumBoostService
- [ ] InsuranceService
- [ ] Updated PaymentService
- [ ] Updated EscrowService

### **API Endpoints**
- [ ] Subscription endpoints
- [ ] Payment request endpoints (external payments)
- [ ] Premium boost endpoints
- [ ] Revenue reporting endpoints

### **Email Notifications**
- [ ] Payment confirmed (in-app)
- [ ] Payment request submitted
- [ ] Payment approved
- [ ] Payment rejected
- [ ] Rent deposited in escrow
- [ ] Admin payment request notification

### **Status Updates**
- [ ] Tenant payment status tracking
- [ ] Landlord escrow notifications
- [ ] Admin dashboard updates

---

## 🎯 **Priority Order**

1. **HIGH PRIORITY** (Core Payment Flow):
   - Payment Calculation Service
   - Updated PaymentService with escrow
   - External Payment Request System
   - Email Notifications

2. **MEDIUM PRIORITY** (Revenue Sources):
   - Subscription System
   - Agreement Processing Fee
   - Processing Fee Integration

3. **LOW PRIORITY** (Additional Features):
   - Premium Boosts
   - Insurance Commission
   - Advanced Reporting

---

## 📝 **Next Steps**

1. Review and confirm this SRD
2. Start with Phase 1 (Data Models)
3. Implement Phase 2-3 (Core Payment Flow)
4. Add Phase 4 (External Payments)
5. Integrate Phase 5 (Email Notifications)
6. Complete remaining phases

---

**Ready to start implementation!** 🚀







