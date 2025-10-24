# Maintenance Admin - Complete View

## What You'll See on `/api/maintenance/admin/all`

### **Default View Includes:**

1. **`awaiting_vendor`** - Need vendor assignment
2. **`vendor_assigned`** - Vendor assigned, waiting for arrival
3. **`in_progress`** - Vendor arrived, work in progress
4. **`completed`** - Work finished (for tracking and history)

### **What You Won't See:**

- ❌ `pending` - Waiting for landlord approval
- ❌ `approved` - Landlord approved (becomes awaiting_vendor)
- ❌ `rejected` - Landlord rejected
- ❌ `cancelled` - Request cancelled

## Complete Admin Workflow:

```
1. Check Dashboard → See all active + completed requests
2. Assign Vendors → Handle awaiting_vendor requests
3. Monitor Progress → Track vendor_assigned and in_progress requests
4. Update ETAs → Keep tenants/landlords informed
5. Mark Arrived → Confirm vendor arrival
6. Track History → See completed requests for reference
```

## Benefits of Including Completed Requests:

- ✅ **Full History** - See all maintenance work done
- ✅ **Performance Tracking** - Monitor vendor completion rates
- ✅ **Reference** - Look at past similar issues
- ✅ **Reporting** - Generate maintenance reports
- ✅ **Quality Control** - Review completed work

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
      "assignedVendor": null
    },
    {
      "_id": "req2",
      "status": "vendor_assigned", 
      "title": "Broken AC",
      "issueType": "hvac",
      "urgency": "medium",
      "assignedVendor": {
        "vendorName": "John's HVAC",
        "company": "CoolPro Ltd"
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
        "company": "PowerFix Ltd"
      },
      "actualArrival": "2024-01-16T09:15:00.000Z"
    },
    {
      "_id": "req4",
      "status": "completed",
      "title": "Plumbing repair",
      "issueType": "plumbing", 
      "urgency": "medium",
      "assignedVendor": {
        "vendorName": "PlumbPro",
        "company": "FixIt Ltd"
      },
      "completedAt": "2024-01-15T16:30:00.000Z",
      "workCompletedAt": "2024-01-15T16:30:00.000Z"
    }
  ]
}
```

## Filtering Options:

### **Get Specific Status:**
```
GET /api/maintenance/admin/all?status=awaiting_vendor
GET /api/maintenance/admin/all?status=vendor_assigned
GET /api/maintenance/admin/all?status=in_progress
GET /api/maintenance/admin/all?status=completed
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

## Key Benefits:

- ✅ **Complete Picture** - See all maintenance activity
- ✅ **Progress Tracking** - Monitor from assignment to completion
- ✅ **History Reference** - Look at past completed work
- ✅ **Performance Monitoring** - Track vendor success rates
- ✅ **Reporting** - Generate comprehensive maintenance reports

**Now you have the complete maintenance picture - active requests that need attention plus completed work for tracking and reference!** 🎯


