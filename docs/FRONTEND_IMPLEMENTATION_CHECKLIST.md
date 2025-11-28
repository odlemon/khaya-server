# Frontend Implementation Checklist

## Quick Reference - Implementation Order

Follow this checklist in order for best results.

---

## ✅ Phase 1: Payment Request System (HIGH PRIORITY)

### 1.1 Tenant: Submit External Payment
- [ ] Create `/tenant/payments/submit-external` page
- [ ] Build payment request form component
- [ ] Add file upload for receipt (proof of payment)
- [ ] Add amount input field
- [ ] Add payment method dropdown (bank_transfer, cash, mobile_money, other)
- [ ] Add notes textarea (optional)
- [ ] Create API service: `submitPaymentRequest()`
- [ ] Add form validation
- [ ] Add success/error handling
- [ ] Show confirmation message after submission
- [ ] Redirect to payment status page

### 1.2 Tenant: View Payment Request Status
- [ ] Create payment request status card component
- [ ] Display status badge (pending, approved, rejected)
- [ ] Show submitted date
- [ ] Show rejection reason if rejected
- [ ] Add refresh/update functionality

### 1.3 Admin: Payment Requests List
- [ ] Create `/admin/payments/requests` page
- [ ] Create API service: `getPendingPaymentRequests()`
- [ ] Build payment requests table component
- [ ] Add columns: Tenant, Property, Amount, Payment Method, Date, Actions
- [ ] Add filter options (date range, tenant, landlord)
- [ ] Add pagination (if needed)

### 1.4 Admin: View Payment Request Details
- [ ] Create payment request detail modal
- [ ] Display full request information
- [ ] Add image viewer for receipt
- [ ] Show tenant and landlord details
- [ ] Show property information

### 1.5 Admin: Approve Payment Request
- [ ] Add "Approve" button to payment request
- [ ] Create confirmation dialog
- [ ] Create API service: `approvePaymentRequest()`
- [ ] Add loading state during approval
- [ ] Show success message
- [ ] Update UI after approval
- [ ] Refresh payment requests list

### 1.6 Admin: Reject Payment Request
- [ ] Add "Reject" button to payment request
- [ ] Create rejection modal with reason textarea (required)
- [ ] Create API service: `rejectPaymentRequest()`
- [ ] Add form validation for rejection reason
- [ ] Add loading state during rejection
- [ ] Show success message
- [ ] Update UI after rejection
- [ ] Refresh payment requests list

**Estimated Time:** 2-3 days

---

## ✅ Phase 2: Payment Display & Tracking (HIGH PRIORITY)

### 2.1 Tenant: Payment History
- [ ] Create `/tenant/payments` page
- [ ] List all payments (in-app and external)
- [ ] Show payment status indicators:
  - ✅ Verified (green)
  - ⏳ Pending (yellow)
  - ❌ Rejected (red)
  - 💰 Distributed (blue)
- [ ] Show payment method
- [ ] Show amount and deductions breakdown
- [ ] Show escrow status
- [ ] Add filters (date range, status)

### 2.2 Deduction Breakdown Component
- [ ] Create reusable `DeductionBreakdown` component
- [ ] Display total amount
- [ ] Display subscription fee
- [ ] Display processing fee
- [ ] Display insurance premium
- [ ] Display total deductions
- [ ] Display net rent amount
- [ ] Make it expandable/collapsible

### 2.3 Landlord: Escrow Dashboard
- [ ] Create `/landlord/escrow` page
- [ ] Add summary cards:
  - Total Pending
  - Total Held
  - Total Distributed
- [ ] Create API service: `getLandlordEscrowSummary()`
- [ ] Display escrow transactions list
- [ ] Show deduction breakdown for each transaction
- [ ] Add filters (date range, status)

### 2.4 Escrow Transaction Card
- [ ] Create escrow transaction card component
- [ ] Display tenant name
- [ ] Display property name
- [ ] Display total payment amount
- [ ] Display deductions breakdown (expandable)
- [ ] Display net amount (landlord portion)
- [ ] Display status badge
- [ ] Display date

**Estimated Time:** 2-3 days

---

## ✅ Phase 3: Distribution Management (MEDIUM PRIORITY - Admin Only)

### 3.1 Admin: Distribution Dashboard
- [ ] Create `/admin/distribution` page
- [ ] Create API service: `getPendingDistribution()`
- [ ] Add summary cards:
  - Total Transactions Pending
  - Total Amount to Distribute
  - Total Landlord Payouts
  - Total Khayalami Payouts
