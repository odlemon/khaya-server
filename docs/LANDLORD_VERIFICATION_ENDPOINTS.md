# 🏢 Landlord Document Verification Endpoints

## Base URL: `/api/verification`

All endpoints require authentication with a valid landlord token.

---

## 📋 **1. Get Required Documents**

### **Endpoint:**
```http
GET /api/verification/landlord/required
Authorization: Bearer <landlord_token>
```

### **Response:**
```json
{
  "success": true,
  "message": "Landlord required documents retrieved successfully",
  "data": {
    "role": "landlord",
    "requiredDocuments": [
      "idDocument",
      "propertyProof",
      "propertyDocuments"
    ],
    "documentDescriptions": {
      "idDocument": "Government-issued ID (Passport, National ID, or Driver's License)",
      "propertyProof": "Property ownership documents (title deed, lease agreement, property registration)",
      "propertyDocuments": "Additional property documents (insurance, permits, property tax receipts)"
    },
    "tips": [
      "Upload clear, readable images of your documents",
      "Ensure property ownership is clearly documented",
      "Include all relevant property permits and licenses",
      "Documents should be current and valid"
    ]
  }
}
```

---

## 📤 **2. Upload Document**

### **Endpoint:**
```http
POST /api/verification/landlord/upload
Authorization: Bearer <landlord_token>
Content-Type: application/json
```

### **Request Body:**
```json
{
  "documentType": "propertyProof",
  "urls": [
    "https://firebase.com/title-deed.pdf",
    "https://firebase.com/lease-agreement.pdf"
  ]
}
```

### **Request Body Fields:**
- `documentType` (string, required): One of: `idDocument`, `propertyProof`, `propertyDocuments`
- `urls` (array, required): Array of Firebase URLs for the documents
- `documentSubType` (string, optional): For ID documents only - `passport`, `national_id`, or `drivers_license`

### **Response (Success):**
```json
{
  "success": true,
  "message": "Documents uploaded successfully. They will be reviewed by our team.",
  "data": {
    "documentType": "propertyProof",
    "uploadedAt": "2024-01-01T10:30:00.000Z",
    "status": "pending_review",
    "nextSteps": [
      "Upload additional property documents",
      "Include property permits and licenses",
      "Add property insurance and tax receipts"
    ]
  }
}
```

### **Response (Error - Invalid Document Type):**
```json
{
  "success": false,
  "message": "Invalid document type for landlord. Allowed types: idDocument, propertyProof, propertyDocuments"
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
Authorization: Bearer <landlord_token>
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
        "documentType": "propertyProof",
        "isUploaded": true,
        "uploadedAt": "2024-01-01T10:30:00.000Z",
        "verified": false,
        "description": "Property ownership documents"
      },
      {
        "documentType": "propertyDocuments",
        "isUploaded": false,
        "uploadedAt": null,
        "verified": false,
        "description": "Additional property documents"
      }
    ],
    "summary": {
      "completed": 2,
      "total": 3,
      "percentage": 67,
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
Authorization: Bearer <landlord_token>
```

