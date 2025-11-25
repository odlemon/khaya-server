# 📋 Admin Agreement Creation Guide

## Overview

Agreements are now created by **admins only** (not landlords). The flow is:
1. **Admin creates agreement** → Both landlord and tenant receive email notifications
2. **Landlord signs** → Agreement status remains "pending"
3. **Tenant pays agreement fee** → Required before tenant can sign
4. **Tenant signs** → Agreement becomes "signed" and rental is auto-created

**📋 Field Guide:** See `ADMIN_AGREEMENT_FIELDS_GUIDE.md` for complete field reference showing:
- Which fields are **auto-populated** from user accounts (no manual input)
- Which fields are **required** manual input
- Which fields are **optional** with defaults

---

## API Endpoints

### Get Connected Landlords and Tenants (Admin Only)

**Endpoint:**
```
GET /api/agreements/connected-parties
Authorization: Bearer <admin_token>
```

**Description:**
Returns all accepted connections between landlords and tenants in a structured format for frontend selection dropdowns.

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Connected parties retrieved successfully",
  "data": {
    "landlords": [
      {
        "id": "507f1f77bcf86cd799439011",
        "firstName": "John",
        "lastName": "Doe",
        "fullName": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "properties": [
          {
            "id": "507f1f77bcf86cd799439013",
            "title": "Modern 2BR Apartment",
            "address": {
              "street": "123 Main St",
              "city": "Harare",
              "state": "Harare",
              "country": "Zimbabwe"
            },
            "tenants": [
              {
                "id": "507f1f77bcf86cd799439012",
                "firstName": "Jane",
                "lastName": "Smith",
                "fullName": "Jane Smith",
                "email": "jane@example.com",
                "phone": "+1234567891"
              }
            ]
          }
        ]
      }
    ],
    "tenants": [
      {
        "id": "507f1f77bcf86cd799439012",
        "firstName": "Jane",
        "lastName": "Smith",
        "fullName": "Jane Smith",
        "email": "jane@example.com",
        "phone": "+1234567891"
      }
    ],
    "connections": [
      {
        "connectionId": "507f1f77bcf86cd799439020",
        "landlordId": "507f1f77bcf86cd799439011",
        "landlordName": "John Doe",
        "tenantId": "507f1f77bcf86cd799439012",
        "tenantName": "Jane Smith",
        "propertyId": "507f1f77bcf86cd799439013",
        "propertyTitle": "Modern 2BR Apartment",
        "connectedAt": "2025-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

**Response Structure:**
- `landlords`: Array of landlords with their properties and connected tenants
- `tenants`: Flat array of all unique tenants (for quick lookup)
- `connections`: Flat array of all connections (for validation)

**Frontend Usage:**
```javascript
// Example: Populate landlord dropdown
landlords.forEach(landlord => {
  // landlord.fullName, landlord.id, landlord.properties
});

// Example: When landlord selected, show their properties
selectedLandlord.properties.forEach(property => {
  // property.title, property.id, property.tenants
});

// Example: When property selected, show connected tenants
selectedProperty.tenants.forEach(tenant => {
  // tenant.fullName, tenant.id
});
```

---

### Create Agreement (Admin Only)

**Endpoint:**
```
POST /api/agreements
Authorization: Bearer <admin_token>
```

**⚠️ IMPORTANT:** See `ADMIN_AGREEMENT_FIELDS_GUIDE.md` for complete field reference showing which fields are auto-populated vs required manual input.

**Required Fields (Manual Input):**
- `landlordId` (string, required) - Select from connected landlords
- `tenantId` (string, required) - Select from connected tenants
- `propertyId` (string, required) - Select from landlord's properties
- `title` (string, required) - Agreement title
- `startDate` (Date, required) - Lease start date
- `endDate` (Date, required) - Lease end date
- `rentAmount` (number, required) - Monthly rent amount
- `depositAmount` (number, required) - Security deposit amount

**Optional Fields (Manual Input):**
- `description` (string) - Agreement description
- `zeroDeposit` (boolean, default: false) - Zero deposit option
- `earlyPaymentRentalAmount` (number) - Discounted rent for early payment
- `utilityDepositAmount` (number, default: 0) - Utility deposit
- `securityDepositMonths` (number, default: 2) - Number of months as deposit
- `minorRepairsLimit` (number, default: 20.00) - Max tenant responsible for repairs
- `cleaningFee` (number) - Fee if property not returned properly
- `latePaymentInterestRate` (number, default: 10) - Annual interest rate
- `renewalOptionPeriod` (string, default: "One year only") - Renewal option period
- `renewalNoticePeriod` (string, default: "Two (2) months") - Renewal notice period
- `propertyUsePurpose` (string, default: "Residential Purpose Only") - Property use purpose
- `landlordTerminationNotice` (string, default: "1 month") - Termination notice period
- `inventoryAddress` (string) - Address for inventory (defaults to property address)
- `inventoryItems` (array) - List of furniture/fixtures: `[{"item": "Ceiling fans", "quantity": "5 sets"}]`
- `witnessName` (string) - Witness name
- `witnessId` (string) - Witness ID number
- `terms` (string[]) - Custom terms and conditions
- `specialConditions` (string[]) - Special conditions
- `paymentSchedule` (object) - Payment schedule configuration
  - `frequency` ("monthly" | "weekly" | "bi-weekly")
  - `dueDay` (number, 1-31)
  - `lateFee` (number)
  - `gracePeriod` (number, days)
- `utilitiesIncluded` (boolean, default: false)
- `utilitiesList` (string[]) - List of included utilities
- `maintenanceIncluded` (boolean, default: false)
- `khayalamiProtection` (object) - Protection plan
  - `enabled` (boolean)
  - `planType` ("basic" | "premium")
  - `monthlyFee` (number)
  - `coverage` (string[])
- `agreementDate` (Date) - Agreement execution date (defaults to createdAt)

**Auto-Populated Fields (No Manual Input Required):**
These fields are automatically filled from user accounts and properties:
- Landlord info: name, NRIC, phone, address, bank account, bank name
- Tenant info: name, ID, phone, address, email
- Property info: address, description, type, postcode, parking allocation, access code
- Calculated fields: tenancy duration, rental amounts in words, payment due date text

**Request Example:**
```json
{
  "landlordId": "507f1f77bcf86cd799439011",
  "tenantId": "507f1f77bcf86cd799439012",
  "propertyId": "507f1f77bcf86cd799439013",
  "title": "Rental Agreement - 123 Main St",
  "description": "Standard residential rental agreement",
  "startDate": "2025-02-01T00:00:00.000Z",
  "endDate": "2026-01-31T23:59:59.999Z",
  "rentAmount": 1500,
  "depositAmount": 1500,
  "zeroDeposit": false,
  "paymentSchedule": {
    "frequency": "monthly",
    "dueDay": 1,
    "lateFee": 50,
    "gracePeriod": 5
  },
  "utilitiesIncluded": true,
  "utilitiesList": ["Water", "Electricity"],
  "maintenanceIncluded": false,
  "terms": [
    "Tenant shall pay rent on time",
    "Tenant shall maintain the property in good condition"
  ],
  "specialConditions": [
    "No pets allowed",
    "No smoking"
  ]
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "Agreement created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "propertyId": "507f1f77bcf86cd799439013",
    "landlordId": "507f1f77bcf86cd799439011",
    "tenantId": "507f1f77bcf86cd799439012",
    "status": "draft",
    "type": "tenancy",
    "title": "Rental Agreement - 123 Main St",
    "startDate": "2025-02-01T00:00:00.000Z",
    "endDate": "2026-01-31T23:59:59.999Z",
    "rentAmount": 1500,
    "depositAmount": 1500,
    "zeroDeposit": false,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

**400 - Missing Required Fields:**
```json
{
  "success": false,
  "message": "landlordId is required"
}
```

```json
{
  "success": false,
  "message": "tenantId is required"
}
```

**400 - Invalid Data:**
```json
{
  "success": false,
  "message": "Invalid agreement data",
  "errors": [
    "Property ID is required",
    "Start date must be before end date"
  ]
}
```

**403 - Unauthorized:**
```json
{
  "success": false,
  "message": "Only admins can create agreements"
}
```

---

## Create Agreement from Template

**Endpoint:**
```
POST /api/agreements/from-template
Authorization: Bearer <admin_token>
```

**Required Fields:**
- `templateId` (string, required) - Agreement template ID
- `landlordId` (string, required) - The landlord's user ID
- `tenantId` (string, required) - The tenant's user ID
- `propertyId` (string, required) - The property ID
- `formData` (object, required) - Form data to fill template fields

**Request Example:**
```json
{
  "templateId": "507f1f77bcf86cd799439020",
  "landlordId": "507f1f77bcf86cd799439011",
  "tenantId": "507f1f77bcf86cd799439012",
  "propertyId": "507f1f77bcf86cd799439013",
  "formData": {
    "title": "Rental Agreement - 123 Main St",
    "description": "Standard residential rental agreement",
    "startDate": "2025-02-01",
    "endDate": "2026-01-31",
    "rentAmount": 1500,
    "depositAmount": 1500,
    "zeroDeposit": false,
    "paymentSchedule": {
      "frequency": "monthly",
      "dueDay": 1,
      "lateFee": 50,
      "gracePeriod": 5
    },
    "utilitiesIncluded": true,
    "utilitiesList": ["Water", "Electricity"],
    "maintenanceIncluded": false,
    "khayalamiProtection": {
      "enabled": false,
      "planType": "basic",
      "monthlyFee": 0,
      "coverage": []
    }
  },
  "customTerms": [
    "Additional custom term 1",
    "Additional custom term 2"
  ],
  "customSpecialConditions": [
    "Custom condition 1"
  ]
}
```

---

## Email Notifications

When an agreement is created, **both landlord and tenant receive email notifications** with:
- Agreement details (title, property, dates, rent amount)
- Next steps based on their role:
  - **Landlord**: Review and sign the agreement
  - **Tenant**: Review, pay agreement fee, then sign

---

## Agreement Template System

### Field Mapping

All 47 template fields have been mapped to database fields. See `AGREEMENT_TEMPLATE_FIELD_MAPPING.md` for complete field mapping reference.

**Key Mappings:**
- Landlord/tenant info → User model (with new `bankAccount`, `bankName`, `address` fields)
- Property info → Property model (with new `parkingAllocation`, `accessCode` fields)
- Agreement terms → Agreement model (with 15+ new extended fields)
- Currency amounts → Auto-converted to words (e.g., "Malaysian Ringgit One Thousand Seven Hundred Only")

### Word Document Templates

If you have **Word document templates** (.docx files), here's how to handle them:

#### Step 1: Prepare Your Word Template

In your Word document, use placeholders that will be replaced with actual data:

**Example Placeholders:**
```
{{landlordName}}
{{tenantName}}
{{propertyAddress}}
{{rentAmount}}
{{startDate}}
{{endDate}}
{{depositAmount}}
{{terms}}
```

**Or use field syntax:**
```
{landlordName}
{tenantName}
{propertyAddress}
```

#### Step 2: Choose Processing Method

**Option A: Server-Side Processing with docxtemplater (Recommended)**

1. **Install Dependencies:**
   ```bash
   npm install docxtemplater pizzip
   ```

2. **Store Template:**
   - Upload Word template to cloud storage (Firebase Storage, AWS S3, or local `uploads/templates/`)
   - Store template path/URL in database

3. **Create Service Method:**
   ```typescript
   // src/services/AgreementTemplateService.ts
   import Docxtemplater from 'docxtemplater';
   import PizZip from 'pizzip';
   import fs from 'fs';

   export class AgreementTemplateService {
     async generateAgreementFromWord(
       templatePath: string,
       agreementData: any
     ): Promise<Buffer> {
       // Load template
       const content = fs.readFileSync(templatePath, 'binary');
       const zip = new PizZip(content);
       const doc = new Docxtemplater(zip, {
         paragraphLoop: true,
         linebreaks: true
       });

       // Prepare data
       const data = {
         landlordName: `${agreementData.landlord.firstName} ${agreementData.landlord.lastName}`,
         tenantName: `${agreementData.tenant.firstName} ${agreementData.tenant.lastName}`,
         propertyAddress: this.formatAddress(agreementData.property.address),
         rentAmount: `$${agreementData.agreement.rentAmount.toLocaleString()}`,
         depositAmount: `$${agreementData.agreement.depositAmount.toLocaleString()}`,
         startDate: new Date(agreementData.agreement.startDate).toLocaleDateString(),
         endDate: new Date(agreementData.agreement.endDate).toLocaleDateString(),
         terms: agreementData.agreement.terms.join('\n'),
         specialConditions: agreementData.agreement.specialConditions.join('\n')
       };

       // Fill template
       doc.setData(data);
       doc.render();

       // Generate document
       const buf = doc.getZip().generate({ type: 'nodebuffer' });
       return buf;
     }

     private formatAddress(address: any): string {
       if (typeof address === 'string') return address;
       return `${address.street}, ${address.city}, ${address.state} ${address.postalCode}, ${address.country}`;
     }
   }
   ```

4. **Add Endpoint:**
   ```typescript
   // In AgreementController
   async generateAgreementDocument(req: Request, res: Response) {
     const { agreementId } = req.params;
     const agreement = await Agreement.findById(agreementId)
       .populate('landlordId tenantId propertyId');
     
     const templatePath = 'uploads/templates/agreement-template.docx';
     const docBuffer = await templateService.generateAgreementFromWord(
       templatePath,
       agreement
     );
     
     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
     res.setHeader('Content-Disposition', `attachment; filename="agreement-${agreementId}.docx"`);
     res.send(docBuffer);
   }
   ```

**Option B: Convert Word to Database Template**

1. **Extract Structure:**
   - Manually identify all fields in Word document
   - Create `AgreementTemplate` in database with same structure
   - Map Word placeholders to database fields

2. **Use Database Template:**
   - Create agreements using database template system
   - Export to Word/PDF using existing PDF generation

**Option C: Hybrid Approach**

1. **Store Word Template:**
   - Keep Word template as reference
   - Create database template that mirrors structure
   - Use database template for creation
   - Optionally generate Word document from database template

#### Step 3: Template Field Mapping

Create a mapping configuration:

```typescript
const templateFieldMapping = {
  // User fields
  landlordName: (agreement) => `${agreement.landlordId.firstName} ${agreement.landlordId.lastName}`,
  tenantName: (agreement) => `${agreement.tenantId.firstName} ${agreement.tenantId.lastName}`,
  landlordEmail: (agreement) => agreement.landlordId.email,
  tenantEmail: (agreement) => agreement.tenantId.email,
  
  // Property fields
  propertyAddress: (agreement) => formatAddress(agreement.propertyId.address),
  propertyTitle: (agreement) => agreement.propertyId.title,
  
  // Agreement fields
  rentAmount: (agreement) => `$${agreement.rentAmount.toLocaleString()}`,
  depositAmount: (agreement) => `$${agreement.depositAmount.toLocaleString()}`,
  startDate: (agreement) => formatDate(agreement.startDate),
  endDate: (agreement) => formatDate(agreement.endDate),
  terms: (agreement) => agreement.terms.join('\n• '),
  specialConditions: (agreement) => agreement.specialConditions.join('\n• ')
};
```

#### Step 4: Upload and Store Templates

**Add Template Upload Endpoint:**
```typescript
// POST /api/agreements/templates/upload
// Admin uploads Word template
// Store in: uploads/templates/
// Save metadata in database
```

#### Recommended Libraries:

- **docxtemplater** (Node.js) - Best for simple placeholders
- **docx** (Node.js) - For programmatic Word document creation
- **mammoth** (Node.js) - Convert Word to HTML
- **officegen** (Node.js) - Generate Office documents

#### Example Implementation:

```bash
# Install
npm install docxtemplater pizzip
```

```typescript
// Usage in service
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

const generateAgreement = async (templatePath: string, data: any) => {
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip);
  
  doc.setData(data);
  doc.render();
  
  return doc.getZip().generate({ type: 'nodebuffer' });
};
```

### Database Template System

Agreements can also be created from **database templates** that define:
1. **Template Structure** - Sections and fields
2. **Default Terms** - Standard terms and conditions
3. **Default Payment Schedule** - Payment frequency and terms
4. **Default Utilities** - Included utilities list
5. **Default Protection Plan** - Khayalami protection settings

### Template Fields

Templates define **sections** with **fields** that can be filled from the database:

**Section Structure:**
```typescript
{
  name: string;           // Section name (e.g., "Property Details")
  order: number;        // Display order
  required: boolean;     // Is section required?
  fields: [
    {
      name: string;      // Field name (e.g., "rentAmount")
      type: "text" | "number" | "date" | "boolean" | "select" | "textarea";
      label: string;     // Display label
      placeholder?: string;
      required: boolean;
      defaultValue?: any;
      options?: string[]; // For select type
      validation?: {
        min?: number;
        max?: number;
        pattern?: string;
      };
    }
  ]
}
```

### Database Field Mapping

When creating an agreement from a template, the system:
1. **Loads the template** structure
2. **Fills fields** from `formData` provided in the request
3. **Merges default terms** with custom terms
4. **Applies default settings** (payment schedule, utilities, etc.)
5. **Creates the agreement** with all populated data

**Example Field Mapping:**
```javascript
// Template defines field: { name: "rentAmount", type: "number", label: "Monthly Rent" }
// formData provides: { rentAmount: 1500 }
// Result: agreement.rentAmount = 1500
```

### Template Categories

Templates are categorized by type:
- `residential` - Standard residential rental
- `commercial` - Commercial property rental
- `student` - Student housing agreements
- `short_term` - Short-term rentals
- `zero_deposit` - Zero deposit protection agreements

---

## Validation Rules

### Required Validations:
- ✅ `propertyId` must exist and belong to the specified landlord
- ✅ `landlordId` must be a valid user with role "landlord"
- ✅ `tenantId` must be a valid user with role "tenant"
- ✅ `startDate` must be before `endDate`
- ✅ `rentAmount` must be > 0
- ✅ `depositAmount` must be >= 0
- ✅ If `zeroDeposit` is true, `depositAmount` must be 0
- ✅ Property must not have an existing active/pending agreement

---

## Agreement Flow After Creation

1. **Agreement Created** (status: "draft")
   - Admin creates agreement
   - Both parties receive email notifications

2. **Landlord Signs** (status: "pending")
   - Landlord can sign anytime after creation
   - Tenant cannot sign until landlord signs

3. **Tenant Pays Agreement Fee**
   - Tenant must pay $30-50 processing fee
   - Can pay online (instant) or external (admin approval)
   - See `TENANT_AGREEMENT_FEE_FRONTEND_GUIDE.md` for details

4. **Tenant Signs** (status: "signed")
   - Tenant can sign after:
     - ✅ Landlord has signed
     - ✅ Agreement fee has been paid
   - Rental is automatically created when both parties sign

5. **Agreement Activated** (status: "active")
   - Automatically activates on `startDate` if both parties signed
   - Or landlord can manually activate

---

## Admin Portal Implementation

**Note:** The admin portal frontend needs to implement:
1. **Agreement Creation Form**
   - Select landlord (dropdown/search)
   - Select tenant (dropdown/search)
   - Select property (filtered by landlord)
   - Fill agreement details
   - Option to use template

2. **Template Selection**
   - List available templates
   - Preview template structure
   - Fill template fields
   - Add custom terms/conditions

3. **Agreement Management**
   - View all agreements
   - Filter by status, landlord, tenant, property
   - View agreement details
   - Track signing status
   - Monitor agreement fee payments

See `ADMIN_PORTAL_FRONTEND_IMPLEMENTATION.md` for existing admin portal structure.

---

## Related Documentation

- `TENANT_AGREEMENT_FEE_FRONTEND_GUIDE.md` - Agreement fee payment flow
- `AGREEMENTS_WORKFLOW_GUIDE.md` - Complete agreement workflow
- `ADMIN_PORTAL_FRONTEND_IMPLEMENTATION.md` - Admin portal structure

