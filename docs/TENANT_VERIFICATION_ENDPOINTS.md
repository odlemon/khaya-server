# 🏠 Tenant Document Verification Endpoints

## Base URL: `/api/verification`

All endpoints require authentication with a valid tenant token.

---

## 📋 **1. Get Required Documents**

### **Endpoint:**
```http
GET /api/verification/tenant/required
Authorization: Bearer <tenant_token>
```

### **Response:**
```json
{
  "success": true,
  "message": "Tenant required documents retrieved successfully",
  "data": {
    "role": "tenant",
    "requiredDocuments": [
      "idDocument",
      "payslips", 
      "utilityBills",
      "bankStatements",
      "employmentLetter"
    ],
    "documentDescriptions": {
      "idDocument": "Government-issued ID (Passport or National ID)",
      "payslips": "Recent payslips (last 3 months)",
      "utilityBills": "Utility bills (electricity, water, internet) in your name",
      "bankStatements": "Bank statements (last 3 months)",
      "employmentLetter": "Employment verification letter from your employer"
    },
    "tips": [
      "Upload clear, readable images of your documents",
      "Ensure all text is visible and not cut off",
      "Documents should be recent (within 3 months for financial documents)",
      "Make sure documents are in your name"
    ]
  }
}
```

---

## 📤 **2. Upload Document**

### **Endpoint:**
```http
POST /api/verification/tenant/upload
Authorization: Bearer <tenant_token>
Content-Type: application/json
```

### **Request Body:**
```json
{
  "documentType": "payslips",
  "urls": [
    "https://firebase.com/pay1.pdf",
    "https://firebase.com/pay2.pdf"
  ],
  "documentSubType": "national_id"
}
```

### **Request Body Fields:**
- `documentType` (string, required): One of: `idDocument`, `payslips`, `utilityBills`, `bankStatements`, `employmentLetter`
- `urls` (array, required): Array of Firebase URLs for the documents
- `documentSubType` (string, optional): For ID documents only - `passport` or `national_id`

### **Response (Success):**
```json
{
  "success": true,
  "message": "Documents uploaded successfully. They will be reviewed by our team.",
  "data": {
    "documentType": "payslips",
    "uploadedAt": "2024-01-01T10:30:00.000Z",
    "status": "pending_review",
    "nextSteps": [
      "Upload utility bills in your name",
      "Add bank statements for financial verification", 
      "Include employment letter from your employer"
    ]
  }
}
```

### **Response (Error - Invalid Document Type):**
```json
{
  "success": false,
  "message": "Invalid document type for tenant. Allowed types: idDocument, payslips, utilityBills, bankStatements, employmentLetter"
}
```

### **Response (Error - Missing Fields):**
```json
{
  "success": false,
  "message": "Document type and URLs are required"
}
```

---

## 📊 **3. Get Upload Progress**

### **Endpoint:**
```http
GET /api/verification/progress
Authorization: Bearer <tenant_token>
```

### **Response:**
```json
{
  "success": true,
  "message": "Upload progress retrieved successfully",
  "data": {
    "progress": [
      {
        "documentType": "idDocument",
        "isUploaded": true,
        "uploadedAt": "2024-01-01T10:00:00.000Z",
        "verified": false,
        "description": "Government-issued ID"
      },
      {
        "documentType": "payslips",
        "isUploaded": true,
        "uploadedAt": "2024-01-01T10:30:00.000Z",
        "verified": false,
        "description": "Recent payslips"
      },
      {
        "documentType": "utilityBills",
        "isUploaded": false,
        "uploadedAt": null,
        "verified": false,
        "description": "Utility bills"
      },
      {
        "documentType": "bankStatements",
        "isUploaded": false,
        "uploadedAt": null,
        "verified": false,
        "description": "Bank statements"
      },
      {
        "documentType": "employmentLetter",
        "isUploaded": false,
        "uploadedAt": null,
        "verified": false,
        "description": "Employment letter"
      }
    ],
    "summary": {
      "completed": 2,
      "total": 5,
      "percentage": 40,
      "canSubmit": false
    }
  }
}
```

---

## ✅ **4. Check Document Completion**

### **Endpoint:**
```http
GET /api/verification/completion
Authorization: Bearer <tenant_token>
```

### **Response:**
```json
{
  "success": true,
  "message": "Document completion check completed",
  "data": {
    "hasAllDocuments": false,
    "missingDocuments": ["utilityBills", "bankStatements", "employmentLetter"],
    "canSubmitForReview": false,
    "progress": 40
  }
}
```

