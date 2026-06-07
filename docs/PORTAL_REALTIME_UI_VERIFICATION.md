# Portal Real-Time UI Verification Checklist

Use this document to verify the **Khayalami portal frontend** correctly handles live chat messages **and** notifications. If messages or notifications only appear after a page refresh, the bug is almost always in portal socket/API wiring — not missing backend routes.

**Related implementation guide:** [PORTAL_REALTIME_CHAT_NOTIFICATIONS.md](./PORTAL_REALTIME_CHAT_NOTIFICATIONS.md)

---

## Backend contract (what the server does)

When any user sends a chat message via REST (`POST /api/chat/:chatId/messages` or `POST /api/chat/send`):

1. Message is saved to MongoDB.
2. Socket emits `new_message` to:
   - `chat:{chatId}` room (users who called `join_chat`)
   - `user:{participantId}` rooms (tenant + landlord)
   - **`role:admin` room (all connected Khayalami admins — no join required)**
3. In-app notifications are created for:
   - The intended recipient (tenant or landlord)
   - **Every active admin**
4. Socket emits `notification_created` (and legacy `chat_notification`) to each notified user’s `user:{id}` room.

**If the backend terminal shows `[REALTIME] REST → socket push` and `emit new_message` but the UI does not update, the portal is not handling socket events correctly.**

---

## 1. Environment (local dev)

```env
VITE_API_URL=http://localhost:3002/api
VITE_SOCKET_URL=http://localhost:3002
```

| Check | Pass criteria |
|-------|----------------|
| API calls use `VITE_API_URL` | Network tab shows requests to `:3002`, **not** `:5173` |
| Socket connects to `VITE_SOCKET_URL` | WS/polling to `localhost:3002`, not `5173` |
| After `.env` change | Restart Vite dev server |

**Common failure:** `fetch('/api/notifications/...')` hits Vite on port 5173 → **404**. Must use full API base or Vite proxy.

---

## 2. Socket lifecycle

| Check | Where | Pass criteria |
|-------|-------|----------------|
| Connect after login | Auth success handler | `socketService.connect(token)` called once |
| Disconnect on logout | Logout handler | `socketService.disconnect()` |
| JWT in handshake | `socket.io-client` options | `auth: { token }` |
| Reconnect on token refresh | Auth interceptor | New token passed to socket on refresh |

```javascript
// Must run after EVERY successful login (all roles: tenant, landlord, admin)
import socketService from '@/services/socketService';
socketService.connect(authStore.token);
```

---

## 3. Global listeners (most important)

**Register these once at app level** (e.g. `App.vue`, auth bootstrap, or `useChatRealtime()` called from layout shell) — **not only inside the chat thread component**.

If listeners are only mounted in `ChatThread.vue`, the **chat list and notification bell will not update** until refresh.

### Required listeners

```javascript
function setupRealtimeListeners() {
  const chatStore = useChatStore();
  const notificationStore = useNotificationStore();
  const currentUserId = authStore.user._id;

  socketService.on('new_message', ({ chatId, message }) => {
    // 1. Update open thread if viewing this chat
    chatStore.ingestMessage(chatId, message, currentUserId);

    // 2. Update chat LIST preview + unread (even if thread is closed)
    chatStore.bumpChatPreview(chatId, message);

    // 3. Admin: update admin chat list without refresh
    if (authStore.user.role === 'admin') {
      chatStore.bumpAdminChatPreview(chatId, message);
    }
  });

  socketService.on('notification_created', ({ notification }) => {
    notificationStore.add(notification); // dedupe by _id
    if (!notification.data?.suppressBanner) {
      notificationStore.incrementUnread();
    }
  });

  // User opened/read chat directly (not via notification inbox)
  socketService.on('notifications_marked_read', ({ chatId, notificationIds, unreadCount }) => {
    notificationStore.markReadByChat(chatId, notificationIds);
    notificationStore.setUnreadCount(unreadCount);
  });

  // Legacy alias — listen to ONE or dedupe both
  socketService.on('chat_notification', ({ notification }) => {
    notificationStore.add(notification);
  });

  socketService.on('user_typing', (payload) => chatStore.setTyping(payload));
  socketService.on('messages_read', (payload) => chatStore.applyReadReceipt(payload));
}
```

### `ingestMessage` / store rules

| Rule | Why |
|------|-----|
| Dedupe by `message._id` | Same message may arrive via HTTP response + socket |
| Skip append if `senderId === currentUserId` and already optimistically added | Avoid duplicate own messages |
| Update list even when `activeChatId !== chatId` | **Fixes “only see message after refresh”** |

---

## 4. Chat thread vs chat list

| Screen | Socket action | REST action |
|--------|---------------|-------------|
| **Chat list** (all roles) | Listen `new_message` globally | Initial load: `GET /api/chat` or `GET /api/chat/admin/all-chats` |
| **Chat thread open** | `join_chat(chatId)` on mount | `GET /api/chat/:chatId` |
| **Chat thread close** | `leave_chat(chatId)` on unmount | — |
| **Send message** | — (server pushes via socket) | `POST /api/chat/:chatId/messages` |

**Admin note:** Admin receives live `new_message` via `role:admin` room as soon as socket is connected. Admin does **not** need `join_chat` to see list updates — but should still `join_chat` when opening a thread (typing, read receipts).

