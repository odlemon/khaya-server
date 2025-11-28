# 💳 Subscription Payment Method Options

## Overview

Landlords can choose how they want to pay for their subscriptions (Premium Features and Zero Deposit Protection). There are **3 payment method options**:

1. **No Subscription** - No subscription, no deduction
2. **Pay Yourself** - Direct payment, not deducted from rent
3. **Pay via Rent** - Deducted from rent during distribution

---

## Payment Method Options

### 1. No Subscription (`no_subscription`)

**What It Means:**
- Landlord has no active subscriptions
- No subscription fees deducted from rent
- Default option for new landlords

**When to Use:**
- Landlord doesn't want any subscriptions
- Landlord wants to manage subscriptions manually
- Landlord cancelled all subscriptions

**Behavior:**
- No subscription fees deducted during escrow distribution
- Landlord receives full net rent (after processing fees only)
- Can still purchase one-time boosts (not affected by this setting)

---

### 2. Pay Yourself (`pay_yourself`)

**What It Means:**
- Landlord has active subscriptions
- Landlord pays subscription fees directly (via payment gateway)
- Subscription fees are NOT deducted from rent payments

**When to Use:**
- Landlord wants to pay subscriptions separately
- Landlord prefers direct payment control
- Landlord wants to keep rent payments separate from subscription payments

**Behavior:**
- No subscription fees deducted during escrow distribution
- Landlord receives full net rent (after processing fees only)
- Landlord pays subscription fees directly via payment gateway
- Subscription fees are separate transactions

**Payment Flow:**
```
1. Subscription billing date arrives
2. Payment gateway charges landlord directly
3. Subscription remains active
4. No deduction from rent payments
```

---

### 3. Pay via Rent (`via_rent`)

**What It Means:**
- Landlord has active subscriptions
- Subscription fees automatically deducted from rent payments
- Convenient - no separate payment needed

**When to Use:**
- Landlord wants automatic deduction from rent
- Convenient payment method
- Landlord receives rent regularly

**Behavior:**
- Subscription fees deducted during escrow distribution
- Both Premium Features and Zero Deposit Protection fees deducted (if active)
- Landlord receives net rent (after processing fees and subscription fees)
- Automatic - no separate payment needed

**Payment Flow:**
```
1. Tenant pays rent → Goes to escrow
2. Distribution runs (monthly or manual)
3. System checks subscription payment method
4. If "via_rent" → Deduct subscription fees
5. Landlord receives: Net rent - subscription fees
6. Khayalami receives: Processing fees + subscription fees
```

---

## How It Works

### Setting Subscription Payment Method

**API Endpoint:**
```
PATCH /api/landlord/preferences/subscription-payment
```

**Request Body:**
```json
{
  "method": "no_subscription" | "via_rent" | "pay_yourself",
  "subscriptionDetails": {
    "planType": "premium" | "premium_plus",  // Only if pay_yourself
    "autoRenew": true
  }
}
```

**Example 1: No Subscription**
```json
{
  "method": "no_subscription"
}
```

**Example 2: Pay Yourself**
```json
{
  "method": "pay_yourself",
  "subscriptionDetails": {
    "planType": "premium",
    "autoRenew": true
  }
}
```

**Example 3: Pay via Rent**
```json
{
  "method": "via_rent"
}
```

---

## Distribution Logic

### During Escrow Distribution

**Code Location:** `src/services/EscrowService.ts` - `distributeEscrow()`

**Logic:**
```typescript
// Check subscription payment method
const preferences = await LandlordPreferences.findOne({ 
  landlordId: new Types.ObjectId(landlordId) 
});

// Only deduct if "via_rent" is selected
if (preferences?.subscriptionPaymentMethod === "via_rent") {
  // Check Premium Features subscription
  if (hasActivePremiumFeatures) {
    // Deduct premium features fee
  }
  
  // Check Zero Deposit Protection subscription
  if (hasActiveZeroDepositProtection) {
    // Deduct zero deposit protection fee
  }
}
// If "no_subscription" or "pay_yourself" → No deduction
```

---

## Examples

### Example 1: No Subscription

**Landlord Settings:**
- `subscriptionPaymentMethod`: `"no_subscription"`
- No active subscriptions

