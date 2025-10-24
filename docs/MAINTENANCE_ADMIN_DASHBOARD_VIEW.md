# Maintenance Admin Dashboard - What You'll See

## Default View: `/api/maintenance/admin/all`

When you call this endpoint, you'll see **all active requests** that need your attention:

### **1. Awaiting Vendor Assignment (`awaiting_vendor`)**
- Requests approved by landlord
- Need you to assign a vendor
- **Action Required**: Assign vendor

### **2. Vendor Assigned (`vendor_assigned`)**
- You've assigned a vendor
- Waiting for vendor to arrive
- **Action Required**: Monitor arrival, update ETA if needed

### **3. Work In Progress (`in_progress`)**
- Vendor has arrived
- Work is being done
- **Action Required**: Monitor progress, mark arrived if needed

### **4. Work Completed (`completed`)**
- Work finished by tenant
- **Action Required**: None (for tracking and history)

## Example Response:

```json
{
  "success": true,
  "data": [
    {
      "_id": "req1",
      "status": "awaiting_vendor",
      "title": "Leaking faucet",
      "issueType": "plumbing",
      "urgency": "high",
      "assignedVendor": null,
      "estimatedArrival": null
    },
    {
      "_id": "req2", 
      "status": "vendor_assigned",
      "title": "Broken AC",
      "issueType": "hvac",
      "urgency": "medium",
      "assignedVendor": {
        "vendorName": "John's HVAC",
        "company": "CoolPro Ltd",
        "phoneNumber": "+254712345678"
      },
      "estimatedArrival": "2024-01-16T10:00:00.000Z"
    },
    {
      "_id": "req3",
      "status": "in_progress", 
      "title": "Electrical fault",
      "issueType": "electrical",
      "urgency": "high",
      "assignedVendor": {
        "vendorName": "Mike's Electric",
        "company": "PowerFix Ltd",
        "phoneNumber": "+254712345679"
      },
      "estimatedArrival": "2024-01-16T09:00:00.000Z",
      "actualArrival": "2024-01-16T09:15:00.000Z"
    }
  ]
}
```

## What You Won't See (By Default):

- ❌ `pending` - Waiting for landlord approval
- ❌ `approved` - Landlord approved (becomes awaiting_vendor)
- ❌ `rejected` - Landlord rejected
- ❌ `cancelled` - Request cancelled

## Filtering Options:

### **Get Specific Status:**
```
GET /api/maintenance/admin/all?status=awaiting_vendor
GET /api/maintenance/admin/all?status=vendor_assigned  
GET /api/maintenance/admin/all?status=in_progress
```

### **Get All Statuses:**
```
GET /api/maintenance/admin/all?status=all
```

### **Filter by Issue Type:**
```
GET /api/maintenance/admin/all?issueType=plumbing
GET /api/maintenance/admin/all?issueType=electrical
```

### **Filter by Urgency:**
```
GET /api/maintenance/admin/all?urgency=high
GET /api/maintenance/admin/all?urgency=emergency
```

## Admin Workflow:

1. **Check Dashboard** → See all active requests
2. **Assign Vendors** → Handle `awaiting_vendor` requests
3. **Monitor Progress** → Track `vendor_assigned` and `in_progress` requests
4. **Update ETAs** → Keep tenants/landlords informed
5. **Mark Arrived** → Confirm vendor arrival

## Key Benefits:

- ✅ **Complete View** - See all requests that need your attention
- ✅ **Status Tracking** - Monitor progress from assignment to completion
- ✅ **Action Items** - Clear indication of what needs to be done
- ✅ **Filtering** - Focus on specific types or urgency levels
- ✅ **Progress Monitoring** - Track vendor assignments and arrivals

**Now you'll see the complete picture of all maintenance requests that need your attention!** 🎯