### **Response (Missing Documents - Still Can Submit):**
```json
{
  "success": true,
  "message": "Document completion check completed",
  "data": {
    "hasAllDocuments": false,
    "missingDocuments": ["propertyDocuments"],
    "canSubmitForReview": true,
    "progress": 67,
    "note": "You can submit for review with any number of documents. Admin will review manually."
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

---

## 🚀 **5. Submit for Review**

### **Endpoint:**
```http
POST /api/verification/submit
Authorization: Bearer <landlord_token>
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
Authorization: Bearer <landlord_token>
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
    "role": "landlord",
    "status": "unverified",
    "documents": {
      "idDocument": {
        "url": "https://firebase.com/id.pdf",
        "type": "national_id",
        "uploadedAt": "2024-01-01T10:00:00.000Z",
        "verified": false
      },
      "propertyProof": {
        "urls": ["https://firebase.com/title-deed.pdf"],
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
    "role": "landlord",
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
    "canCreateListings": true,
    "canSendRequests": false
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
    "role": "landlord",
    "status": "rejected",
    "documents": {
      "idDocument": {
        "url": "https://firebase.com/id.pdf",
        "type": "national_id",
        "uploadedAt": "2024-01-01T10:00:00.000Z",
        "verified": false
      }
    },
    "adminFeedback": "Property ownership documents are unclear, please upload clearer copies",
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
Authorization: Bearer <landlord_token>
Content-Type: application/json
```

### **Request Body:**
```json
{
  "documentType": "propertyProof"
}
```

### **Response (Success):**
```json
{
  "success": true,
  "message": "Document deleted successfully",
  "data": {
    "documentType": "propertyProof",
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
  "message": "Invalid document type for landlord. Allowed types: idDocument, propertyProof, propertyDocuments"
}
```

---

## 📄 **8. Get Document Details**

### **Endpoint:**
```http
GET /api/verification/document/:documentType
Authorization: Bearer <landlord_token>
```

### **Example:**
```http
GET /api/verification/document/propertyProof
Authorization: Bearer <landlord_token>
```

### **Response (Success):**
```json
{
  "success": true,
  "message": "Document details retrieved successfully",
  "data": {
    "documentType": "propertyProof",
    "document": {
      "urls": ["https://firebase.com/title-deed.pdf", "https://firebase.com/lease-agreement.pdf"],
      "uploadedAt": "2024-01-01T10:30:00.000Z",
      "verified": false
    },
    "description": "Property ownership documents",
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
  "message": "Invalid document type for landlord. Allowed types: idDocument, propertyProof, propertyDocuments"
}
```

---

## 🧪 **Complete Testing Flow**

### **Step 1: Get Required Documents**
```bash
curl -X GET http://localhost:3001/api/verification/landlord/required \
  -H "Authorization: Bearer <landlord_token>"
```

### **Step 2: Upload ID Document**
```bash
curl -X POST http://localhost:3001/api/verification/landlord/upload \
  -H "Authorization: Bearer <landlord_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "idDocument",
    "urls": ["https://firebase.com/id.pdf"],
    "documentSubType": "national_id"
  }'
```

### **Step 3: Upload Property Proof**
```bash
curl -X POST http://localhost:3001/api/verification/landlord/upload \
  -H "Authorization: Bearer <landlord_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "propertyProof",
    "urls": ["https://firebase.com/title-deed.pdf", "https://firebase.com/lease-agreement.pdf"]
  }'
```

### **Step 4: Upload Property Documents**
```bash
curl -X POST http://localhost:3001/api/verification/landlord/upload \
  -H "Authorization: Bearer <landlord_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "propertyDocuments",
    "urls": ["https://firebase.com/insurance.pdf", "https://firebase.com/permits.pdf"]
  }'
```

### **Step 5: Check Progress**
```bash
curl -X GET http://localhost:3001/api/verification/progress \
  -H "Authorization: Bearer <landlord_token>"
```

### **Step 6: Submit for Review**
```bash
curl -X POST http://localhost:3001/api/verification/submit \
  -H "Authorization: Bearer <landlord_token>"
```

### **Step 7: Check Status**
```bash
curl -X GET http://localhost:3001/api/verification/status \
  -H "Authorization: Bearer <landlord_token>"
```

### **Step 8: Get Document Details**
```bash
curl -X GET http://localhost:3001/api/verification/document/propertyProof \
  -H "Authorization: Bearer <landlord_token>"
```

### **Step 9: Delete Document (if needed)**
```bash
curl -X DELETE http://localhost:3001/api/verification/document \
  -H "Authorization: Bearer <landlord_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "propertyProof"
  }'
```

---

## 📱 **Frontend Implementation Examples**

### **Document Upload Component**
```javascript
const uploadLandlordDocument = async (documentType, urls, documentSubType) => {
  try {
    const response = await fetch('/api/verification/landlord/upload', {
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
      setCanCreateListings(result.data.canCreateListings);
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

✅ **Role-Specific Validation**: Only landlord documents are accepted
✅ **Progress Tracking**: Real-time upload progress and completion status
✅ **Next Steps Guidance**: Helpful tips after each document upload
✅ **Status Management**: Clear status indicators (unverified, pending, verified, rejected)
✅ **Admin Feedback**: Users can see admin feedback and rejection reasons
✅ **Permission Checks**: Shows if user can create property listings
✅ **Document Validation**: Ensures correct document types for landlords
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
| Property Proof | Property ownership documents | ✅ | Yes |
| Property Documents | Additional property documents | ✅ | Yes |

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

- All endpoints require valid landlord authentication
- Document types are validated for landlord role only
- Firebase URLs are required for document uploads
- Documents are stored securely and reviewed by admin
- Users can only access their own verification data

---

## 🏢 **Landlord-Specific Features**

### **Property Listing Permissions:**
- ✅ **canCreateListings**: Shows if landlord can create property listings
- ✅ **Verification Required**: Must be verified to create listings
- ✅ **Status Tracking**: Clear indication of verification status

### **Document Requirements:**
- ✅ **Property Ownership**: Title deeds, lease agreements
- ✅ **Property Permits**: Licenses, insurance documents
- ✅ **Identity Verification**: Government-issued ID required

### **Admin Review Process:**
- ✅ **Manual Review**: Admin reviews all documents manually
- ✅ **Flexible Approval**: Admin can approve with partial documents
- ✅ **Detailed Feedback**: Clear feedback on approval/rejection

The landlord document verification system provides complete control over property owner verification! 🏢📄✅
