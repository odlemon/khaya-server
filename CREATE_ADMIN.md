# Create Admin Account - Quick Guide

Since MongoDB might not be running locally, here are **3 ways** to create the admin account:

---

## ✅ **Option 1: Via API (Easiest)**

### **Step 1: Register the admin user**

```bash
POST http://localhost:3001/api/auth/register
Content-Type: application/json

{
  "email": "admin@khaya.com",
  "password": "Admin@123456",
  "firstName": "System",
  "lastName": "Admin",
  "role": "admin"
}
```

**Using cURL:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@khaya.com\",\"password\":\"Admin@123456\",\"firstName\":\"System\",\"lastName\":\"Admin\",\"role\":\"admin\"}"
```

**Using PowerShell:**
```powershell
$body = @{
    email = "admin@khaya.com"
    password = "Admin@123456"
    firstName = "System"
    lastName = "Admin"
    role = "admin"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" -Method POST -Body $body -ContentType "application/json"
```

---

## ✅ **Option 2: Update Existing User to Admin**

If you already have an account, make it admin:

### **Step 1: Login with any account**
```bash
POST http://localhost:3001/api/auth/login
{
  "email": "your@email.com",
  "password": "yourpassword"
}
```

### **Step 2: Copy the token from response**

### **Step 3: Update role to admin**
```bash
PUT http://localhost:3001/api/setup/update-role
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "email": "your@email.com",
  "role": "admin"
}
```

---

## ✅ **Option 3: Start MongoDB & Run Seed Script**

### **For Windows:**

1. **Start MongoDB:**
   ```bash
   # If installed as service
   net start MongoDB
   
   # Or manually
   "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath="C:\data\db"
   ```

2. **Run seed script:**
   ```bash
   npm run seed:admin
   ```

### **For macOS/Linux:**

1. **Start MongoDB:**
   ```bash
   # Using brew (macOS)
   brew services start mongodb-community
   
   # Or systemd (Linux)
   sudo systemctl start mongod
   ```

2. **Run seed script:**
   ```bash
   npm run seed:admin
   ```

---

## 🔑 **Admin Credentials**

```
Email:    admin@khaya.com
Password: Admin@123456
```

---

## 🧪 **Test Login**

Once created, test the admin account:

```bash
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "admin@khaya.com",
  "password": "Admin@123456"
}
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "...",
    "email": "admin@khaya.com",
    "firstName": "System",
    "lastName": "Admin",
    "role": "admin"
  }
}
```

---

## ✅ **Verify Admin Access**

Test admin endpoint:

```bash
GET http://localhost:3001/api/chat/admin/all-chats
Authorization: Bearer YOUR_ADMIN_TOKEN
```

If you get chat data, admin account is working! 🎉

---

## 🆘 **Troubleshooting**

**Error: "Connection refused"**
- MongoDB is not running
- Use Option 1 (API registration) instead

**Error: "Email already exists"**
- Account already created
- Use Option 2 (update role) instead
- Or login with the credentials

**Error: "Role validation failed"**
- Backend might restrict admin registration
- Use Option 2 (update role) with setup endpoint

---

**Recommended:** Use **Option 1** if your dev server is running! It's the easiest way.



