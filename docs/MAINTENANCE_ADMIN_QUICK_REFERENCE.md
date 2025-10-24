# Maintenance Admin - Quick Reference

## Correct Admin Endpoints

### **Maintenance Requests**
```
GET /api/maintenance/admin/all                    - Get all maintenance requests
GET /api/maintenance/admin/awaiting-vendor        - Get requests awaiting vendor assignment
POST /api/maintenance/admin/requests/:id/assign-vendor    - Assign vendor to request
POST /api/maintenance/admin/requests/:id/update-eta       - Update vendor ETA
POST /api/maintenance/admin/requests/:id/mark-arrived      - Mark vendor as arrived
```

### **Service Providers**
```
GET /api/service-providers                        - Get all service providers
POST /api/service-providers                        - Create service provider
GET /api/service-providers/:id                     - Get provider by ID
PUT /api/service-providers/:id                      - Update provider
POST /api/service-providers/:id/verify             - Verify provider
DELETE /api/service-providers/:id                  - Delete provider
GET /api/service-providers/service-type/:type      - Get providers by service type
```

## Example Requests

### 1. Get Maintenance Requests (Default: Active Requests)
```bash
GET http://localhost:3001/api/maintenance/admin/all
Authorization: Bearer <admin-token>
```

**Default Behavior:** Shows requests that need admin attention:
- `awaiting_vendor` - Need vendor assignment
- `vendor_assigned` - Vendor assigned, waiting for arrival
- `in_progress` - Vendor arrived, work in progress
- `completed` - Work finished (for tracking and history)

**Query Parameters:**
- `status` - Filter by status (pending, approved, awaiting_vendor, vendor_assigned, in_progress, completed, rejected, cancelled)
- `issueType` - Filter by issue type (plumbing, electrical, hvac, aircon, appliance, structural, pest_control, other)
- `urgency` - Filter by urgency (low, medium, high, emergency)

**Examples:**
```
# Get active requests (awaiting_vendor, vendor_assigned, in_progress, completed)
GET /api/maintenance/admin/all

# Get only awaiting_vendor requests
GET /api/maintenance/admin/all?status=awaiting_vendor

# Get only vendor_assigned requests
GET /api/maintenance/admin/all?status=vendor_assigned

# Get only in_progress requests
GET /api/maintenance/admin/all?status=in_progress

# Get all completed requests
GET /api/maintenance/admin/all?status=completed

# Get plumbing requests (active ones)
GET /api/maintenance/admin/all?issueType=plumbing

# Get high urgency requests (active ones)
GET /api/maintenance/admin/all?urgency=high
```

### 2. Get Requests Awaiting Vendor Assignment
```bash
GET http://localhost:3001/api/maintenance/admin/awaiting-vendor
Authorization: Bearer <admin-token>
```

### 3. Assign Vendor to Request
```bash
POST http://localhost:3001/api/maintenance/admin/requests/:requestId/assign-vendor
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "vendorId": "64f8a1b2c3d4e5f6a7b8c9d1",
  "estimatedArrival": "2024-01-16T10:00:00.000Z"
}
```

### 4. Update Vendor ETA
```bash
POST http://localhost:3001/api/maintenance/admin/requests/:requestId/update-eta
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "estimatedArrival": "2024-01-16T14:00:00.000Z",
  "message": "ETA updated due to traffic delays"
}
```

### 5. Mark Vendor as Arrived
```bash
POST http://localhost:3001/api/maintenance/admin/requests/:requestId/mark-arrived
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "message": "Vendor has arrived and work is in progress"
}
```

### 6. Get All Service Providers
```bash
GET http://localhost:3001/api/service-providers
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `serviceType` - Filter by service type
- `city` - Filter by city
- `isActive` - Filter by active status (true/false)
- `isVerified` - Filter by verification status (true/false)

**Example:**
```
GET /api/service-providers?serviceType=plumbing&city=Nairobi&isActive=true&isVerified=true
```

### 7. Create Service Provider
```bash
POST http://localhost:3001/api/service-providers
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "John Smith",
  "company": "PlumbPro Ltd",
  "phoneNumber": "+254712345678",
  "email": "john@plumbpro.com",
  "serviceTypes": ["plumbing", "hvac"],
  "location": {
    "city": "Nairobi",
    "area": "Westlands"
  },
  "businessLicense": "BL123456",
  "insuranceNumber": "IN789012"
}
```

### 8. Verify Service Provider
```bash
POST http://localhost:3001/api/service-providers/:providerId/verify
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "isVerified": true,
  "verificationNotes": "All documents verified and insurance is valid"
}
```

## Common Issues & Solutions

### ❌ **404 Error on `/api/maintenance`**
**Problem:** Trying to access `/api/maintenance` directly
**Solution:** Use the correct nested paths:
- `/api/maintenance/admin/all` - Get all requests
- `/api/maintenance/admin/awaiting-vendor` - Get requests awaiting vendor

### ❌ **404 Error on Service Providers**
**Problem:** Trying to access `/api/maintenance/service-providers`
**Solution:** Service providers are on a separate route:
- `/api/service-providers` - Service provider endpoints

### ✅ **Correct URL Structure**
```
/api/maintenance/admin/all                    ← Admin maintenance requests
/api/maintenance/admin/awaiting-vendor        ← Requests needing vendors
/api/maintenance/admin/requests/:id/assign-vendor ← Assign vendor
/api/service-providers                        ← Service provider management
```

## Status Flow for Admin

1. **Request Created** → Status: `pending`
2. **Landlord Approves** → Status: `awaiting_vendor` 
3. **Admin Assigns Vendor** → Status: `vendor_assigned`
4. **Admin Marks Arrived** → Status: `in_progress`
5. **Work Complete** → Status: `completed`

## Quick Test Commands

```bash
# Test admin can get all requests
curl -H "Authorization: Bearer <admin-token>" \
     http://localhost:3001/api/maintenance/admin/all

# Test admin can get service providers
curl -H "Authorization: Bearer <admin-token>" \
     http://localhost:3001/api/service-providers

# Test admin can get requests awaiting vendor
curl -H "Authorization: Bearer <admin-token>" \
     http://localhost:3001/api/maintenance/admin/awaiting-vendor
```
