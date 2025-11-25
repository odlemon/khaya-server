# 🔄 Subscription Cancellation - What Happens?

## Overview

When a landlord cancels their subscription, the system handles it gracefully to ensure:
- ✅ No immediate loss of access (fair billing)
- ✅ Clear communication about what changes
- ✅ Proper cleanup of features

---

## 1. Premium Features Subscription Cancellation

### What Happens When You Cancel

**Immediate Changes:**
- ✅ **Auto-renewal is disabled** - Subscription won't renew automatically
- ✅ **Access continues** - You keep premium features until `endDate` expires
- ✅ **No refund** - Current billing period is not refunded (standard practice)

**After `endDate` Expires:**
- ❌ **Premium features are revoked** - Account reverts to Basic plan
- ❌ **Premium account benefits stop** - No longer have premium account features
- ✅ **Data is preserved** - All your properties, tenants, and data remain intact

### Current Implementation

```typescript
// When cancelled:
preferences.premiumFeatures.autoRenew = false;
// isSubscribed remains true until endDate expires
// This allows continued access until current billing period ends
```

### Status Check Logic

The system checks subscription status like this:
```typescript
const now = new Date();
const isActive = preferences.premiumFeatures.endDate 
  ? new Date(preferences.premiumFeatures.endDate) > now
  : false;

// Subscription is active if:
// 1. isSubscribed = true
// 2. endDate > current date
```

### Example Timeline

```
Day 1: Subscribe to Premium (K15/month)
       - Start Date: Jan 1
       - End Date: Feb 1
       - Auto-renew: true

Day 15: Cancel subscription
        - Auto-renew: false (changed)
        - isSubscribed: true (still true)
        - Access: Still active until Feb 1

Feb 1: Subscription expires
       - isSubscribed: true (but endDate passed)
       - Access: Revoked (status check returns false)
       - Account: Reverts to Basic plan
```

---

## 2. Zero Deposit Protection Subscription Cancellation

### What Happens When You Cancel

**Immediate Changes:**
- ✅ **Auto-renewal is disabled** - Subscription won't renew automatically
- ✅ **Access continues** - You can still offer zero-deposit until `endDate` expires
- ✅ **No refund** - Current billing period is not refunded

**After `endDate` Expires:**
- ❌ **Zero-deposit option disabled** - Properties can no longer offer zero-deposit
- ❌ **Existing zero-deposit agreements** - May need to be reviewed/migrated
- ✅ **Properties remain** - All properties stay active, just lose zero-deposit option

### Current Implementation

```typescript
// When cancelled:
preferences.zeroDepositProtection.autoRenew = false;
// isSubscribed remains true until endDate expires
// This allows continued zero-deposit offering until current billing period ends
```

### Important Considerations

**For Properties with Active Zero-Deposit Tenants:**
- Existing agreements remain valid
- New zero-deposit agreements cannot be created after `endDate`
- Landlord should communicate with tenants about deposit requirements

**For Properties with Zero-Deposit Enabled:**
- Zero-deposit option is automatically disabled after `endDate`
- Landlord can re-enable by resubscribing
- No data loss - settings are preserved

---

## 3. What Gets Affected

### Premium Features Subscription

**What Stops:**
- ❌ Premium account features
- ❌ Premium dashboard features
- ❌ Advanced analytics
- ❌ Priority support

**What Continues:**
- ✅ All properties remain active
- ✅ All tenants remain active
- ✅ All agreements remain active
- ✅ All payments continue normally
- ✅ Basic features remain available

### Zero Deposit Protection Subscription

**What Stops:**
- ❌ Ability to enable zero-deposit on new properties
- ❌ Zero-deposit option for new tenants
- ❌ Zero-deposit protection coverage

**What Continues:**
- ✅ All properties remain active
- ✅ Existing zero-deposit agreements remain valid
- ✅ All other features remain available
- ✅ Can resubscribe anytime

---

## 4. Resubscribing After Cancellation

### Premium Features
- Can resubscribe anytime
- Previous subscription data is preserved
- New subscription starts fresh (new startDate/endDate)
- Can choose same or different plan

### Zero Deposit Protection
- Can resubscribe anytime
- Previous subscription data is preserved
- New subscription starts fresh
- Can re-enable zero-deposit on properties immediately

---

## 5. Refund Policy

**Current Implementation:**
- ❌ **No refunds** for cancelled subscriptions
- ✅ **Access continues** until endDate (fair billing)
- ✅ **Standard practice** - Most SaaS subscriptions work this way

**Why No Refunds:**
- Access is provided until endDate expires
- Landlord gets full value for current billing period
- Prevents abuse (subscribe, use features, cancel, get refund)

---

## 6. Frontend Implementation Notes

### Display Cancellation Status

**Show to Landlord:**
```json
{
  "isSubscribed": true,
  "isActive": true,
  "endDate": "2025-02-01T00:00:00.000Z",
  "autoRenew": false,
  "status": "cancelled_but_active"
}
```

**Status Options:**
- `active` - Subscription active, auto-renew enabled
- `cancelled_but_active` - Cancelled but access until endDate
- `expired` - Subscription expired, no access
- `never_subscribed` - Never had subscription

### UI Recommendations

1. **Show Clear Warning:**
   - "Your subscription will expire on [endDate]"
   - "Auto-renewal is disabled"
   - "You'll lose premium features after expiration"

2. **Resubscribe Option:**
   - Show "Resubscribe" button if cancelled
   - Allow re-enabling auto-renewal
   - Show benefits they'll regain

3. **Countdown Timer:**
   - Show days remaining until expiration
   - Remind about upcoming expiration
   - Offer to resubscribe before expiration

---

## 7. API Endpoints

### Cancel Premium Features Subscription
```
POST /api/landlord/subscription/cancel
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription cancelled successfully"
}
```

**What It Does:**
- Sets `autoRenew = false`
- Keeps `isSubscribed = true` until endDate
- Access continues until endDate expires

### Cancel Zero Deposit Protection
```
POST /api/landlord/subscription/zero-deposit-protection/cancel
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Zero Deposit Protection subscription cancelled successfully"
}
```

**What It Does:**
- Sets `autoRenew = false`
- Keeps `isSubscribed = true` until endDate
- Zero-deposit option continues until endDate expires

---

## Summary

✅ **Cancellation is graceful** - No immediate loss of access
✅ **Fair billing** - Access continues until endDate
✅ **Clear status** - System tracks cancellation state
✅ **Easy resubscribe** - Can resubscribe anytime
❌ **No refunds** - Standard SaaS practice
✅ **Data preserved** - All data remains intact




