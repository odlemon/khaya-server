# Maintenance System - Admin Guide

## Overview
Admins manage the complete maintenance workflow by assigning verified service providers and tracking vendor performance. This guide covers vendor management and maintenance request handling.

## Service Provider Management

### 1. Create Service Provider
**POST** `/api/service-providers`

**Request Body:**
```json
{
  "name": "John Smith",
  "company": "PlumbPro Ltd",
  "phoneNumber": "+254712345678",
  "email": "john@plumbpro.com",
  "serviceTypes": ["plumbing", "hvac"],
  "location": {
    "city": "Nairobi",
    "area": "Westlands",
    "coordinates": {
      "latitude": -1.2921,
      "longitude": 36.8219
    }
  },
  "businessLicense": "BL123456",
  "insuranceNumber": "IN789012",
  "workingHours": {
    "start": "08:00",
    "end": "17:00",
    "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
  }
}
```

### 2. Get All Service Providers
**GET** `/api/service-providers`

**Query Parameters:**
- `serviceType` - Filter by service type
- `city` - Filter by city
- `isActive` - Filter by active status
- `isVerified` - Filter by verification status

**Example:**
```
GET /api/service-providers?serviceType=plumbing&city=Nairobi&isActive=true&isVerified=true
```

### 3. Get Service Provider by ID
**GET** `/api/service-providers/:id`

### 4. Update Service Provider
**PUT** `/api/service-providers/:id`

**Request Body:**
```json
{
  "name": "John Smith Updated",
  "company": "PlumbPro Ltd",
  "phoneNumber": "+254712345679",
  "email": "john.updated@plumbpro.com",
  "serviceTypes": ["plumbing", "hvac", "electrical"],
  "isActive": true
}
```

### 5. Verify Service Provider
**POST** `/api/service-providers/:id/verify`

**Request Body:**
```json
{
  "isVerified": true,
  "verificationNotes": "All documents verified and insurance is valid"
}
```

### 6. Delete Service Provider
**DELETE** `/api/service-providers/:id`

**Note:** Cannot delete providers with active maintenance requests

### 7. Get Providers by Service Type
**GET** `/api/service-providers/service-type/:serviceType`

**Example:**
```
GET /api/service-providers/service-type/plumbing
```

## Maintenance Request Management

### 1. Get Requests Awaiting Vendor Assignment
**GET** `/api/maintenance/admin/awaiting-vendor`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "status": "awaiting_vendor",
      "title": "Leaking faucet",
      "issueType": "plumbing",
      "urgency": "high",
      "rentalId": {
        "status": "active",
        "startDate": "2024-01-01T00:00:00.000Z",
        "endDate": "2024-12-31T00:00:00.000Z"
      },
      "propertyId": {
        "title": "Beautiful Apartment",
        "address": {
          "street": "123 Main St",
          "city": "Nairobi"
        }
      },
      "landlordId": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "tenantId": {
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane@example.com"
      },
      "createdAt": "2024-01-15T09:00:00.000Z"
    }
  ]
}
```

### 2. Assign Vendor to Request
**POST** `/api/maintenance/admin/requests/:id/assign-vendor`

**Request Body:**
```json
{
  "vendorId": "64f8a1b2c3d4e5f6a7b8c9d1",
  "estimatedArrival": "2024-01-16T10:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vendor assigned",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "status": "vendor_assigned",
    "assignedVendor": {
      "vendorId": "64f8a1b2c3d4e5f6a7b8c9d1",
      "vendorName": "John Smith",
      "phoneNumber": "+254712345678",
      "company": "PlumbPro Ltd",
      "email": "john@plumbpro.com"
    },
    "estimatedArrival": "2024-01-16T10:00:00.000Z",
    "vendorAssignedAt": "2024-01-15T11:00:00.000Z",
    "vendorUpdates": [
      {
        "message": "Vendor assigned: John Smith (PlumbPro Ltd). ETA: 2024-01-16T10:00:00.000Z",
        "timestamp": "2024-01-15T11:00:00.000Z",
        "from": "admin",
        "type": "status_update"
      }
    ]
  }
}
```

### 3. Update Vendor ETA
**POST** `/api/maintenance/admin/requests/:id/update-eta`

**Request Body:**
```json
{
  "estimatedArrival": "2024-01-16T14:00:00.000Z",
  "message": "ETA updated due to traffic delays"
}
```

### 4. Mark Vendor as Arrived
**POST** `/api/maintenance/admin/requests/:id/mark-arrived`

**Request Body:**
```json
{
  "message": "Vendor has arrived and work is in progress"
}
```

## Service Provider Model

```typescript
interface IServiceProvider {
  _id: string;
  name: string;
  company: string;
  phoneNumber: string;
  email: string;
  
  // Service types they can handle
  serviceTypes: string[];
  
