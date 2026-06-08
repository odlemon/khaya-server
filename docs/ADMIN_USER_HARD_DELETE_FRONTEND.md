# Admin User Management — Frontend Implementation

Guide for the **admin portal** to **list users** and **permanently delete** a user plus all related database records.

**Auth:** Admin JWT only (`role: admin`). All routes are under `/api/admin`.

---

## Base URL

**Production (portal proxy):**

```env
VITE_API_URL=https://khayamanage.co.zw/api/backend
```

**Local dev:**

```env
VITE_API_URL=http://localhost:3002/api
```

Admin routes prefix:

```
{VITE_API_URL}/admin
```

Example: `GET https://khayamanage.co.zw/api/backend/admin/users`

---

## Auth header

Every request:

```http
Authorization: Bearer <admin-jwt>
Content-Type: application/json
```

---

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/admin/users` | List users (paginated, searchable) |
| `DELETE` | `/admin/users/:userId` | **Hard delete** user + all related data |

### Related (soft actions — not hard delete)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/admin/users/terminated` | List admin-terminated accounts |
| `POST` | `/admin/users/:userId/terminate` | Soft-disable (keeps row in DB) |
| `POST` | `/admin/users/:userId/reinstate` | Undo termination |

Use **terminate** when you want to block login but keep audit history. Use **hard delete** when the account and all related data must be removed permanently.

---

## 1. List users

```
GET /api/admin/users
```

### Query parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Items per page |
| `role` | string | — | Filter: `tenant`, `landlord`, or `admin` |
| `search` | string | — | Match `firstName`, `lastName`, or `email` (case-insensitive) |
| `isActive` | string | — | `"true"` or `"false"` |

### Example request

```http
GET /api/admin/users?page=1&limit=20&role=landlord&search=choto
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Success response `200`

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "_id": "696e39f2f0761e2780a8f9cd",
        "firstName": "Choto",
        "lastName": "App",
        "email": "chotoappzw@gmail.com",
        "role": "landlord",
        "phone": "+263...",
        "isActive": true,
        "isVerified": true,
        "createdAt": "2026-01-20T10:00:00.000Z",
        "updatedAt": "2026-01-20T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

Password is never returned.

### Notes

- Terminated users (`adminTerminatedAt` set) are **excluded** from this list. Use `GET /admin/users/terminated` for those.
- Sort order: newest first (`createdAt` desc).

---

## 2. Hard delete user

```
DELETE /api/admin/users/:userId
```

**Irreversible.** Deletes the user and related records: properties, chats, messages, payments, invoices, agreements, rentals, notifications, onboarding, auth tokens, etc.

### Example request

```http
DELETE /api/admin/users/696e39f2f0761e2780a8f9cd
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

No request body required.

### Success response `200`

```json
{
  "success": true,
  "message": "User chotoappzw@gmail.com and related data permanently deleted.",
  "data": {
    "user": {
      "id": "696e39f2f0761e2780a8f9cd",
      "email": "chotoappzw@gmail.com",
      "role": "landlord",
      "firstName": "Choto",
      "lastName": "App"
    },
    "deletedCounts": {
      "properties": 2,
      "chats": 1,
      "messagesByChat": 15,
      "notifications": 4,
      "user": 1
    }
  }
}
```

`deletedCounts` only includes collections that had rows deleted (empty collections are omitted).

### Error responses

| HTTP | Message | When |
|------|---------|------|
| `400` | `Invalid user ID` | Malformed `:userId` |
| `400` | `You cannot delete your own account.` | Admin tries to delete themselves |
| `403` | `Admin accounts cannot be hard-deleted via this endpoint.` | Target user is `admin` |
| `404` | `User not found` | No user with that ID |
| `401` | Auth errors | Missing/invalid token or non-admin |
| `503` | `Database temporarily unavailable. Please retry.` | DB blip — retry, do not assume delete succeeded |

---

## API service (copy-paste)

