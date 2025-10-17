# Connection Status Guide

This guide explains the **easiest ways** to check if a tenant is connected to a landlord for properties without calling external APIs.

## Overview

The system now provides **automatic connection status** in all property endpoints. When tenants view properties, the connection status is automatically included in the response, so you can see it directly in the frontend without making additional API calls.

## Method 1: Automatic Connection Status in Default Endpoints (Recommended)

### How It Works

All property endpoints now automatically include connection status fields when a tenant is authenticated:

- `GET /api/properties` - All properties with connection status
- `GET /api/properties/:id` - Single property with connection status  
- `GET /api/properties/featured` - Featured properties with connection status

### Response Structure

Every property now includes these fields:

```json
{
  "_id": "property-id",
  "title": "Beautiful Apartment",
  "price": 15000,
  "landlordId": {
    "firstName": "John",
    "lastName": "Doe"
  },
  // NEW: Connection status fields (always present)
  "connectionStatus": {
    "status": "accepted",
    "canChat": true,
    "message": "I'm interested in this property",
    "responseMessage": "Great! Let's arrange a viewing",
    "respondedAt": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-10T14:20:00Z"
  },
  "isConnected": true,
  "connectionState": "accepted"
}
```

### Connection Status Values

- **`connectionStatus`**: Full connection details object or `null`
- **`isConnected`**: Boolean - `true` if any connection exists
- **`connectionState`**: String - `"none"`, `"pending"`, `"accepted"`, or `"rejected"`

### Frontend Usage (Super Easy!)

```javascript
// Just check the fields directly - no extra API calls needed!
const renderPropertyCard = (property) => {
  return (
    <div className="property-card">
      <h3>{property.title}</h3>
      <p>R{property.price}/month</p>
      
      {/* Simple boolean check */}
      {property.isConnected ? (
        <div className="connection-status">
          {/* Simple string check */}
          {property.connectionState === 'accepted' && (
            <button className="chat-button">Chat with Landlord</button>
          )}
          {property.connectionState === 'pending' && (
            <span className="pending-status">Request Pending</span>
          )}
          {property.connectionState === 'rejected' && (
            <span className="rejected-status">Request Rejected</span>
          )}
        </div>
      ) : (
        <button className="connect-button">Connect with Landlord</button>
      )}
    </div>
  );
};

// Or even simpler with just the state
const getConnectionText = (property) => {
  switch (property.connectionState) {
    case 'accepted': return 'Connected - You can chat!';
    case 'pending': return 'Request sent - Waiting for response';
    case 'rejected': return 'Request was rejected';
    case 'none': 
    default: return 'Not connected - Send a request';
  }
};
```

#### Get All Properties with Connection Status
```http
GET /api/properties/tenant/with-connections
Authorization: Bearer <tenant-token>
```

**Response includes:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "property-id",
      "title": "Beautiful Apartment",
      "price": 15000,
      "landlordId": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "connectionStatus": {
        "status": "accepted",
        "canChat": true,
        "message": "I'm interested in this property",
        "responseMessage": "Great! Let's arrange a viewing",
        "respondedAt": "2024-01-15T10:30:00Z"
      }
    },
    {
      "_id": "another-property-id",
      "title": "Modern House",
      "price": 25000,
      "landlordId": {
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "connectionStatus": null // No connection exists
    }
  ]
}
```

#### Get Single Property with Connection Status
```http
GET /api/properties/:id
Authorization: Bearer <tenant-token>
```

#### Filter Properties by Connection Status
```http
GET /api/properties/tenant/with-connections?connectionStatus=accepted
GET /api/properties/tenant/with-connections?connectionStatus=pending
GET /api/properties/tenant/with-connections?connectionStatus=none
```

## Method 2: Quick Connection Status Check

### Check Connection Status for Specific Property
```http
GET /api/properties/tenant/connection-status/:propertyId
Authorization: Bearer <tenant-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "propertyId": "property-id",
    "connectionStatus": {
      "status": "accepted",
      "canChat": true,
      "message": "I'm interested in this property",
      "responseMessage": "Great! Let's arrange a viewing",
      "respondedAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-10T14:20:00Z"
    },
    "isConnected": true,
    "canChat": true
  }
}
```

## Method 3: Using the ConnectionStatusService

For backend operations, use the `ConnectionStatusService`:

```typescript
import { ConnectionStatusService } from '../services/ConnectionStatusService';

