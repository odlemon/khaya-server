# Tenant Dashboard - Simple Endpoint

## Single Endpoint
```
GET /api/tenant/dashboard
Authorization: Bearer <tenant_token>
```

## Response Body
```json
{
  "success": true,
  "message": "Tenant dashboard retrieved successfully",
  "data": {
    "rental": {
      "property": {
        "_id": "property123",
        "title": "Modern Apartment",
        "address": "123 Main St, City"
      },
      "landlord": {
        "_id": "landlord123",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "+1234567890"
      },
      "monthlyRent": 1500,
      "nextPaymentDue": "2024-01-01T00:00:00.000Z",
      "status": "active"
    },
    "payments": {
      "totalPaid": 15000,
      "monthlySpending": 1500,
      "pendingPayments": 1,
      "overduePayments": 0,
      "paymentRate": 95.5
    },
    "services": {
      "totalServices": 5,
      "completedServices": 4,
      "pendingServices": 1,
      "totalSpent": 500
    },
    "maintenance": {
      "totalRequests": 3,
      "completedRequests": 2,
      "pendingRequests": 1
    },
    "communication": {
      "activeChats": 2,
      "unreadMessages": 5
    },
    "profile": {
      "completion": 87.5,
      "isVerified": true,
      "missing": ["Date of Birth"]
    }
  }
}
```

## Data Fields Explained

### **Rental**
- `property`: Current property details
- `landlord`: Landlord contact information
- `monthlyRent`: Monthly rent amount
- `nextPaymentDue`: Next payment due date
- `status`: Rental status (active/suspended/ended)

### **Payments**
- `totalPaid`: Total amount paid to date
- `monthlySpending`: Current month spending
- `pendingPayments`: Number of pending payments
- `overduePayments`: Number of overdue payments
- `paymentRate`: Payment reliability percentage

### **Services**
- `totalServices`: Total service bookings
- `completedServices`: Completed services
- `pendingServices`: Pending services
- `totalSpent`: Total spent on services

### **Maintenance**
- `totalRequests`: Total maintenance requests
- `completedRequests`: Completed requests
- `pendingRequests`: Pending requests

### **Communication**
- `activeChats`: Number of active chats
- `unreadMessages`: Number of unread messages

### **Profile**
- `completion`: Profile completion percentage
- `isVerified`: Account verification status
- `missing`: Array of missing profile fields

## Usage Example
```bash
curl -X GET http://localhost:3001/api/tenant/dashboard \
  -H "Authorization: Bearer <tenant_token>"
```

## Frontend Implementation
```javascript
// Fetch tenant dashboard
const fetchDashboard = async () => {
  const response = await fetch('/api/tenant/dashboard', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  return data.data;
};

// Use in React component
const TenantDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  
  useEffect(() => {
    fetchDashboard().then(setDashboard);
  }, []);
  
  if (!dashboard) return <div>Loading...</div>;
  
  return (
    <div className="dashboard">
      <div className="rental-info">
        <h3>{dashboard.rental?.property?.title}</h3>
        <p>Rent: K{dashboard.rental?.monthlyRent}</p>
        <p>Next Payment: {dashboard.rental?.nextPaymentDue}</p>
      </div>
      
      <div className="payments">
        <h3>Payments</h3>
        <p>Total Paid: K{dashboard.payments.totalPaid}</p>
        <p>Monthly: K{dashboard.payments.monthlySpending}</p>
        <p>Rate: {dashboard.payments.paymentRate}%</p>
      </div>
      
      <div className="services">
        <h3>Services</h3>
        <p>Total: {dashboard.services.totalServices}</p>
        <p>Completed: {dashboard.services.completedServices}</p>
        <p>Spent: K{dashboard.services.totalSpent}</p>
      </div>
      
      <div className="maintenance">
        <h3>Maintenance</h3>
        <p>Total: {dashboard.maintenance.totalRequests}</p>
        <p>Completed: {dashboard.maintenance.completedRequests}</p>
        <p>Pending: {dashboard.maintenance.pendingRequests}</p>
      </div>
      
      <div className="communication">
        <h3>Messages</h3>
        <p>Active Chats: {dashboard.communication.activeChats}</p>
        <p>Unread: {dashboard.communication.unreadMessages}</p>
      </div>
      
      <div className="profile">
        <h3>Profile</h3>
        <p>Completion: {dashboard.profile.completion}%</p>
        <p>Verified: {dashboard.profile.isVerified ? 'Yes' : 'No'}</p>
        {dashboard.profile.missing.length > 0 && (
          <p>Missing: {dashboard.profile.missing.join(', ')}</p>
        )}
      </div>
    </div>
  );
};
```

This single endpoint provides all essential tenant dashboard data in one response! 🎯
