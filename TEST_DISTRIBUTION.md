# 🧪 Distribution Testing Guide

## Overview

This guide helps you test the money distribution system to ensure funds are correctly distributed to landlords and Khayalami.

## Prerequisites

1. **Server must be running**: `npm run dev` or `npm start`
2. **Admin account exists**: `admin@khaya.com` / `Admin@123456`
3. **Escrow transactions exist** with status `"held"`

---

## Step 1: Save Current State (IMPORTANT!)

Before testing, save the current state so you can reset if needed:

```bash
npx ts-node src/scripts/saveDistributionState.ts
```

This will:
- Save all escrow transactions
- Save all landlord balances
- Save all payouts
- Save escrow account state
- Create `distribution-state-backup.json`

**Expected Output:**
```
📊 Escrow Account: Held=1650, Distributed=0
📋 Escrow Transactions: 5 total
💰 Landlord Balances: 4 accounts
💸 Payouts: 0 total
💵 Revenue Sources: 18 total

📊 SUMMARY:
   Total Held in Escrow: 1650
   Landlord Amount: 1593.04
   Khayalami Amount: 56.96
   Held Transactions: 5
```

---

## Step 2: Test Distribution via API

### 2.1 Login as Admin

```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@khaya.com",
  "password": "Admin@123456"
}
```

**Save the token** from the response.

### 2.2 Check Pending Distribution

```bash
GET http://localhost:3000/api/distribution/pending
Authorization: Bearer <admin_token>
```

This shows:
- Number of transactions ready for distribution
- Expected amounts for landlords
- Expected amount for Khayalami

### 2.3 Run Distribution

```bash
POST http://localhost:3000/api/distribution/manual
Authorization: Bearer <admin_token>
Content-Type: application/json

{}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Distribution completed successfully",
  "data": {
    "totalDistributed": 1650,
    "landlordPayouts": 2,
    "khayalamiPayouts": 1,
    "payoutIds": ["...", "...", "..."]
  }
}
```

---

## Step 3: Verify Results

### 3.1 Check Escrow Account

```bash
GET http://localhost:3000/api/escrow/summary
Authorization: Bearer <admin_token>
```

**Verify:**
- `totalHeld` decreased by distributed amount
- `totalDistributed` increased
- `distributedTransactions` increased

### 3.2 Check Landlord Balances

For each landlord, check their balance:

```bash
GET http://localhost:3000/api/payments/landlord/balance
Authorization: Bearer <landlord_token>
```

**Verify:**
- `availableBalance` increased by their payout amount
- Transaction history shows the credit

### 3.3 Check Payouts

```bash
GET http://localhost:3000/api/escrow/payouts
Authorization: Bearer <admin_token>
```

**Verify:**
- Landlord payouts created with correct amounts
- Khayalami payout created with correct amount
- All payouts have status `"pending"`

### 3.4 Verify Calculations

**Expected Formula:**
```
Total Amount = Landlord Amount + Khayalami Amount
Khayalami Amount = Total Amount × 5% (commission) + deductions
Landlord Amount = Total Amount - Khayalami Amount
```

**Check:**
- Sum of all landlord payouts + Khayalami payout = Total distributed
- Each landlord received correct amount based on their transactions
- Khayalami received correct commission

---

## Step 4: Reset if Needed

If the distribution is incorrect, reset everything:

```bash
npx ts-node src/scripts/resetDistributionState.ts
```

This will:
- Delete payouts created after saved state
- Reset escrow transactions to saved state
- Reset escrow account to saved state
- Reset landlord balances to saved state
- Reset revenue sources to saved state

---

## Expected Results

### Before Distribution:
- **Escrow Account**: `totalHeld = 1650`
- **Landlord Balances**: Current balances
- **Payouts**: 0

### After Distribution:
- **Escrow Account**: 
  - `totalHeld = 0` (or reduced)
  - `totalDistributed = 1650`
  - `distributedTransactions = 5`
- **Landlord Balances**: 
  - Increased by their payout amounts
  - New transaction records added
- **Payouts**: 
  - 2 landlord payouts (one per landlord)
  - 1 Khayalami payout
  - All with status `"pending"`

---

## Troubleshooting

### Issue: "No transactions to distribute"
- Check if escrow transactions have status `"held"`
- Check if `landlordPayoutStatus` is `"pending"`

### Issue: "Amounts don't match"
- Check for subscription deductions (if landlord has "Pay via Rent")
- Check for rounding differences (tolerance: 0.01)
- Verify commission calculation (5%)

### Issue: "Landlord balance not updated"
- Check if LandlordBalance record exists for the landlord
- Check transaction history in balance record
- Verify payout was created successfully

---

## Manual Verification Checklist

- [ ] State saved before distribution
- [ ] Distribution API called successfully
- [ ] Total distributed matches expected amount
- [ ] Landlord payouts created correctly
- [ ] Khayalami payout created correctly
- [ ] Landlord balances increased correctly
- [ ] Escrow account updated correctly
- [ ] All calculations verified
- [ ] If incorrect, reset completed successfully

---

## Notes

- **Subscription Deductions**: If a landlord has "Pay via Rent" subscription method, their subscription fee will be deducted from the payout
- **Commission**: 5% of total payment goes to Khayalami
- **Rounding**: Small differences (< 0.01) are acceptable due to floating point arithmetic
- **Status**: Payouts are created with status `"pending"` - they need to be processed separately



