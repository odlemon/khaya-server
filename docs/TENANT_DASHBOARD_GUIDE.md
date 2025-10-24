# Tenant Dashboard System

## Overview
The Tenant Dashboard provides comprehensive metrics and insights for tenants, including rental information, payment tracking, service management, maintenance requests, and communication status.

## 🏠 **Tenant Dashboard Metrics**

### **1. Rental Overview**
- **Current Rental**: Active rental details with property and landlord info
- **Active Agreements**: Number of active rental agreements
- **Total Rentals**: Historical rental count
- **Rental Stats**: Payment history, condition logs, maintenance requests

### **2. Payment Management**
- **Payment Statistics**: Total, paid, pending, and overdue payments
- **Financial Summary**: Monthly/yearly spending, average payments
- **Recent Payments**: Last 10 payment transactions
- **Upcoming Payments**: Payments due in the next 7 days
- **Overdue Payments**: Past due payments requiring attention

### **3. Service Management**
- **Service Statistics**: Total, completed, and pending services
- **Service Spending**: Total amount spent on services
- **Recent Services**: Last 10 service bookings
- **Pending Services**: Services awaiting approval or completion

### **4. Maintenance Tracking**
- **Maintenance Statistics**: Total, completed, and pending requests
- **Recent Maintenance**: Last 10 maintenance requests
- **Pending Maintenance**: Active maintenance requests
- **Completion Rate**: Percentage of completed maintenance

### **5. Communication Status**
- **Chat Statistics**: Active chats and unread messages
- **Recent Chats**: Last 5 chat conversations
- **Communication Overview**: Chat activity and engagement

### **6. Profile Management**
- **Profile Completion**: Percentage and missing fields
- **Verification Status**: Account verification status
- **Profile Health**: Required information completion

### **7. Financial Overview**
- **Monthly Spending**: Current month payment total
- **Yearly Spending**: Year-to-date payment total
- **Average Monthly**: Historical monthly average
- **Spending Trends**: Payment pattern analysis

### **8. Activity Timeline**
- **Recent Activity**: Combined timeline of payments, services, and maintenance
- **Activity Types**: Payment, service, and maintenance activities
- **Chronological Order**: Most recent activities first

## 📊 **API Endpoints**

### **Main Dashboard**
```
GET /api/tenant/dashboard
Authorization: Bearer <tenant_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Tenant dashboard retrieved successfully",
  "data": {
    "rental": {
      "current": {
        "_id": "rental123",
        "property": {
          "title": "Modern Apartment",
          "address": "123 Main St"
        },
        "landlord": {
          "firstName": "John",
          "lastName": "Doe"
        },
        "status": "active",
        "monthlyRent": 1500,
        "nextPaymentDue": "2024-01-01T00:00:00.000Z"
      },
      "activeAgreements": 1,
      "totalRentals": 2
    },
    "payments": {
      "stats": {
        "totalPayments": 12,
        "paidPayments": 10,
        "pendingPayments": 1,
        "overduePayments": 1,
        "totalPaid": 15000,
        "monthlySpending": 1500,
        "paymentRate": 83.33
      },
      "recent": [...],
      "upcoming": [...],
      "overdue": [...]
    },
    "services": {
      "stats": {
        "totalServices": 5,
        "completedServices": 4,
        "pendingServices": 1,
        "totalSpent": 500,
        "completionRate": 80
      },
      "recent": [...],
      "pending": [...]
    },
    "maintenance": {
      "stats": {
        "totalRequests": 3,
        "completedRequests": 2,
        "pendingRequests": 1,
        "completionRate": 66.67
      },
      "recent": [...],
      "pending": [...]
    },
    "communication": {
      "stats": {
        "activeChats": 2,
        "unreadMessages": 5
      },
      "recent": [...]
    },
    "profile": {
      "completion": {
        "percentage": 87.5,
        "completed": 7,
        "total": 8,
        "missing": ["Date of Birth"]
      },
      "isVerified": true
    },
    "activity": [...],
    "stats": {
      "totalPayments": 12,
      "totalServices": 5,
      "totalMaintenance": 3,
      "activeChats": 2,
      "profileCompletion": 87.5
    }
  }
}
```

### **Payment Summary**
```
GET /api/tenant/payments
Authorization: Bearer <tenant_token>
```

### **Service Summary**
```
GET /api/tenant/services
Authorization: Bearer <tenant_token>
```

### **Maintenance Summary**
```
GET /api/tenant/maintenance
Authorization: Bearer <tenant_token>
```

### **Profile Status**
```
GET /api/tenant/profile
Authorization: Bearer <tenant_token>
```

### **Financial Summary**
```
GET /api/tenant/financial
Authorization: Bearer <tenant_token>
```