### **Response (All Documents Uploaded):**
```json
{
  "success": true,
  "message": "Document completion check completed",
  "data": {
    "hasAllDocuments": true,
    "missingDocuments": [],
    "canSubmitForReview": true,
    "progress": 100,
    "note": "You can submit for review with any number of documents. Admin will review manually."
  }
}
```

### **Response (Missing Documents - Still Can Submit):**
```json
{
  "success": true,
  "message": "Document completion check completed",
  "data": {
    "hasAllDocuments": false,
    "missingDocuments": ["payslips", "utilityBills", "bankStatements"],
    "canSubmitForReview": true,
    "progress": 40,
    "note": "You can submit for review with any number of documents. Admin will review manually."
  }
}
```

---

## 🚀 **5. Submit for Review**

### **Endpoint:**
```http
POST /api/verification/submit
Authorization: Bearer <tenant_token>
```

### **Response (Success):**
```json
{
  "success": true,
  "message": "Documents submitted for review successfully. You will be notified once the review is complete.",
  "data": {
    "status": "pending",
    "estimatedReviewTime": "24-48 hours"
  }
}
```

### **Response (Success - No Validation):**
```json
{
  "success": true,
  "message": "Documents submitted for review successfully. Admin will review your submission.",
  "data": {
    "status": "pending",
    "estimatedReviewTime": "24-48 hours",
    "note": "Admin will review all submitted documents manually"
  }
}
```

### **Response (Already Verified):**
```json
{
  "success": false,
  "message": "Your documents are already verified"
}
```

### **Response (Already Under Review):**
```json
{
  "success": false,
  "message": "Your documents are already under review"
}
```

---

## 🔍 **6. Get Verification Status**

### **Endpoint:**
```http
GET /api/verification/status
Authorization: Bearer <tenant_token>
```

### **Response (Unverified):**
```json
{
  "success": true,
  "message": "Verification status retrieved successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "tenant",
    "status": "unverified",
    "documents": {
      "idDocument": {
        "url": "https://firebase.com/id.pdf",
        "type": "national_id",
        "uploadedAt": "2024-01-01T10:00:00.000Z",
        "verified": false
      },
      "payslips": {
        "urls": ["https://firebase.com/pay1.pdf"],
        "uploadedAt": "2024-01-01T10:30:00.000Z",
        "verified": false
      }
    },
    "adminFeedback": null,
    "verifiedAt": null,
    "rejectedAt": null,
    "rejectionReason": null,
    "canCreateListings": false,
    "canSendRequests": false
  }
}
```

### **Response (Verified):**
```json
{
  "success": true,
  "message": "Verification status retrieved successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "tenant",
    "status": "verified",
    "documents": {
      "idDocument": {
        "url": "https://firebase.com/id.pdf",
        "type": "national_id",
        "uploadedAt": "2024-01-01T10:00:00.000Z",
        "verified": true
      }
    },
    "adminFeedback": "All documents verified successfully",
    "verifiedAt": "2024-01-01T15:00:00.000Z",
    "rejectedAt": null,
    "rejectionReason": null,
    "canCreateListings": false,
    "canSendRequests": true
  }
}
```

### **Response (Rejected):**
```json
{
  "success": true,
  "message": "Verification status retrieved successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "tenant",
    "status": "rejected",
    "documents": {
      "idDocument": {
        "url": "https://firebase.com/id.pdf",
        "type": "national_id",
        "uploadedAt": "2024-01-01T10:00:00.000Z",
        "verified": false
      }
    },
    "adminFeedback": "ID document is unclear, please upload a clearer copy",
    "verifiedAt": null,
    "rejectedAt": "2024-01-01T15:00:00.000Z",
    "rejectionReason": "Poor document quality",
    "canCreateListings": false,
    "canSendRequests": false
  }
}
```

---

## 🗑️ **7. Delete Document**

### **Endpoint:**
```http
DELETE /api/verification/document
Authorization: Bearer <tenant_token>
Content-Type: application/json
```

### **Request Body:**
```json
{
  "documentType": "payslips"
}
```

### **Response (Success):**
```json
{
  "success": true,
  "message": "Document deleted successfully",
  "data": {
    "documentType": "payslips",
    "deletedAt": "2024-01-01T10:30:00.000Z",
    "status": "deleted"
  }
}
```

### **Response (Document Not Found):**
```json
{
  "success": false,
  "message": "Document not found"
}
```

### **Response (Cannot Delete - Verified):**
```json
{
  "success": false,
  "message": "Cannot delete documents after verification is complete. Please contact support if you need to make changes."
}
```

