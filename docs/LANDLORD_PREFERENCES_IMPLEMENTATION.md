# 🏢 Landlord Preferences & Settings - Frontend Implementation Guide

## Overview

This guide covers the implementation of landlord preferences including payment reception methods, subscription payment options, and premium features management.

---

## 📋 Features to Implement

### **1. Payment Reception Preferences**
Landlords choose how they want to receive payments from tenants.

### **2. Subscription Payment Preferences**
Landlords choose how to pay for their premium features subscription.

### **3. Premium Features Management**
Landlords manage their premium subscription and features.

---

## Feature 1: Payment Reception Preferences

### 1.1 Payment Reception Method Selection

**What it does:**
- Landlord selects how they want to receive payments
- Options: Bank Transfer, Mobile Money, PayPal, Cash
- For Mobile Money, landlord must enter phone number
- Details are saved and used for payouts

**API Endpoint:**
```
GET /api/landlord/preferences
Authorization: Bearer <landlord_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "pref_123",
    "landlordId": "landlord_123",
    "paymentReceptionMethod": "bank_transfer",
    "bankDetails": {
      "bankName": "Standard Bank",
      "accountNumber": "1234567890",
      "accountHolderName": "John Doe",
      "branchName": "Lusaka Main",
      "swiftCode": "SBICZMMX"
    },
    "mobileMoneyDetails": null,
    "paypalDetails": null,
    "subscriptionPaymentMethod": "via_rent",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**UI Components to Build:**

1. **Payment Reception Selection Page**
   ```
   ┌─────────────────────────────────────┐
   │ How to Receive Payments              │
   ├─────────────────────────────────────┤
   │ Choose how you want to receive       │
   │ payments from tenants                │
   │                                     │
   │ ┌─────────────────────────────────┐ │
   │ │ 🏦 Bank Transfer        (●)      │ │
   │ │ Direct bank transfers            │ │
   │ └─────────────────────────────────┘ │
   │                                     │
   │ ┌─────────────────────────────────┐ │
   │ │ 📱 Mobile Money        (○)      │ │
   │ │ EcoCash, OneMoney, Telecash     │ │
   │ └─────────────────────────────────┘ │
   │                                     │
   │ ┌─────────────────────────────────┐ │
   │ │ 💳 PayPal              (○)      │ │
   │ │ PayPal account payments          │ │
   │ └─────────────────────────────────┘ │
   │                                     │
   │ ┌─────────────────────────────────┐ │
   │ │ 💵 Cash                 (○)      │ │
   │ │ Physical cash payments           │ │
   │ └─────────────────────────────────┘ │
   │                                     │
   │ [Cancel]  [Continue]                 │
   └─────────────────────────────────────┘
   ```

2. **Bank Transfer Details Form** (shown when Bank Transfer selected)
   ```
   ┌─────────────────────────────────────┐
   │ Bank Transfer Details                │
   ├─────────────────────────────────────┤
   │ Bank Name *                         │
   │ [___________________________]       │
   │                                     │
   │ Account Number *                    │
   │ [___________________________]       │
   │                                     │
   │ Account Holder Name *               │
   │ [___________________________]       │
   │                                     │
   │ Branch Name                         │
   │ [___________________________]       │
   │                                     │
   │ SWIFT Code                          │
   │ [___________________________]       │
   │                                     │
   │ [Back]  [Save]                      │
   └─────────────────────────────────────┘
   ```

3. **Mobile Money Details Form** (shown when Mobile Money selected)
   ```
   ┌─────────────────────────────────────┐
   │ Mobile Money Details                 │
   ├─────────────────────────────────────┤
   │ Provider *                          │
   │ [EcoCash ▼]                         │
   │                                     │
   │ Phone Number *                       │
   │ [+260] [___________________]        │
   │                                     │
   │ Account Name                         │
   │ [___________________________]       │
   │                                     │
   │ ℹ️ Make sure your phone number is   │
   │    registered with the provider     │
   │                                     │
   │ [Back]  [Save]                      │
   └─────────────────────────────────────┘
   ```

4. **PayPal Details Form** (shown when PayPal selected)
   ```
   ┌─────────────────────────────────────┐
   │ PayPal Details                       │
   ├─────────────────────────────────────┤
   │ PayPal Email *                      │
   │ [___________________________]       │
   │                                     │
   │ Account Name                        │
   │ [___________________________]      │
   │                                     │
   │ [Back]  [Save]                      │
   └─────────────────────────────────────┘
   ```

**Implementation Steps:**
1. Create `/landlord/preferences/payment-reception` page
2. Create payment method selection component (radio buttons)
3. Create conditional forms for each payment method
4. Add form validation:
   - Bank Transfer: bankName, accountNumber, accountHolderName required
   - Mobile Money: provider, phoneNumber required
   - PayPal: email required
   - Cash: no additional details needed
5. Create API service: `updatePaymentReceptionMethod()`
6. Add success/error handling
7. Show current selection on load

**API Endpoint to Update:**
```
PATCH /api/landlord/preferences/payment-reception
Authorization: Bearer <landlord_token>
```

**Request Body Examples:**

**Bank Transfer:**
```json
{
  "method": "bank_transfer",
  "bankDetails": {
    "bankName": "Standard Bank",
    "accountNumber": "1234567890",
    "accountHolderName": "John Doe",
    "branchName": "Lusaka Main",
    "swiftCode": "SBICZMMX"
  }
}
```

**Mobile Money:**
```json
{
  "method": "mobile_money",
  "mobileMoneyDetails": {
    "provider": "ecocash",
    "phoneNumber": "+260971234568",
    "accountName": "John Doe"
  }
}
```

**PayPal:**
```json
{
  "method": "paypal",
  "paypalDetails": {
    "email": "john@example.com",
    "accountName": "John Doe"
  }
}
```

**Cash:**
```json
{
  "method": "cash"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment reception method updated successfully",
  "data": {
    "_id": "pref_123",
    "paymentReceptionMethod": "mobile_money",
    "mobileMoneyDetails": {
      "provider": "ecocash",
      "phoneNumber": "+260971234568",
      "accountName": "John Doe"
    },
    "updatedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

---

## Feature 2: Subscription Payment Preferences

### 2.1 Subscription Payment Method Selection

**What it does:**
- Landlord chooses how to pay for premium features subscription
- Option 1: "Pay via Rent" - Deducted automatically from rent payments
- Option 2: "Pay Yourself" - Direct payment interface needed

**UI Components to Build:**

1. **Subscription Payment Selection**
   ```
   ┌─────────────────────────────────────┐
   │ Subscription Payment                 │
   ├─────────────────────────────────────┤
   │ Choose how you want to pay for       │
   │ your subscription                    │
   │                                     │
   │ ┌─────────────────────────────────┐ │
   │ │ 💰 Pay via Rent        (●)       │ │
   │ │ Deduct subscription from rent    │ │
   │ │ payments                          │ │
   │ └─────────────────────────────────┘ │
   │                                     │
   │ ┌─────────────────────────────────┐ │
   │ │ 💳 Pay Yourself         (○)      │ │
   │ │ Pay subscription directly        │ │
   │ └─────────────────────────────────┘ │
   │                                     │
   │ ┌─────────────────────────────────┐ │
   │ │ ℹ️ Note: When paying via rent,   │ │
   │ │    a percentage will be        │ │
   │ │    automatically deducted from   │ │
   │ │    each rent payment. You can    │ │
   │ │    change this preference at    │ │
   │ │    any time.                     │ │
   │ └─────────────────────────────────┘ │
   │                                     │
   │ [Cancel]  [Save]                    │
   └─────────────────────────────────────┘
   ```

2. **Pay Yourself Subscription Setup** (shown when Pay Yourself selected)
   ```
   ┌─────────────────────────────────────┐
   │ Subscription Plan                    │
   ├─────────────────────────────────────┤
   │ Choose your subscription plan:       │
   │                                     │
   │ ┌─────────────────────────────────┐ │
   │ │ Premium                         │ │
   │ │ K15/month                       │ │
   │ │ • Featured listings             │ │
   │ │ • Priority support              │ │
   │ │ [Select]                        │ │
   │ └─────────────────────────────────┘ │
   │                                     │
   │ ┌─────────────────────────────────┐ │
   │ │ Premium Plus                    │ │
   │ │ K25/month                       │ │
   │ │ • All Premium features          │ │
   │ │ • Advanced analytics            │ │
   │ │ • Dedicated support             │ │
   │ │ [Select]                        │ │
   │ └─────────────────────────────────┘ │
   │                                     │
   │ Payment Method:                     │
   │ ○ Pay via App (Instant)            │
   │ ○ Pay Outside (Upload Proof)       │
   │                                     │
   │ Auto-renew: [Toggle ON]             │
   │                                     │
   │ [Back]  [Subscribe]                  │
   └─────────────────────────────────────┘
   ```

3. **Payment Options Modal** (if "Pay Outside" selected)
   ```
   ┌─────────────────────────────────────┐
   │ Upload Payment Proof                 │
   ├─────────────────────────────────────┤
   │ Plan: Premium (K15/month)           │
   │                                     │
   │ Payment Method:                     │
   │ [Bank Transfer ▼]                   │
   │                                     │
   │ Upload Proof of Payment *           │
   │ [Choose File] [Upload]              │
   │                                     │
   │ Notes (optional):                   │
   │ [___________________________]        │
   │                                     │
   │ ℹ️ Your subscription will be        │
   │    activated after admin review     │
   │                                     │
   │ [Cancel]  [Submit Request]          │
   └─────────────────────────────────────┘
   ```

**Implementation Steps:**
1. Create `/landlord/preferences/subscription-payment` page
2. Create subscription payment method selection (radio buttons)
3. Show info note about "Pay via Rent" option
4. If "Pay Yourself" selected:
   - Show subscription plan options
   - Show payment method selection:
     - "Pay via App" - Direct payment (instant)
     - "Pay Outside" - Upload proof (admin review)
   - If "Pay via App": Add payment gateway integration
   - If "Pay Outside": Show file upload form
   - Handle subscription creation
5. Create API service: `updateSubscriptionPaymentMethod()`
6. Create API service: `subscribe()` for in-app payments
7. Create API service: `createSubscriptionRequest()` for external payments
8. Add success/error handling

**See detailed guide:** `LANDLORD_SUBSCRIPTION_PAYMENT_IMPLEMENTATION.md`

**API Endpoint:**
```
PATCH /api/landlord/preferences/subscription-payment
Authorization: Bearer <landlord_token>
```

**Request Body:**

**Pay via Rent:**
```json
{
  "method": "via_rent"
}
```

**Pay Yourself:**
```json
{
  "method": "pay_yourself",
  "subscriptionDetails": {
    "planType": "premium",
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
    "_id": "pref_123",
    "subscriptionPaymentMethod": "pay_yourself",
    "subscriptionDetails": {
      "planType": "premium",
      "autoRenew": true,
      "nextBillingDate": "2025-02-15T00:00:00.000Z"
    },
    "updatedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

---

## Feature 3: Premium Features Management

### 3.1 Premium Features Subscription

**What it does:**
- Landlord can subscribe to premium features
- Manage subscription (upgrade, downgrade, cancel)
- View subscription status and billing

**UI Components to Build:**

1. **Premium Features Dashboard**
   ```
   ┌─────────────────────────────────────┐
   │ Premium Features                     │
   ├─────────────────────────────────────┤
   │ Current Plan: Premium                │
   │ Status: ✅ Active                    │
   │                                     │
   │ Next Billing: Feb 15, 2025           │
   │ Amount: K15/month                   │
   │                                     │
   │ Features Included:                  │
   │ ✓ Featured property listings        │
   │ ✓ Priority customer support         │
   │ ✓ Advanced analytics                │
   │                                     │
   │ [Manage Subscription]               │
   └─────────────────────────────────────┘
   ```

2. **Subscription Management Modal**
   ```
   ┌─────────────────────────────────────┐
   │ Manage Subscription                  │
   ├─────────────────────────────────────┤
   │ Current Plan: Premium                │
   │                                     │
   │ Change Plan:                        │
   │ ○ Basic (Free)                      │
   │ ● Premium (K15/month)               │
   │ ○ Premium Plus (K25/month)           │
   │                                     │
   │ Auto-renew: [Toggle ON]              │
   │                                     │
   │ [Cancel Subscription]               │
   │                                     │
   │ [Cancel]  [Save Changes]             │
   └─────────────────────────────────────┘
   ```

**Implementation Steps:**
1. Create `/landlord/preferences/premium-features` page
2. Show current subscription status
3. Add subscription management options
4. Create API service: `updatePremiumFeatures()`
5. Add payment integration for new subscriptions
6. Handle subscription cancellation

**API Endpoint:**
```
PATCH /api/landlord/preferences/premium-features
Authorization: Bearer <landlord_token>
```

**Request Body:**
```json
{
  "isSubscribed": true,
  "planType": "premium",
  "autoRenew": true,
  "startDate": "2025-01-15T00:00:00.000Z",
  "endDate": "2025-02-15T00:00:00.000Z"
}
```

---

## 📱 Complete Settings Page Layout

### Settings Navigation

```
┌─────────────────────────────────────┐
│ Settings                             │
├─────────────────────────────────────┤
│ [Payment Methods] [Subscription     │
│  Options] [Subscriptions]            │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Payment Reception                │ │
│ │ Current: Bank Transfer           │ │
│ │ [Change]                         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Subscription Payment             │ │
│ │ Current: Pay via Rent            │ │
│ │ [Change]                         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Premium Features                 │ │
│ │ Status: Active                   │ │
│ │ Plan: Premium                    │ │
│ │ [Manage]                         │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 🔌 API Service Functions (TypeScript)

```typescript
// services/landlordPreferencesService.ts

export const landlordPreferencesService = {
  // Get preferences
  async getPreferences() {
    const response = await fetch('/api/landlord/preferences', {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  // Update payment reception method
  async updatePaymentReception(data: {
    method: 'bank_transfer' | 'mobile_money' | 'paypal' | 'cash';
    bankDetails?: {
      bankName: string;
      accountNumber: string;
      accountHolderName: string;
      branchName?: string;
      swiftCode?: string;
    };
    mobileMoneyDetails?: {
      provider: 'ecocash' | 'onemoney' | 'telecash' | 'other';
      phoneNumber: string;
      accountName?: string;
    };
    paypalDetails?: {
      email: string;
      accountName?: string;
    };
  }) {
    const response = await fetch('/api/landlord/preferences/payment-reception', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Update subscription payment method
  async updateSubscriptionPayment(data: {
    method: 'via_rent' | 'pay_yourself';
    subscriptionDetails?: {
      planType?: 'premium' | 'premium_plus';
      autoRenew?: boolean;
    };
  }) {
    const response = await fetch('/api/landlord/preferences/subscription-payment', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Update premium features
  async updatePremiumFeatures(data: {
    isSubscribed: boolean;
    planType?: 'basic' | 'premium' | 'premium_plus';
    subscriptionId?: string;
    startDate?: string;
    endDate?: string;
    autoRenew?: boolean;
  }) {
    const response = await fetch('/api/landlord/preferences/premium-features', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};
```

---

## ✅ Implementation Checklist

### Payment Reception Preferences
- [ ] Create `/landlord/preferences/payment-reception` page
- [ ] Build payment method selection component
- [ ] Build bank transfer details form
- [ ] Build mobile money details form (with phone number input)
- [ ] Build PayPal details form
- [ ] Add form validation
- [ ] Create API service functions
- [ ] Add success/error handling
- [ ] Show current selection on page load

### Subscription Payment Preferences
- [ ] Create `/landlord/preferences/subscription-payment` page
- [ ] Build subscription payment method selection
- [ ] Add info note about "Pay via Rent"
- [ ] Build "Pay Yourself" subscription setup
- [ ] Add payment gateway integration (if Pay Yourself)
- [ ] Create API service functions
- [ ] Handle subscription creation

### Premium Features Management
- [ ] Create `/landlord/preferences/premium-features` page
- [ ] Show current subscription status
- [ ] Build subscription management modal
- [ ] Add plan upgrade/downgrade options
- [ ] Add subscription cancellation
- [ ] Create API service functions

### Settings Navigation
- [ ] Create main settings page with tabs
- [ ] Add navigation between settings sections
- [ ] Show current preferences summary
- [ ] Add quick actions

---

## 📝 Important Notes

1. **Payment Reception:**
   - Mobile Money requires phone number (mandatory)
   - Bank Transfer requires account details (mandatory)
   - PayPal requires email (mandatory)
   - Cash requires no additional details

2. **Subscription Payment:**
   - "Pay via Rent" = automatic deduction from rent payments
   - "Pay Yourself" = direct payment, requires payment gateway
   - Can change preference at any time

3. **Premium Features:**
   - Subscription can be managed independently
   - Auto-renew can be toggled
   - Cancellation available

4. **Validation:**
   - Phone numbers must be valid format
   - Email addresses must be valid
   - Account numbers must be provided for bank transfer
   - All required fields must be filled

---

## 🚀 Quick Start

1. **Start with Payment Reception** - Most critical for payouts
2. **Then Subscription Payment** - Affects how landlord pays
3. **Then Premium Features** - Optional but valuable

---

## 📚 Related Documentation

- `LANDLORD_FRONTEND_IMPLEMENTATION.md` - Complete landlord guide
- `FRONTEND_IMPLEMENTATION_GUIDE.md` - General frontend guide
- `FRONTEND_API_REFERENCE.md` - Complete API documentation

