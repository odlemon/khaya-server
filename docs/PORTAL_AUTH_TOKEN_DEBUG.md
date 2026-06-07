# Portal Auth Token — Intermittent "Invalid Token" Debug Guide

## Your token is valid

The JWT you provided verifies correctly against the backend `JWT_SECRET`:

| Field | Value |
|-------|-------|
| User | System Admin (`admin@khaya.com`) |
| Role | `admin` |
| Expires | **2026-06-13** (7 days from issue) |
| Status | **Valid signature, not expired** |

So the intermittent `"Invalid or expired token"` after ~5 minutes idle is **not** because the token expired.

---

## Root cause (backend — fixed)

Previously, if **MongoDB** had a brief connection stall after idle (remote VPS DB), `User.findById()` failed and the API returned a generic `"Invalid or expired token"` even though JWT verification succeeded.

**Backend now returns:**

| Code | HTTP | Meaning | Portal action |
|------|------|---------|---------------|
| `TOKEN_EXPIRED` | 401 | JWT actually expired | Redirect to login |
| `TOKEN_INVALID` | 401 | Bad signature / corrupt token | Redirect to login |
| `AUTH_MISSING` | 401 | No Bearer header | Redirect to login |
| `DB_UNAVAILABLE` | 503 | DB blip, token still valid | **Retry request** — do NOT logout |
| `USER_NOT_FOUND` | 401 | User deleted | Redirect to login |

---

## Portal fixes required

### 1. Do not logout on every 401

```javascript
axios.interceptors.response.use(
  (res) => res,
  async (error) => {
    const code = error.response?.data?.code;
    const status = error.response?.status;

    if (status === 503 && code === 'DB_UNAVAILABLE') {
      // Token is still valid — retry once after short delay
      await new Promise((r) => setTimeout(r, 1000));
      return axios.request(error.config);
    }

    if (status === 401 && ['TOKEN_EXPIRED', 'TOKEN_INVALID', 'AUTH_MISSING'].includes(code)) {
      authStore.logout();
      router.push('/login');
    }

    return Promise.reject(error);
  }
);
```

### 2. Race on navigation after idle

After tab wakes from idle, ensure token is read from storage **before** API calls:

```javascript
// Bad — fires before Pinia/localStorage hydrates
onMounted(() => fetchChats());

// Good — wait for auth ready
onMounted(async () => {
  await authStore.hydrate();
  if (!authStore.token) return router.push('/login');
  fetchChats();
});
```

### 3. Single axios instance

All API calls (chat, notifications, admin) must use **one** axios instance with the same `Authorization` interceptor. Duplicate instances cause some requests to send stale/empty tokens.

### 4. Trim stored token

```javascript
const token = localStorage.getItem('token')?.trim();
```

### 5. Socket reconnect after idle

When tab becomes visible again, reconnect socket with current token:

```javascript
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && authStore.token) {
    socketService.connect(authStore.token);
  }
});
```

---

## How to verify

1. Login as admin.
2. Leave portal idle 5+ minutes.
3. Navigate to another route.
4. **Backend terminal** — if you see `Auth DB lookup failed` → was DB issue (now returns 503).
5. **Network tab** — check response `code`:
   - `DB_UNAVAILABLE` → portal should retry, not logout
   - `TOKEN_EXPIRED` → portal should logout

---

## Backend env (must match)

```env
JWT_SECRET=5f76g87h98j
JWT_EXPIRES_IN=7d
MONGODB_URI=...
DB_SERVER_SELECTION_TIMEOUT=5000
```

Portal must use the **same backend** that issued the token. A token from `localhost:3002` will fail against production if `JWT_SECRET` differs.