  // Location and availability
  location: {
    city: string;
    area: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Business details
  businessLicense?: string;
  insuranceNumber?: string;
  rating: number; // 1-5 stars
  totalJobs: number;
  
  // Availability
  isActive: boolean;
  workingHours: {
    start: string; // "08:00"
    end: string;   // "17:00"
    days: string[]; // ["monday", "tuesday", ...]
  };
  
  // Admin management
  createdBy: string; // Admin who added this provider
  isVerified: boolean;
  verificationNotes?: string;
  
  // Stats
  stats: {
    completedJobs: number;
    averageRating: number;
    responseTime: number; // in hours
    onTimeRate: number; // percentage
  };
  
  createdAt: Date;
  updatedAt: Date;
}
```

## Maintenance Request Enhanced Model

```typescript
interface IMaintenanceRequest {
  // ... existing fields ...
  
  status: "pending" | "approved" | "rejected" | "awaiting_vendor" | "vendor_assigned" | "in_progress" | "completed" | "cancelled";
  
  // Vendor assignment (Khayalami assigns)
  assignedVendor?: {
    vendorId: string;
    vendorName: string;
    phoneNumber: string;
    company: string;
    email?: string;
  };
  
  // ETA tracking
  estimatedArrival?: Date;
  actualArrival?: Date;
  
  // Vendor updates
  vendorUpdates?: [{
    message: string;
    timestamp: Date;
    from: "vendor" | "landlord" | "tenant" | "admin";
    type: "eta_update" | "status_update" | "completion_update";
  }];
  
  // Work completion
  workCompletedAt?: Date;
  invoiceUrl?: string;
  totalCost?: number;
  
  // Timestamps
  approvedAt?: Date;
  rejectedAt?: Date;
  vendorAssignedAt?: Date;
  completedAt?: Date;
}
```

## Admin Workflow

### 1. Vendor Management
1. **Create Service Providers**: Add new vendors with their service types and locations
2. **Verify Providers**: Check documents and insurance before activation
3. **Monitor Performance**: Track completion rates, ratings, and response times
4. **Update Information**: Keep vendor details current

### 2. Maintenance Assignment
1. **Review Requests**: Check `awaiting_vendor` status requests
2. **Select Vendor**: Choose appropriate vendor based on:
   - Service type capability
   - Location proximity
   - Availability
   - Performance history
3. **Assign Vendor**: Set ETA and notify all parties
4. **Track Progress**: Monitor vendor updates and arrival
5. **Complete Work**: Ensure proper completion and invoicing

### 3. ETA Management
Since service providers don't use the system directly, admins manage ETA updates:

1. **Initial Assignment**: Set estimated arrival time
2. **Update ETA**: Modify arrival time based on vendor communication
3. **Mark Arrival**: Confirm when vendor actually arrives
4. **Track Completion**: Monitor work progress and completion

## Frontend Implementation

### Admin Dashboard Components

```jsx
// Service Provider Management
const ServiceProviderList = () => {
  const [providers, setProviders] = useState([]);
  const [filters, setFilters] = useState({});
  
  const fetchProviders = async () => {
    const response = await fetch(`/api/service-providers?${new URLSearchParams(filters)}`);
    const data = await response.json();
    setProviders(data.data);
  };
  
  return (
    <div>
      <h2>Service Providers</h2>
      <FilterControls filters={filters} setFilters={setFilters} />
      <ProviderTable providers={providers} />
    </div>
  );
};

// Maintenance Request Management
const MaintenanceRequests = () => {
  const [requests, setRequests] = useState([]);
  
  const fetchAwaitingVendor = async () => {
    const response = await fetch('/api/maintenance/admin/awaiting-vendor');
    const data = await response.json();
    setRequests(data.data);
  };
  
  const assignVendor = async (requestId, vendorId, eta) => {
    await fetch(`/api/maintenance/admin/requests/${requestId}/assign-vendor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId, estimatedArrival: eta })
    });
    fetchAwaitingVendor(); // Refresh
  };
  
  return (
    <div>
      <h2>Maintenance Requests Awaiting Vendor</h2>
      <RequestTable requests={requests} onAssignVendor={assignVendor} />
    </div>
  );
};
```

## Key Features

1. **Vendor Management**: Complete CRUD operations for service providers
2. **Smart Assignment**: Filter vendors by service type and location
3. **ETA Tracking**: Manage estimated and actual arrival times
4. **Performance Monitoring**: Track vendor stats and ratings
5. **Real-time Updates**: All parties see vendor assignments and updates
6. **Verification System**: Verify vendors before activation
7. **Location-based**: Filter vendors by city and area
8. **Service Type Matching**: Automatic filtering by service capability

## Error Handling

- **Vendor Validation**: Check service type compatibility
- **Active Status**: Only assign active and verified vendors
- **Request Status**: Ensure proper status transitions
- **Location Matching**: Consider vendor location for assignment
- **Performance Tracking**: Monitor vendor completion rates