**Rent Payment:**
- Tenant pays: K500
- Processing fee: K10 (2%)
- Subscription fee: K0 (no subscription)
- **Landlord receives: K490**

---

### Example 2: Pay Yourself

**Landlord Settings:**
- `subscriptionPaymentMethod`: `"pay_yourself"`
- Premium Features: Active (K15/month)
- Zero Deposit Protection: Active (K10/month)

**Rent Payment:**
- Tenant pays: K500
- Processing fee: K10 (2%)
- Subscription fee: K0 (not deducted, paid separately)
- **Landlord receives: K490**

**Separate Subscription Payment:**
- Premium Features: K15 (paid via gateway)
- Zero Deposit Protection: K10 (paid via gateway)
- **Total subscription cost: K25/month (paid separately)**

---

### Example 3: Pay via Rent

**Landlord Settings:**
- `subscriptionPaymentMethod`: `"via_rent"`
- Premium Features: Active (K15/month)
- Zero Deposit Protection: Active (K10/month)

**Rent Payment:**
- Tenant pays: K500
- Processing fee: K10 (2%)
- Premium Features fee: K15 (deducted)
- Zero Deposit Protection fee: K10 (deducted)
- **Landlord receives: K465**

**Total Deductions:**
- Processing: K10
- Subscriptions: K25
- **Net to landlord: K465**

---

## Comparison Table

| Payment Method | Subscription Deduction | Payment Location | Convenience |
|---------------|----------------------|------------------|-------------|
| **No Subscription** | None | N/A | N/A |
| **Pay Yourself** | None (from rent) | Direct payment gateway | Medium |
| **Pay via Rent** | Yes (from rent) | Automatic from rent | High |

---

## Important Notes

1. **Default Value:**
   - New landlords default to `"no_subscription"`
   - Can be changed anytime via API

2. **Subscription Status:**
   - Payment method doesn't affect subscription status
   - Subscriptions can be active regardless of payment method
   - Only affects HOW subscription fees are paid

3. **One-Time Boosts:**
   - Not affected by subscription payment method
   - Always paid directly (one-time payment)

4. **Changing Payment Method:**
   - Can be changed anytime
   - Takes effect on next distribution (if changed to "via_rent")
   - No retroactive changes

5. **Multiple Subscriptions:**
   - If "via_rent", ALL active subscriptions are deducted
   - Premium Features + Zero Deposit Protection both deducted
   - Total deduction = sum of all active subscription fees

---

## Frontend Implementation

### UI Component

**Subscription Payment Method Selector:**
```
┌─────────────────────────────────────┐
│ Subscription Payment Method          │
├─────────────────────────────────────┤
│                                     │
│ ○ No Subscription                   │
│   No subscriptions, no deductions   │
│                                     │
│ ○ Pay Yourself                      │
│   Pay subscriptions directly         │
│                                     │
│ ● Pay via Rent                      │
│   Deducted from rent automatically  │
│                                     │
│ [Save Changes]                      │
└─────────────────────────────────────┘
```

### Display Current Method

**Settings Page:**
```
Current Payment Method: Pay via Rent
├─ Premium Features: K15/month (deducted)
└─ Zero Deposit Protection: K10/month (deducted)

Total Monthly Deduction: K25
```

---

## API Reference

### Update Subscription Payment Method

**Endpoint:** `PATCH /api/landlord/preferences/subscription-payment`

**Request:**
```json
{
  "method": "no_subscription" | "via_rent" | "pay_yourself",
  "subscriptionDetails": {
    "planType": "premium" | "premium_plus",
    "autoRenew": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription payment method updated successfully",
  "data": {
    "subscriptionPaymentMethod": "via_rent",
    "premiumFeatures": { ... },
    "zeroDepositProtection": { ... }
  }
}
```

---

## Summary

✅ **Three Options:**
1. `"no_subscription"` - No subscription, no deduction
2. `"pay_yourself"` - Direct payment, no deduction from rent
3. `"via_rent"` - Deducted from rent during distribution

✅ **Default:** `"no_subscription"`

✅ **Distribution Logic:** Only deducts if `"via_rent"` is selected

✅ **Flexibility:** Can be changed anytime







