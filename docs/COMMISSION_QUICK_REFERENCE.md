# Commission System Quick Reference

## 🎯 **What This System Does**
- **Tracks 5% commission** from every rental transaction
- **Handles online payments** (immediate collection)
- **Manages cash payment debts** (landlord owes us)
- **Provides admin dashboard** for money tracking

## 📊 **Key Endpoints**

### Record Commissions
```http
POST /api/commissions/online    # Online payment (immediate)
POST /api/commissions/cash       # Cash payment (debt)
```

### Check Debts
```http
GET /api/commissions/landlord/:id/debt           # Total debt
GET /api/commissions/landlord/:id/debt-breakdown  # Debt details
```

### Collect Debts
```http
POST /api/commissions/landlord/:id/collect-debt   # Pay off debts
```

### Admin Dashboard
```http
GET /api/commissions/admin/earnings   # All earnings
GET /api/commissions/admin/summary    # Summary stats
GET /api/commissions/admin/all        # All commissions
```

## 💰 **How It Works**

### Online Payment Flow
1. Tenant pays K1,000 online
2. **Khayalami gets K50** (5%) immediately
3. **Landlord gets K950** (95%)
4. Commission status: `"collected"`

### Cash Payment Flow
1. Tenant pays K1,000 cash to landlord
2. **Landlord owes K50** (5%) to Khayalami
3. Commission status: `"owed"`
4. When landlord gets online payment later, we collect our 5% + the K50 they owe

## 🔧 **Request Examples**

### Record Online Commission
```json
POST /api/commissions/online
{
  "rentalId": "rental123",
  "landlordId": "landlord456",
  "tenantId": "tenant789",
  "paymentId": "payment101",
  "totalAmount": 1000
}
```

### Record Cash Commission
```json
POST /api/commissions/cash
{
  "rentalId": "rental123",
  "landlordId": "landlord456",
  "tenantId": "tenant789",
  "paymentId": "payment101",
  "totalAmount": 1000
}
```

### Collect Debt
```json
POST /api/commissions/landlord/landlord456/collect-debt
{
  "paymentId": "new_payment123",
  "amount": 2000
}
```

## 📈 **Admin Dashboard Data**

### Summary Response
```json
{
  "totalEarnings": 5000,      // Total collected
  "totalDebts": 1200,         // Total owed by landlords
  "collectedThisMonth": 3000, // This month's collections
  "owedThisMonth": 800,       // This month's new debts
  "topLandlords": [           // Landlords with most debt
    {
      "landlordId": "landlord123",
      "totalDebt": 500
    }
  ]
}
```

## 🎯 **Integration Points**

### When to Call Commission Endpoints
- **After successful online payment** → Call `/online`
- **After cash payment verification** → Call `/cash`
- **When landlord receives online payment** → Call `/collect-debt`

### Commission Statuses
- `"collected"` - Commission received (online payments)
- `"owed"` - Landlord owes us (cash payments)
- `"pending"` - Not yet processed

## 🔍 **Common Queries**

### Get All Earnings
```http
GET /api/commissions/admin/earnings
```

### Get Debts by Landlord
```http
GET /api/commissions/landlord/landlord123/debt
```

### Get Monthly Earnings
```http
GET /api/commissions/admin/earnings?startDate=2025-01-01&endDate=2025-01-31
```

### Get Cash Payment Debts
```http
GET /api/commissions/admin/all?paymentMethod=cash&commissionStatus=owed
```

## ⚠️ **Important Notes**

1. **Commission rate is 5%** (0.05) by default
2. **Cash payments create debts** that must be collected
3. **Debt collection is FIFO** (oldest first)
4. **All endpoints require authentication**
5. **Admin endpoints require admin role**

## 🚀 **Next Steps**

1. **Test commission recording** with sample data
2. **Integrate with payment system** when ready
3. **Set up admin dashboard** for monitoring
4. **Configure debt collection** workflow
