# 🔧 Admin Document Verification Endpoints

## Base URL: `/api/documents`

All endpoints require admin authentication.

---

## 📋 **1. Get Pending Verification Requests**

### **Endpoint:**
```http
GET /api/documents/admin/pending
Authorization: Bearer <admin_token>
```

### **Response:**
```json
{
  "success": true,
  "message": "Pending verifications retrieved successfully",
  "data": [
    {
      "userId": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "tenant",
      "status": "pending",
      "documents": {
        "idDocument": {
          "url": "https://firebase.com/id.pdf",
          "type": "national_id",
          "uploadedAt": "2024-01-01T10:00:00.000Z",
          "verified": false
        },
        "payslips": {
          "urls": ["https://firebase.com/pay1.pdf", "https://firebase.com/pay2.pdf"],
          "uploadedAt": "2024-01-01T10:30:00.000Z",
          "verified": false
        }
      },
      "submittedAt": "2024-01-01T09:00:00.000Z"
    },
    {
      "userId": "507f1f77bcf86cd799439012",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "landlord",
      "status": "pending",
      "documents": {
        "idDocument": {
          "url": "https://firebase.com/jane-id.pdf",
          "type": "passport",
          "uploadedAt": "2024-01-01T11:00:00.000Z",
          "verified": false
        },
        "propertyProof": {
          "urls": ["https://firebase.com/title-deed.pdf"],
          "uploadedAt": "2024-01-01T11:30:00.000Z",
          "verified": false
        }
      },
      "submittedAt": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

---

## 📊 **2. Get All Verification Requests**

### **Endpoint:**
```http
GET /api/documents/admin/all
Authorization: Bearer <admin_token>
```

### **Response:**
```json
{
  "success": true,
  "message": "All verifications retrieved successfully",
  "data": [
    {
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
      "verifiedBy": {
        "_id": "admin123",
        "firstName": "Admin",
        "lastName": "User"
      },
      "submittedAt": "2024-01-01T09:00:00.000Z"
    },
    {
      "userId": "507f1f77bcf86cd799439012",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "landlord",
      "status": "rejected",
      "documents": {
        "idDocument": {
          "url": "https://firebase.com/jane-id.pdf",
          "type": "passport",
          "uploadedAt": "2024-01-01T11:00:00.000Z",
          "verified": false
        }
      },
      "adminFeedback": "ID document is unclear, please upload a clearer copy",
      "rejectedAt": "2024-01-01T16:00:00.000Z",
      "rejectedBy": {
        "_id": "admin123",
        "firstName": "Admin",
        "lastName": "User"
      },
      "rejectionReason": "Poor document quality",
      "submittedAt": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

---

## ✅ **3. Approve Documents**

### **Endpoint:**
```http
POST /api/documents/admin/verify
Authorization: Bearer <admin_token>
Content-Type: application/json
```

### **Request Body:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "status": "verified",
  "adminFeedback": "All documents verified successfully. User is now approved for platform access."
}
```

### **Response (Success):**
```json
{
  "success": true,
  "message": "Documents verified successfully"
}
```

### **Response (User Not Found):**
```json
{
  "success": false,
  "message": "User not found"
}
```

### **Response (Already Verified):**
```json
{
  "success": false,
  "message": "User is already verified"
}
```

---

## ❌ **4. Reject Documents**

### **Endpoint:**
```http
POST /api/documents/admin/verify
Authorization: Bearer <admin_token>
Content-Type: application/json
```

### **Request Body:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "status": "rejected",
  "adminFeedback": "ID document is unclear, please upload a clearer copy. Payslips are missing employer information.",
  "rejectionReason": "Poor document quality and missing information"
}
```

### **Response (Success):**
```json
{
  "success": true,
  "message": "Documents rejected successfully"
}
```

### **Response (Missing Rejection Reason):**
```json
{
  "success": false,
  "message": "Rejection reason is required when rejecting documents"
}
```

---

## 🔍 **5. Get User Verification Details**

### **Endpoint:**
```http
GET /api/documents/admin/user/:userId
Authorization: Bearer <admin_token>
```

### **Response:**
```json
{
  "success": true,
  "message": "User verification details retrieved successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "tenant",
    "status": "pending",
    "documents": {
      "idDocument": {
        "url": "https://firebase.com/id.pdf",
        "type": "national_id",
        "uploadedAt": "2024-01-01T10:00:00.000Z",
        "verified": false
      },
      "payslips": {
        "urls": ["https://firebase.com/pay1.pdf", "https://firebase.com/pay2.pdf"],
        "uploadedAt": "2024-01-01T10:30:00.000Z",
        "verified": false
      },
      "utilityBills": {
        "urls": ["https://firebase.com/electricity.pdf"],
        "uploadedAt": "2024-01-01T11:00:00.000Z",
        "verified": false
      }
    },
    "adminFeedback": null,
    "verifiedAt": null,
    "rejectedAt": null,
    "rejectionReason": null,
    "submittedAt": "2024-01-01T09:00:00.000Z",
    "userProfile": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "createdAt": "2024-01-01T08:00:00.000Z"
    }
  }
}
```

---

## 📈 **6. Get Verification Statistics**

### **Endpoint:**
```http
GET /api/documents/admin/stats
Authorization: Bearer <admin_token>
```

### **Response:**
```json
{
  "success": true,
  "message": "Verification statistics retrieved successfully",
  "data": {
    "total": 150,
    "pending": 25,
    "verified": 100,
    "rejected": 25,
    "byRole": {
      "tenant": {
        "total": 100,
        "pending": 15,
        "verified": 70,
        "rejected": 15
      },
      "landlord": {
        "total": 50,
        "pending": 10,
        "verified": 30,
        "rejected": 10
      }
    },
    "recentActivity": [
      {
        "userId": "user123",
        "name": "John Doe",
        "action": "verified",
        "timestamp": "2024-01-01T15:00:00.000Z",
        "admin": "Admin User"
      },
      {
        "userId": "user124",
        "name": "Jane Smith",
        "action": "rejected",
        "timestamp": "2024-01-01T14:30:00.000Z",
        "admin": "Admin User"
      }
    ]
  }
}
```

---

## 🔄 **7. Get Verification History**

### **Endpoint:**
```http
GET /api/documents/admin/history
Authorization: Bearer <admin_token>
```

### **Query Parameters:**
- `status` (optional): Filter by status (pending, verified, rejected)
- `role` (optional): Filter by role (tenant, landlord)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Skip results (default: 0)

### **Example:**
```http
GET /api/documents/admin/history?status=verified&role=tenant&limit=20&offset=0
Authorization: Bearer <admin_token>
```

### **Response:**
```json
{
  "success": true,
  "message": "Verification history retrieved successfully",
  "data": {
    "results": [
      {
        "userId": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "tenant",
        "status": "verified",
        "verifiedAt": "2024-01-01T15:00:00.000Z",
        "verifiedBy": "Admin User",
        "adminFeedback": "All documents verified successfully"
      }
    ],
    "pagination": {
      "total": 100,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

## 🧪 **Complete Testing Flow**

### **Step 1: Get Pending Requests**
```bash
curl -X GET http://localhost:3001/api/documents/admin/pending \
  -H "Authorization: Bearer <admin_token>"
```

### **Step 2: Get User Details**
```bash
curl -X GET http://localhost:3001/api/documents/admin/user/user123 \
  -H "Authorization: Bearer <admin_token>"
```

### **Step 3: Approve Documents**
```bash
curl -X POST http://localhost:3001/api/documents/admin/verify \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "status": "verified",
    "adminFeedback": "All documents verified successfully"
  }'
```

### **Step 4: Reject Documents**
```bash
curl -X POST http://localhost:3001/api/documents/admin/verify \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user124",
    "status": "rejected",
    "adminFeedback": "ID document is unclear",
    "rejectionReason": "Poor document quality"
  }'
