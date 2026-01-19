# Wishlist / Favorites API Documentation

This document describes all endpoints related to the property wishlist/favorites feature.

---

## Table of Contents

1. [Add Property to Wishlist](#1-add-property-to-wishlist)
2. [Remove Property from Wishlist](#2-remove-property-from-wishlist)
3. [Get User's Saved Properties](#3-get-users-saved-properties)
4. [Check if Property is Favorited](#4-check-if-property-is-favorited)
5. [Get Properties with Favorite Status](#5-get-properties-with-favorite-status)
6. [Get Single Property with Favorite Status](#6-get-single-property-with-favorite-status)

---

## 1. Add Property to Wishlist

Add a property to the authenticated tenant's wishlist.

### Endpoint
```
POST /api/favorites
```

### Authorization
- **Required**: Yes
- **Role**: Tenant only

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body
```json
{
  "propertyId": "507f1f77bcf86cd799439011",
  "notes": "Optional notes about this property",
  "priority": "medium",
  "reminderDate": "2025-02-01T00:00:00.000Z"
}
```

### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `propertyId` | String (ObjectId) | ✅ Yes | The ID of the property to add to favorites |
| `notes` | String | ❌ No | Personal notes about the property |
| `priority` | String | ❌ No | Priority level: `"low"`, `"medium"`, or `"high"` (default: `"medium"`) |
| `reminderDate` | String (ISO Date) | ❌ No | Date for reminder notification |

### Response (Success - 201)
```json
{
  "success": true,
  "message": "Property added to favorites",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "userId": "507f1f77bcf86cd799439011",
    "propertyId": "507f1f77bcf86cd799439011",
    "addedAt": "2025-01-15T10:00:00.000Z",
    "notes": "Optional notes",
    "priority": "medium",
    "reminderDate": null,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

### Response (Error - 400)
```json
{
  "success": false,
  "message": "Property ID is required"
}
```

### Response (Error - 400 - Already Favorited)
```json
{
  "success": false,
  "message": "Property is already in your favorites"
}
```

### Response (Error - 400 - Property Not Published)
```json
{
  "success": false,
  "message": "Can only favorite published properties"
}
```

### Response (Error - 403)
```json
{
  "success": false,
  "message": "Only tenants can add properties to favorites"
}
```

---

## 2. Remove Property from Wishlist

Remove a property from the authenticated tenant's wishlist.

### Endpoint
```
DELETE /api/favorites/:propertyId
```

### Authorization
- **Required**: Yes
- **Role**: Tenant only

### Headers
```
Authorization: Bearer <token>
```

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `propertyId` | String (ObjectId) | ✅ Yes | The ID of the property to remove from favorites |

### Request Body
```
None required
```

### Response (Success - 200)
```json
{
  "success": true,
  "message": "Property removed from favorites"
}
```

### Response (Error - 404)
```json
{
  "success": false,
  "message": "Property not found in favorites"
}
```

---

## 3. Get User's Saved Properties

Get all properties saved in the authenticated tenant's wishlist with pagination and filtering options.

### Endpoint
```
GET /api/favorites
```

### Authorization
- **Required**: Yes
- **Role**: Tenant only

### Headers
```
Authorization: Bearer <token>
```

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Number | ❌ No | `1` | Page number for pagination |
| `limit` | Number | ❌ No | `10` | Number of items per page |
| `priority` | String | ❌ No | - | Filter by priority: `"low"`, `"medium"`, or `"high"` |
| `sortBy` | String | ❌ No | `"addedAt"` | Sort field: `"addedAt"`, `"priority"`, or `"reminderDate"` |
| `sortOrder` | String | ❌ No | `"desc"` | Sort order: `"asc"` or `"desc"` |

### Example Request
```
GET /api/favorites?page=1&limit=20&sortBy=addedAt&sortOrder=desc
```

### Response (Success - 200)
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "userId": "507f1f77bcf86cd799439011",
      "propertyId": {
        "_id": "507f1f77bcf86cd799439011",
        "title": "Luxury Apartment",
        "address": {
          "street": "123 Main St",
          "city": "Lusaka",
          "country": "Zambia"
        },
        "price": 5000,
        "propertyType": "apartment",
        "bedrooms": 2,
        "bathrooms": 1,
        "images": {
          "mainImage": "https://...",
          "gallery": ["https://..."]
        },
        "status": "published",
        "isVerified": true,
        ...
      },
      "addedAt": "2025-01-15T10:00:00.000Z",
      "notes": "Great location near shopping mall",
      "priority": "high",
      "reminderDate": "2025-02-01T00:00:00.000Z",
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2
  }
}
```

---

## 4. Check if Property is Favorited

Check if a specific property is in the authenticated tenant's wishlist.

### Endpoint
```
GET /api/favorites/check/:propertyId
```

### Authorization
- **Required**: Yes
- **Role**: Tenant only

### Headers
```
Authorization: Bearer <token>
```

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `propertyId` | String (ObjectId) | ✅ Yes | The ID of the property to check |

### Response (Success - 200)
```json
{
  "success": true,
  "data": {
    "isFavorited": true
  }
}
```

---

## 5. Get Properties with Favorite Status

Get a list of properties with an `isFavorited` indicator showing if each property is in the authenticated tenant's wishlist.

### Endpoint
```
GET /api/properties
```

### Authorization
- **Required**: Yes (for favorite status)
- **Role**: Any authenticated user (favorite status only shown for tenants)

### Headers
```
Authorization: Bearer <token>
```

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Number | ❌ No | `1` | Page number |
| `limit` | Number | ❌ No | `10` | Items per page |
| `search` | String | ❌ No | - | Search by title, description, or address |
| `minPrice` | Number | ❌ No | - | Minimum price filter |
| `maxPrice` | Number | ❌ No | - | Maximum price filter |
| `bedrooms` | Number | ❌ No | - | Number of bedrooms |
| `propertyType` | String | ❌ No | - | Property type filter |
| `city` | String | ❌ No | - | City filter |
| `status` | String | ❌ No | `"published"` | Property status |

### Response (Success - 200)
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Luxury Apartment",
      "price": 5000,
      "address": {
        "street": "123 Main St",
        "city": "Lusaka",
        "country": "Zambia"
      },
      "images": {
        "mainImage": "https://...",
        "gallery": ["https://..."]
      },
      "isFavorited": true,  // ✅ Shows if property is in user's wishlist
      "isConnected": false,
      "connectionState": "none",
      "isFeatured": false,
      "zeroDepositAvailable": false,
      "verificationStatus": "verified",
      ...
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "title": "Modern House",
      "price": 8000,
      ...
      "isFavorited": false,  // ✅ Not in wishlist
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Notes
- **For authenticated tenants**: `isFavorited` will be `true` if the property is in their wishlist, `false` otherwise
- **For non-authenticated users or non-tenants**: `isFavorited` will always be `false`

---

## 6. Get Single Property with Favorite Status

Get a single property by ID with an `isFavorited` indicator.

### Endpoint
```
GET /api/properties/:id
```

### Authorization
- **Required**: Yes (for favorite status)
- **Role**: Any authenticated user (favorite status only shown for tenants)

### Headers
```
Authorization: Bearer <token>
```

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String (ObjectId) | ✅ Yes | The ID of the property |

### Response (Success - 200)
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Luxury Apartment",
    "description": "Beautiful apartment in the heart of the city...",
    "price": 5000,
    "deposit": 5000,
    "address": {
      "street": "123 Main St",
      "city": "Lusaka",
      "country": "Zambia"
    },
    "images": {
      "mainImage": "https://...",
      "gallery": ["https://..."]
    },
    "propertyType": "apartment",
    "bedrooms": 2,
    "bathrooms": 1,
    "isFavorited": true,  // ✅ Shows if property is in user's wishlist
    "isConnected": false,
    "connectionState": "none",
    "verificationStatus": "verified",
    "landlordId": {
      "_id": "...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    ...
  }
}
```

### Response (Error - 404)
```json
{
  "success": false,
  "message": "Property not found"
}
```

### Notes
- **For authenticated tenants**: `isFavorited` will be `true` if the property is in their wishlist, `false` otherwise
- **For non-authenticated users or non-tenants**: `isFavorited` will always be `false`

---

## Additional Endpoints

### Get Property Favorite Count (Public)

Get the total number of users who have favorited a property. This endpoint does not require authentication.

#### Endpoint
```
GET /api/favorites/count/:propertyId
```

#### Response (Success - 200)
```json
{
  "success": true,
  "data": {
    "count": 42
  }
}
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| `200` | Success |
| `201` | Created (property added to favorites) |
| `400` | Bad Request (missing/invalid parameters) |
| `401` | Unauthorized (missing or invalid token) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not Found (property or favorite not found) |
| `500` | Internal Server Error |

---

## Usage Examples

### Example 1: Add Property to Wishlist
```javascript
const response = await fetch('http://127.0.0.1:3001/api/favorites', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    propertyId: '507f1f77bcf86cd799439011',
    notes: 'Great location, near shopping mall',
    priority: 'high'
  })
});

const data = await response.json();
console.log(data); // { success: true, message: "Property added to favorites", ... }
```

### Example 2: Remove Property from Wishlist
```javascript
const response = await fetch('http://127.0.0.1:3001/api/favorites/507f1f77bcf86cd799439011', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer <token>'
  }
});

const data = await response.json();
console.log(data); // { success: true, message: "Property removed from favorites" }
```

### Example 3: Get Saved Properties
```javascript
const response = await fetch('http://127.0.0.1:3001/api/favorites?page=1&limit=20', {
  headers: {
    'Authorization': 'Bearer <token>'
  }
});

const data = await response.json();
console.log(data.data); // Array of favorited properties
```

### Example 4: Check if Property is Favorited
```javascript
const response = await fetch('http://127.0.0.1:3001/api/favorites/check/507f1f77bcf86cd799439011', {
  headers: {
    'Authorization': 'Bearer <token>'
  }
});

const data = await response.json();
console.log(data.data.isFavorited); // true or false
```

### Example 5: Get Properties with Favorite Status
```javascript
const response = await fetch('http://127.0.0.1:3001/api/properties?page=1&limit=20', {
  headers: {
    'Authorization': 'Bearer <token>'
  }
});

const data = await response.json();
data.data.forEach(property => {
  console.log(`${property.title}: ${property.isFavorited ? '❤️ Favorited' : '🤍 Not favorited'}`);
});
```

---

## Notes

1. **Tenant Only**: Only users with the `tenant` role can add/remove favorites. Other roles will receive a 403 Forbidden error.

2. **Published Properties Only**: Only published properties can be added to favorites. Attempting to favorite an unpublished property will result in an error.

3. **Unique Constraint**: A user can only favorite a property once. Attempting to favorite the same property twice will result in an error.

4. **Performance**: The `isFavorited` field in property listings is efficiently queried using a single database query for all properties on the current page.

5. **Authentication**: While the properties endpoints (`GET /api/properties`) can be accessed without authentication, the `isFavorited` field will only be accurate for authenticated tenants. For non-authenticated users, it will always be `false`.

---

## Database Schema

### Favorite Model
```typescript
{
  userId: ObjectId (ref: User),
  propertyId: ObjectId (ref: Property),
  addedAt: Date,
  notes?: string,
  priority: "low" | "medium" | "high",
  reminderDate?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- Unique index on `{ userId: 1, propertyId: 1 }` - ensures one favorite per user per property
- Index on `{ userId: 1, addedAt: -1 }` - for efficient querying of user's favorites
- Index on `{ userId: 1, priority: 1 }` - for priority-based filtering

---

## Support

For issues or questions, please contact the development team.
