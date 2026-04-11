# Insurance partner dashboard (backend)

APIs for the **insurance provider portal**. Authenticate as a user with role `insurance_admin` (e.g. `admin@insurance.com`). Uses the same login as other staff: `POST /api/auth/login`.

## Business rules (enforced in responses)

| Rule | Implementation |
|------|----------------|
| **Cover start** | When the **tenancy agreement is fully signed** (`Agreement.signedAt` set; both parties executed per existing `AgreementService` flow). |
| **Policy scope** | **One dashboard row per property** with `insurance.enabled === true`. |
| **Policyholder** | **Landlord** (identified on each response). |
| **Lapse / arrears** | Not modeled in this version (no automatic lapse flags). |

For underlying landlord listing behaviour and premium math, see [INSURANCE_FEATURE.md](./INSURANCE_FEATURE.md).

---

## Authentication

All routes:

- **Header:** `Authorization: Bearer <JWT>`
- **Required role:** `insurance_admin` only (Khayalami `admin` does **not** have access to these URLs unless you extend `authorize()` in code).

---

## Endpoints

Base path: **`/api/insurance-admin`**

### 1. Summary counts

**`GET /api/insurance-admin/summary`**

Aggregates all properties with rental insurance enabled and classifies each by phase (see **Phases** below).

**Response `data`:**

```json
{
  "totalPropertiesWithInsurance": 42,
  "inForce": 30,
  "awaitingSignature": 8,
  "ended": 4,
  "rules": {
    "coverStartsAt": "fully_signed_agreement",
    "policyScope": "one_row_per_property",
    "policyholder": "landlord"
  }
}
```

---

### 2. List policies (paginated)

**`GET /api/insurance-admin/policies`**

**Query parameters:**

| Param | Default | Description |
|--------|---------|-------------|
| `page` | `1` | Page number (1-based). |
| `limit` | `20` | Page size (max `100`). |
| `status` | `all` | Filter: `all` \| `in_force` \| `awaiting_signature` \| `ended`. |

**Response `data`:**

```json
{
  "policies": [
    {
      "propertyId": "...",
      "propertyTitle": "2-bed apartment",
      "propertyStatus": "rented",
      "address": {
        "street": "...",
        "city": "...",
        "area": null,
        "state": null,
        "country": "South Africa"
      },
      "propertyType": "apartment",
      "furnishingLevel": "fully_furnished",
      "phase": "in_force",
      "coverStartDate": "2025-03-01T12:00:00.000Z",
      "insurance": {
        "enabled": true,
        "coverageType": "standard",
        "pricingModel": "included_in_rent",
        "monthlyPremium": 18,
        "riskCategory": "medium",
        "propertyValue": 80000
      },
      "policyholder": {
        "type": "landlord",
        "description": "The landlord is the policyholder under Khayalami’s rental insurance program.",
        "userId": "...",
        "firstName": "...",
        "lastName": "...",
        "email": "...",
        "phone": null,
        "isVerified": true,
        "documentVerificationStatus": "verified"
      },
      "agreement": {
        "agreementId": "...",
        "status": "active",
        "startDate": "...",
        "endDate": "...",
        "rentAmount": 500,
        "depositAmount": 500,
        "signedAt": "...",
        "tenant": {
          "userId": "...",
          "firstName": "...",
          "lastName": "...",
          "email": "...",
          "phone": null
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

If there is no tenancy agreement yet, `agreement` is `null` and `phase` is usually `awaiting_signature`.

---

### 3. Policy detail (single property)

**`GET /api/insurance-admin/policies/property/:propertyId`**

- **`404`** if the property does not exist or **`insurance.enabled` is false**.
- **`400`** if `propertyId` is not a valid ObjectId.

**Response `data`:** Full property context, insurance block, policyholder (landlord), **primary** tenancy agreement (same selection rules as the list), and **`agreementHistory`** (all tenancy agreements on that property, newest first by `updatedAt`).

Notable fields:

- **`phase`** — same enum as list.
- **`coverStartDate`** — ISO string when `phase === "in_force"` and a cover start can be derived from `signedAt` / signatures; otherwise `null`.
- **`coverRules`** — human-readable reminders for the partner UI.
- **`primaryAgreement.landlordSignedAt` / `tenantSignedAt`** — from embedded signature objects when present.

---

## Phases (`phase`)

| Value | Meaning |
|--------|---------|
| `in_force` | There is a **signed / active / pending_termination** tenancy agreement whose lease end is not in the past (and not `expired` / `terminated`). Cover start uses agreement signing time when available. |
| `awaiting_signature` | Insurance is on the listing but there is **no** suitable executed agreement yet (e.g. draft, pending, or no agreement). |
| `ended` | Latest relevant agreement is **expired** or **terminated**, or lease **`endDate`** is in the past. |

**Primary agreement selection** (per property): prefer current lifecycle agreement (`active` / `signed` / `pending_termination`, newest `startDate`); else newest `draft` / `pending`; else most recently ended `expired` / `terminated` by `endDate`.

---

## Frontend user stories

1. **As an insurance admin, I want to log in with my partner credentials** so I only see insurance APIs (role `insurance_admin` from login / `/api/auth/me`).

2. **As an insurance admin, I want a dashboard home with headline counts** so I can see how many properties have cover in force vs awaiting signature vs ended — implement using **`GET /summary`**.

3. **As an insurance admin, I want a searchable/filterable table of policies** with columns such as property title, city, landlord (policyholder), coverage tier, monthly premium, phase, and cover start date — implement using **`GET /policies`** with `status` filters and client-side search on the current page (or load all pages if dataset is small).

4. **As an insurance admin, I want to open a property detail view** with landlord KYC hints (verified, document status), tenant summary, lease dates, rent/deposit, and insurance configuration — implement using **`GET /policies/property/:propertyId`**.

5. **As an insurance admin, I want to see explicit policyholder wording** so compliance is clear — surface `policyholder.type` and `policyholder.description` from the API on list and detail screens.

6. **As an insurance admin, I want to understand when cover started** — show **`coverStartDate`** when `phase === "in_force"`; show a clear “Awaiting fully signed agreement” state when `phase === "awaiting_signature"` or `coverStartDate` is null.

7. **As an insurance admin, I want agreement history for a property** — show **`agreementHistory`** on the detail page (optional collapse/expand).

8. **(Later)** As an insurance admin, I want exports and remittance reconciliation — not in this API version; will need payment / escrow reporting endpoints separately.

---

## Example requests

```http
GET /api/insurance-admin/summary
Authorization: Bearer <token>
```

```http
GET /api/insurance-admin/policies?page=1&limit=20&status=in_force
Authorization: Bearer <token>
```

```http
GET /api/insurance-admin/policies/property/674a1b2c3d4e5f6789012345
Authorization: Bearer <token>
```

---

## Files (reference)

| Area | Path |
|------|------|
| Service | `src/services/InsuranceAdminService.ts` |
| Controller | `src/controllers/InsuranceAdminController.ts` |
| Routes | `src/routes/insuranceAdminRoutes.ts` |
| App mount | `src/app.ts` → `/api/insurance-admin` |
