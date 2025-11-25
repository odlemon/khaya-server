# 🏢 Landlord Subscription Types & How They Work

## Overview

Landlords have **3 types of subscriptions/premium features** they can purchase:

1. **Premium Boosts** - Per-property featured listings (one-time purchase)
2. **Premium Features Subscription** - Account-level subscription (monthly recurring)
3. **Zero Deposit Protection Subscription** - Enables zero-deposit option for tenants (monthly recurring)

---

## 1. Premium Boosts (Per Property)

### What It Is
- **One-time purchase** for a specific property
- Makes that property **featured** (appears at top of search results)
- **Cost**: USD 10-25 per property
- **Duration**: 7, 30, or 90 days

### How It Works

**Purchase Flow:**
```
1. Landlord selects a property
2. Chooses boost duration (7/30/90 days)
3. Pays one-time fee (USD 10-25)
4. Property becomes "featured" immediately
5. Boost expires after duration
6. Can purchase again to extend
```

**Pricing:**
- **7 days**: USD 10
- **30 days**: USD 15
- **90 days**: USD 25

**Features:**
- Property appears at top of search results
- Highlighted badge on property card
- Increased visibility
- More tenant inquiries

**Payment:**
- One-time payment per boost
- Tracked in `RevenueSource` with `sourceType: "premium_boost"`
- Creates revenue for Khayalami

**Tracking:**
- Stored in `RevenueSource` model
- Linked to `propertyId` and `payerId` (landlord)
- Status: `pending` → `collected` → `distributed`

**API Endpoints:**
- `POST /api/properties/:propertyId/boost` - Purchase boost
- `GET /api/properties/boosts/history` - View all boosts
- `GET /api/properties/:propertyId/boosts/history` - View property boosts

---

## 2. Premium Features Subscription (Account Level)

### What It Is
- **Monthly subscription** for the landlord account
- Gives access to premium features across all properties
- **Plans**: Basic (Free), Premium, Premium Plus
- **Billing**: Monthly recurring

### Subscription Plans

#### **Basic Plan (Free)**
- Standard listing features
- Basic support
- Standard analytics

#### **Premium Plan**
- **Cost**: ~USD 15/month (K15/month)
- All Basic features +
- Featured listings for all properties
- Priority customer support
- Advanced analytics dashboard
- Property performance insights

#### **Premium Plus Plan**
- **Cost**: ~USD 25/month (K25/month)
- All Premium features +
- Unlimited featured listings
- Dedicated account manager
- Custom reporting
- API access (if applicable)
- White-label options (if applicable)

### How It Works

**Subscription Flow:**
```
1. Landlord chooses subscription plan
2. Selects payment method:
   - "Pay via Rent" - Deducted from rent payments
   - "Pay Yourself" - Direct payment
3. Subscription activated
4. Monthly billing (auto-renew)
5. Can upgrade/downgrade/cancel anytime
```

**Payment Methods:**

**Option 1: Pay via Rent**
- Subscription fee automatically deducted from rent payments
- Example: If rent is K500 and subscription is K15:
  - Tenant pays: K500
  - Processing fee deducted: K10 (2%)
  - Subscription fee deducted: K15
  - Landlord receives: K475 (net rent)
- No separate payment needed
- Convenient for landlords

**Option 2: Pay Yourself**
- Landlord pays subscription directly
- Monthly payment via payment gateway
- Separate from rent payments
- More control over payments

**Features Included:**
- Account-level benefits (not per property)
- Applies to all landlord's properties
- Monthly recurring billing
- Auto-renewal (can be disabled)

**Tracking:**
- Stored in `LandlordPreferences.premiumFeatures`
- Status: `isSubscribed: true/false`
- Plan type: `basic`, `premium`, `premium_plus`
- Dates: `startDate`, `endDate`, `nextBillingDate`
- Auto-renew: `true/false`

**API Endpoints:**
- `GET /api/landlord/preferences` - Get subscription status
- `POST /api/landlord/subscription/subscribe` - Subscribe (in-app payment)
- `POST /api/landlord/subscription/request` - Create payment request (external payment)
- `GET /api/landlord/subscription/status` - Get subscription status
- `POST /api/landlord/subscription/cancel` - Cancel subscription

---

## 3. Zero Deposit Protection Subscription (Account Level)

### What It Is
- **Monthly subscription** that enables landlords to offer zero-deposit rentals
- Allows tenants to use subscription instead of paying large upfront deposits
- **Cost**: ~USD 10/month (K10/month)
- **Billing**: Monthly recurring

