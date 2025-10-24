# Maintenance System - Tenant & Landlord Guide

## Overview
The maintenance system (KhayaFix/LamiFix) allows tenants to report property issues and landlords to approve them. Khayalami automatically assigns verified service providers and tracks the entire process.

## Status Flow

```
pending → approved → awaiting_vendor → vendor_assigned → in_progress → completed
   ↓         ↓
rejected  cancelled
```

## Tenant Endpoints

### 1. Create Maintenance Request
**POST** `/api/maintenance/:rentalId/requests`

**Request Body:**
```json
{
  "issueType": "plumbing",
  "urgency": "high",
  "title": "Leaking faucet",
  "description": "Kitchen faucet is dripping constantly",
  "photoUrls": ["https://firebase.../photo1.jpg"],
  "videoUrls": ["https://firebase.../video1.mp4"]
}
```

**Valid Issue Types:**
- `plumbing` - Water, pipes, faucets, toilets
- `electrical` - Wiring, outlets, switches, lights
- `hvac` - Heating, ventilation, air conditioning
- `aircon` - Air conditioning specifically
- `appliance` - Refrigerator, stove, dishwasher, etc.
- `structural` - Walls, floors, ceilings, doors, windows
- `pest_control` - Bugs, rodents, insects
- `other` - Any other maintenance issue

**Valid Urgency Levels:**
- `low` - Non-urgent, can wait
- `medium` - Moderate priority
- `high` - Important, needs attention soon
- `emergency` - Critical, needs immediate attention

