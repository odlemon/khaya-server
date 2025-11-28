# 🏦 Escrow System - Khayalami

## Overview

All payments now go to a **centralized escrow account** first, then are distributed monthly (or manually) to landlords and Khayalami. This ensures proper fund management and commission tracking.

---

## 🔄 **New Payment Flow**

### **OLD SYSTEM (Removed):**
```
Tenant pays → Money goes directly to landlord balance ❌
```

### **NEW SYSTEM (Escrow):**
```
Tenant pays → Money goes to ESCROW account ✅
    ↓
At month end (or manual) → Distributed to:
    - Landlords (95%)
    - Khayalami (5% commission)
```

---

## 📊 **Data Models**

### **1. EscrowTransaction**
Tracks each payment in escrow:
- `totalAmount`: Full payment amount
- `landlordAmount`: 95% (what landlord gets)
- `khayalamiAmount`: 5% (commission)
- `status`: `pending` | `held` | `distributed` | `cancelled`

### **2. EscrowAccount**
Central escrow account:
- `totalHeld`: Current amount in escrow
- `totalDistributed`: Lifetime distributed
- `autoDistributionEnabled`: Auto-distribute at month end
- `distributionDay`: Day of month to distribute (default: 1st)

### **3. Payout**
Distribution records:
- Tracks each payout to landlords/Khayalami
- Links to escrow transactions
- Status: `pending` | `processing` | `completed` | `failed`

---

## 🔄 **Payment Flow with Escrow**

### **Online Payment:**
```
1. Tenant pays K1,000 online
    ↓
2. Payment created (status: "verified")
    ↓
3. Added to ESCROW:
   - totalAmount: K1,000
   - landlordAmount: K950 (95%)
   - khayalamiAmount: K50 (5%)
   - status: "held" ✅
    ↓
4. Money held in escrow until distribution
```

### **Cash Payment:**
```
1. Tenant pays K1,000 cash
    ↓
2. Payment created (status: "paid")
    ↓
3. Added to ESCROW:
   - status: "pending" ⏳
    ↓
4. Landlord verifies payment
    ↓
5. Escrow status: "pending" → "held" ✅
    ↓
6. Money held in escrow until distribution
```

---

## 📅 **Distribution**

### **Monthly Distribution (Scheduled)**
- Runs automatically at month end (configurable day)
- Distributes all "held" transactions
- Creates payout records for each landlord
- Creates payout record for Khayalami commission

### **Manual Distribution (Button Click)**
- Admin can trigger distribution anytime
- Can filter by:
  - Specific landlord
  - Date range
  - All held transactions

---

## 🔌 **API Endpoints**

### **Get Escrow Summary (Admin)**
```http
GET /api/escrow/summary
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "account": {
      "totalHeld": 50000,
      "totalDistributed": 200000,
      "autoDistributionEnabled": true,
      "distributionDay": 1
    },
    "totalHeld": 50000,
    "pendingLandlordPayouts": 47500,
    "pendingKhayalamiPayouts": 2500,
    "transactionCounts": {
      "pending": 5,
      "held": 50,
      "distributed": 200
    }
  }
}
```

### **Get Landlord Escrow Transactions**
```http
GET /api/escrow/landlord/transactions
Authorization: Bearer <landlord_token>
```

### **Manual Distribution (Admin)**
```http
POST /api/escrow/distribute
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "landlordId": "optional_landlord_id",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Escrow distributed successfully: K50000 to 10 landlords and Khayalami",
  "data": {
    "totalDistributed": 50000,
    "landlordPayouts": 10,
    "khayalamiPayouts": 1,
    "payoutIds": ["payout_1", "payout_2", ...]
  }
}
```

### **Get Distribution Statistics**
```http
GET /api/escrow/stats?startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer <admin_token>
```

---

## ⚙️ **Configuration**

### **Enable Auto-Distribution:**
Update EscrowAccount:
```typescript
account.autoDistributionEnabled = true;
account.distributionDay = 1; // 1st of month
```

### **Monthly Distribution Job:**
Set up cron job to run daily:
```bash
# Runs at midnight every day
0 0 * * * node dist/jobs/distributionJob.js
```

Or use a job scheduler like:
- PM2 cron
- node-cron
- AWS EventBridge
- etc.

---

## 📊 **Distribution Process**

### **Step 1: Group by Landlord**
```
Transaction 1: Landlord A - K950
Transaction 2: Landlord A - K1,900
Transaction 3: Landlord B - K950
    ↓
Grouped:
- Landlord A: K2,850
- Landlord B: K950
```

### **Step 2: Create Payouts**
```
For each landlord:
- Create Payout record
- Link to escrow transactions
- Credit landlord balance
- Status: "pending"
```

### **Step 3: Create Khayalami Payout**
```
- Sum all commissions: K50 + K100 + K50 = K200
- Create Payout record
- Status: "pending"
```

### **Step 4: Update Escrow Transactions**
```
- Mark as "distributed"
- Link to payout records
- Set distribution date
```

---

## 🎯 **Key Benefits**

1. ✅ **Centralized Control**: All money in one place
2. ✅ **Proper Tracking**: Every payment tracked in escrow
3. ✅ **Scheduled Distribution**: Automatic monthly payouts
4. ✅ **Manual Override**: Admin can distribute anytime
5. ✅ **Commission Tracking**: Clear separation of landlord vs Khayalami amounts
6. ✅ **Audit Trail**: Full history of all distributions

---

## 🔄 **Migration Notes**

**Old System:**
- Payments went directly to landlord balance
- Commission tracked separately
- No escrow holding period

**New System:**
- All payments go to escrow first
- Distribution happens monthly or manually
- Better fund management and tracking

---

## 📝 **Next Steps**

1. ✅ Escrow models created
2. ✅ Escrow service created
3. ✅ Distribution service created
4. ✅ Payment flow updated
5. ⏳ Set up cron job for monthly distribution
6. ⏳ Configure escrow account settings
7. ⏳ Test distribution flow

The escrow system is ready! Now you can provide the revenue sources and money movement details. 🚀






