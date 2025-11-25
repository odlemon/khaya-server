# 💰 Subscription Deduction During Distribution

## Overview

When distributing escrow funds to landlords, the system automatically checks if the landlord has chosen "Pay via Rent" for their subscription payment method. If yes, and they have an active subscription, the subscription fee is deducted from their payout.

---

## How It Works

### Distribution Flow with Subscription Deduction

```
1. Distribution starts (monthly cron or manual)
   ↓
2. Get all held escrow transactions
   ↓
3. Group transactions by landlord
   ↓
4. For each landlord:
   a. Calculate total payout amount
   b. Check subscription payment method:
      - If "Pay via Rent" → Check if active subscription
      - If active → Calculate subscription fee
      - Deduct fee from landlord payout
      - Add fee to Khayalami payout
      - Create revenue source record
   c. Create landlord payout (net amount)
   d. Credit landlord balance
   ↓
5. Create Khayalami payout (all commissions + subscription fees)
   ↓
6. Mark all as distributed
```

---

## Logic Implementation

### Step 1: Check Subscription Payment Method

**Location:** `src/services/EscrowService.ts` - `distributeEscrow()` method

**Three Options:**
1. `"no_subscription"` - No subscription, no deduction
2. `"pay_yourself"` - Landlord pays directly, no deduction from rent
3. `"via_rent"` - Deducted from rent during distribution

```typescript
// Check landlord subscription payment method
const preferences = await LandlordPreferences.findOne({ 
  landlordId: new Types.ObjectId(landlordId) 
});

// Only deduct subscriptions if landlord has "Pay via Rent" selected
// Options: "no_subscription" (no deduction), "pay_yourself" (no deduction), "via_rent" (deduct)
if (preferences?.subscriptionPaymentMethod === "via_rent") {
  const subscriptionStatus = await landlordSubscriptionService.getSubscriptionStatus(landlordId);
  
  if (subscriptionStatus.isSubscribed && subscriptionStatus.planType) {
    // Calculate and deduct subscription fee
  }
}
```

### Step 2: Calculate Subscription Fee

```typescript
// Calculate subscription fee based on plan
subscriptionFee = landlordSubscriptionService.calculateSubscriptionPrice(
  subscriptionStatus.planType as "premium" | "premium_plus"
);
// Premium: K15/month
// Premium Plus: K25/month
```

### Step 3: Deduct from Landlord Payout

```typescript
// Deduct from landlord payout
totalAmount -= subscriptionFee;

// Add to Khayalami total
totalKhayalamiAmount += subscriptionFee;
```

### Step 4: Create Revenue Source

```typescript
// Create revenue source for subscription fee
const subscriptionRev = await revenueSourceService.createRevenueSource({
  sourceType: "subscription",
  amount: subscriptionFee,
  payerId: landlordId,
  recipientId: "khayalami",
  description: `Landlord subscription fee (via rent) - ${subscriptionStatus.planType}`,
  notes: `Deducted from rent distribution - ${transactions.length} transaction(s)`
});
```

### Step 5: Create Payouts

**Landlord Payout:**
- Amount: Net rent (after subscription deduction)
- Notes: Includes subscription fee deduction info

**Khayalami Payout:**
- Amount: All commissions + subscription fees
- Includes subscription fees from all landlords who chose "Pay via Rent"

---

## Example Scenario

### Landlord A: "Pay via Rent" (Premium Plan)

**Before Distribution:**
- Total rent in escrow: K1,000
- Subscription: Premium (K15/month)
- Payment method: "Pay via Rent"

**During Distribution:**
1. Calculate landlord payout: K1,000
2. Check subscription: Active Premium
3. Deduct subscription fee: K1,000 - K15 = K985
4. Create landlord payout: K985
5. Add to Khayalami: K15 (subscription fee)

**After Distribution:**
- Landlord receives: K985
- Khayalami receives: K15 (subscription fee) + commissions

---

### Landlord B: "Pay Yourself" (Premium Plus Plan)

**Before Distribution:**
- Total rent in escrow: K1,500
- Subscription: Premium Plus (K25/month)
- Payment method: "Pay Yourself"

**During Distribution:**
1. Calculate landlord payout: K1,500
2. Check subscription: Active Premium Plus
3. Payment method is "Pay Yourself" → No deduction
4. Create landlord payout: K1,500 (full amount)

**After Distribution:**
- Landlord receives: K1,500 (full amount)
- Subscription fee not deducted (landlord pays separately)

