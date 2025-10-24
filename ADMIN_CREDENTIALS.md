# Admin Account Credentials

## 🔑 Default Admin Login

```
Email:    admin@khaya.com
Password: Admin@123456
```

---

## 🚀 Creating Admin Account

### **Method 1: Run Seed Script (Recommended)**

```bash
npm run seed:admin
```

This will:
- Create the admin user if it doesn't exist
- Display the credentials in the terminal
- Set up the account with admin role

---

### **Method 2: Manual Creation**

If the seed script doesn't work, you can:

1. **Register a normal account:**
```bash
POST /api/auth/register
{
  "email": "admin@khaya.com",
  "password": "Admin@123456",
  "firstName": "System",
  "lastName": "Admin",
  "role": "admin"
}
```

2. **Or update existing user role:**
```bash
PUT /api/setup/update-role
Authorization: Bearer <any_user_token>
{
  "email": "admin@khaya.com",
  "role": "admin"
}
```

---

## 🔐 Security Notes

1. **Change the password** after first login
2. **Never commit** this file with real production credentials
3. **Use environment variables** for production admin setup
4. **Enable 2FA** if implementing additional security

---

## 🎯 Admin Portal Access

Once logged in, admins can access:

- **Dashboard:** `/`
- **All Chats:** `/chats`
- **User Management:** `/users`
- **Property Management:** `/properties`
- **Connection Management:** `/connections`

---

## 📋 Admin Capabilities

✅ View all chats in the system  
✅ Join any tenant-landlord conversation  
✅ Send public messages (all participants see)  
✅ Send private messages using `@landlord` or `@tenant`  
✅ Monitor all properties and listings  
✅ Manage user accounts and permissions  
✅ View connection requests and status  
✅ Access system analytics and statistics  

---

## 🧪 Testing Admin Features

### **Login as Admin:**
```bash
POST /api/auth/login
{
  "email": "admin@khaya.com",
  "password": "Admin@123456"
}
```

### **View All Chats:**
```bash
GET /api/chat/admin/all-chats
Authorization: Bearer <admin_token>
```

### **Join a Chat:**
```bash
POST /api/chat/admin/join/CHAT_ID
Authorization: Bearer <admin_token>
```

### **Send Private Message:**
```bash
POST /api/chat/CHAT_ID/message
Authorization: Bearer <admin_token>
{
  "content": "@landlord Please verify this property"
}
```

---

## 🆘 Troubleshooting

**Admin account not working?**
1. Run the seed script: `npm run seed:admin`
2. Check if user exists in database
3. Verify role is set to "admin"
4. Try resetting password

**Can't access admin endpoints?**
1. Check JWT token is valid
2. Verify user role is "admin"
3. Check authentication middleware
4. Review server logs for errors

---

## 📝 Notes

- This is the **default admin account** for development
- For production, use a secure password and enable MFA
- Consider implementing admin invitation system
- Monitor admin actions with audit logs

---

**Last Updated:** October 17, 2025



