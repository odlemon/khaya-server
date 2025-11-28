

## Overview

This project uses **ZeptoMail** (by Zoho) as the email service provider for sending transactional emails. The configuration is **hardcoded** in the service files and includes all necessary credentials.

---

## 🔧 Email Service Setup

### **Service Provider: ZeptoMail**

ZeptoMail is a transactional email service by Zoho that provides reliable email delivery for applications.

### **Installation**

The ZeptoMail package is already installed in the project:

```json
"zeptomail": "^6.2.1"
```

No additional configuration needed in `package.json` as it's already included.

---

## 🔐 Hardcoded Credentials

### **ZeptoMail Configuration**

All credentials are **hardcoded** in the service files. Here are the exact values:

#### **ZeptoMail API URL:**
```typescript
const zeptoUrl = "api.zeptomail.com/";
```

#### **ZeptoMail API Token:**
```typescript
const zeptoToken = "Zoho-enczapikey wSsVR61/+xejCqZ6mzOpJuptkQxSVlmgER993FKmuHb7HKiT8MdvxELKDFWmTfJMFmZvRTRAorookUoIgGZa3dUszgsFASiF9mqRe1U4J3x17qnvhDzPX29dmxCAL4wPwQ1jmWVjFc8q+g==";
```

#### **From Address Configuration:**
- **Email Address**: `noreply@lysp.io`
- **Display Name**: 
  - `"Khayalami"` (for verification and welcome emails)
  - `"Khayalami Security"` (for 2FA emails)

---

## 📁 Service Files

### **1. Email Verification Service**

**Location:** `src/services/EmailVerificationService.ts`

#### **Configuration Code:**
```typescript
// ZeptoMail configuration
const zeptoUrl = "api.zeptomail.com/";
const zeptoToken = "Zoho-enczapikey wSsVR61/+xejCqZ6mzOpJuptkQxSVlmgER993FKmuHb7HKiT8MdvxELKDFWmTfJMFmZvRTRAorookUoIgGZa3dUszgsFASiF9mqRe1U4J3x17qnvhDzPX29dmxCAL4wPwQ1jmWVjFc8q+g==";

const zeptoClient = new SendMailClient({ url: zeptoUrl, token: zeptoToken });
```

#### **Usage Example:**
```typescript
// Send verification email
await zeptoClient.sendMail({
  from: {
    address: "noreply@lysp.io",
    name: "Khayalami"
  },
  to: [
    {
      email_address: {
        address: data.email,
        name: `${data.firstName} ${data.lastName}`
      }
    }
  ],
  subject: "Verify Your Email - Khayalami",
  htmlbody: htmlContent
});
```

#### **What This Service Does:**
- ✅ Sends email verification PINs (6-digit codes)
- ✅ Sends welcome emails after verification
- ✅ Manages email verification flow
- ✅ PIN expiration (15 minutes)

---

### **2. Two-Factor Authentication Service**

**Location:** `src/services/TwoFactorAuthService.ts`

#### **Configuration Code:**
```typescript
// ZeptoMail configuration
const zeptoUrl = "api.zeptomail.com/";
const zeptoToken = "Zoho-enczapikey wSsVR61/+xejCqZ6mzOpJuptkQxSVlmgER993FKmuHb7HKiT8MdvxELKDFWmTfJMFmZvRTRAorookUoIgGZa3dUszgsFASiF9mqRe1U4J3x17qnvhDzPX29dmxCAL4wPwQ1jmWVjFc8q+g==";

const zeptoClient = new SendMailClient({ url: zeptoUrl, token: zeptoToken });
```

#### **Usage Example:**
```typescript
// Send 2FA verification email
await zeptoClient.sendMail({
  from: {
    address: "noreply@lysp.io",
    name: "Khayalami Security"
  },
  to: [
    {
      email_address: {
        address: email,
        name: firstName
      }
    }
  ],
  subject: "Your 2FA Verification Code - Khayalami",
  htmlbody: htmlContent
});
```

#### **What This Service Does:**
- ✅ Sends 2FA verification codes (6-digit PINs)
- ✅ Manages two-factor authentication flow
- ✅ PIN expiration (10 minutes)
- ✅ Security-focused email templates

---

## 📨 Email Templates

### **1. Verification Email Template**

**Subject:** `"Verify Your Email - Khayalami"`

**Features:**
- Purple gradient header design
- Large, prominent 6-digit PIN display
- 15-minute expiration warning
- Role-specific features list (tenant/landlord/admin)
- Security warnings
- Professional branding

**Template Location:** `EmailVerificationService.getVerificationEmailTemplate()`

### **2. Welcome Email Template**

**Subject:** `"Welcome to Khayalami!"`

**Features:**
- Professional gradient design
- Role-specific welcome content
- Feature highlights based on user role
- Next steps guidance
- Success confirmation badge

**Template Location:** `EmailVerificationService.getWelcomeEmailTemplate()`

### **3. 2FA Email Template**

**Subject:** `"Your 2FA Verification Code - Khayalami"`

**Features:**
- Security-focused design
- 6-digit verification code display
- 10-minute expiration warning
- Security benefits explanation
- Warning about code sharing

**Template Location:** `TwoFactorAuthService.get2FAEmailTemplate()`

---

## 🔄 Email Flow

### **Email Verification Flow:**

1. **User Registration**
   ```
   User registers → System generates 6-digit PIN → Email sent via ZeptoMail
   ```

2. **PIN Generation**
   ```typescript
   const pin = Math.floor(100000 + Math.random() * 900000).toString();
   ```

3. **Email Sending**
   ```typescript
   await zeptoClient.sendMail({
     from: { address: "noreply@lysp.io", name: "Khayalami" },
     to: [{ email_address: { address: data.email, name: `${data.firstName} ${data.lastName}` } }],
     subject: "Verify Your Email - Khayalami",
     htmlbody: htmlContent
   });
   ```

