# 📋 Agreement Creation - Frontend Integration Guide

## 🎯 Problem Statement

When creating an agreement, the landlord needs to select a tenant from their **accepted connections** for a specific property.

---

## ✅ Solution: Get Connected Tenants Endpoint

### **Endpoint:** `GET /api/connections/landlord`

**Purpose:** Get all connections for the landlord, with optional filters for status and property.

---

## 📡 API Details

### **1. Get All Accepted Connections**

**Endpoint:** `GET /api/connections/landlord?status=accepted`  
**Role:** Landlord  
**Authentication:** Required (Bearer Token)

**Request:**
```
GET http://localhost:3001/api/connections/landlord?status=accepted
Authorization: Bearer {landlord_token}
```

**Success Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "68ee65867ca9e545c108d77c",
      "tenantId": {
        "_id": "68e3bac894186666e663924a",
        "firstName": "Nyasha",
        "lastName": "Karata",
        "email": "nyasha@khaya.com",
        "phone": "0778669677"
      },
      "landlordId": "68a81dfe039be06c6062ea2f",
      "propertyId": {
        "_id": "68dcea00e5de536938a77f4f",
        "title": "Modern 2BR Apartment",
        "address": {
          "street": "123 Main St",
          "city": "Harare",
          "state": "Harare",
          "country": "Zimbabwe"
        }
      },
      "status": "accepted",
      "message": "Hi, I'm interested in this property. Can we schedule a viewing?",
      "isActive": true,
      "createdAt": "2025-10-14T15:00:22.872Z",
      "updatedAt": "2025-10-16T13:08:22.541Z",
      "respondedAt": "2025-10-16T13:08:22.537Z",
      "responseMessage": "Connection accepted"
    },
    {
      "_id": "68ad85ff4850d58b89a55f39",
      "tenantId": {
        "_id": "68ad66b0d1da741d166d090f",
        "firstName": "Kundai",
        "lastName": "K",
        "email": "k@tenant.io"
      },
      "landlordId": "68a81dfe039be06c6062ea2f",
      "propertyId": {
        "_id": "68a86467039be06c6062ea66",
        "title": "Luxury Villa",
        "address": {
          "street": "456 Park Ave",
          "city": "Cape Town",
          "country": "South Africa"
        }
      },
      "status": "accepted",
      "message": "Hi, I'm interested in your property. Can we connect?",
      "isActive": true,
      "createdAt": "2025-08-26T10:01:35.380Z",
      "updatedAt": "2025-08-26T10:09:26.479Z",
      "respondedAt": "2025-08-26T10:09:26.472Z",
      "responseMessage": "Connection accepted"
    }
  ]
}
```

---

### **2. Get Accepted Connections for a Specific Property**

**Endpoint:** `GET /api/connections/landlord?status=accepted&propertyId={propertyId}`  
**Role:** Landlord  
**Authentication:** Required (Bearer Token)

**Use Case:** When creating an agreement for a specific property, show only tenants connected to that property.

**Request:**
```
GET http://localhost:3001/api/connections/landlord?status=accepted&propertyId=68dcea00e5de536938a77f4f
Authorization: Bearer {landlord_token}
```

**Success Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "68ee65867ca9e545c108d77c",
      "tenantId": {
        "_id": "68e3bac894186666e663924a",
        "firstName": "Nyasha",
        "lastName": "Karata",
        "email": "nyasha@khaya.com",
        "phone": "0778669677"
      },
      "landlordId": "68a81dfe039be06c6062ea2f",
      "propertyId": {
        "_id": "68dcea00e5de536938a77f4f",
        "title": "Modern 2BR Apartment",
        "address": {
          "street": "123 Main St",
          "city": "Harare"
        }
      },
      "status": "accepted",
      "createdAt": "2025-10-14T15:00:22.872Z"
    }
  ]
}
```

---

### **3. Get All Connections (Any Status)**

**Endpoint:** `GET /api/connections/landlord`  
**Role:** Landlord  
**Authentication:** Required (Bearer Token)

**Request:**
```
GET http://localhost:3001/api/connections/landlord
Authorization: Bearer {landlord_token}
```

Returns all connections regardless of status (pending, accepted, rejected).

---

