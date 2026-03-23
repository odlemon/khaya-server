# Paynow Payment Gateway Integration

## Overview

Khayalami uses **Paynow** (Zimbabwe's leading payment gateway) for all online payments via EcoCash and OneMoney mobile money. The integration follows a **server-initiated** flow where the backend calls Paynow's API to send a USSD push to the user's phone.

## Architecture

```
┌──────────────┐     ┌────────────────────┐     ┌───────────────┐
│  Mobile App  │────▶│  Backend Controller │────▶│ PaynowService │
│  (Frontend)  │     │  (API Layer)        │     │ (Central SDK) │
└──────────────┘     └────────────────────┘     └───────┬───────┘
       │                      │                         │
       │ (polls status)       │                         ▼
       │                      │                 ┌───────────────┐
       │                      │                 │  Paynow API   │
       │                      │                 └───────┬───────┘
       │                      │                         │
       │                      ▼                         ▼
       │             ┌──────────────┐          ┌───────────────┐
       │             │   Payment    │          │   EcoCash /   │
       │             │   (Model)    │          │   OneMoney    │
       │             └──────────────┘          └───────────────┘
       │                      │
       └──────────────────────┘
              (status check)
```

## Test vs Live Mode

**We default to TEST mode.** No real money moves in test mode.

- **Test mode (default):** Set `PAYNOW_ENVIRONMENT=test` or leave it unset. Use your **test** integration ID and key from the Paynow dashboard. Only the merchant account that created the integration can complete test payments (fake success in Paynow).
- **Live mode:** Set `PAYNOW_ENVIRONMENT=production` and use your **live** integration ID and key. Request “Set Live” in Paynow’s Integration Keys section after testing.

Test mode mobile numbers (EcoCash/OneMoney):

| Number       | Result              |
|-------------|---------------------|
| 0771111111  | Success (5 sec)     |
| 0772222222  | Delayed success     |
| 0773333333  | User cancelled     |
| 0774444444  | Insufficient balance|

## Environment Variables

Add these to your `.env` file:

```
# Use "test" (default) or "production". Omit or set test to stay in test mode.
PAYNOW_ENVIRONMENT=test

PAYNOW_INTEGRATION_ID=your_integration_id
PAYNOW_INTEGRATION_KEY=your_integration_key
PAYNOW_MERCHANT_EMAIL=your@email.com
PAYNOW_RESULT_URL=https://khaya-server.vercel.app/api/webhooks/paynow
PAYNOW_RETURN_URL=https://khaya-portal.vercel.app/payment/return
```

## Payment Flow

### Step 1: Initiate Payment

Frontend sends a POST request with `phone` number to any payment endpoint.

### Step 2: USSD Prompt

Paynow sends a USSD push to the user's phone. User enters their PIN to authorize.

### Step 3: Confirm Payment

Two confirmation paths:
- **Frontend Polling**: `GET /api/webhooks/payment-status/:paymentId`
- **Paynow Webhook**: `POST /api/webhooks/paynow` (server-to-server)

### Step 4: Post-Payment Processing

Once confirmed, the system automatically processes the payment based on its type (escrow, subscriptions, invoices, etc.)

---

## Endpoints That Support Paynow

All online payments go through Paynow. Send `phone` (required) and optionally `mobileMethod` (default `"ecocash"`). Tenant subscription **requires** `phone`; there is no legacy path for that endpoint.

### 1. Rent Payment

**Endpoint:** `POST /api/payments/rental/:rentalId/create`

```json
{
  "amount": 500,
  "paymentMethod": "paynow",
  "phone": "0771234567",
  "mobileMethod": "ecocash",
  "paymentType": "rent"
}
```

### 2. Tenant Subscription (Zero-Deposit Access)

**Endpoint:** `POST /api/tenant/subscription/subscribe`

**Required:** `planType`, `propertyValueBracket`, **`phone`** (payment is Paynow-only; no raw/gateway bypass).

```json
{
  "planType": "premium",
  "propertyValueBracket": "medium",
  "phone": "0771234567",
  "mobileMethod": "ecocash"
}
```

### 3. Landlord Premium Subscription

**Endpoint:** `POST /api/landlord/subscription/subscribe`

```json
{
  "planType": "premium",
  "paymentMethod": "in_app",
  "phone": "0771234567",
  "mobileMethod": "ecocash",
  "autoRenew": true
}
```

### 4. Zero Deposit Protection

**Endpoint:** `POST /api/landlord/subscription/zero-deposit-protection`

```json
{
  "paymentMethod": "in_app",
  "phone": "0771234567",
  "mobileMethod": "ecocash",
  "autoRenew": true,
  "propertyCount": 3
}
```

### 5. Premium Boost

**Endpoint:** `POST /api/properties/:propertyId/boost`

```json
{
  "duration": 30,
  "paymentMethod": "in_app",
  "phone": "0771234567",
  "mobileMethod": "ecocash"
}
```

### 6. Agreement Fee

**Endpoint:** `POST /api/agreements/:id/pay-fee`

```json
{
  "amount": 25,
  "phone": "0771234567",
  "mobileMethod": "ecocash"
}
```

---

## Paynow Response (All Endpoints)

When Paynow payment is initiated, all endpoints return the same response structure:

```json
{
  "success": true,
  "message": "Payment initiated. Check your phone.",
  "data": {
    "paymentId": "648abc...",
    "reference": "RENT-userId-1690300000",
    "pollUrl": "https://www.paynow.co.zw/Interface/CheckPayment/?guid=...",
    "instructions": "Please check your phone for payment instructions and enter your PIN to confirm.",
    "statusCheckUrl": "/api/webhooks/payment-status/648abc..."
  }
}
```

---

## Payment Status Check (Frontend Polling)

**Endpoint:** `GET /api/webhooks/payment-status/:paymentId`

**Authorization:** Bearer token required

**Response (pending):**
```json
{
  "success": true,
  "data": {
    "paid": false,
    "status": "pending",
    "payment": { ... }
  }
}
```

**Response (completed):**
```json
{
  "success": true,
  "data": {
    "paid": true,
    "status": "completed",
    "payment": { ... }
  }
}
```

**Response (expired):**
```json
{
  "success": true,
  "data": {
    "paid": false,
    "status": "expired",
    "payment": { ... }
  }
}
```

Payments auto-expire after **15 minutes** if not confirmed.

---

## Webhook (Server-to-Server)

**Endpoint:** `POST /api/webhooks/paynow`

No authentication required. Paynow sends payment status updates here.

**Expected fields:** `reference`, `paynowreference`, `amount`, `status`, `pollurl`, `hash`

---

## Supported Mobile Money Methods

| Method | Provider | Phone Prefix |
|--------|----------|-------------|
| `ecocash` | EcoCash (Econet) | 077, 078 |
| `onemoney` | OneMoney (NetOne) | 071 |

---

## Payment Reference Prefixes

| Payment Type | Prefix | Example |
|-------------|--------|---------|
| Rent | `RENT` | `RENT-userId-1690300000` |
| Tenant Subscription | `TSUB` | `TSUB-userId-1690300000` |
| Landlord Premium | `LSUB` | `LSUB-userId-1690300000` |
| Zero Deposit Protection | `ZDEP` | `ZDEP-userId-1690300000` |
| Premium Boost | `BOOST` | `BOOST-userId-1690300000` |
| Agreement Fee | `AFEE` | `AFEE-userId-1690300000` |

---

## Payment Model (New Fields)

| Field | Type | Description |
|-------|------|-------------|
| `pollUrl` | `String` | Paynow poll URL for status checks |
| `paynowReference` | `String` (indexed) | Unique reference sent to Paynow |
| `paynowMetadata` | `Mixed` | Stores `paymentPurpose` and type-specific data |
| `gatewayResponse.provider` | `String` | Now includes `"paynow"` as an option |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/config/paynowConfig.ts` | Configuration (env vars) |
| `src/services/PaynowService.ts` | Central Paynow service (initiate, poll, webhook, post-payment) |
| `src/routes/webhookRoutes.ts` | Webhook + status polling endpoints |
| `src/models/Payment.ts` | Updated with Paynow fields |

---

## Paynow Logging

All Paynow-related actions are logged with the `[Paynow]` prefix so you can filter logs:

- Gateway init (TEST/LIVE mode, resultUrl)
- Initiate mobile/web (ref, amount, phone, method, result)
- Poll status (paymentId, userId, poll result)
- Webhook received (reference, status, amount) and response
- Post-payment (purpose, paymentId, and per-type completion)

Search logs for `[Paynow]` to see the full payment flow.

## Backward Compatibility

Some endpoints (e.g. rent) may still accept a legacy `gatewayResponse` if `phone` is not sent. **Tenant subscription** (`POST /api/tenant/subscription/subscribe`) is Paynow-only and **requires** `phone`; the legacy path was removed.

---

## Dependencies

```
npm install --save paynow
```

Package: `paynow` v2.2.2 (official Paynow Zimbabwe Node.js SDK)