### **Recent Activity**
```
GET /api/tenant/activity
Authorization: Bearer <tenant_token>
```

## 🎯 **Key Metrics Explained**

### **Payment Rate**
- **Formula**: `(Paid Payments / Total Payments) * 100`
- **Purpose**: Shows payment reliability
- **Good Range**: 80%+ indicates reliable tenant

### **Service Completion Rate**
- **Formula**: `(Completed Services / Total Services) * 100`
- **Purpose**: Shows service engagement
- **Good Range**: 70%+ indicates active service user

### **Maintenance Completion Rate**
- **Formula**: `(Completed Requests / Total Requests) * 100`
- **Purpose**: Shows maintenance resolution
- **Good Range**: 80%+ indicates good maintenance handling

### **Profile Completion**
- **Formula**: `(Completed Fields / Total Required Fields) * 100`
- **Purpose**: Shows profile completeness
- **Good Range**: 90%+ indicates complete profile

## 📱 **Frontend Implementation**

### **Dashboard Cards**
```javascript
// Payment Overview Card
const PaymentCard = () => {
  const { data } = useFetch('/api/tenant/payments');
  
  return (
    <Card>
      <h3>Payments</h3>
      <div className="stats">
        <div>Total: {data.stats.totalPayments}</div>
        <div>Paid: {data.stats.paidPayments}</div>
        <div>Pending: {data.stats.pendingPayments}</div>
        <div>Overdue: {data.stats.overduePayments}</div>
      </div>
      <div className="rate">
        Payment Rate: {data.stats.paymentRate}%
      </div>
    </Card>
  );
};
```

### **Activity Timeline**
```javascript
// Recent Activity Component
const ActivityTimeline = () => {
  const { data } = useFetch('/api/tenant/activity');
  
  return (
    <div className="timeline">
      {data.map(activity => (
        <div key={activity.id} className="activity-item">
          <div className="type">{activity.type}</div>
          <div className="description">{activity.description}</div>
          <div className="date">{formatDate(activity.date)}</div>
          <div className={`status ${activity.status}`}>
            {activity.status}
          </div>
        </div>
      ))}
    </div>
  );
};
```

### **Profile Completion**
```javascript
// Profile Completion Component
const ProfileCompletion = () => {
  const { data } = useFetch('/api/tenant/profile');
  
  return (
    <div className="profile-completion">
      <div className="progress-bar">
        <div 
          className="progress" 
          style={{ width: `${data.completion.percentage}%` }}
        />
      </div>
      <div className="percentage">{data.completion.percentage}%</div>
      {data.completion.missing.length > 0 && (
        <div className="missing">
          Missing: {data.completion.missing.join(', ')}
        </div>
      )}
    </div>
  );
};
```

## 🔧 **Configuration**

### **Required Environment Variables**
```bash
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
```

### **Authentication**
- All endpoints require tenant authentication
- Use `Authorization: Bearer <token>` header
- Token must be for a user with `role: "tenant"`

## 📈 **Performance Considerations**

### **Caching Strategy**
- Cache dashboard data for 5 minutes
- Use Redis for frequently accessed metrics
- Implement client-side caching for static data

### **Database Optimization**
- Index on `tenantId` for all queries
- Use aggregation pipelines for complex metrics
- Limit result sets to prevent large responses

### **Response Time**
- Target: < 500ms for dashboard load
- Use parallel queries for better performance
- Implement pagination for large datasets

## 🚀 **Usage Examples**

### **Get Full Dashboard**
```bash
curl -X GET http://localhost:3001/api/tenant/dashboard \
  -H "Authorization: Bearer <tenant_token>"
```

### **Get Payment Summary**
```bash
curl -X GET http://localhost:3001/api/tenant/payments \
  -H "Authorization: Bearer <tenant_token>"
```

### **Get Profile Status**
```bash
curl -X GET http://localhost:3001/api/tenant/profile \
  -H "Authorization: Bearer <tenant_token>"
```

## 🎨 **UI/UX Recommendations**

### **Dashboard Layout**
1. **Top Row**: Key metrics cards (payments, services, maintenance)
2. **Middle Row**: Current rental info and upcoming payments
3. **Bottom Row**: Recent activity timeline and profile completion

### **Color Coding**
- **Green**: Completed, paid, verified
- **Yellow**: Pending, upcoming
- **Red**: Overdue, rejected, failed
- **Blue**: In progress, active

### **Interactive Elements**
- Clickable cards for detailed views
- Filter options for activity timeline
- Quick action buttons for common tasks

This tenant dashboard provides a comprehensive view of the tenant's rental experience, helping them stay on top of payments, services, and maintenance while tracking their overall engagement with the platform.
