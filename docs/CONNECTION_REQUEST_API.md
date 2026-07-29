# Connection Request API Documentation

## Send Connection Request

**Endpoint:** `POST /api/connections/request`

**Authorization:** Tenant only (Bearer token required)

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `propertyId` | `string` | Yes | The ID of the property the tenant is interested in |
| `landlordId` | `string` | Yes | The ID of the landlord who owns the property |
| `message` | `string` | Yes | Personal message to the landlord (max 500 characters) |
| `proposedViewingDate` | `string (YYYY-MM-DD)` | No | Tenant's proposed viewing date. Today or a future date; past dates are rejected |
| `expectedMoveInDate` | `string (ISO date)` | No | When the tenant expects to move in (e.g. `"2026-04-01"`) |
| `expectedBudget` | `number` | No | Tenant's monthly budget in Rands (e.g. `5000`) |
| `numberOfOccupants` | `number` | No | Total number of people who will be living in the property (minimum 1) |
| `employmentStatus` | `string` | No | Tenant's current employment status. One of: `"employed"`, `"self-employed"`, `"student"`, `"unemployed"`, `"retired"`, `"other"` |
| `leaseDurationMonths` | `number` | No | Preferred lease duration in months (e.g. `12` for 1 year) |
| `hasPets` | `boolean` | No | Whether the tenant has pets (`true` / `false`) |
| `petDetails` | `string` | No | Details about pets if `hasPets` is true (e.g. `"1 small dog"`, max 300 characters) |
| `specialRequirements` | `string` | No | Any special requirements or additional notes (max 500 characters) |

### Example Request

```json
{
  "propertyId": "696f703ab5f77d709e34b77e",
  "landlordId": "694a1b2c3d4e5f6a7b8c9d0e",
  "message": "Hi, I'm interested in renting this property. I'm a working professional looking for a quiet place.",
  "proposedViewingDate": "2026-08-03",
  "expectedMoveInDate": "2026-04-01",
  "expectedBudget": 6500,
  "numberOfOccupants": 2,
  "employmentStatus": "employed",
  "leaseDurationMonths": 12,
  "hasPets": true,
  "petDetails": "1 small cat, indoor only",
  "specialRequirements": "I work from home and need a quiet environment. Fibre internet is a must."
}
```

### Example Response (201 Created)

```json
{
  "success": true,
  "message": "Connection request sent successfully",
  "data": {
    "_id": "697abc123def456ghi789jkl",
    "tenantId": {
      "_id": "694tenant123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "isVerified": true
    },
    "landlordId": {
      "_id": "694a1b2c3d4e5f6a7b8c9d0e",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com"
    },
    "propertyId": {
      "_id": "696f703ab5f77d709e34b77e",
      "title": "Modern 2 Bedroom Apartment",
      "address": "123 Main Street, Cape Town",
      "images": ["..."]
    },
    "status": "pending",
    "message": "Hi, I'm interested in renting this property...",
    "expectedMoveInDate": "2026-04-01T00:00:00.000Z",
    "expectedBudget": 6500,
    "numberOfOccupants": 2,
    "employmentStatus": "employed",
    "leaseDurationMonths": 12,
    "hasPets": true,
    "petDetails": "1 small cat, indoor only",
    "specialRequirements": "I work from home and need a quiet environment. Fibre internet is a must.",
    "isActive": true,
    "createdAt": "2026-03-06T10:30:00.000Z",
    "updatedAt": "2026-03-06T10:30:00.000Z"
  }
}
```

### Minimal Request (only required fields)

```json
{
  "propertyId": "696f703ab5f77d709e34b77e",
  "landlordId": "694a1b2c3d4e5f6a7b8c9d0e",
  "message": "Hi, I'd like to know more about this property."
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 400 | Property ID, landlord ID, and message are required |
| 400 | Property does not belong to this landlord |
| 403 | Only tenants can send connection requests |
| 404 | Property not found |
| 409 | Connection request already exists |

---

## Get Landlord Connection Requests

**Endpoint:** `GET /api/connections/landlord`

**Authorization:** Landlord (Bearer token required)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | `string` | No | Filter by status: `pending`, `accepted`, `rejected` |
| `propertyId` | `string` | No | Filter by property ID |

The response includes all tenant detail fields (`expectedMoveInDate`, `expectedBudget`, `numberOfOccupants`, `employmentStatus`, `leaseDurationMonths`, `hasPets`, `petDetails`, `specialRequirements`) for each connection request, so the landlord can review the tenant's information before accepting or rejecting.

---

## Field Details

### expectedMoveInDate
The date the tenant expects to move in. Helps the landlord understand the urgency and plan accordingly. Send as ISO date string (e.g. `"2026-04-01"`).

### expectedBudget
The tenant's monthly budget in Rands. Helps the landlord understand if the tenant can afford the property before engaging in conversation.

### numberOfOccupants
Total number of people who will live in the property. Important for landlords to know regarding property capacity and house rules.

### employmentStatus
The tenant's employment situation. Valid values:
- `employed` - Full-time or part-time employment
- `self-employed` - Freelancer or business owner
- `student` - Currently studying
- `unemployed` - Not currently employed
- `retired` - Retired
- `other` - Other situation

### leaseDurationMonths
How long the tenant wants to rent (in months). For example, `6` for 6 months, `12` for 1 year, `24` for 2 years.

### hasPets
Whether the tenant has pets. `true` or `false`.

### petDetails
If `hasPets` is `true`, this field provides details about the pets (type, size, number). Max 300 characters.

### specialRequirements
Any additional notes or special requirements the tenant wants the landlord to know about. Max 500 characters.
