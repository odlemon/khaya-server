# Portal RBAC — Frontend Implementation Guide

This document describes how Khayalami, Bank, and Insurance portal frontends should integrate with the backend RBAC system: dynamic staff roles, permission-gated APIs, staff user management, and first-login password changes.

---

## Overview

- **One portal per staff account** — each staff user belongs to exactly one portal: `khayalami`, `bank`, or `insurance`.
- **Role defines portal** — `StaffRole.portal` maps to `User.role`:
  - `khayalami` → `admin`
  - `bank` → `bank_admin`
  - `insurance` → `insurance_admin`
- **Super-admins bypass all permission checks** — legacy portal admins with `isSuperAdmin: true` (or no `staffRoleId`) see every feature.
- **Staff management** lives under **Khayalami Admin → Settings → Staff Management** and is only available to users with staff-management permissions (or super-admins).

---

## Login response

`POST /api/auth/login` (and `GET /api/auth/me` if implemented) returns:

```json
{
  "success": true,
  "token": "<jwt>",
  "user": {
    "userId": "...",
    "email": "staff@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "admin",
    "isSuperAdmin": false,
    "mustChangePassword": true,
    "portal": "khayalami",
    "staffRole": {
      "id": "...",
      "name": "Compliance Officer",
      "portal": "khayalami"
    }
  },
  "permissions": [
    "khayalami.users.view",
    "khayalami.properties.view"
  ],
  "portal": "khayalami",
  "isSuperAdmin": false,
  "mustChangePassword": true
}
```

### Fields to persist in client state

| Field | Use |
|-------|-----|
| `token` | Authorization header: `Bearer <token>` |
| `user.role` | Portal routing (`admin` / `bank_admin` / `insurance_admin`) |
| `portal` | Which dashboard shell to render |
| `permissions` | Menu and action gating |
| `isSuperAdmin` | If `true`, show all nav items and skip client-side permission checks |
| `mustChangePassword` | Block app until password is changed |

### Portal routing after login

| `user.role` | Route to |
|-------------|----------|
| `admin` | Khayalami admin app |
| `bank_admin` | Bank dashboard |
| `insurance_admin` | Insurance dashboard |

Tenant/landlord roles are unchanged.

---

## First-login password change

When `mustChangePassword === true`:

1. Show a blocking modal or dedicated screen immediately after login.
2. Call `POST /api/auth/change-password`:

```json
{
  "newPassword": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}
```

- `currentPassword` is **not required** when `mustChangePassword` is true.
- On success, clear `mustChangePassword` in local state and allow normal navigation.
- For voluntary password changes (not forced), include `currentPassword`.

---

## Permission gating (UI)

### Rule

```ts
function canAccess(permissions: string[], key: string, isSuperAdmin: boolean): boolean {
  return isSuperAdmin || permissions.includes(key);
}
```

Hide nav items, tabs, and action buttons when the user lacks the required permission key. Super-admins always see everything.

### 403 handling

APIs return when permission is denied:

```json
{
  "success": false,
  "message": "Forbidden: insufficient permissions",
  "code": "PERMISSION_DENIED",
  "required": ["khayalami.users.view"]
}
```

Show a friendly **"You don't have access to this feature"** message. Do not retry automatically.

---

## Settings → Staff Management (Khayalami only)

Accessible when `canAccess(permissions, "khayalami.staff.roles.manage", isSuperAdmin)` **or** `canAccess(permissions, "khayalami.staff.users.manage", isSuperAdmin)`.

### Tab: Roles

1. **Portal picker** — `khayalami` | `bank` | `insurance`
2. Load permission catalog from `GET /api/admin/staff/permissions` (or filter client-side by selected portal)
3. Render checkbox tree grouped by module
4. **Create role** — name + selected permissions → `POST /api/admin/staff/roles`
5. **Edit role** — update name/permissions → `PUT /api/admin/staff/roles/:id`
6. **Deactivate** — `DELETE /api/admin/staff/roles/:id` (blocked if users are assigned)

### Tab: Staff Users

1. Optional portal filter
2. **List** — `GET /api/admin/staff/users?portal=khayalami`
3. **Create** — form: firstName, lastName, email, staffRoleId (dropdown filtered by portal)
4. **Update** — change role or active status → `PUT /api/admin/staff/users/:id`
5. **Reset password** — `POST /api/admin/staff/users/:id/reset-password` (emails new temp password)

---

## Staff Management API reference

Base path: `/api/admin/staff`  
Auth: `Bearer` token, `User.role === "admin"`, plus permission keys below.

### GET `/permissions`

**Permission:** `khayalami.staff.roles.manage` OR `khayalami.staff.users.manage`

Returns the full permission catalog grouped by portal and module (for checkbox UI).

### Roles

| Method | Path | Permission | Body |
|--------|------|------------|------|
| GET | `/roles?portal=khayalami` | `khayalami.staff.roles.manage` | — |
| POST | `/roles` | `khayalami.staff.roles.manage` | `{ name, portal, permissions: string[] }` |
| PUT | `/roles/:id` | `khayalami.staff.roles.manage` | `{ name?, permissions?, isActive? }` |
| DELETE | `/roles/:id` | `khayalami.staff.roles.manage` | — |

**Create role example:**

```json
POST /api/admin/staff/roles
{
  "name": "Payments Officer",
  "portal": "khayalami",
  "permissions": [
    "khayalami.dashboard.view",
    "khayalami.payments.view",
    "khayalami.payment_requests.view",
    "khayalami.payment_requests.approve"
  ]
}
```

