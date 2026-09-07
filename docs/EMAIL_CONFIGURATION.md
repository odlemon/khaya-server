# Email Configuration

Source of truth: `src/config/emailConfig.ts`

## Provider

**ZeptoMail** — transactional email via SMTP (Nodemailer)

## SMTP settings

| Setting | Value |
|---------|-------|
| Host | `smtp.zeptomail.com` |
| Port | `587` |
| Secure | `false` (TLS upgrade on port 587) |
| TLS | `rejectUnauthorized: false` |

## Credentials

| Setting | Value |
|---------|-------|
| Username | `emailapikey` |
| Password / API key | `wSsVR60jq0L4Cqt4mDz/I7s7nllWU1zyQUwsiQOi7iL1TfHH98c7kE3NAQauHfNKQGNgQjEbrbt4mhcIgTFciYgon1pRDCiF9mqRe1U4J3x17qnvhDzNXWRblBKALIoMxw1onGlpGsgj+g==` |

## From address

| Setting | Value |
|---------|-------|
| From email | `noreply@khayalami.co.zw` |

## From display names

| Module | From name | Used by |
|--------|-----------|---------|
| `verification` | `Khayalami` | EmailVerificationService, StaffCredentialEmailService |
| `security` | `Khayalami Security` | TwoFactorAuthService, PasswordResetService |
| `notifications` | `Khayalami` | EmailNotificationService |
| `default` | `Khayalami` | Fallback |

## Services that send mail

1. **EmailVerificationService** — verification PINs, welcome emails
2. **TwoFactorAuthService** — 2FA codes
3. **PasswordResetService** — password reset emails
4. **StaffCredentialEmailService** — staff credential emails
5. **EmailNotificationService** — payments, agreements, rent reminders, admin alerts, escrow, etc.

## Notes

- Credentials are currently **hardcoded** in `src/config/emailConfig.ts` (not loaded from `.env`).
- For production, prefer moving the API key into environment variables.
- To verify the SMTP connection: `verifyEmailConnection()` from `emailConfig.ts`.