### 2. Get My Maintenance Requests
**GET** `/api/maintenance/my`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "status": "vendor_assigned",
      "title": "Leaking faucet",
      "description": "Kitchen faucet is dripping constantly",
      "issueType": "plumbing",
      "urgency": "high",
      "assignedVendor": {
        "vendorName": "John's Plumbing",
        "company": "PlumbPro Ltd",
        "phoneNumber": "+254712345678",
        "email": "john@plumbpro.com"
      },
      "estimatedArrival": "2024-01-16T10:00:00.000Z",
      "vendorUpdates": [
        {
          "message": "Request approved by landlord. Awaiting vendor assignment from Khayalami.",
          "timestamp": "2024-01-15T10:30:00.000Z",
          "from": "landlord",
          "type": "status_update"
        },
        {
          "message": "Vendor assigned: John's Plumbing (PlumbPro Ltd). ETA: 2024-01-16T10:00:00.000Z",
          "timestamp": "2024-01-15T11:00:00.000Z",
          "from": "admin",
          "type": "status_update"
        }
      ],
      "createdAt": "2024-01-15T09:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  ]
}
```

### 3. Get Specific Request Details
**GET** `/api/maintenance/requests/:id`

### 4. Cancel Request
**POST** `/api/maintenance/requests/:id/cancel`

**Note:** Only allowed for `pending` or `approved` status

### 5. Mark as Complete (Tenant Only)
**POST** `/api/maintenance/requests/:id/complete`

**Request Body:**
```json
{
  "notes": "Work completed successfully"
}
```

**Note:** Only tenants can mark maintenance as complete since they verify the work is actually done.

## Landlord Endpoints

### 1. Get Landlord's Maintenance Requests
**GET** `/api/maintenance/landlord`

**Query Parameters:**
- `status` - Filter by status (optional)

**Example:**
```
GET /api/maintenance/landlord?status=pending
```

### 2. Approve Request
**POST** `/api/maintenance/requests/:id/approve`

**Request Body:**
```json
{
  "notes": "Approved, will send plumber tomorrow"
}
```

**Note:** This changes status to `awaiting_vendor` for admin assignment

### 3. Reject Request
**POST** `/api/maintenance/requests/:id/reject`

**Request Body:**
```json
{
  "rejectionReason": "Not covered under lease agreement"
}
```

### 4. Mark as In Progress
**POST** `/api/maintenance/requests/:id/progress`

**Request Body:**
```json
{
  "notes": "Work has started"
}
```

### 5. Mark as Complete (Tenant Only)
**POST** `/api/maintenance/requests/:id/complete`

**Request Body:**
```json
{
  "notes": "Work completed successfully"
}
```

**Note:** Only tenants can mark maintenance as complete since they verify the work is actually done.

## Status Meanings

| Status | Description | Who Can See |
|--------|-------------|-------------|
| `pending` | Waiting for landlord approval | Tenant, Landlord |
| `approved` | Landlord approved, awaiting vendor | Tenant, Landlord, Admin |
| `rejected` | Landlord rejected the request | Tenant, Landlord |
| `awaiting_vendor` | Approved, waiting for admin to assign vendor | Tenant, Landlord, Admin |
| `vendor_assigned` | Vendor assigned, waiting for arrival | Tenant, Landlord, Admin |
| `in_progress` | Vendor arrived, work in progress | Tenant, Landlord, Admin |
| `completed` | Work finished (marked by tenant) | Tenant, Landlord, Admin |
| `cancelled` | Request cancelled by tenant | Tenant, Landlord |

## Vendor Updates

The `vendorUpdates` array contains real-time updates about the maintenance process:

```json
{
  "vendorUpdates": [
    {
      "message": "Request approved by landlord. Awaiting vendor assignment from Khayalami.",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "from": "landlord",
      "type": "status_update"
    },
    {
      "message": "Vendor assigned: John's Plumbing (PlumbPro Ltd). ETA: 2024-01-16T10:00:00.000Z",
      "timestamp": "2024-01-15T11:00:00.000Z",
      "from": "admin",
      "type": "status_update"
    },
    {
      "message": "ETA updated: 2024-01-16T14:00:00.000Z",
      "timestamp": "2024-01-15T15:00:00.000Z",
      "from": "admin",
      "type": "eta_update"
    },
    {
      "message": "Vendor has arrived and work is in progress",
      "timestamp": "2024-01-16T14:30:00.000Z",
      "from": "admin",
      "type": "status_update"
    }
  ]
}
```

## Frontend Implementation

### Status Badge Colors
```css
.status-pending { color: #f59e0b; }      /* Orange */
.status-approved { color: #10b981; }     /* Green */
.status-rejected { color: #ef4444; }     /* Red */
.status-awaiting-vendor { color: #3b82f6; } /* Blue */
.status-vendor-assigned { color: #8b5cf6; } /* Purple */
.status-in-progress { color: #06b6d4; }  /* Cyan */
.status-completed { color: #10b981; }    /* Green */
.status-cancelled { color: #6b7280; }     /* Gray */
```

### Example React Component
```jsx
const MaintenanceRequestCard = ({ request }) => {
  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      approved: 'green',
      rejected: 'red',
      awaiting_vendor: 'blue',
      vendor_assigned: 'purple',
      in_progress: 'cyan',
      completed: 'green',
      cancelled: 'gray'
    };
    return colors[status] || 'gray';
  };

  return (
    <div className="maintenance-card">
      <h3>{request.title}</h3>
      <p>Status: <span className={`status-${request.status}`}>{request.status}</span></p>
      
      {request.assignedVendor && (
        <div className="vendor-info">
          <h4>Assigned Vendor</h4>
          <p>{request.assignedVendor.vendorName} ({request.assignedVendor.company})</p>
          <p>Phone: {request.assignedVendor.phoneNumber}</p>
          {request.estimatedArrival && (
            <p>ETA: {new Date(request.estimatedArrival).toLocaleString()}</p>
          )}
        </div>
      )}
      
      {request.vendorUpdates && request.vendorUpdates.length > 0 && (
        <div className="updates">
          <h4>Updates</h4>
          {request.vendorUpdates.map((update, index) => (
            <div key={index} className="update">
              <p>{update.message}</p>
              <small>{new Date(update.timestamp).toLocaleString()}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

## Key Features

1. **Real-time Updates**: Both tenant and landlord can see vendor assignments and ETA updates
2. **Status Tracking**: Clear status flow from request to completion
3. **Vendor Information**: When assigned, both parties can see vendor details
4. **ETA Tracking**: Estimated and actual arrival times
5. **Update History**: Complete audit trail of all status changes
6. **Flexible Completion**: Either tenant or landlord can mark work as complete

## Error Handling

- **Validation Errors**: Check issueType and urgency values
- **Authorization**: Users can only see their own requests
- **Status Transitions**: Some status changes are restricted
- **Vendor Assignment**: Only admins can assign vendors
- **Completion**: Only authorized users can mark as complete

