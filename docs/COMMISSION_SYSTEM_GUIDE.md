# Khayalami Commission System Guide

## Overview
Khayalami takes a 5% commission from every rental transaction. This system tracks commissions for both online and cash payments, managing debt collection for cash payments.

## How It Works

### Online Payments (In-App)
- **Tenant pays K1,000 online**
- **Khayalami gets 5% (K50)** immediately
- **Landlord gets 95% (K950)**
- Commission status: `"collected"`

### Cash Payments
- **Tenant pays K1,000 cash to landlord**
- **Landlord owes Khayalami 5% (K50)** - becomes a debt
- Commission status: `"owed"`
- When landlord receives online payment later, we collect our 5% + the K50 they owe

## API Endpoints

### Commission Recording
```http
POST /api/commissions/online
POST /api/commissions/cash
```

**Request Body:**
```json
{
  "rentalId": "rental123",
  "landlordId": "landlord456",
  "tenantId": "tenant789",
  "paymentId": "payment101",
  "totalAmount": 1000,
  "commissionRate": 0.05
}
```

### Landlord Debt Management
```http
GET /api/commissions/landlord/:landlordId/debt
GET /api/commissions/landlord/:landlordId/debt-breakdown
POST /api/commissions/landlord/:landlordId/collect-debt
```

### Admin Endpoints
```http
GET /api/commissions/admin/earnings
GET /api/commissions/admin/summary
GET /api/commissions/admin/all
```

## Commission Data Model

```typescript
interface ICommission {
  transactionId: string;
  rentalId: string;
  landlordId: string;
  tenantId: string;
  paymentId: string;
  
  // Transaction details
  totalAmount: number;
  commissionRate: number; // 0.05 (5%)
  commissionAmount: number; // calculated
  
  // Payment method
  paymentMethod: "in_app" | "cash";
  
  // Commission status
  commissionStatus: "collected" | "owed" | "pending";
  
  // For cash payments - debt tracking
  isDebt: boolean;
  debtAmount: number;
  debtPaid: boolean;
  debtPaidAt?: Date;
  
  // For online payments - immediate collection
  collectedAt?: Date;
  collectedFromPaymentId?: string;
}
```

## Usage Examples

### 1. Record Online Payment Commission
```javascript
// When tenant pays online
const response = await fetch('/api/commissions/online', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rentalId: 'rental123',
    landlordId: 'landlord456',
    tenantId: 'tenant789',
    paymentId: 'payment101',
    totalAmount: 1000
  })
});
```

### 2. Record Cash Payment Commission
```javascript
// When tenant pays cash
const response = await fetch('/api/commissions/cash', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rentalId: 'rental123',
    landlordId: 'landlord456',
    tenantId: 'tenant789',
    paymentId: 'payment101',
    totalAmount: 1000
  })
});
```

### 3. Check Landlord Debt
```javascript
// Check how much landlord owes
const response = await fetch('/api/commissions/landlord/landlord456/debt');
const data = await response.json();
console.log(`Landlord owes: K${data.data.totalDebt}`);
```

### 4. Collect Debt
```javascript
// When landlord receives online payment, collect their debt
const response = await fetch('/api/commissions/landlord/landlord456/collect-debt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentId: 'new_payment123',
    amount: 2000 // Amount from new online payment
  })
});
```

### 5. Admin Dashboard - Get Earnings
```javascript
// Get Khayalami's total earnings
const response = await fetch('/api/commissions/admin/earnings');
const data = await response.json();
console.log(`Total earnings: K${data.data.totalEarnings}`);
```

### 6. Admin Dashboard - Get Summary
```javascript
// Get commission summary
const response = await fetch('/api/commissions/admin/summary');
const data = await response.json();
console.log('Summary:', data.data);
```

## Commission Summary Response
```json
{
  "success": true,
  "data": {
    "totalEarnings": 5000,
    "totalDebts": 1200,
    "collectedThisMonth": 3000,
    "owedThisMonth": 800,
    "topLandlords": [
      {
        "landlordId": "landlord123",
        "totalDebt": 500
      }
    ]
  }
}
```

## Debt Collection Logic

When a landlord receives an online payment, the system:

1. **Finds all unpaid debts** for that landlord
2. **Collects from oldest debt first** (FIFO)
3. **Updates debt records** as paid
4. **Returns collection summary**

Example:
- Landlord owes K150 (3 debts of K50 each)
- Landlord receives K200 online payment
- System collects K150 from debts
- Landlord gets K50 remaining
- All 3 debts marked as paid

## Integration Notes

This commission system is designed to integrate with your existing payment system. When you're ready to integrate:

1. **Call commission endpoints** after successful payments
2. **Use payment method** to determine commission type
3. **Handle debt collection** when landlords receive online payments

## Error Handling

All endpoints return standard error responses:
```json
{
  "success": false,
  "message": "Error description",
  "timestamp": "2025-01-XX..."
}
```

## Security

- All endpoints require authentication
- Admin endpoints require admin role
- Landlord endpoints require landlord or admin role
- Commission recording requires authentication
