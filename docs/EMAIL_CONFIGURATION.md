# Email Configuration Documentation

This document describes the email service configuration used in the Khayalami backend application.

## Email Service Provider

**ZeptoMail** - Transactional email service via SMTP

## SMTP Configuration

The application uses Nodemailer to send emails through ZeptoMail's SMTP service.

### SMTP Settings

- **Host**: `smtp.zeptomail.com`
- **Port**: `587`
- **Security**: TLS (Transport Layer Security)
- **Connection Type**: Non-secure connection with TLS upgrade

### Authentication Credentials

- **Username**: `emailapikey`
- **API Key/Password**: `wSsVR60l/RH4Bqx1mjyuJeg/y19XAFj/FUQujlLz6XP8HPnDpscywkDKUVCmHPgdRGNoEjoS8rJ/mR8H1DMN294lyVsCWyiF9mqRe1U4J3x17qnvhDzJWWlZkRqLJYsMxQRunGdhE8on+g==`

## From Domain Configuration

- **Domain**: `kyntaro.com`
- **From Address**: `noreply@kyntaro.com`

All emails sent from the application use the `noreply@kyntaro.com` email address.

## From Name Configuration

Different email types use different sender names for better user experience:

| Email Type | From Name |
|------------|-----------|
| Verification Emails | `Khayalami` |
| Security Emails (2FA) | `Khayalami Security` |
| Notification Emails | `Khayalami` |
| Default | `Khayalami` |

## Configuration File Location

The email configuration is centralized in:
```
src/config/emailConfig.ts
```

## Implementation Details

### Email Transport

The application uses Nodemailer's `createTransport` method to establish the SMTP connection:

```typescript
import nodemailer from 'nodemailer';

const emailTransport = nodemailer.createTransport({
  host: "smtp.zeptomail.com",
  port: 587,
  secure: false, // Use TLS for port 587
  auth: {
    user: "emailapikey",
    pass: "wSsVR60l/RH4Bqx1mjyuJeg/y19XAFj/FUQujlLz6XP8HPnDpscywkDKUVCmHPgdRGNoEjoS8rJ/mR8H1DMN294lyVsCWyiF9mqRe1U4J3x17qnvhDzJWWlZkRqLJYsMxQRunGdhE8on+g=="
  },
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates if needed
  }
});
```

### Services Using Email Configuration

The following services use the email configuration:

1. **EmailVerificationService** (`src/services/EmailVerificationService.ts`)
   - Sends email verification PINs
   - Sends welcome emails after verification

2. **TwoFactorAuthService** (`src/services/TwoFactorAuthService.ts`)
   - Sends 2FA verification codes

3. **EmailNotificationService** (`src/services/EmailNotificationService.ts`)
   - Payment confirmations
   - Payment requests
   - Payment approvals/rejections
   - Escrow deposit notifications
   - Admin notifications
   - Agreement creation notifications
   - Rent reminder notifications

## Email Format

All emails are sent in HTML format with:
- Professional styling
- Responsive design
- Branded headers and footers
- Clear call-to-action buttons
- Role-specific content (tenant/landlord/admin)

## Testing Email Connection

The configuration includes a helper function to verify the email connection:

```typescript
import { verifyEmailConnection } from '../config/emailConfig';

// Verify connection
const isConnected = await verifyEmailConnection();
if (isConnected) {
  console.log('Email service is ready');
} else {
  console.error('Email service connection failed');
}
```

## Security Notes

⚠️ **Important**: 
- The API key is currently hardcoded in the configuration file
- For production environments, consider moving sensitive credentials to environment variables
- The `rejectUnauthorized: false` setting should be reviewed for production security requirements

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Verify SMTP host and port are correct
   - Check firewall settings
   - Ensure TLS is properly configured

2. **Authentication Failed**
   - Verify API key is correct and active
   - Check if the API key has expired
   - Ensure username is exactly `emailapikey`

3. **Email Not Received**
   - Check spam/junk folders
   - Verify recipient email address is valid
   - Check ZeptoMail dashboard for delivery status
   - Review email service logs

## Support

For issues related to:
- **ZeptoMail Service**: Contact ZeptoMail support
- **Application Email Logic**: Check service logs and error messages
- **Configuration**: Review `src/config/emailConfig.ts`

---

**Last Updated**: January 2025  
**Configuration Version**: 1.0