---

## 5. Notifications UI

| Check | Endpoint | Pass criteria |
|-------|----------|----------------|
| Bell badge on load | `GET {VITE_API_URL}/notifications/unread-count` | Returns `{ success: true, data: { unreadCount } }` |
| Inbox list | `GET {VITE_API_URL}/notifications?page=1&limit=20` | Returns `data.items[]` |
| Live badge increment | Socket `notification_created` | Badge +1 without refresh |
| Mark read (inbox) | `PUT {VITE_API_URL}/notifications/:id/read` | Badge decreases |
| Mark read (via chat) | `GET .../chat/:chatId` or `PUT .../chat/:chatId/read` | Backend auto-marks notifications for that `chatId` |
| Live badge after opening chat | Socket `notifications_marked_read` | `unreadCount` in payload — update bell without refresh |
| Auth header | All notification requests | `Authorization: Bearer <token>` |

On **401** from notifications API → token expired → redirect to login.

---

## 6. Role-specific test matrix

Run with **three browser sessions** (normal + incognito + another incognito):

| Step | Actor | Expected (no refresh) |
|------|-------|------------------------|
| 1 | Admin | Socket connected; terminal: `admin monitoring room joined` |
| 2 | Tenant | Send message in chat with landlord |
| 3 | Landlord | Sees message in thread + list; notification badge increases |
| 4 | Admin | Sees message in admin chat list + open thread; notification appears |
| 5 | Landlord | Reply to tenant |
| 6 | Tenant | Sees reply live |
| 7 | Admin | Sees reply live |

---

## 7. Browser DevTools checks

### Network tab

| Request | Expected |
|---------|----------|
| `socket.io/?EIO=4&transport=...` | Status 101 (WS) or 200 (polling); host **:3002** |
| `GET .../api/notifications/unread-count` | Status **200**, host **:3002** |
| `POST .../api/chat/.../messages` | Status **201** |

### Console (temporary debug in portal)

```javascript
socketService.on('connect', () => console.log('[portal] socket connected'));
socketService.on('new_message', (p) => console.log('[portal] new_message', p.chatId));
socketService.on('notification_created', (p) => console.log('[portal] notification', p));
```

If backend logs show `emit new_message` but portal console never logs `new_message` → listener not registered or socket not connected.

---

## 8. Common portal mistakes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Message only after refresh | `new_message` listener only in thread component | Move listener to app shell |
| Notifications 404 | API URL points to Vite `:5173` | Use `VITE_API_URL` or proxy |
| Notifications empty, socket works | Not calling REST inbox on load | `fetchNotifications()` on mount |
| Admin no live updates | Socket not connected after admin login | Call `connect(token)` for admin role too |
| Duplicate messages | No dedupe by `_id` | Check `ingestMessage` |
| Socket connect_error | Wrong `VITE_SOCKET_URL` or expired JWT | Fix env; re-login |
| Chat works, notifications don’t | Separate axios instance without auth header | Attach Bearer token |

---

## 9. Backend terminal — what you should see when tenant sends

When portal is wired correctly, backend logs (tenant → landlord):

```text
[REALTIME] REST → socket push | chatId=... messageId=... sender=Tenant Name
[REALTIME] notifying 2 recipient(s) | chatId=... admins=1
[REALTIME] notification dispatch | type=new_message to=Landlord Name from=Tenant Name
[REALTIME] notification dispatch | type=new_message to=System Admin from=Tenant Name
[REALTIME] notification saved | id=... to=Landlord Name
[REALTIME] notification saved | id=... to=System Admin
[REALTIME] emit new_message | ... from=Tenant Name → Landlord Name + all admins
[REALTIME] emit notification_created | to=Landlord Name ...
[REALTIME] emit notification_created | to=System Admin ...
```

If these lines appear but UI is stale → **portal socket/store logic**.

If `REST → socket push` never appears → message did not hit this backend (wrong API URL on tenant side).

---

## 10. Files to audit in portal repo

| Area | What to verify |
|------|----------------|
| `.env` | `VITE_API_URL`, `VITE_SOCKET_URL` |
| `src/services/socketService.js` | Singleton, `auth.token`, connect/disconnect |
| Login flow | `connect(token)` after login for **all roles** |
| `src/stores/chatStore.js` | Global `new_message` → list + thread |
| `src/stores/notificationStore.js` | REST fetch + socket `notification_created` |
| Chat list component | Reacts to store changes (not only REST on mount) |
| Notification bell | Binds to `notificationStore.unreadCount` |
| Admin chat views | Same socket listeners as tenant/landlord |
| `vite.config.js` | Optional `/api` proxy to `:3002` |

---

## 11. Sign-off checklist

- [ ] Socket connects on login (all roles)
- [ ] `new_message` listener registered globally (app shell)
- [ ] Chat list updates without refresh when message arrives
- [ ] Open chat thread updates without refresh
- [ ] Admin sees tenant↔landlord messages without refresh
- [ ] `notification_created` updates bell badge without refresh
- [ ] `GET /notifications` and `/unread-count` return 200 with valid token
- [ ] No API requests go to `localhost:5173` (except Vite assets)
- [ ] Re-login fixes 401 errors

When all boxes pass, real-time chat + notifications are correctly integrated on the portal.