```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/** List users for admin table */
export async function fetchAdminUsers(token, { page = 1, limit = 20, role, search, isActive } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (role) params.set('role', role);
  if (search) params.set('search', search);
  if (isActive !== undefined) params.set('isActive', String(isActive));

  const res = await fetch(`${API_URL}/admin/users?${params}`, {
    headers: authHeaders(token),
  });

  const json = await res.json();
  if (!res.ok) throw Object.assign(new Error(json.message || 'Request failed'), { response: res, data: json });
  return json.data; // { users, pagination }
}

/** Permanently delete user and all related data */
export async function hardDeleteAdminUser(token, userId) {
  const res = await fetch(`${API_URL}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });

  const json = await res.json();
  if (!res.ok) throw Object.assign(new Error(json.message || 'Delete failed'), { response: res, data: json });
  return json.data; // { user, deletedCounts }
}
```

### Axios variant

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/admin`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // or your auth store
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const listUsers = (params) => api.get('/users', { params }).then((r) => r.data.data);
export const hardDeleteUser = (userId) => api.delete(`/users/${userId}`).then((r) => r.data.data);
```

---

## UI recommendations

### Users table

| Column | Source |
|--------|--------|
| Name | `firstName` + `lastName` |
| Email | `email` |
| Role | `role` |
| Status | `isActive`, `isVerified` |
| Joined | `createdAt` |
| Actions | Delete button |

### Delete flow (required UX)

Hard delete is permanent. Use a **two-step confirmation**:

1. Click **Delete permanently** on a row.
2. Modal shows user email + name and warns that properties, chats, payments, etc. will be removed.
3. Optional: require typing the user's email to enable the confirm button.
4. Call `DELETE /admin/users/:userId`.
5. On success: remove row from table or refetch list; show toast with `message`.
6. On error: show `response.data.message` — do not retry delete on `404` (already gone).

```javascript
async function onConfirmHardDelete(user) {
  try {
    setDeletingId(user._id);
    const result = await hardDeleteAdminUser(token, user._id);
    toast.success(result.user.email + ' deleted permanently');
    refetchUsers();
  } catch (err) {
    toast.error(err.data?.message || err.message);
  } finally {
    setDeletingId(null);
  }
}
```

### Disable delete button when

- Row is the **logged-in admin** (compare `_id` with current user id from JWT/profile).
- Row `role === 'admin'`.
- Delete request is in flight.

### Terminate vs hard delete (admin copy)

| Action | Endpoint | Reversible | Data kept |
|--------|----------|------------|-----------|
| Terminate | `POST .../terminate` | Yes (reinstate) | User row + audit |
| Hard delete | `DELETE .../:userId` | **No** | Nothing |

---

## Example: React admin page sketch

```jsx
import { useEffect, useState } from 'react';
import { fetchAdminUsers, hardDeleteAdminUser } from '@/services/adminUsers';

export function AdminUsersPage({ token, currentUserId }) {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);

  async function load(page = 1) {
    setLoading(true);
    try {
      const data = await fetchAdminUsers(token, { page, limit: 20, search, role: role || undefined });
      setUsers(data.users);
      setPagination(data.pagination);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(1); }, [search, role]);

  async function handleDelete(user) {
    if (!window.confirm(`Permanently delete ${user.email}? This cannot be undone.`)) return;
    await hardDeleteAdminUser(token, user._id);
    load(pagination.page);
  }

  return (
    <div>
      <input placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="">All roles</option>
        <option value="tenant">Tenant</option>
        <option value="landlord">Landlord</option>
        <option value="admin">Admin</option>
      </select>

      <table>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              <td>{u.firstName} {u.lastName}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>
                <button
                  disabled={u._id === currentUserId || u.role === 'admin'}
                  onClick={() => handleDelete(u)}
                >
                  Delete permanently
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>Prev</button>
      <span>Page {pagination.page} of {pagination.pages}</span>
      <button disabled={pagination.page >= pagination.pages} onClick={() => load(pagination.page + 1)}>Next</button>
    </div>
  );
}
```

---

## Checklist

- [ ] Admin-only route guard in the portal (`role === 'admin'`)
- [ ] `VITE_API_URL` points at backend (not Vite dev server in production)
- [ ] List: pagination + search wired to `GET /admin/users`
- [ ] Delete: confirmation modal before `DELETE /admin/users/:userId`
- [ ] Hide/disable delete for current admin and other admins
- [ ] Handle `503` / `DB_UNAVAILABLE` with retry (see [PORTAL_AUTH_TOKEN_DEBUG.md](./PORTAL_AUTH_TOKEN_DEBUG.md))
- [ ] After delete, refresh list or remove row locally
- [ ] Deploy backend with `UserHardDeleteService` before using delete in production

---

## Backend reference

| File | Purpose |
|------|---------|
| `src/routes/adminRoutes.ts` | Route definitions |
| `src/controllers/AdminController.ts` | `getUsers`, `hardDeleteUser` |
| `src/services/UserHardDeleteService.ts` | Cascade delete logic |
