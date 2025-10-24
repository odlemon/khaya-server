# Email Verification System - Khayalami

## Overview
The email verification system ensures that all new users verify their email addresses before they can access the platform. Users receive a 6-digit PIN via email and must enter it to activate their accounts.

## 🔧 **System Components**

### **1. EmailVerification Model**
- Stores verification PINs and user data
- 15-minute expiration for security
- Prevents multiple active verifications per email
- TTL index for automatic cleanup

### **2. EmailVerificationService**
- Generates 6-digit PINs
- Sends verification emails via ZeptoMail
- Verifies PINs and activates accounts
- Sends welcome emails after verification

### **3. EmailVerificationController**
- Handles API endpoints for verification
- Validates input data
- Manages verification flow

## 📧 **Email Templates**

### **Verification Email Features:**
- Professional gradient design (purple theme)
- 6-digit PIN prominently displayed
- 15-minute expiration warning
- Role-specific features and benefits
- Security warnings and instructions

### **Welcome Email Features:**
- Personalized welcome message
- Role-specific feature highlights
- Next steps guidance
- Professional branding

## 🚀 **API Endpoints**

### **1. Send Verification Email**
```
POST /api/email-verification/send
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "tenant"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification email sent successfully",
  "data": {
    "email": "user@example.com",
    "expiresAt": "2024-01-01T12:15:00.000Z"
  }
}
```

### **2. Verify PIN**
```
POST /api/email-verification/verify
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "pin": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email verified successfully! Welcome to Khayalami!",
  "data": {
    "user": {
      "_id": "user123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "tenant",
      "isVerified": true
    },
    "verified": true
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid verification PIN. Please check and try again."
}
```

### **3. Resend Verification Email**
```
POST /api/email-verification/resend
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification email sent successfully!"
}
```

## 🔄 **Registration Flow**

### **Updated Registration Process:**

1. **User submits registration form**
2. **System creates user account** (isVerified: false, isActive: false)
3. **System sends verification email** with 6-digit PIN
4. **User receives email** with PIN and instructions
5. **User enters PIN** in app
6. **System verifies PIN** and activates account
7. **System sends welcome email** with role-specific features
8. **User can now login** and access platform

### **Registration Response:**
```json
{
  "success": true,
  "message": "Registration successful! Please check your email (user@example.com) for a 6-digit verification PIN to activate your tenant account.",
  "data": {
    "userId": "user123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "tenant",
    "isVerified": false,
    "requiresEmailVerification": true,
    "message": "Check your email for verification PIN"
  }
}
```

## 🔐 **Login Flow**

### **Updated Login Process:**

1. **User submits login credentials**
2. **System validates credentials**
3. **System checks if account is active**
4. **System checks if email is verified**
5. **If not verified**: Return error with verification requirement
6. **If verified**: Generate JWT token and allow login

### **Login Response (Not Verified):**
```json
{
  "success": false,
  "message": "Email not verified. Please check your email for verification PIN to activate your account.",
  "requiresEmailVerification": true
}
```

### **Login Response (Verified):**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "token": "jwt_token_here",
  "user": {
    "userId": "user123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "tenant",
    "isVerified": true
  }
}
```

## 📧 **Email Configuration**

### **ZeptoMail Setup:**
```typescript
const zeptoUrl = "api.zeptomail.com/";
const zeptoToken = "Zoho-enczapikey YOUR_API_KEY";
const zeptoClient = new SendMailClient({ url: zeptoUrl, token: zeptoToken });
```

### **From Address:**
- **Address**: `noreply@lysp.io`
- **Name**: `Khayalami`

## 🎨 **Email Templates**

### **Verification Email Template:**
- **Subject**: "Verify Your Email - Khayalami"
- **Design**: Purple gradient header
- **PIN Display**: Large, prominent 6-digit PIN
- **Expiration**: 15-minute warning
- **Features**: Role-specific benefits listed
- **Security**: Warning about PIN sharing

### **Welcome Email Template:**
- **Subject**: "Welcome to Khayalami!"
- **Design**: Professional gradient design
- **Content**: Role-specific features and next steps
- **CTA**: Encourages platform engagement

## 🔒 **Security Features**

### **PIN Security:**
- **6-digit numeric PIN**
- **15-minute expiration**
- **Maximum 3 attempts**
- **One-time use only**
- **Automatic cleanup after expiration**

### **Account Security:**
- **Inactive until verified**
- **Cannot login without verification**
- **Email must match registration**
- **Prevents duplicate verifications**

## 📱 **Frontend Implementation**

### **Registration Form:**
```javascript
const handleRegistration = async (formData) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Show verification screen
    setShowVerification(true);
    setUserEmail(result.data.email);
  }
};
```

### **Verification Screen:**
```javascript
const handleVerification = async (pin) => {
  const response = await fetch('/api/email-verification/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userEmail,
      pin: pin
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Redirect to login or dashboard
    router.push('/login');
  } else {
    setError(result.message);
  }
};
```

### **Login with Verification Check:**
```javascript
const handleLogin = async (credentials) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  
  const result = await response.json();
  
  if (result.requiresEmailVerification) {
    // Show verification screen
    setShowVerification(true);
  } else if (result.success) {
    // Store token and redirect
    localStorage.setItem('token', result.token);
    router.push('/dashboard');
  }
};
```

## 🧪 **Testing**

### **Test Registration:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User",
    "role": "tenant"
  }'
```