## 🎨 Frontend Implementation

### **Step 1: Fetch Connected Tenants When Creating Agreement**

**Scenario A: Creating Agreement from Property Page**

```javascript
// You already have the propertyId
const propertyId = "68dcea00e5de536938a77f4f";

// Fetch connected tenants for this specific property
const response = await fetch(
  `http://localhost:3001/api/connections/landlord?status=accepted&propertyId=${propertyId}`,
  {
    headers: {
      'Authorization': `Bearer ${landlordToken}`,
      'Content-Type': 'application/json'
    }
  }
);

const { success, data: connections } = await response.json();

if (success && connections.length > 0) {
  // Show tenant selection dropdown
  const tenants = connections.map(conn => ({
    id: conn.tenantId._id,
    name: `${conn.tenantId.firstName} ${conn.tenantId.lastName}`,
    email: conn.tenantId.email,
    phone: conn.tenantId.phone
  }));
  
  // Populate dropdown with tenants
  showTenantDropdown(tenants);
} else {
  // Show error message
  showError("No accepted connections for this property. Connect with tenants first.");
}
```

**Scenario B: Creating Agreement from Agreements Page (Select Property First)**

```javascript
// Step 1: User selects a property
const selectedPropertyId = userSelectedProperty.id;

// Step 2: Fetch connected tenants for selected property
const response = await fetch(
  `http://localhost:3001/api/connections/landlord?status=accepted&propertyId=${selectedPropertyId}`,
  {
    headers: {
      'Authorization': `Bearer ${landlordToken}`,
      'Content-Type': 'application/json'
    }
  }
);

const { success, data: connections } = await response.json();

if (success && connections.length > 0) {
  const tenants = connections.map(conn => ({
    id: conn.tenantId._id,
    name: `${conn.tenantId.firstName} ${conn.tenantId.lastName}`,
    email: conn.tenantId.email,
    phone: conn.tenantId.phone
  }));
  
  enableTenantSelection(tenants);
} else {
  disableTenantSelection();
  showError("No accepted connections for this property. Connect with tenants first.");
}
```

---

### **Step 2: Create Agreement with Selected Tenant**

Once the landlord selects a tenant, create the agreement:

```javascript
const agreementData = {
  propertyId: selectedPropertyId,
  tenantId: selectedTenantId, // From the connection
  type: "tenancy",
  title: "1 Year Tenancy Agreement - 123 Main St",
  startDate: "2025-11-01T00:00:00Z",
  endDate: "2026-10-31T00:00:00Z",
  rentAmount: 1500,
  depositAmount: 3000,
  // ... other fields
};

const response = await fetch('http://localhost:3001/api/agreements', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${landlordToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(agreementData)
});

const result = await response.json();
if (result.success) {
  showSuccess("Agreement created successfully!");
  navigateToAgreements();
}
```

---

## 🎯 Query Parameters Reference

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `status` | string | Filter by connection status: `pending`, `accepted`, `rejected` | `?status=accepted` |
| `propertyId` | string | Filter by specific property ID | `?propertyId=68dcea00e5de536938a77f4f` |

**Combine Both:**
```
GET /api/connections/landlord?status=accepted&propertyId=68dcea00e5de536938a77f4f
```

---

## ⚠️ Error Handling

### **Case 1: No Connections Found**

**Response:**
```json
{
  "success": true,
  "data": []
}
```

**Frontend Action:**
- Show message: "No accepted connections for this property. Connect with tenants first."
- Provide button to navigate to Connections page
- Disable tenant selection dropdown

---

### **Case 2: Property Not Found / Deleted**

**Backend Behavior:**
- Still returns connections, but `propertyId` will be `null` in the response
- This is the issue you're seeing in your logs: `🔍 Property data: null`

**Frontend Action:**
- Filter out connections where `propertyId` is `null`
- Show warning: "Some connections have invalid properties"

```javascript
const validConnections = connections.filter(conn => conn.propertyId !== null);
```

---

### **Case 3: Tenant Tries to Create Agreement**

**Response:**
```json
{
  "success": false,
  "message": "Only landlords can create agreements"
}
```

**Frontend Action:**
- This should never happen if role-based UI is implemented
- Hide "Create Agreement" button for tenants

---

## 💡 UI/UX Best Practices

### **1. Property Selection First**
```
┌─────────────────────────────────────┐
│ Create New Agreement                │
├─────────────────────────────────────┤
│                                     │
│ Step 1: Select Property             │
│ ┌─────────────────────────────────┐ │
│ │ [Dropdown] Select Property...   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Step 2: Select Tenant (Disabled)   │
│ ┌─────────────────────────────────┐ │
│ │ [Dropdown] Select property first│ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

