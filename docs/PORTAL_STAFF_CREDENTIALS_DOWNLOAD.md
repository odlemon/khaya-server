# Staff credentials download (temporary — email down)

While staff credential emails are unreliable, the backend returns the **temporary password in the API response** so the Khayalami admin portal can download a `.txt` file for the operator to share with the new staff user.

Remove this UI once email delivery is stable again.

---

## Backend change

### Create staff user

`POST /api/admin/staff/users`

**201 response (relevant fields):**

```json
{
  "success": true,
  "message": "Staff user created. Email delivery failed — download credentials from the response.",
  "data": {
    "user": { "...": "staff user object without password" },
    "emailSent": false,
    "credentials": {
      "email": "new.staff@example.com",
      "password": "Khaya@abc1231",
      "portal": "khayalami",
      "roleName": "Users Viewer",
      "mustChangePassword": true
    }
  }
}
```

### Reset staff password

`POST /api/admin/staff/users/:id/reset-password`

```json
{
  "success": true,
  "message": "Temporary password generated. Email delivery failed — download credentials from the response.",
  "data": {
    "emailSent": false,
    "credentials": {
      "email": "staff@example.com",
      "password": "Khaya@xyz7891",
      "portal": "bank",
      "roleName": "Payouts Viewer",
      "mustChangePassword": true
    }
  }
}
```

| Field | Meaning |
|-------|---------|
| `emailSent` | `true` if ZeptoMail/SMTP succeeded; usually `false` while email is broken |
| `credentials.email` | Login email |
| `credentials.password` | One-time temporary password (plaintext, only in this response) |
| `credentials.portal` | `khayalami` \| `bank` \| `insurance` |
| `credentials.roleName` | Staff role display name |
| `credentials.mustChangePassword` | Always `true` for new/reset passwords |

**Security:** The password is only returned once in this response. Do not log it to analytics or store it in Redux/localStorage after download.

---

## Frontend updates required

### 1. After create staff user succeeds

On `POST /api/admin/staff/users` → `201`:

1. Keep existing success toast / refresh staff users table.
2. If `data.credentials` is present, **trigger a `.txt` download** (always while this temporary mode is on; or when `emailSent === false`).
3. Optionally show a modal: “Credentials downloaded — share the file securely with the staff member.”

### 2. After reset password succeeds

Same download behaviour for `POST /api/admin/staff/users/:id/reset-password`.

### 3. Suggested `.txt` file contents

```
Khayalami Staff Login Credentials
=================================
Email:    new.staff@example.com
Password: Khaya@abc1231
Portal:   khayalami
Role:     Users Viewer

You must change your password on first login.
Generated: 2026-07-10T10:30:00.000Z
```

### 4. Suggested filename

```
staff-credentials-{email-local-part}-{YYYYMMDD}.txt
```

Example: `staff-credentials-new.staff-20260710.txt`

### 5. Example download helper (browser)

```ts
function downloadStaffCredentialsTxt(credentials: {
  email: string;
  password: string;
  portal: string;
  roleName: string;
}) {
  const generatedAt = new Date().toISOString();
  const content = [
    "Khayalami Staff Login Credentials",
    "=================================",
    `Email:    ${credentials.email}`,
    `Password: ${credentials.password}`,
    `Portal:   ${credentials.portal}`,
    `Role:     ${credentials.roleName}`,
    "",
    "You must change your password on first login.",
    `Generated: ${generatedAt}`,
    "",
  ].join("\n");

  const localPart = credentials.email.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "_");
  const date = generatedAt.slice(0, 10).replace(/-/g, "");
  const filename = `staff-credentials-${localPart}-${date}.txt`;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

### 6. Wire into create / reset handlers

```ts
// After successful create
const res = await api.post("/admin/staff/users", payload);
if (res.data?.data?.credentials) {
  downloadStaffCredentialsTxt(res.data.data.credentials);
  if (!res.data.data.emailSent) {
    toast.info("Email not sent — credentials file downloaded instead.");
  }
}

// After successful reset-password
const res = await api.post(`/admin/staff/users/${id}/reset-password`);
if (res.data?.data?.credentials) {
  downloadStaffCredentialsTxt(res.data.data.credentials);
}
```

### 7. UX checklist

- [ ] Create staff user → auto-download `.txt` with email + password
- [ ] Reset password → auto-download `.txt`
- [ ] Toast distinguishes email sent vs download-only
- [ ] Do not display the password permanently on the page (download is enough; optional one-time copy button is fine)
- [ ] Staff user still has `mustChangePassword: true` on first login

---

## Cleanup later

When email works reliably:

1. Stop returning `credentials` from the API (or gate behind `NODE_ENV === "development"`).
2. Remove the download helper from the portal.
3. Rely on credential email only.