- [ ] Add filter options (date range, landlord)
- [ ] Display pending transactions list

### 3.2 Admin: Manual Distribution
- [ ] Add "Distribute Now" button
- [ ] Create distribution confirmation modal
- [ ] Show distribution summary in modal:
  - Transaction count
  - Total amount
  - Landlord payout count
  - Khayalami payout count
- [ ] Add warning message
- [ ] Create API service: `manualDistribution()`
- [ ] Add loading state during distribution
- [ ] Show success message with results
- [ ] Refresh dashboard after distribution

### 3.3 Admin: Distribution History
- [ ] Create `/admin/distribution/history` page
- [ ] Create API service: `getDistributionSummary()`
- [ ] Display last distribution date
- [ ] Display distribution method (scheduled/manual)
- [ ] Display total distributed amounts
- [ ] Add chart/graph (optional)

**Estimated Time:** 1-2 days

---

## ✅ Phase 4: Revenue Analytics (LOW PRIORITY - Admin)

### 4.1 Admin: Revenue Dashboard
- [ ] Create `/admin/revenue` page
- [ ] Display revenue by source:
  - Subscription fees
  - Processing fees
  - Agreement fees
  - Premium boosts
  - Insurance commissions
- [ ] Add revenue over time chart
- [ ] Display top revenue sources
- [ ] Add monthly/yearly comparisons

**Estimated Time:** 1-2 days

---

## 🛠️ Shared Components & Utilities

### API Service Layer
- [ ] Create `paymentRequestService.ts`
- [ ] Create `distributionService.ts`
- [ ] Update existing `paymentService.ts` (if needed)
- [ ] Add error handling utilities
- [ ] Add request interceptors for auth tokens

### UI Components
- [ ] Create `StatusBadge` component (reusable)
- [ ] Create `DeductionBreakdown` component (reusable)
- [ ] Create `ConfirmationModal` component (reusable)
- [ ] Create `FileUpload` component (for receipts)
- [ ] Create `LoadingSpinner` component
- [ ] Create `ErrorToast` component
- [ ] Create `SuccessToast` component

### Utilities
- [ ] Add date formatting utilities
- [ ] Add currency formatting utilities
- [ ] Add file upload utilities
- [ ] Add validation utilities

**Estimated Time:** 1 day

---

## 📋 Testing Checklist

### Phase 1 Testing
- [ ] Test payment request submission with valid data
- [ ] Test payment request submission with invalid data
- [ ] Test file upload for receipt
- [ ] Test admin approval flow
- [ ] Test admin rejection flow
- [ ] Test email notifications (check backend logs)

### Phase 2 Testing
- [ ] Test payment history display
- [ ] Test deduction breakdown display
- [ ] Test escrow dashboard for landlords
- [ ] Test filters and date ranges

### Phase 3 Testing
- [ ] Test pending distribution display
- [ ] Test manual distribution trigger
- [ ] Test distribution confirmation
- [ ] Test distribution summary display

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All API endpoints tested
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Success/error messages displayed
- [ ] File uploads working
- [ ] Authentication working
- [ ] Admin role checks working
- [ ] Mobile responsive design
- [ ] Accessibility checked
- [ ] Performance optimized

---

## 📝 Notes

1. **Start with Phase 1** - It's the most critical for user functionality
2. **Test each phase** before moving to the next
3. **Reuse components** where possible (StatusBadge, DeductionBreakdown, etc.)
4. **Follow existing patterns** in your codebase
5. **Handle errors gracefully** - Show user-friendly messages
6. **Add loading states** - Don't leave users wondering
7. **Email notifications** are handled by backend - no frontend action needed

---

## 🆘 Need Help?

Refer to:
- `FRONTEND_IMPLEMENTATION_GUIDE.md` - Detailed implementation guide
- `FRONTEND_API_REFERENCE.md` - Complete API documentation
- `REVENUE_MODEL_IMPLEMENTATION_SRD.md` - System requirements
- `ESCROW_SYSTEM.md` - Escrow system details

---

## ⏱️ Total Estimated Time

- Phase 1: 2-3 days
- Phase 2: 2-3 days
- Phase 3: 1-2 days
- Phase 4: 1-2 days
- Shared Components: 1 day

**Total: 7-11 days** (depending on team size and experience)