---

## Revenue Source Tracking

### Subscription Fee Revenue Source

When subscription fee is deducted during distribution:

```json
{
  "sourceType": "subscription",
  "amount": 15,
  "payerId": "landlord_123",
  "recipientId": "khayalami",
  "description": "Landlord subscription fee (via rent) - premium",
  "notes": "Deducted from rent distribution - 3 transaction(s)",
  "status": "collected",
  "createdAt": "2025-01-31T00:00:00.000Z"
}
```

**Key Points:**
- `sourceType`: "subscription"
- `payerId`: Landlord ID
- `recipientId`: "khayalami"
- `status`: "collected" (immediately collected during distribution)
- No `paymentId` (not linked to a specific payment, deducted from distribution)

---

## Payout Notes

### Landlord Payout Notes

**If subscription deducted:**
```
"Monthly distribution - 3 transaction(s). Subscription fee K15 deducted."
```

**If no subscription deduction:**
```
"Monthly distribution - 3 transaction(s)"
```

### Landlord Balance Transaction

**If subscription deducted:**
```
"Escrow distribution - 3 payment(s). Subscription fee K15 deducted."
```

**If no subscription deduction:**
```
"Escrow distribution - 3 payment(s)"
```

---

## Important Notes

1. **Three Subscription Payment Options:**
   - `"no_subscription"` - No subscription, no deduction from rent
   - `"pay_yourself"` - Landlord pays directly, no deduction from rent
   - `"via_rent"` - Subscription fee deducted from rent during distribution
   
2. **Only for "Pay via Rent"**
   - Subscription fee is only deducted if `subscriptionPaymentMethod === "via_rent"`
   - If "no_subscription" or "pay_yourself", no deduction (landlord pays separately or has no subscription)

2. **Active Subscription Required**
   - Only deducts if landlord has active subscription
   - Checks `isSubscribed: true` and valid `planType`

3. **Monthly Deduction**
   - Deducted once per distribution cycle
   - Not per payment, but per distribution batch

4. **Revenue Tracking**
   - Creates `RevenueSource` record for tracking
   - Added to Khayalami's total payout
   - Tracked separately from processing fees

5. **Transparency**
   - Payout notes clearly show deduction
   - Balance transaction shows deduction
   - Landlord can see what was deducted

---

## Testing Scenarios

### Test Case 1: Landlord with "Pay via Rent" + Active Subscription
- ✅ Subscription fee deducted
- ✅ Revenue source created
- ✅ Added to Khayalami payout
- ✅ Payout notes show deduction

### Test Case 2: Landlord with "Pay Yourself" + Active Subscription
- ✅ No subscription fee deducted
- ✅ Full payout amount
- ✅ No revenue source created for distribution

### Test Case 3: Landlord with "Pay via Rent" + No Active Subscription
- ✅ No subscription fee deducted
- ✅ Full payout amount
- ✅ No revenue source created

### Test Case 4: Landlord with No Preferences
- ✅ No subscription fee deducted
- ✅ Full payout amount
- ✅ No errors

---

## Code Location

**File:** `src/services/EscrowService.ts`
**Method:** `distributeEscrow()`
**Lines:** ~300-360

**Key Logic:**
1. Check `LandlordPreferences.subscriptionPaymentMethod`
2. If "via_rent", check subscription status
3. Calculate and deduct subscription fee
4. Create revenue source
5. Adjust payouts accordingly

---

## Frontend Display

### Landlord Payout Details

When displaying payout information, show:

```
┌─────────────────────────────────────┐
│ Distribution Summary                 │
├─────────────────────────────────────┤
│ Total Rent: K1,000                   │
│                                     │
│ Deductions:                         │
│   • Processing Fees: K20            │
│   • Subscription Fee: K15           │
│   ─────────────────────────────    │
│   Total Deductions: K35            │
│                                     │
│ Your Net Payout: K965              │
│                                     │
│ Note: Subscription fee deducted      │
│       because you chose "Pay via    │
│       Rent"                          │
└─────────────────────────────────────┘
```

---

## Summary

✅ **Implemented:** Subscription deduction during distribution
✅ **Checks:** Landlord subscription payment method preference
✅ **Deducts:** Only if "Pay via Rent" and active subscription
✅ **Tracks:** Creates revenue source for subscription fee
✅ **Transparent:** Shows deduction in payout notes and balance transactions