### **Response (Invalid Document Type):**
```json
{
  "success": false,
  "message": "Invalid document type for tenant. Allowed types: idDocument, payslips, utilityBills, bankStatements, employmentLetter"
}
```

---

## 📄 **8. Get Document Details**

### **Endpoint:**
```http
GET /api/verification/document/:documentType
Authorization: Bearer <tenant_token>
```

### **Example:**
```http
GET /api/verification/document/payslips
Authorization: Bearer <tenant_token>
```

### **Response (Success):**
```json
{
  "success": true,
  "message": "Document details retrieved successfully",
  "data": {
    "documentType": "payslips",
    "document": {
      "urls": ["https://firebase.com/pay1.pdf", "https://firebase.com/pay2.pdf"],
      "uploadedAt": "2024-01-01T10:30:00.000Z",
      "verified": false
    },
    "description": "Recent payslips",
    "canDelete": true
  }
}
```

### **Response (Document Not Found):**
```json
{
  "success": false,
  "message": "Document not found"
}
```

### **Response (Invalid Document Type):**
```json
{
  "success": false,
  "message": "Invalid document type for tenant. Allowed types: idDocument, payslips, utilityBills, bankStatements, employmentLetter"
}
```

---

## 🧪 **Complete Testing Flow**

### **Step 1: Get Required Documents**
```bash
curl -X GET http://localhost:3001/api/verification/tenant/required \
  -H "Authorization: Bearer <tenant_token>"
```

### **Step 2: Upload ID Document**
```bash
curl -X POST http://localhost:3001/api/verification/tenant/upload \
  -H "Authorization: Bearer <tenant_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "idDocument",
    "urls": ["https://firebase.com/id.pdf"],
    "documentSubType": "national_id"
  }'
```

### **Step 3: Upload Payslips**
```bash
curl -X POST http://localhost:3001/api/verification/tenant/upload \
  -H "Authorization: Bearer <tenant_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "payslips",
    "urls": ["https://firebase.com/pay1.pdf", "https://firebase.com/pay2.pdf"]
  }'
```

### **Step 4: Upload Utility Bills**
```bash
curl -X POST http://localhost:3001/api/verification/tenant/upload \
  -H "Authorization: Bearer <tenant_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "utilityBills",
    "urls": ["https://firebase.com/electricity.pdf", "https://firebase.com/water.pdf"]
  }'
```

### **Step 5: Upload Bank Statements**
```bash
curl -X POST http://localhost:3001/api/verification/tenant/upload \
  -H "Authorization: Bearer <tenant_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "bankStatements",
    "urls": ["https://firebase.com/bank1.pdf", "https://firebase.com/bank2.pdf"]
  }'
```

### **Step 6: Upload Employment Letter**
```bash
curl -X POST http://localhost:3001/api/verification/tenant/upload \
  -H "Authorization: Bearer <tenant_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "employmentLetter",
    "urls": ["https://firebase.com/employment.pdf"]
  }'
```

### **Step 7: Check Progress**
```bash
curl -X GET http://localhost:3001/api/verification/progress \
  -H "Authorization: Bearer <tenant_token>"
```

### **Step 8: Submit for Review**
```bash
curl -X POST http://localhost:3001/api/verification/submit \
  -H "Authorization: Bearer <tenant_token>"
```

### **Step 9: Check Status**
```bash
curl -X GET http://localhost:3001/api/verification/status \
  -H "Authorization: Bearer <tenant_token>"
```

### **Step 10: Get Document Details**
```bash
curl -X GET http://localhost:3001/api/verification/document/payslips \
  -H "Authorization: Bearer <tenant_token>"
```

### **Step 11: Delete Document (if needed)**
```bash
curl -X DELETE http://localhost:3001/api/verification/document \
  -H "Authorization: Bearer <tenant_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "payslips"
  }'
```

---

## 📱 **Frontend Implementation Examples**

### **Document Upload Component**
```javascript
const uploadTenantDocument = async (documentType, urls, documentSubType) => {
  try {
    const response = await fetch('/api/verification/tenant/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        documentType,
        urls,
        documentSubType
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      setMessage('Document uploaded successfully!');
      setNextSteps(result.data.nextSteps);
      // Refresh progress
      await checkProgress();
    } else {
      setError(result.message);
    }
  } catch (error) {
    setError('Upload failed. Please try again.');
  }
};
```

