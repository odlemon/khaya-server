# 📄 Agreement Template Field Mapping Guide

## Overview

This document maps all 47 fields from the Word template to database fields and shows how they're populated.

---

## Field Mapping Reference

### Agreement Header Fields

| Template Field | Database Source | Type | Required | Default/Notes |
|---------------|----------------|------|----------|---------------|
| `agreement_date` | `agreement.agreementDate` or `agreement.createdAt` | Date | Yes | Current date if not set |
| Format: DD/MM/YYYY | | | | |

---

### Landlord Information Fields

| Template Field | Database Source | Type | Required | Notes |
|---------------|----------------|------|----------|-------|
| `landlord_name` | `landlord.firstName + " " + landlord.lastName` | Text | Yes | Auto-generated |
| `landlord_nric` | `landlord.profile.idNumber` | Text | Yes | National ID number |
| `landlord_phone` | `landlord.phone` | Text | Yes | Contact number |
| `landlord_address` | `landlord.profile.address` or `landlord.profile.location` | Text | No | Formatted address |
| `landlord_bank_account` | `landlord.bankAccount` | Text | Yes | **NEW FIELD** - Add to User model |
| `landlord_bank_name` | `landlord.bankName` | Text | Yes | **NEW FIELD** - Add to User model |
| `landlord_signature` | `agreement.landlordSignature.signatureUrl` | Signature | Yes | URL to signature image |

**New Fields Added to User Model:**
- `bankAccount` (string) - Bank account number for rent payments
- `bankName` (string) - Bank name
- `profile.address` (object) - Full address structure

---

### Tenant Information Fields

| Template Field | Database Source | Type | Required | Notes |
|---------------|----------------|------|----------|-------|
| `tenant_name` | `tenant.firstName + " " + tenant.lastName` | Text | Yes | Auto-generated |
| `tenant_id` | `tenant.profile.idNumber` | Text | Yes | National ID/passport |
| `tenant_phone` | `tenant.phone` | Text | Yes | Contact number |
| `tenant_address` | `tenant.profile.address` or `tenant.profile.location` | Text | No | Formatted address |
| `tenant_email` | `tenant.email` | Email | No | Email address |
| `tenant_signature` | `agreement.tenantSignature.signatureUrl` | Signature | Yes | URL to signature image |

---

### Property Information Fields

| Template Field | Database Source | Type | Required | Notes |
|---------------|----------------|------|----------|-------|
| `property_address` | `property.address` | Text | Yes | Formatted full address |
| `property_description` | `property.description` | Text | Yes | Property description |
| `property_type` | `property.propertyType` | Text | No | apartment/house/room/studio/townhouse |
| `property_postcode` | `property.address.postalCode` | Text | Yes | Postal code |
| `parking_allocation` | `property.parkingAllocation` | Text | No | **NEW FIELD** - e.g., "2 parking bays: B-05-01" |
| `property_access_code` | `property.accessCode` | Text | No | **NEW FIELD** - e.g., "Building code: 1234#" |

**New Fields Added to Property Model:**
- `parkingAllocation` (string) - Parking space allocation details
- `accessCode` (string) - Building/unit access codes

---

### Tenancy Terms Fields

| Template Field | Database Source | Type | Required | Notes |
|---------------|----------------|------|----------|-------|
| `tenancy_term_duration` | Calculated from `startDate` and `endDate` | Text | Yes | Auto-calculated (e.g., "ONE (1) YEAR") |
| `tenancy_start_date` | `agreement.startDate` | Date | Yes | Format: DD/MM/YYYY |
| `tenancy_end_date` | `agreement.endDate` | Date | Yes | Format: DD/MM/YYYY |

---

### Financial Terms Fields