### How It Works

**Subscription Flow:**
```
1. Landlord subscribes to Zero Deposit Protection
2. Selects payment method:
   - "Pay via Rent" - Deducted from rent payments
   - "Pay Yourself" - Direct payment
3. Subscription activated
4. Landlord can enable zero-deposit option on properties
5. Tenants can use subscription to skip traditional deposit
6. Monthly billing (auto-renew)
```

**Payment Methods:**

**Option 1: Pay via Rent**
- Subscription fee automatically deducted from rent payments
- Example: If rent is K500 and subscription is K10:
  - Tenant pays: K500
  - Processing fee deducted: K10 (2%)
  - Zero deposit subscription fee deducted: K10
  - Landlord receives: K480 (net rent)
- No separate payment needed
- Convenient for landlords

**Option 2: Pay Yourself**
- Landlord pays subscription directly
- Monthly payment via payment gateway
- Separate from rent payments
- More control over payments

**Features Included:**
- Enable zero-deposit option on any property
- Tenants can use subscription to skip deposit
- Protection coverage (default: K500)
- Account-wide benefit (applies to all properties)
- Monthly recurring billing
- Auto-renewal (can be disabled)

**Benefits:**
- Attracts more tenants (lower barrier to entry)
- Faster property occupancy
- Still get deposit protection via insurance
- Competitive advantage

**Tracking:**
- Stored in `LandlordPreferences.zeroDepositProtection`
- Status: `isSubscribed: true/false`
- Dates: `startDate`, `endDate`, `nextBillingDate`
- Auto-renew: `true/false`
- Price: Monthly fee amount
- Coverage: Protection coverage amount

**API Endpoints:**
- `POST /api/landlord/subscription/zero-deposit-protection` - Subscribe (in-app payment)
- `POST /api/landlord/subscription/zero-deposit-protection/request` - Create payment request (external payment)
- `GET /api/landlord/subscription/zero-deposit-protection/status` - Get subscription status
- `POST /api/landlord/subscription/zero-deposit-protection/cancel` - Cancel subscription

---

## Key Differences

| Feature | Premium Boosts | Premium Features Subscription | Zero Deposit Protection |
|---------|---------------|------------------------------|------------------------|
| **Scope** | Per property | Account-wide | Account-wide |
| **Payment** | One-time | Monthly recurring | Monthly recurring |
| **Cost** | USD 10-25 | USD 15-25/month | USD 10/month (K10) |
| **Duration** | 7/30/90 days | Monthly (ongoing) | Monthly (ongoing) |
| **Purpose** | Feature specific property | Account-level benefits | Enable zero-deposit option |
| **Payment Method** | Direct payment | Via rent or direct | Via rent or direct |
| **Tracking** | RevenueSource | LandlordPreferences | LandlordPreferences |

---

## How They Work Together

**Example Scenario:**

```
Landlord has:

- Premium Features Subscription (Premium plan) - K15/month
- Zero Deposit Protection Subscription - K10/month
- 3 properties with Premium Boosts (K15 each for 30 days)



Monthly Costs:

- Premium Features: K15 (via rent deduction)
- Zero Deposit Protection: K10 (via rent deduction)
- Total: K25/month (via rent)
- Boosts: Already paid (one-time)



Benefits:

- All properties get premium account features
- All properties can offer zero-deposit option
- 3 specific properties are featured (from boosts)
- Can purchase more boosts anytime
- Attracts more tenants with zero-deposit option
```

---

## Implementation Status

### ✅ Implemented

- Premium Boosts tracking (RevenueSource model)
- Boost history endpoints (`GET /api/properties/boosts/history`, `GET /api/properties/:propertyId/boosts/history`)
- Premium Features subscription service
- Zero Deposit Protection subscription service
- LandlordPreferences model (all subscription types)
- Payment integration (in-app and external with admin approval)
- Subscription billing logic (monthly deduction if "via_rent" during distribution)
- All subscription API endpoints

### ⚠️ To Be Implemented

- Premium Boost purchase endpoint (`POST /api/properties/:propertyId/boost`)
- Boost expiration tracking and auto-removal
- Email notifications for subscription approvals
- Subscription renewal automation

---

## Frontend Implementation

### Premium Boosts

1. **Purchase Boost Page** - `/landlord/properties/:id/boost`
2. **Boost History** - `/landlord/properties/boosts/history`
3. **Boost Status** - Show on property cards

