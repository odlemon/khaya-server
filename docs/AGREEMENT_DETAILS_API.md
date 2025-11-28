# 📋 Agreement Details API - Request & Response Guide

## Get Agreement by ID

### Endpoint
```
GET /api/agreements/:id
```

### Authentication
**Required:** Bearer token in Authorization header
```
Authorization: Bearer <jwt_token>
```

### Request Structure

**No Request Body** - This is a GET request, so there's no body.

**URL Parameters:**
- `id` (string, required) - The agreement ID

**Example Request:**
```http
GET /api/agreements/68fca73c124aee2c52c893d4
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Access Control
- ✅ **Landlord** can fetch agreements where they are the landlord
- ✅ **Tenant** can fetch agreements where they are the tenant
- ✅ **Admin** can fetch any agreement
- ❌ Users cannot fetch agreements they're not part of

---

## Response Structure

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "_id": "68fca73c124aee2c52c893d4",
    "propertyId": {
      "_id": "68fca0d8124aee2c52c89154",
      "title": "Modern Apartment",
      "address": {
        "street": "123 Main St",
        "city": "Cape Town",
        "state": "Western Cape",
        "postalCode": "8001",
        "country": "South Africa",
        "coordinates": {
          "lat": -33.9249,
          "lng": 18.4241
        }
      },
      "images": {
        "mainImage": "https://...",
        "gallery": ["https://...", "https://..."]
      }
    },
    "landlordId": {
      "_id": "68fca0d8124aee2c52c89153",
      "firstName": "Craig",
      "lastName": "Hood",
      "email": "veximagames@gmail.com",
      "phone": "+27123456789"
    },
    "tenantId": {
      "_id": "68fca19f124aee2c52c8916d",
      "firstName": "Elisa",
      "lastName": "Desterviell",
      "email": "nkarata@clearcoverhealth.com",
      "phone": "+27987654321"
    },
    "status": "active",
    "type": "tenancy",
    "title": "Apartment Agreement",
    "description": "Standard rental agreement for Modern Apartment",
    "startDate": "2025-11-01T00:00:00.000Z",
    "endDate": "2026-10-31T23:59:59.999Z",
    "rentAmount": 1500,
    "depositAmount": 3000,
    "zeroDeposit": false,
    
    "terms": [
      "Tenant shall pay rent on time",
      "Tenant shall maintain the property in good condition",
      "Tenant shall not sublet without written permission",
      "Landlord shall provide necessary maintenance"
    ],
    "specialConditions": [
      "No pets allowed",
      "No smoking"
    ],
    
    "landlordSignature": {
      "signedAt": "2025-10-25T10:30:00.000Z",
      "signatureData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      "ipAddress": "192.168.1.1"
    },
    "tenantSignature": {
      "signedAt": "2025-10-25T11:00:00.000Z",
      "signatureData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      "ipAddress": "192.168.1.2"
    },
    
    "attachments": [
      {
        "name": "property-photos.pdf",
        "url": "https://storage.googleapis.com/...",
        "type": "application/pdf",
        "uploadedAt": "2025-10-20T09:00:00.000Z"
      }
    ],
    
    "paymentSchedule": {
      "frequency": "monthly",
      "dueDay": 1,
      "lateFee": 50,
      "gracePeriod": 5
    },
    
    "utilitiesIncluded": true,
    "utilitiesList": ["Water", "Electricity"],
    "maintenanceIncluded": false,
    
    "notifications": {
      "rentReminder": true,
      "maintenanceUpdates": true,
      "agreementAlerts": true
    },
    
    "khayalamiProtection": {
      "enabled": false,
      "planType": "basic",
      "monthlyFee": 0,
      "coverage": []
    },
    
    "terminationRequest": null,
    
    "agreementDate": "2025-10-25T10:00:00.000Z",
    "earlyPaymentRentalAmount": 1400,
    "utilityDepositAmount": 500,
    "securityDepositMonths": 2,
    "renewalOptionPeriod": "One year only",
    "renewalNoticePeriod": "Two (2) months",
    "propertyUsePurpose": "Residential Purpose Only",
    "minorRepairsLimit": 20.00,
    "cleaningFee": 100.00,
    "latePaymentInterestRate": 10,
    "landlordTerminationNotice": "1 month",
    "inventoryAddress": "123 Main St, Cape Town, 8001",
    "inventoryItems": [
      {
        "item": "Ceiling fans",
        "quantity": "5 sets"
      },
      {
        "item": "Curtain tracks",
        "quantity": "1 set in each bedroom"
      },
      {
        "item": "Air conditioning",
        "quantity": "3 sets"
      }
    ],
    "witnessName": "Mary Johnson",
    "witnessSignature": "https://storage.googleapis.com/...",
    "witnessId": "654321-98-7654",
    
    "formattedAgreement": "This Tenancy Agreement is made on 25/10/2025 between...",
    
    "createdAt": "2025-10-25T10:00:00.000Z",
    "updatedAt": "2025-10-25T11:00:00.000Z",
    "signedAt": "2025-10-25T11:00:00.000Z",
    "activatedAt": "2025-11-01T00:00:00.000Z",
    "expiredAt": null,
    "terminatedAt": null,
    "terminatedBy": null
  }
}
```

---

## Response Fields Breakdown

