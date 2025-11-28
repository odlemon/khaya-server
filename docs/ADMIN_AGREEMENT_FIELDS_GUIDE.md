# 📋 Admin Agreement Creation - Fields Guide

## Overview

This guide shows **exactly which fields** an admin needs to provide when creating an agreement, and which fields are **automatically populated** from user accounts and properties.

---

## Field Categories

### 🔵 Auto-Populated Fields (No Manual Input Required)

These fields are **automatically filled** from existing user and property data. Admin does NOT need to provide them.

#### Landlord Information (Auto from User Account)
- ✅ `landlord_name` → `landlord.firstName + " " + landlord.lastName`
- ✅ `landlord_nric` → `landlord.profile.idNumber`
- ✅ `landlord_phone` → `landlord.phone`
- ✅ `landlord_address` → `landlord.profile.address` or `landlord.profile.location`
- ✅ `landlord_bank_account` → `landlord.bankAccount` (if set in profile)
- ✅ `landlord_bank_name` → `landlord.bankName` (if set in profile)

#### Tenant Information (Auto from User Account)
- ✅ `tenant_name` → `tenant.firstName + " " + tenant.lastName`
- ✅ `tenant_id` → `tenant.profile.idNumber`
- ✅ `tenant_phone` → `tenant.phone`
- ✅ `tenant_address` → `tenant.profile.address` or `tenant.profile.location`
- ✅ `tenant_email` → `tenant.email`

#### Property Information (Auto from Property)
- ✅ `property_address` → `property.address` (formatted)
- ✅ `property_description` → `property.description`
- ✅ `property_type` → `property.propertyType` (apartment/house/room/studio/townhouse)
- ✅ `property_postcode` → `property.address.postalCode`
- ✅ `parking_allocation` → `property.parkingAllocation` (if set)
- ✅ `property_access_code` → `property.accessCode` (if set)

#### Calculated Fields (Auto-Generated)
- ✅ `tenancy_term_duration` → Calculated from `startDate` and `endDate` (e.g., "ONE (1) YEAR")
- ✅ `monthly_rental_text` → Auto-converted from `rentAmount` to words
- ✅ `security_deposit_text` → Auto-converted from `depositAmount` to words
- ✅ `utility_deposit_text` → Auto-converted from `utilityDepositAmount` to words
- ✅ `early_payment_rental_text` → Auto-converted from `earlyPaymentRentalAmount` to words
- ✅ `rental_due_date` → Auto-generated from `paymentSchedule.dueDay`
- ✅ `rental_payment_method` → Auto-generated from payment schedule
- ✅ `agreement_date` → Uses `agreementDate` or `createdAt`

---

## Required Manual Input Fields

Admin **MUST** provide these fields when creating an agreement:

### Selection Fields (Required)
| Field | Type | Description |
|-------|------|-------------|
| `landlordId` | string | Landlord user ID (select from connected landlords) |
| `tenantId` | string | Tenant user ID (select from connected tenants) |
| `propertyId` | string | Property ID (select from landlord's properties) |

### Basic Agreement Fields (Required)
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `title` | string | Agreement title | "Rental Agreement - 123 Main St" |
| `startDate` | Date | Tenancy start date | "2026-01-01" |
| `endDate` | Date | Tenancy end date | "2026-12-31" |
| `rentAmount` | number | Monthly rent amount | 1500.00 |
| `depositAmount` | number | Security deposit amount | 3000.00 |

### Financial Fields (Required with Defaults)
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `utilityDepositAmount` | number | No | 0 | Utility deposit amount |
| `securityDepositMonths` | number | No | 2 | Number of months as security deposit |
| `minorRepairsLimit` | number | No | 20.00 | Max tenant responsible for minor repairs per month |

---

## Optional Manual Input Fields

Admin **CAN** provide these fields for customization:

### Financial Fields (Optional)
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `earlyPaymentRentalAmount` | number | Discounted rent if paid early | 1400.00 |
| `cleaningFee` | number | Fee if property not returned properly | 100.00 |
| `latePaymentInterestRate` | number | Annual interest rate for late payments | 10 |

### Agreement Terms (Optional with Defaults)
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `renewalOptionPeriod` | string | "One year only" | Option to renew period |
| `renewalNoticePeriod` | string | "Two (2) months" | Notice period for renewal |
| `propertyUsePurpose` | string | "Residential Purpose Only" | Permitted use of property |
| `landlordTerminationNotice` | string | "1 month" | Landlord termination notice period |

### Inventory Fields (Optional)
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `inventoryAddress` | string | Address for inventory list | Defaults to property address |
| `inventoryItems` | array | List of furniture/fixtures | `[{"item": "Ceiling fans", "quantity": "5 sets"}]` |

### Witness Fields (Optional)
| Field | Type | Description |
|-------|------|-------------|
| `witnessName` | string | Witness name |
| `witnessId` | string | Witness ID number |

### Existing Optional Fields
| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Agreement description |
| `zeroDeposit` | boolean | Zero deposit option |
| `terms` | string[] | Custom terms and conditions |
| `specialConditions` | string[] | Special conditions |
| `paymentSchedule` | object | Payment schedule configuration |
| `utilitiesIncluded` | boolean | Utilities included in rent |
| `utilitiesList` | string[] | List of included utilities |
| `maintenanceIncluded` | boolean | Maintenance included |
| `khayalamiProtection` | object | Protection plan configuration |
| `agreementDate` | Date | Agreement execution date (defaults to createdAt) |

---

## Complete Request Example

### Minimal Required Request
```json
{
  "landlordId": "507f1f77bcf86cd799439011",
  "tenantId": "507f1f77bcf86cd799439012",
  "propertyId": "507f1f77bcf86cd799439013",
  "title": "Rental Agreement - 123 Main St",
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": "2026-12-31T23:59:59.999Z",
  "rentAmount": 1500,
  "depositAmount": 3000
}
```

### Full Request with All Optional Fields
```json
{
  "landlordId": "507f1f77bcf86cd799439011",
  "tenantId": "507f1f77bcf86cd799439012",
  "propertyId": "507f1f77bcf86cd799439013",
  "title": "Rental Agreement - 123 Main St",
  "description": "Standard residential rental agreement",
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": "2026-12-31T23:59:59.999Z",
  "rentAmount": 1500,
  "depositAmount": 3000,
  "zeroDeposit": false,
  
  "earlyPaymentRentalAmount": 1400,
  "utilityDepositAmount": 500,
  "securityDepositMonths": 2,
  "minorRepairsLimit": 20.00,
  "cleaningFee": 100.00,
  "latePaymentInterestRate": 10,
  
  "renewalOptionPeriod": "One year only",
  "renewalNoticePeriod": "Two (2) months",
  "propertyUsePurpose": "Residential Purpose Only",
  "landlordTerminationNotice": "1 month",
  
  "inventoryAddress": "123 Main St, Kuala Lumpur, 50000",
  "inventoryItems": [
    {"item": "Ceiling fans", "quantity": "5 sets"},
    {"item": "Curtain tracks", "quantity": "1 set in each bedroom"},
    {"item": "Air conditioning", "quantity": "3 sets"}
  ],
  
  "witnessName": "Mary Johnson",
  "witnessId": "654321-98-7654",
  
  "terms": [
    "Tenant shall pay rent on time",
    "Tenant shall maintain the property in good condition"
  ],
  "specialConditions": [
    "No pets allowed",
    "No smoking"
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
  
  "agreementDate": "2025-01-15T10:30:00.000Z"
}
```

---

## Field Summary

### Total Fields: 47

- **Auto-Populated**: 23 fields (from User/Property accounts)
- **Required Manual Input**: 5 fields (landlordId, tenantId, propertyId, title, startDate, endDate, rentAmount)
- **Optional Manual Input**: 19 fields (with sensible defaults)

---

## What Admin Needs to Do

1. **Select Parties** (Required):
   - Choose landlord from connected landlords
   - Choose tenant from connected tenants (for that landlord)
   - Choose property (owned by selected landlord)

2. **Enter Basic Info** (Required):
   - Agreement title
   - Start date
   - End date
   - Rent amount
   - Deposit amount

3. **Customize Terms** (Optional):
   - Add early payment discount
   - Set utility deposit
   - Add inventory items
   - Set renewal options
   - Add special conditions
   - Add witness info

4. **Submit**: All other fields are auto-populated from user accounts and properties.

---

## Auto-Population Logic

The system automatically:
- ✅ Fetches landlord info from User account (name, ID, phone, address, bank details)
- ✅ Fetches tenant info from User account (name, ID, phone, address, email)
- ✅ Fetches property info from Property (address, description, type, postcode, parking, access)
- ✅ Calculates tenancy duration in words
- ✅ Converts currency amounts to words
- ✅ Generates payment due date text
- ✅ Sets agreement date to current date (or provided date)

---

## Complete Auto-Populated Fields Reference

### From Landlord User Account (`landlordId`)

| Template Field | Source | Database Path |
|---------------|--------|---------------|
| `landlord_name` | Auto | `landlord.firstName + " " + landlord.lastName` |
| `landlord_nric` | Auto | `landlord.profile.idNumber` |
| `landlord_phone` | Auto | `landlord.phone` |
| `landlord_address` | Auto | `landlord.profile.address` or `landlord.profile.location` |
| `landlord_bank_account` | Auto | `landlord.bankAccount` |
| `landlord_bank_name` | Auto | `landlord.bankName` |

**Note:** If `bankAccount` or `bankName` are not set in landlord profile, they will be empty strings. Admin should ensure landlords have these fields filled in their profiles.

### From Tenant User Account (`tenantId`)

| Template Field | Source | Database Path |
|---------------|--------|---------------|
| `tenant_name` | Auto | `tenant.firstName + " " + tenant.lastName` |
| `tenant_id` | Auto | `tenant.profile.idNumber` |
| `tenant_phone` | Auto | `tenant.phone` |
| `tenant_address` | Auto | `tenant.profile.address` or `tenant.profile.location` |
| `tenant_email` | Auto | `tenant.email` |

**Note:** If `idNumber` is not set in tenant profile, it will be empty. Admin should ensure tenants have ID numbers in their profiles.

### From Property (`propertyId`)

| Template Field | Source | Database Path |
|---------------|--------|---------------|
| `property_address` | Auto | `property.address` (formatted) |
| `property_description` | Auto | `property.description` |
| `property_type` | Auto | `property.propertyType` |
| `property_postcode` | Auto | `property.address.postalCode` |
| `parking_allocation` | Auto | `property.parkingAllocation` (if set) |
| `property_access_code` | Auto | `property.accessCode` (if set) |

**Note:** `parkingAllocation` and `accessCode` are optional property fields. If not set, they will be empty.

### Calculated/Auto-Generated Fields

| Template Field | Source | How It's Generated |
|---------------|--------|-------------------|
| `tenancy_term_duration` | Auto | Calculated from `startDate` and `endDate` → "ONE (1) YEAR" |
| `monthly_rental_text` | Auto | `rentAmount` converted to words → "Malaysian Ringgit One Thousand Five Hundred Only" |
| `security_deposit_text` | Auto | `depositAmount` converted to words |
| `utility_deposit_text` | Auto | `utilityDepositAmount` converted to words |
| `early_payment_rental_text` | Auto | `earlyPaymentRentalAmount` converted to words (if provided) |
| `rental_due_date` | Auto | Generated from `paymentSchedule.dueDay` → "before the 1st day of each month" |
| `rental_payment_method` | Auto | Generated from `paymentSchedule.frequency` → "Bank deposit with proof of payment" |
| `agreement_date` | Auto | Uses `agreementDate` if provided, otherwise `createdAt` |

### Signature Fields (Populated After Signing)

| Template Field | Source | When Populated |
|---------------|--------|----------------|
| `landlord_signature` | Auto | After landlord signs → `agreement.landlordSignature.signatureUrl` |
| `tenant_signature` | Auto | After tenant signs → `agreement.tenantSignature.signatureUrl` |
| `witness_signature` | Manual | If witness signs → `agreement.witnessSignature` |

---

## Field Requirements Summary

### Minimum Required for Agreement Creation

Admin only needs to provide **5 core fields**:
1. `landlordId` - Select from dropdown
2. `tenantId` - Select from dropdown  
3. `propertyId` - Select from dropdown
4. `title` - Text input
5. `startDate` - Date picker
6. `endDate` - Date picker
7. `rentAmount` - Number input
8. `depositAmount` - Number input

**Everything else is either:**
- Auto-populated from user accounts (23 fields)
- Optional with defaults (19 fields)

---

## Related Documentation

- `ADMIN_AGREEMENT_CREATION_GUIDE.md` - Complete creation process
- `AGREEMENT_TEMPLATE_FIELD_MAPPING.md` - Template field mapping reference