```

### **Step 5: Get Statistics**
```bash
curl -X GET http://localhost:3001/api/documents/admin/stats \
  -H "Authorization: Bearer <admin_token>"
```

### **Step 6: Get All Requests**
```bash
curl -X GET http://localhost:3001/api/documents/admin/all \
  -H "Authorization: Bearer <admin_token>"
```

---

## 📱 **Frontend Implementation Examples**

### **Get Pending Requests**
```javascript
const getPendingRequests = async () => {
  try {
    const response = await fetch('/api/documents/admin/pending', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const result = await response.json();
    
    if (result.success) {
      setPendingRequests(result.data);
    } else {
      setError(result.message);
    }
  } catch (error) {
    setError('Failed to load pending requests');
  }
};
```

### **Approve Documents**
```javascript
const approveDocuments = async (userId, feedback) => {
  try {
    const response = await fetch('/api/documents/admin/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        status: 'verified',
        adminFeedback: feedback
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      setMessage('Documents approved successfully!');
      // Refresh pending requests
      await getPendingRequests();
    } else {
      setError(result.message);
    }
  } catch (error) {
    setError('Approval failed. Please try again.');
  }
};
```

### **Reject Documents**
```javascript
const rejectDocuments = async (userId, feedback, reason) => {
  try {
    const response = await fetch('/api/documents/admin/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        status: 'rejected',
        adminFeedback: feedback,
        rejectionReason: reason
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      setMessage('Documents rejected successfully!');
      // Refresh pending requests
      await getPendingRequests();
    } else {
      setError(result.message);
    }
  } catch (error) {
    setError('Rejection failed. Please try again.');
  }
};
```

### **Get User Details**
```javascript
const getUserDetails = async (userId) => {
  try {
    const response = await fetch(`/api/documents/admin/user/${userId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const result = await response.json();
    
    if (result.success) {
      setUserDetails(result.data);
      setDocuments(result.data.documents);
    } else {
      setError(result.message);
    }
  } catch (error) {
    setError('Failed to load user details');
  }
};
```

---

## 🎯 **Key Features**

✅ **Complete Admin Control**: Full CRUD operations for verification management
✅ **Detailed User Information**: Name, email, role, documents, timestamps
✅ **Flexible Filtering**: Filter by status, role, date ranges
✅ **Statistics Dashboard**: Overview of verification metrics
✅ **Audit Trail**: Track who approved/rejected and when
✅ **Document Access**: Direct links to uploaded documents
✅ **User Profile Integration**: Access to user's complete profile
✅ **Pagination Support**: Handle large numbers of requests
✅ **Role-Based Views**: Separate tenant and landlord requests
✅ **Admin Feedback**: Provide detailed feedback to users

---

## 📊 **Admin Dashboard Data**

### **Pending Requests Table:**
| User | Role | Documents | Submitted | Actions |
|------|------|-----------|-----------|---------|
| John Doe | Tenant | 3 docs | 2 hours ago | Approve/Reject |
| Jane Smith | Landlord | 2 docs | 1 hour ago | Approve/Reject |

### **Statistics Overview:**
- **Total Requests**: 150
- **Pending Review**: 25
- **Approved**: 100
- **Rejected**: 25
- **Approval Rate**: 80%

### **Recent Activity:**
- ✅ John Doe - Approved by Admin User (2 hours ago)
- ❌ Jane Smith - Rejected by Admin User (1 hour ago)
- ✅ Mike Johnson - Approved by Admin User (3 hours ago)

---

## 🔒 **Security Notes**

- All endpoints require admin authentication
- Admin can only access verification data
- User personal information is protected
- Document URLs are secure and time-limited
- Audit trail tracks all admin actions
- Role-based access control enforced

---

## 📋 **Admin Workflow**

### **Daily Admin Tasks:**
1. **Check Pending Requests** - Review new submissions
2. **Examine Documents** - Verify document quality and completeness
3. **Make Decisions** - Approve or reject based on criteria
4. **Provide Feedback** - Give clear feedback to users
5. **Monitor Statistics** - Track approval rates and trends

### **Verification Criteria:**
- **Document Quality**: Clear, readable, not blurry
- **Document Completeness**: All required documents present
- **Document Authenticity**: Documents appear genuine
- **User Information**: Matches user profile information
- **Role Requirements**: Documents appropriate for user role

The admin verification system provides complete control over the document verification process! 🔧✅