### **2. After Property Selected**
```
┌─────────────────────────────────────┐
│ Create New Agreement                │
├─────────────────────────────────────┤
│                                     │
│ Step 1: Select Property ✓           │
│ ┌─────────────────────────────────┐ │
│ │ Modern 2BR Apartment            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Step 2: Select Tenant               │
│ ┌─────────────────────────────────┐ │
│ │ [v] Nyasha Karata               │ │
│ │     John Doe                    │ │
│ │     Jane Smith                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 3 accepted connections found        │
│                                     │
└─────────────────────────────────────┘
```

### **3. No Connections Available**
```
┌─────────────────────────────────────┐
│ Create New Agreement                │
├─────────────────────────────────────┤
│                                     │
│ ⚠️ No accepted connections          │
│                                     │
│ You need to accept connection       │
│ requests from tenants before        │
│ creating an agreement.              │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │   Go to Connections              │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔍 Debugging Tips

### **Check Connections in Postman**

```bash
GET http://localhost:3001/api/connections/landlord?status=accepted
Authorization: Bearer YOUR_LANDLORD_TOKEN
```

**Expected Response:**
- Should return array of connections
- Each connection should have `propertyId` populated with property details
- Each connection should have `tenantId` populated with tenant details

### **Common Issues**

1. **Empty Array Returned:**
   - Landlord has no accepted connections
   - Check if connections exist: `GET /api/connections/landlord` (without filters)

2. **Property is null:**
   - Property was deleted after connection was created
   - Either delete the connection or re-associate with valid property

3. **Tenant Dropdown Shows "No connections":**
   - Verify `status=accepted` query parameter is included
   - Verify `propertyId` query parameter is correct
   - Check if connections are actually "accepted" status (not "pending")

---

## 📝 Complete Example (Vue.js)

```javascript
// composables/useAgreementCreation.js
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

export function useAgreementCreation() {
  const authStore = useAuthStore();
  const selectedProperty = ref(null);
  const connectedTenants = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const fetchConnectedTenants = async (propertyId) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(
        `http://localhost:3001/api/connections/landlord?status=accepted&propertyId=${propertyId}`,
        {
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();

      if (result.success) {
        // Filter out connections with null propertyId
        const validConnections = result.data.filter(conn => conn.propertyId !== null);
        
        connectedTenants.value = validConnections.map(conn => ({
          id: conn.tenantId._id,
          name: `${conn.tenantId.firstName} ${conn.tenantId.lastName}`,
          email: conn.tenantId.email,
          phone: conn.tenantId.phone || 'N/A'
        }));

        if (connectedTenants.value.length === 0) {
          error.value = "No accepted connections for this property. Connect with tenants first.";
        }
      } else {
        error.value = result.message || "Failed to fetch connected tenants";
      }
    } catch (err) {
      error.value = "Network error. Please try again.";
      console.error('Error fetching connected tenants:', err);
    } finally {
      loading.value = false;
    }
  };

  const hasConnections = computed(() => connectedTenants.value.length > 0);

  return {
    selectedProperty,
    connectedTenants,
    loading,
    error,
    hasConnections,
    fetchConnectedTenants
  };
}
```

---

## 🚀 Quick Start Checklist

- [ ] Add endpoint call when property is selected
- [ ] Filter connections by `status=accepted` and `propertyId`
- [ ] Populate tenant dropdown with connected tenants
- [ ] Show error message if no connections found
- [ ] Provide link to Connections page
- [ ] Disable tenant selection until property is selected
- [ ] Filter out connections with null propertyId
- [ ] Add loading state while fetching connections
- [ ] Test with multiple properties
- [ ] Test with no connections

---

**Last Updated:** October 18, 2025  
**Version:** 1.0



