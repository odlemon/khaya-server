# Portal RBAC — Test credentials (local / dev)

Fixed passwords for frontend RBAC testing. **Emails are not sent** — use these logins directly.

**Backend:** `http://localhost:4002`  
**Login:** `POST /api/auth/login`  
**Seed script:** `npm run seed:rbac-test` (safe to re-run; resets test passwords)

---

## Super-admins (full access — bypass all permission checks)

| Email | Password | Portal | `user.role` | `isSuperAdmin` | Use for |
|-------|----------|--------|-------------|----------------|---------|
| `admin@khaya.com` | `Admin@123456` | khayalami | `admin` | `true` | Khayalami admin — all nav, all APIs |
| `admin@metbank` | `Admin@123` | bank | `bank_admin` | `true` | Bank dashboard — full bank access |
| `admin@insurance.com` | `Admin@123` | `insurance_admin` | `insurance_admin` | `true` | Insurance dashboard — full insurance access |

Create super-admins if missing:

```bash
npm run seed:admin          # admin@khaya.com
npm run seed:portal-admins  # bank + insurance super-admins
```

---

## Khayalami — restricted staff (custom roles)

Password for all accounts below: **`Test@123456`**  
`isSuperAdmin: false` — nav and APIs gated by `permissions[]`.

| Email | Staff role | Permissions (summary) | Frontend test focus |
|-------|------------|----------------------|---------------------|
| `staff.users@khaya.test` | Users Viewer | `dashboard.view`, `users.view` | Sidebar: Dashboard + Users only. No Properties, Payments, Staff, etc. |
| `staff.payments@khaya.test` | Payments Officer | `dashboard.view`, `payments.view`, `payment_requests.view/approve/reject` | Payments + payment requests; no Users/Properties |
| `staff.minimal@khaya.test` | Dashboard Only | `dashboard.view` only | Minimal sidebar — single nav item |
| `staff.manager@khaya.test` | Staff Manager | `dashboard.view`, `staff.roles.manage`, `staff.users.manage` | Settings → Staff roles/users without full super-admin |

### Khayalami — `mustChangePassword` flow

| Email | Password | Staff role | `mustChangePassword` | Test |
|-------|----------|------------|----------------------|------|
| `staff.mustchange@khaya.test` | `Temp@Test1` | Users Viewer | `true` | Blocking password modal on login; `POST /api/auth/change-password` without `currentPassword` |

---

## Bank — restricted staff

| Email | Password | Staff role | Permissions | Frontend test focus |
|-------|----------|------------|-------------|---------------------|
| `staff.bank@khaya.test` | `Test@123456` | Payouts Viewer | `bank.dashboard.view`, `bank.payouts.view` | See payouts list; **no** mark-paid, escrow, insurance payouts |

Super-admin bank login: `admin@metbank` / `Admin@123`

---

## Insurance — restricted staff

| Email | Password | Staff role | Permissions | Frontend test focus |
|-------|----------|------------|-------------|---------------------|
| `staff.insurance@khaya.test` | `Test@123456` | Policies Viewer | `insurance.dashboard.view`, `insurance.policies.view` | Dashboard + policies only |

Super-admin insurance login: `admin@insurance.com` / `Admin@123`

---

## Permission keys per test role (exact)

### Users Viewer (`staff.users@khaya.test`)

```
khayalami.dashboard.view
khayalami.users.view
```

### Payments Officer (`staff.payments@khaya.test`)

```
khayalami.dashboard.view
khayalami.payments.view
khayalami.payment_requests.view
khayalami.payment_requests.approve
khayalami.payment_requests.reject
```

### Dashboard Only (`staff.minimal@khaya.test`)

```
khayalami.dashboard.view
```

### Staff Manager (`staff.manager@khaya.test`)

```
khayalami.dashboard.view
khayalami.staff.roles.manage
khayalami.staff.users.manage
```

### Payouts Viewer (`staff.bank@khaya.test`)

```
bank.dashboard.view
bank.payouts.view
```

### Policies Viewer (`staff.insurance@khaya.test`)

```
insurance.dashboard.view
insurance.policies.view
```

---

## Sample login request

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "staff.users@khaya.test",
  "password": "Test@123456"
}
```

### Expected response shape (restricted staff)

```json
{
  "success": true,
  "token": "...",
  "user": {
    "role": "admin",
    "isSuperAdmin": false,
    "mustChangePassword": false,
    "portal": "khayalami",
    "staffRole": {
      "id": "...",
      "name": "Users Viewer",
      "portal": "khayalami"
    }
  },
  "permissions": [
    "khayalami.dashboard.view",
    "khayalami.users.view"
  ],
  "portal": "khayalami",
  "isSuperAdmin": false,
  "mustChangePassword": false
}
```

---

## Suggested frontend test matrix

| # | Login | Expect sidebar | Expect 403 on |
|---|-------|----------------|---------------|
| 1 | `admin@khaya.com` | All Khayalami items | — |
| 2 | `staff.users@khaya.test` | Dashboard, Users | `/api/admin/properties`, `/api/admin/staff/*` |
| 3 | `staff.payments@khaya.test` | Dashboard, Payments | `/api/admin/users` |
| 4 | `staff.minimal@khaya.test` | Dashboard only | Most `/api/admin/*` |
| 5 | `staff.manager@khaya.test` | Dashboard, Staff settings | `/api/admin/users` (no users.view) |
| 6 | `staff.mustchange@khaya.test` | Blocked until password change | Any route until modal completes |
| 7 | `staff.bank@khaya.test` | Bank: dashboard, payouts | Mark payout paid |
| 8 | `admin@metbank` | All bank items | — |
| 9 | `staff.insurance@khaya.test` | Insurance: dashboard, policies | — |
| 10 | `admin@insurance.com` | All insurance items | — |

---

## Reset / recreate test data

```bash
npm run seed:rbac-test
```

This upserts all roles and staff users above and resets passwords to the values in this document.

---

## Notes

- Test emails use `@khaya.test` so they do not conflict with real tenant/landlord accounts.
- Staff API `POST /api/admin/staff/users` still tries to email credentials; for manual QA use this doc or the seed script instead.
- Super-admins receive **all** permission keys for their portal in the login response (bypass at API layer too).