### Staff users

| Method | Path | Permission | Body |
|--------|------|------------|------|
| GET | `/users?portal=bank` | `khayalami.staff.users.manage` | — |
| POST | `/users` | `khayalami.staff.users.manage` | `{ firstName, lastName, email, staffRoleId }` |
| PUT | `/users/:id` | `khayalami.staff.users.manage` | `{ staffRoleId?, isActive? }` |
| POST | `/users/:id/reset-password` | `khayalami.staff.users.manage` | — |

**Create staff user example:**

```json
POST /api/admin/staff/users
{
  "firstName": "Tendai",
  "lastName": "Moyo",
  "email": "tendai@metbank",
  "staffRoleId": "665f..."
}
```

- **409** if email already exists (tenant, landlord, or staff).
- Credentials are emailed; user logs in with temp password and `mustChangePassword: true`.

---

## Permission-to-menu mapping

### Khayalami Admin

| Nav / section | Permission key(s) |
|---------------|-------------------|
| Dashboard | `khayalami.dashboard.view` |
| Users (list) | `khayalami.users.view` |
| Terminate user | `khayalami.users.terminate` |
| Reinstate user | `khayalami.users.reinstate` |
| Delete user | `khayalami.users.delete` |
| Update user status / profile | `khayalami.users.update_status` |
| Properties (list) | `khayalami.properties.view` |
| Verify property | `khayalami.properties.verify` |
| Reject property | `khayalami.properties.reject` |
| Update property status | `khayalami.properties.update_status` |
| Connections | `khayalami.connections.view` |
| Agreements | `khayalami.agreements.view` |
| Create agreement | `khayalami.agreements.create` |
| From template | `khayalami.agreements.from_template` |
| Generate Word | `khayalami.agreements.generate_word` |
| Documents | `khayalami.documents.view` |
| Verify documents | `khayalami.documents.verify` |
| Reject documents | `khayalami.documents.reject` |
| Payments | `khayalami.payments.view` |
| Payment requests | `khayalami.payment_requests.view` |
| Approve payment request | `khayalami.payment_requests.approve` |
| Reject payment request | `khayalami.payment_requests.reject` |
| Escrow | `khayalami.escrow.view` |
| Distribute escrow | `khayalami.escrow.distribute` |
| Distribution | `khayalami.distribution.view` |
| Manual distribution | `khayalami.distribution.manual` |
| Commissions | `khayalami.commissions.view` |
| Transactions | `khayalami.transactions.view` |
| Maintenance | `khayalami.maintenance.view` |
| Assign vendor (maintenance) | `khayalami.maintenance.assign_vendor` |
| Update ETA | `khayalami.maintenance.update_eta` |
| Mark arrived | `khayalami.maintenance.mark_arrived` |
| Services | `khayalami.services.view` |
| Assign service | `khayalami.services.assign` |
| Approve service | `khayalami.services.approve` |
| Reject service | `khayalami.services.reject` |
| Service billing | `khayalami.services.billing` |
| Service providers | `khayalami.service_providers.view` |
| Create provider | `khayalami.service_providers.create` |
| Edit provider | `khayalami.service_providers.edit` |
| Verify provider | `khayalami.service_providers.verify` |
| Delete provider | `khayalami.service_providers.delete` |
| Chat (list) | `khayalami.chat.view` |
| Join chat | `khayalami.chat.join` |
| Send (admin chat) | `khayalami.chat.send` |
| Reports | `khayalami.reports.view` |
| Analytics | `khayalami.analytics.view` |
| Staff roles (Settings) | `khayalami.staff.roles.manage` |
| Staff users (Settings) | `khayalami.staff.users.manage` |

### Bank Dashboard

| Nav / section | Permission key(s) |
|---------------|-------------------|
| Dashboard / summary | `bank.dashboard.view` |
| Escrow held by landlord | `bank.escrow.view` |
| Landlord payouts (list/detail) | `bank.payouts.view` |
| Mark landlord payout paid | `bank.payouts.mark_paid` |
| Insurance payouts (list/detail) | `bank.insurance_payouts.view` |
| Mark insurance payout paid | `bank.insurance_payouts.mark_paid` |

### Insurance Dashboard

| Nav / section | Permission key(s) |
|---------------|-------------------|
| Dashboard / summary | `insurance.dashboard.view` |
| Policies (list / by property) | `insurance.policies.view` |

---

## Suggested client architecture

```ts
// After login, store in context/store:
interface StaffSession {
  token: string;
  user: LoginUser;
  permissions: string[];
  portal: "khayalami" | "bank" | "insurance" | null;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
}

// Nav config example:
const khayalamiNav = [
  { label: "Dashboard", path: "/dashboard", permission: "khayalami.dashboard.view" },
  { label: "Users", path: "/users", permission: "khayalami.users.view" },
  // ...
];

function visibleNav(items: NavItem[], session: StaffSession) {
  if (session.isSuperAdmin) return items;
  return items.filter((item) => session.permissions.includes(item.permission));
}
```

---

## Migration notes

- Existing portal admin accounts should have `isSuperAdmin: true` so nothing breaks until custom roles are assigned.
- Run `npx ts-node src/scripts/seedPortalAdmins.ts` to seed bank/insurance admins and mark legacy staff as super-admin.
- Staff users created via Settings always have `isSuperAdmin: false` and a `staffRoleId`.

---

## Out of scope (v1)

- One account accessing multiple portals
- Tenant/landlord RBAC
- Audit log UI for staff actions