4. **PIN Verification**
   ```
   User enters PIN → System validates → Account activated → Welcome email sent
   ```

### **2FA Email Flow:**

1. **2FA Request**
   ```
   User requests 2FA → System generates PIN → Email sent via ZeptoMail
   ```

2. **PIN Generation**
   ```typescript
   const pin = Math.floor(100000 + Math.random() * 900000).toString();
   ```

3. **Email Sending**
   ```typescript
   await zeptoClient.sendMail({
     from: { address: "noreply@lysp.io", name: "Khayalami Security" },
     to: [{ email_address: { address: email, name: firstName } }],
     subject: "Your 2FA Verification Code - Khayalami",
     htmlbody: htmlContent
   });
   ```

---

## 🔌 ZeptoMail Client Initialization

### **Full Client Setup:**

```typescript
import { SendMailClient } from "zeptomail";

// Hardcoded configuration
const zeptoUrl = "api.zeptomail.com/";
const zeptoToken = "Zoho-enczapikey wSsVR61/+xejCqZ6mzOpJuptkQxSVlmgER993FKmuHb7HKiT8MdvxELKDFWmTfJMFmZvRTRAorookUoIgGZa3dUszgsFASiF9mqRe1U4J3x17qnvhDzPX29dmxCAL4wPwQ1jmWVjFc8q+g==";

// Initialize client
const zeptoClient = new SendMailClient({ 
  url: zeptoUrl, 
  token: zeptoToken 
});
```

---

## 📋 Complete Configuration Summary

| **Configuration** | **Value** |
|------------------|-----------|
| **Email Service** | ZeptoMail (Zoho) |
| **API URL** | `api.zeptomail.com/` |
| **API Token** | `Zoho-enczapikey wSsVR61/+xejCqZ6mzOpJuptkQxSVlmgER993FKmuHb7HKiT8MdvxELKDFWmTfJMFmZvRTRAorookUoIgGZa3dUszgsFASiF9mqRe1U4J3x17qnvhDzPX29dmxCAL4wPwQ1jmWVjFc8q+g==` |
| **From Address** | `noreply@lysp.io` |
| **From Name (Verification)** | `Khayalami` |
| **From Name (2FA)** | `Khayalami Security` |
| **Package Version** | `^6.2.1` |

---

## 🔍 Where Credentials Are Located

### **File 1: Email Verification Service**
```
📁 src/services/EmailVerificationService.ts
   └── Lines 7-11: ZeptoMail configuration
```

### **File 2: Two-Factor Auth Service**
```
📁 src/services/TwoFactorAuthService.ts
   └── Lines 7-11: ZeptoMail configuration
```

**Both files use the exact same credentials.**

---

## ⚙️ How to Use

### **Sending a Verification Email:**

```typescript
import { EmailVerificationService } from "../services/EmailVerificationService";

const result = await EmailVerificationService.sendVerificationEmail({
  email: "user@example.com",
  firstName: "John",
  lastName: "Doe",
  role: "tenant"
});

console.log(result.pin); // 6-digit PIN (for testing)
console.log(result.expiresAt); // Expiration date
```

### **Sending a 2FA Email:**

```typescript
import { TwoFactorAuthService } from "../services/TwoFactorAuthService";

const result = await TwoFactorAuthService.send2FAEmail(
  userId,
  "user@example.com",
  "John"
);

console.log(result.pin); // 6-digit PIN (for testing)
console.log(result.expiresAt); // Expiration date
```

---

## 🔒 Security Notes

### **Current Implementation:**
- ✅ Credentials are **hardcoded** (not in environment variables)
- ✅ API token is embedded directly in source code
- ✅ Same token used for both verification and 2FA services
- ✅ From address is `noreply@lysp.io`

### **Recommendations (Future Improvements):**
- ⚠️ Consider moving credentials to environment variables for production
- ⚠️ Use separate tokens for different environments (dev/staging/prod)
- ⚠️ Implement credential rotation strategy
- ⚠️ Add rate limiting for email sending
- ⚠️ Monitor email delivery rates

---

## 📊 Email Statistics & Monitoring

### **PIN Details:**

| **Type** | **Length** | **Expiration** | **Attempt Limit** |
|---------|-----------|----------------|-------------------|
| **Email Verification** | 6 digits | 15 minutes | 3 attempts |
| **2FA Verification** | 6 digits | 10 minutes | 3 attempts |

### **Email Sending:**
- All emails are sent **asynchronously**
- Errors are logged to console
- Success messages include PIN (for testing/debugging)

---

## 🛠️ Troubleshooting

### **Common Issues:**

1. **Email Not Received:**
   - Check spam/junk folder
   - Verify email address is correct
   - Check ZeptoMail dashboard for delivery status
   - Verify API token is valid

2. **Token Errors:**
   - Ensure token format is correct: `Zoho-enczapikey <token>`
   - Check if token has expired
   - Verify token permissions in ZeptoMail dashboard

3. **Connection Issues:**
   - Verify API URL is correct: `api.zeptomail.com/`
   - Check network connectivity
   - Review ZeptoMail service status

---

## 📝 Summary

The email system in this project:
- ✅ Uses **ZeptoMail** as the email service provider
- ✅ Has **hardcoded credentials** in both service files
- ✅ Sends **verification emails** and **2FA emails**
- ✅ Uses **professional HTML email templates**
- ✅ Includes **PIN expiration** and **attempt limits**
- ✅ From address: `noreply@lysp.io`
- ✅ Display name: `Khayalami` or `Khayalami Security`

All configuration is ready to use without any additional setup! 🚀