### Core Agreement Fields

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Agreement ID |
| `status` | string | `draft`, `pending`, `signed`, `active`, `expired`, `terminated`, `pending_termination` |
| `type` | string | `tenancy`, `maintenance`, `service` |
| `title` | string | Agreement title |
| `description` | string | Agreement description |
| `startDate` | Date | Lease start date (ISO string) |
| `endDate` | Date | Lease end date (ISO string) |
| `rentAmount` | number | Monthly rent amount |
| `depositAmount` | number | Security deposit amount |
| `zeroDeposit` | boolean | Zero deposit option |

### Populated User Fields

**`propertyId`** (populated):
- `_id`, `title`, `address`, `images`

**`landlordId`** (populated):
- `_id`, `firstName`, `lastName`, `email`, `phone`

**`tenantId`** (populated):
- `_id`, `firstName`, `lastName`, `email`, `phone`

### Signature Fields

| Field | Type | Description |
|-------|------|-------------|
| `landlordSignature` | object \| null | Landlord signature data |
| `landlordSignature.signedAt` | Date | When landlord signed |
| `landlordSignature.signatureData` | string | Base64 signature image |
| `landlordSignature.ipAddress` | string | IP address when signed |
| `tenantSignature` | object \| null | Tenant signature data |
| `tenantSignature.signedAt` | Date | When tenant signed |
| `tenantSignature.signatureData` | string | Base64 signature image |
| `tenantSignature.ipAddress` | string | IP address when signed |

### Extended Template Fields

| Field | Type | Description |
|-------|------|-------------|
| `agreementDate` | Date | Agreement execution date |
| `earlyPaymentRentalAmount` | number | Discounted rent for early payment |
| `utilityDepositAmount` | number | Utility deposit amount |
| `securityDepositMonths` | number | Number of months as security deposit |
| `renewalOptionPeriod` | string | Renewal option period |
| `renewalNoticePeriod` | string | Renewal notice period |
| `propertyUsePurpose` | string | Permitted use of property |
| `minorRepairsLimit` | number | Max tenant responsible for repairs |
| `cleaningFee` | number | Cleaning fee if property not returned properly |
| `latePaymentInterestRate` | number | Annual interest rate for late payments |
| `landlordTerminationNotice` | string | Landlord termination notice period |
| `inventoryAddress` | string | Address for inventory list |
| `inventoryItems` | array | List of furniture/fixtures |
| `witnessName` | string | Witness name |
| `witnessSignature` | string | Witness signature URL |
| `witnessId` | string | Witness ID number |

### Other Fields

| Field | Type | Description |
|-------|------|-------------|
| `terms` | string[] | Terms and conditions |
| `specialConditions` | string[] | Special conditions |
| `attachments` | array | Attached documents |
| `paymentSchedule` | object | Payment schedule configuration |
| `utilitiesIncluded` | boolean | Utilities included in rent |
| `utilitiesList` | string[] | List of included utilities |
| `maintenanceIncluded` | boolean | Maintenance included |
| `notifications` | object | Notification preferences |
| `khayalamiProtection` | object | Protection plan configuration |
| `terminationRequest` | object \| null | Termination request details |
| `formattedAgreement` | string | Formatted agreement text (auto-generated) |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last update timestamp |
| `signedAt` | Date | When both parties signed |
| `activatedAt` | Date | When agreement was activated |
| `expiredAt` | Date | When agreement expired |
| `terminatedAt` | Date | When agreement was terminated |
| `terminatedBy` | string \| null | User ID who terminated |

---

## Error Responses

### Agreement Not Found (404)
```json
{
  "success": false,
  "message": "Agreement not found"
}
```

### Access Denied (403)
```json
{
  "success": false,
  "message": "Access denied"
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

---

## Example Usage

### JavaScript/TypeScript (Fetch API)
```javascript
const agreementId = '68fca73c124aee2c52c893d4';
const token = 'your_jwt_token_here';

const response = await fetch(`/api/agreements/${agreementId}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();

if (result.success) {
  const agreement = result.data;
  console.log('Agreement:', agreement.title);
  console.log('Rent:', agreement.rentAmount);
  console.log('Landlord:', agreement.landlordId.email);
  console.log('Tenant:', agreement.tenantId.email);
}
```

### Axios
```javascript
import axios from 'axios';

const agreementId = '68fca73c124aee2c52c893d4';
const token = 'your_jwt_token_here';

const response = await axios.get(`/api/agreements/${agreementId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const agreement = response.data.data;
console.log('Agreement:', agreement);
```

### cURL
```bash
curl -X GET "https://api.example.com/api/agreements/68fca73c124aee2c52c893d4" \
  -H "Authorization: Bearer your_jwt_token_here" \
  -H "Content-Type: application/json"
```

---

## Notes

1. **No Request Body**: This is a GET request, so there's no body to send.

2. **Authentication Required**: You must include a valid JWT token in the Authorization header.

3. **Access Control**: Users can only fetch agreements they're part of (as landlord or tenant).

4. **Populated Fields**: The `propertyId`, `landlordId`, and `tenantId` are automatically populated with user/property details.

5. **Formatted Agreement**: The `formattedAgreement` field contains a formatted text version of the agreement, auto-generated from the agreement data.

6. **Null Values**: Optional fields may be `null` if not set (e.g., `terminationRequest`, `witnessName`, etc.).