### **Progress Tracking**
```javascript
const checkProgress = async () => {
  try {
    const response = await fetch('/api/verification/progress', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const result = await response.json();
    
    if (result.success) {
      setProgress(result.data.progress);
      setSummary(result.data.summary);
      setCanSubmit(result.data.summary.canSubmit);
    }
  } catch (error) {
    setError('Failed to load progress');
  }
};
```

### **Submit for Review**
```javascript
const submitForReview = async () => {
  try {
    const response = await fetch('/api/verification/submit', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const result = await response.json();
    
    if (result.success) {
      setMessage('Documents submitted for review!');
      setStatus('pending');
      setEstimatedTime(result.data.estimatedReviewTime);
    } else {
      setError(result.message);
      if (result.data.missingDocuments) {
        setMissingDocuments(result.data.missingDocuments);
      }
    }
  } catch (error) {
    setError('Submission failed. Please try again.');
  }
};
```

### **Status Check**
```javascript
const checkVerificationStatus = async () => {
  try {
    const response = await fetch('/api/verification/status', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const result = await response.json();
    
    if (result.success) {
      setVerificationStatus(result.data.status);
      setDocuments(result.data.documents);
      setCanSendRequests(result.data.canSendRequests);
      setAdminFeedback(result.data.adminFeedback);
      
      if (result.data.status === 'rejected') {
        setRejectionReason(result.data.rejectionReason);
      }
    }
  } catch (error) {
    setError('Failed to load verification status');
  }
};
```

### **Delete Document**
```javascript
const deleteDocument = async (documentType) => {
  try {
    const response = await fetch('/api/verification/document', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ documentType })
    });
    
    const result = await response.json();
    
    if (result.success) {
      setMessage('Document deleted successfully!');
      // Refresh progress
      await checkProgress();
    } else {
      setError(result.message);
    }
  } catch (error) {
    setError('Delete failed. Please try again.');
  }
};
```

### **Get Document Details**
```javascript
const getDocumentDetails = async (documentType) => {
  try {
    const response = await fetch(`/api/verification/document/${documentType}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const result = await response.json();
    
    if (result.success) {
      setDocumentDetails(result.data.document);
      setCanDelete(result.data.canDelete);
      setDocumentDescription(result.data.description);
    } else {
      setError(result.message);
    }
  } catch (error) {
    setError('Failed to load document details');
  }
};
```

---

## 🎯 **Key Features**

✅ **Role-Specific Validation**: Only tenant documents are accepted
✅ **Progress Tracking**: Real-time upload progress and completion status
✅ **Next Steps Guidance**: Helpful tips after each document upload
✅ **Status Management**: Clear status indicators (pending, verified, rejected)
✅ **Admin Feedback**: Users can see admin feedback and rejection reasons
✅ **Permission Checks**: Shows if user can send connection requests
✅ **Document Validation**: Ensures correct document types for tenants
✅ **Upload Management**: Individual document upload with progress tracking
✅ **Document Deletion**: Users can delete documents (except when verified)
✅ **Document Details**: Get detailed information about specific documents
✅ **Smart Restrictions**: Cannot delete only after verification is complete
✅ **Document Management**: Full CRUD operations for document management

---

## 📋 **Required Documents Summary**

| Document Type | Description | Required | Multiple Files |
|---------------|-------------|-----------|----------------|
| ID Document | Government-issued ID | ✅ | No |
| Payslips | Recent payslips (last 3 months) | ✅ | Yes |
| Utility Bills | Bills in tenant's name | ✅ | Yes |
| Bank Statements | Last 3 months | ✅ | Yes |
| Employment Letter | From employer | ✅ | No |

---

## 🔄 **Status Flow**

### **Document Verification Status Flow:**
1. **unverified** (default) - User hasn't submitted for review yet
2. **pending** - User submitted documents, admin is reviewing
3. **verified** - Admin approved the documents
4. **rejected** - Admin rejected the documents

### **Status Transitions:**
- **unverified** → **pending** (when user submits)
- **pending** → **verified** (when admin approves)
- **pending** → **rejected** (when admin rejects)
- **rejected** → **pending** (when user resubmits)
- **rejected** → **verified** (when admin approves after rejection)

### **User Permissions:**
- **unverified/rejected**: Can upload, delete, and submit documents
- **pending**: Can only view status (cannot modify documents)
- **verified**: Can only view status (documents are locked)

---

## 🔒 **Security Notes**

- All endpoints require valid tenant authentication
- Document types are validated for tenant role only
- Firebase URLs are required for document uploads
- Documents are stored securely and reviewed by admin
- Users can only access their own verification data