### **Test Verification:**
```bash
curl -X POST http://localhost:3001/api/email-verification/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "pin": "123456"
  }'
```

### **Test Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 🚨 **Error Handling**

### **Common Errors:**

1. **Invalid PIN:**
   ```json
   {
     "success": false,
     "message": "Invalid verification PIN. Please check and try again."
   }
   ```

2. **Expired PIN:**
   ```json
   {
     "success": false,
     "message": "Verification PIN has expired. Please request a new one."
   }
   ```

3. **Too Many Attempts:**
   ```json
   {
     "success": false,
     "message": "Too many failed attempts. Please request a new verification PIN."
   }
   ```

4. **Email Already Verified:**
   ```json
   {
     "success": false,
     "message": "Email is already verified."
   }
   ```

## 📊 **Database Schema**

### **EmailVerification Collection:**
```javascript
{
  email: String,           // User email (indexed)
  pin: String,            // 6-digit PIN
  role: String,           // tenant/landlord/admin
  firstName: String,      // User first name
  lastName: String,       // User last name
  expiresAt: Date,       // 15 minutes from creation
  isUsed: Boolean,       // Whether PIN was used
  attempts: Number,       // Failed attempts (max 3)
  createdAt: Date,        // Creation timestamp
  verifiedAt: Date        // Verification timestamp
}
```

### **User Collection Updates:**
```javascript
{
  // ... existing fields
  isVerified: Boolean,    // Email verification status
  isActive: Boolean       // Account activation status
}
```

## 🔧 **Configuration**

### **Environment Variables:**
```bash
# ZeptoMail Configuration
ZEPTO_MAIL_URL="api.zeptomail.com/"
ZEPTO_MAIL_TOKEN="Zoho-enczapikey YOUR_API_KEY"
ZEPTO_FROM_ADDRESS="noreply@lysp.io"
ZEPTO_FROM_NAME="Khayalami"

# JWT Configuration
JWT_SECRET="your_jwt_secret"
```

### **PIN Configuration:**
- **Length**: 6 digits
- **Expiration**: 15 minutes
- **Max Attempts**: 3
- **Format**: Numeric only

## 🎯 **Benefits**

### **Security:**
- ✅ Prevents fake email registrations
- ✅ Ensures valid email addresses
- ✅ Reduces spam and abuse
- ✅ Protects user accounts

### **User Experience:**
- ✅ Clear verification process
- ✅ Professional email templates
- ✅ Role-specific welcome messages
- ✅ Helpful error messages

### **Platform Integrity:**
- ✅ Verified user base
- ✅ Reduced fake accounts
- ✅ Better user engagement
- ✅ Improved platform trust

## 🚀 **Deployment Notes**

### **Production Checklist:**
- [ ] Update ZeptoMail API key in environment variables
- [ ] Test email delivery in production
- [ ] Configure email domain authentication (SPF, DKIM, DMARC)
- [ ] Monitor email delivery rates
- [ ] Set up email bounce handling
- [ ] Configure rate limiting for verification requests

### **Monitoring:**
- Track verification email delivery rates
- Monitor PIN verification success rates
- Alert on high failure rates
- Monitor email bounce rates

This email verification system ensures that only users with valid email addresses can access the Khayalami platform, improving security and user quality! 🎯✨