| Template Field | Database Source | Type | Required | Notes |
|---------------|----------------|------|----------|-------|
| `monthly_rental_amount` | `agreement.rentAmount` | Currency | Yes | Formatted to 2 decimals |
| `monthly_rental_text` | `agreement.rentAmount` | Text | Yes | **Auto-converted to words** (e.g., "Malaysian Ringgit One Thousand Seven Hundred Only") |
| `early_payment_rental_amount` | `agreement.earlyPaymentRentalAmount` | Currency | No | **NEW FIELD** - Discounted rent |
| `early_payment_rental_text` | `agreement.earlyPaymentRentalAmount` | Text | No | **Auto-converted to words** |
| `rental_due_date` | `agreement.paymentSchedule.dueDay` | Text | Yes | Auto-generated (e.g., "before the 1st day of each month") |
| `rental_payment_method` | `agreement.paymentSchedule.frequency` | Text | Yes | Default: "Bank deposit with proof of payment" |
| `security_deposit_amount` | `agreement.depositAmount` | Currency | Yes | Formatted to 2 decimals |
| `security_deposit_text` | `agreement.depositAmount` | Text | Yes | **Auto-converted to words** |
| `security_deposit_months` | `agreement.securityDepositMonths` | Number | Yes | **NEW FIELD** - Default: 2 |
| `utility_deposit_amount` | `agreement.utilityDepositAmount` | Currency | Yes | **NEW FIELD** - Default: 0 |
| `utility_deposit_text` | `agreement.utilityDepositAmount` | Text | Yes | **Auto-converted to words** |
| `minor_repairs_limit` | `agreement.minorRepairsLimit` | Currency | Yes | **NEW FIELD** - Default: 20.00 |
| `cleaning_fee` | `agreement.cleaningFee` | Currency | No | **NEW FIELD** |
| `late_payment_interest_rate` | `agreement.latePaymentInterestRate` | Percentage | Yes | **NEW FIELD** - Default: 10 |

**New Fields Added to Agreement Model:**
- `earlyPaymentRentalAmount` (number) - Discounted rental for early payment
- `utilityDepositAmount` (number) - Utility deposit amount
- `securityDepositMonths` (number) - Number of months as security deposit
- `minorRepairsLimit` (number) - Maximum tenant responsible for minor repairs
- `cleaningFee` (number) - Fee if property not returned properly
- `latePaymentInterestRate` (number) - Annual interest rate for late payments

---

### Agreement Terms Fields

| Template Field | Database Source | Type | Required | Notes |
|---------------|----------------|------|----------|-------|
| `property_use_purpose` | `agreement.propertyUsePurpose` | Text | Yes | **NEW FIELD** - Default: "Residential Purpose Only" |
| `renewal_option_period` | `agreement.renewalOptionPeriod` | Text | Yes | **NEW FIELD** - Default: "One year only" |
| `renewal_notice_period` | `agreement.renewalNoticePeriod` | Text | Yes | **NEW FIELD** - Default: "Two (2) months" |
| `landlord_termination_notice` | `agreement.landlordTerminationNotice` | Text | Yes | **NEW FIELD** - Default: "1 month" |
| `special_conditions` | `agreement.specialConditions` | Text | No | Joined array with newlines |

**New Fields Added to Agreement Model:**
- `propertyUsePurpose` (string) - Permitted use of property
- `renewalOptionPeriod` (string) - Option to renew period
- `renewalNoticePeriod` (string) - Notice period for renewal
- `landlordTerminationNotice` (string) - Landlord termination notice period

---

### Inventory Fields

| Template Field | Database Source | Type | Required | Notes |
|---------------|----------------|------|----------|-------|
| `inventory_address` | `agreement.inventoryAddress` or `property.address` | Text | Yes | **NEW FIELD** - Address for inventory |
| `inventory_items` | `agreement.inventoryItems` | Array | Yes | **NEW FIELD** - List of items with quantities |

**New Fields Added to Agreement Model:**
- `inventoryAddress` (string) - Address shown on inventory
- `inventoryItems` (array) - Array of `{item: string, quantity: string}`

**Example:**
```json
{
  "inventoryItems": [
    {"item": "Ceiling fans", "quantity": "5 sets"},
    {"item": "Curtain tracks", "quantity": "1 set in each bedroom"},
    {"item": "Air conditioning", "quantity": "3 sets"}
  ]
}
```

---

### Witness Fields (Optional)