// Check if tenant is connected to a property
const connectionStatus = await ConnectionStatusService.checkTenantPropertyConnection(
  tenantId, 
  propertyId
);

if (connectionStatus) {
  console.log('Connection status:', connectionStatus.status);
  console.log('Can chat:', connectionStatus.canChat);
} else {
  console.log('No connection exists');
}

// Check if tenant can chat with landlord
const canChat = await ConnectionStatusService.canTenantChatWithLandlord(
  tenantId, 
  propertyId
);

// Get all properties where tenant has connections
const connectedProperties = await ConnectionStatusService.getTenantConnectedProperties(
  tenantId,
  'accepted' // optional status filter
);

// Get connection status for multiple properties at once
const propertyIds = ['property1', 'property2', 'property3'];
const bulkStatus = await ConnectionStatusService.getBulkConnectionStatus(
  tenantId, 
  propertyIds
);

// Check if tenant has any connections
const hasConnections = await ConnectionStatusService.hasAnyConnections(tenantId);

// Get connection statistics
const stats = await ConnectionStatusService.getTenantConnectionStats(tenantId);
console.log(stats); // { total: 5, pending: 2, accepted: 2, rejected: 1 }
```

## Connection Status Values

- **`null`** - No connection exists
- **`pending`** - Connection request sent, waiting for landlord response
- **`accepted`** - Landlord accepted the connection request
- **`rejected`** - Landlord rejected the connection request

## Frontend Usage Examples

### React/JavaScript Example
```javascript
// Check connection status when viewing a property
const checkConnectionStatus = async (propertyId) => {
  try {
    const response = await fetch(`/api/properties/tenant/connection-status/${propertyId}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      const { connectionStatus, isConnected, canChat } = data.data;
      
      if (isConnected) {
        switch (connectionStatus.status) {
          case 'accepted':
            return 'Connected - You can chat with the landlord';
          case 'pending':
            return 'Request sent - Waiting for landlord response';
          case 'rejected':
            return 'Request rejected by landlord';
        }
      } else {
        return 'Not connected - Send a connection request';
      }
    }
  } catch (error) {
    console.error('Error checking connection status:', error);
  }
};

// Display different UI based on connection status
const renderPropertyCard = (property) => {
  const { connectionStatus } = property;
  
  return (
    <div className="property-card">
      <h3>{property.title}</h3>
      <p>R{property.price}/month</p>
      
      {connectionStatus ? (
        <div className="connection-status">
          {connectionStatus.status === 'accepted' && (
            <button className="chat-button">Chat with Landlord</button>
          )}
          {connectionStatus.status === 'pending' && (
            <span className="pending-status">Request Pending</span>
          )}
          {connectionStatus.status === 'rejected' && (
            <span className="rejected-status">Request Rejected</span>
          )}
        </div>
      ) : (
        <button className="connect-button">Connect with Landlord</button>
      )}
    </div>
  );
};
```

## Benefits

1. **No External API Calls** - Everything is handled internally
2. **Real-time Status** - Always up-to-date connection information
3. **Efficient Queries** - Uses database indexes for fast lookups
4. **Flexible Filtering** - Filter properties by connection status
5. **Bulk Operations** - Check multiple properties at once
6. **Easy Integration** - Simple API endpoints and service methods

## Performance Considerations

- All queries use database indexes for optimal performance
- Bulk operations reduce the number of database calls
- Connection status is cached in memory during property listing operations
- The system automatically handles invalid IDs and edge cases

This approach provides the **easiest and most efficient** way to check tenant-landlord connections without any external API dependencies.