### Premium Features Subscription

1. **Subscription Dashboard** - `/landlord/subscription`
2. **Plan Selection** - Choose Basic/Premium/Premium Plus
3. **Payment Method** - Choose "Pay via Rent" or "Pay Yourself"
4. **Subscription Management** - Upgrade/downgrade/cancel

### Zero Deposit Protection Subscription

1. **Zero Deposit Protection Page** - `/landlord/subscription/zero-deposit-protection`
2. **Subscribe** - Activate zero-deposit protection
3. **Payment Method** - Choose "Pay via Rent" or "Pay Yourself"
4. **Status Display** - Show active subscription status
5. **Property Settings** - Enable zero-deposit option on properties (requires active subscription)

---

## Revenue Model

### Premium Boosts Revenue

- **Source**: `premium_boost` in RevenueSource
- **Recipient**: Khayalami
- **Amount**: USD 10-25 per boost
- **Frequency**: One-time per boost purchase

### Premium Features Subscription Revenue

- **Source**: `subscription` (landlord subscription) in RevenueSource
- **Recipient**: Khayalami
- **Amount**: USD 15-25/month
- **Frequency**: Monthly recurring
- **Payment**: Via rent deduction or direct payment

### Zero Deposit Protection Subscription Revenue

- **Source**: `subscription` (landlord zero deposit protection) in RevenueSource
- **Recipient**: Khayalami
- **Amount**: USD 10/month (K10/month)
- **Frequency**: Monthly recurring
- **Payment**: Via rent deduction or direct payment

---

## Important Notes

1. **Premium Boosts** are **per property** - each property needs its own boost

2. **Premium Features Subscription** is **account-wide** - applies to all properties

3. **Zero Deposit Protection** is **account-wide** - enables zero-deposit option on all properties

4. **All can be active simultaneously**:
   - Premium Features: Account benefits
   - Zero Deposit Protection: Zero-deposit option
   - Premium Boosts: Property visibility

5. **Payment methods differ**:
   - Boosts: Always direct payment (one-time)
   - Premium Features: Can be via rent or direct (monthly)
   - Zero Deposit Protection: Can be via rent or direct (monthly)

6. **Boosts expire** - need to repurchase to extend

7. **Subscriptions renew** - monthly unless cancelled

8. **Distribution deduction**: Both Premium Features and Zero Deposit Protection subscriptions are deducted during escrow distribution if "Pay via Rent" is selected

---

## API Endpoints Implemented

### Premium Boost Endpoints
- `POST /api/properties/:propertyId/boost` - Purchase boost (in-app payment)
- `POST /api/properties/:propertyId/boost/request` - Create boost payment request (external payment)
- `GET /api/properties/:propertyId/boosts` - Get property boosts
- `GET /api/properties/boosts/history` - Get all boost history
- `GET /api/properties/:propertyId/boosts/history` - Get property boost history

### Premium Features Subscription Endpoints
- `POST /api/landlord/subscription/subscribe` - Subscribe (in-app payment)
- `POST /api/landlord/subscription/request` - Create subscription payment request (external payment)
- `GET /api/landlord/subscription/status` - Get subscription status
- `POST /api/landlord/subscription/cancel` - Cancel subscription

### Zero Deposit Protection Subscription Endpoints
- `POST /api/landlord/subscription/zero-deposit-protection` - Subscribe (in-app payment)
- `POST /api/landlord/subscription/zero-deposit-protection/request` - Create payment request (external payment)
- `GET /api/landlord/subscription/zero-deposit-protection/status` - Get subscription status
- `POST /api/landlord/subscription/zero-deposit-protection/cancel` - Cancel subscription

### Payment Request Approval
- `POST /api/payment-requests/:id/approve` - Admin approves (handles rent, boost, premium features subscription, and zero deposit protection requests)

---

## Next Steps for Implementation

1. **Payment Gateway Integration**
   - Integrate payment gateway for in-app payments
   - Handle payment callbacks
   - Process successful payments

2. **Cron Jobs**
   - Check boost expirations (daily) - remove `isFeatured` when expired
   - Process subscription renewals (monthly)
   - Handle "Pay via Rent" deductions (during escrow distribution)

3. **Email Notifications**
   - Boost purchase confirmation
   - Subscription activation confirmation
   - Boost/subscription request submitted
   - Boost/subscription approved/rejected