| Template Field | Database Source | Type | Required | Notes |
|---------------|----------------|------|----------|-------|
| `witness_name` | `agreement.witnessName` | Text | No | **NEW FIELD** |
| `witness_signature` | `agreement.witnessSignature` | Signature | No | **NEW FIELD** - URL to signature |
| `witness_id` | `agreement.witnessId` | Text | No | **NEW FIELD** - Witness ID number |

**New Fields Added to Agreement Model:**
- `witnessName` (string) - Witness name
- `witnessSignature` (string) - Witness signature URL
- `witnessId` (string) - Witness ID number

---

## Template Placeholder Format

The template uses **double curly braces** for placeholders:

```
{{landlord_name}}
{{tenant_name}}
{{monthly_rental_amount}}
{{monthly_rental_text}}
```

---

## Number to Words Conversion

The system automatically converts currency amounts to words:

- **Input:** `1700.00`
- **Output:** `"Malaysian Ringgit One Thousand Seven Hundred Only"`

Supports amounts up to billions.

---

## Usage

### 1. Prepare Your Word Template

In your Word document, replace static values with placeholders:

```
This Tenancy Agreement is made on {{agreement_date}} between:

Landlord: {{landlord_name}}
NRIC: {{landlord_nric}}
Phone: {{landlord_phone}}
Address: {{landlord_address}}

Tenant: {{tenant_name}}
ID: {{tenant_id}}
Phone: {{tenant_phone}}
Email: {{tenant_email}}
```

### 2. Generate Agreement Document

**API Endpoint:**
```
POST /api/agreements/:id/generate-word
Authorization: Bearer <admin_token>
```

**Request Body (Optional):**
```json
{
  "templatePath": "/path/to/custom/template.docx",
  "outputPath": "/path/to/save/output.docx"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Agreement document generated successfully",
  "data": {
    "agreementId": "...",
    "filePath": "/uploads/agreements/agreement-xxx.docx",
    "downloadUrl": "/api/agreements/:id/document/download"
  }
}
```

### 3. Download Generated Document

**API Endpoint:**
```
GET /api/agreements/:id/document/download?download=true
Authorization: Bearer <admin_token>
```

Returns the Word document as a file download.

---

## Field Mapping Service

The `AgreementTemplateMappingService` handles all field mapping:

```typescript
import { agreementTemplateMappingService } from '../services/AgreementTemplateMappingService';

const templateData = agreementTemplateMappingService.mapAgreementToTemplate(
  agreement,
  landlord,
  tenant,
  property
);
```

---

## Required Database Updates

### User Model
- ✅ Added `bankAccount` (string)
- ✅ Added `bankName` (string)
- ✅ Added `profile.address` (object)

### Property Model
- ✅ Added `parkingAllocation` (string)
- ✅ Added `accessCode` (string)

### Agreement Model
- ✅ Added `agreementDate` (Date)
- ✅ Added `earlyPaymentRentalAmount` (number)
- ✅ Added `utilityDepositAmount` (number)
- ✅ Added `securityDepositMonths` (number)
- ✅ Added `renewalOptionPeriod` (string)
- ✅ Added `renewalNoticePeriod` (string)
- ✅ Added `propertyUsePurpose` (string)
- ✅ Added `minorRepairsLimit` (number)
- ✅ Added `cleaningFee` (number)
- ✅ Added `latePaymentInterestRate` (number)
- ✅ Added `landlordTerminationNotice` (string)
- ✅ Added `inventoryAddress` (string)
- ✅ Added `inventoryItems` (array)
- ✅ Added `witnessName` (string)
- ✅ Added `witnessSignature` (string)
- ✅ Added `witnessId` (string)

---

## Next Steps

1. **Convert Word Template**: Convert your `.doc` file to `.docx` format
2. **Add Placeholders**: Replace static values with `{{field_name}}` placeholders
3. **Upload Template**: Place template in `resources/` or `uploads/templates/`
4. **Test Generation**: Use the API to generate a test agreement
5. **Update Frontend**: Add fields to agreement creation form

---

## Installation

Install required dependencies:

```bash
npm install docxtemplater pizzip
```

---

## Related Documentation

- `ADMIN_AGREEMENT_CREATION_GUIDE.md` - Agreement creation process
- `AGREEMENTS_WORKFLOW_GUIDE.md` - Complete agreement workflow



