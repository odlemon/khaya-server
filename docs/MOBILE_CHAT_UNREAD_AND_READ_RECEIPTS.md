# Mobile App — Chat Unread Counts & Read Receipts (Landlord + Tenant)

**Audience:** Khayalami **mobile app** only (Vue + Capacitor). The web admin portal is **not** part of this fix.

---

## The bug you saw

**Scenario:** Admin sends a normal message from the **portal** to a chat (landlord + tenant both receive it — not a private `@mention` message).

1. Tenant opens the chat on **mobile** → unread clears for tenant ✓  
2. Landlord on **mobile** still has **not** opened the chat  
3. **Bug:** Landlord’s unread badge also disappeared, or the message showed as “read” for landlord

**Cause:** The mobile app was treating `message.isRead` as global (one read = read for everyone). The backend now tracks **`readBy` per user** — the **mobile app must use that correctly**.

---

## Backend (already fixed)

| API | Behaviour |
|-----|-----------|
| `GET /api/chat` | `unreadCount` on each chat = **unread for the logged-in user only** |
| `GET /api/chat/:chatId` | Each message: `isRead` = **true/false for you only** |
| `PUT /api/chat/:chatId/read` | Marks read **for you only** (adds your user ID to `readBy`) |

When admin sends from portal → tenant and landlord each get their **own** unread count of `1`.

---

## What the mobile app must change

### 1. Chat list — use API `unreadCount` per user

```typescript
// GET /api/chat — after login as tenant OR landlord
const { data } = await chatApi.getChats();
// data[].unreadCount is already per-user — display it directly
```

Do **not** derive unread from a global `message.isRead` on cached messages.

### 2. Opening a chat — mark read for current user only

```typescript
// On open thread
await chatApi.getChat(chatId);        // backend marks read for YOU
// optional explicit:
await chatApi.markChatRead(chatId);   // PUT /api/chat/:chatId/read
```

### 3. Socket `messages_read` — do not clear badge for other users

When the **tenant** reads, the backend emits:

```json
{
  "chatId": "...",
  "messageIds": ["..."],
  "readBy": "tenant-user-id",
  "readAt": "..."
}
```

**Landlord’s app receives this too** (same chat room). The landlord app must **not** clear its unread badge unless `readBy` is the landlord’s own ID.

```typescript
// composables/useChatRealtime.ts
socket.on('messages_read', (payload) => {
  const { chatId, messageIds, readBy } = payload;

  // Optional: show read ticks in open thread
  chatStore.applyReadReceipt({ chatId, messageIds, readBy });

  // CRITICAL — only clear unread when *I* read
  if (readBy === authStore.user._id) {
    chatStore.setChatUnread(chatId, 0);
  }
  // If readBy is someone else → do nothing to unread badge
});
```

### 4. Socket `new_message` — increment unread for recipient only

```typescript
socket.on('new_message', ({ chatId, message }) => {
  const senderId = message.senderId?._id || message.senderId;
  if (senderId?.toString() === currentUserId) return;
  if (activeChatId.value === chatId) return;

  chatStore.incrementUnread(chatId); // local + refresh list optional
});
```

### 5. `message.isRead` in thread UI

Use `message.isRead` from **`GET /api/chat/:chatId`** (already per-user).  
Do **not** set `isRead = true` on all messages when `messages_read` fires unless `readBy === me`.

---

## Test checklist (mobile only)

Use **admin portal** to send; test on **two mobile sessions** (or mobile + emulator): tenant + landlord.

| Step | Actor | Expected on mobile |
|------|-------|-------------------|
| 1 | Admin (portal) | Sends public message in chat |
| 2 | Tenant app | Chat list shows **1 unread** |
| 3 | Landlord app | Chat list shows **1 unread** |
| 4 | Tenant app | Opens chat → tenant unread **0** |
| 5 | Landlord app | **Still 1 unread** (do not refresh incorrectly) |
| 6 | Landlord app | Opens chat → landlord unread **0** |

---

## Files to audit (mobile repo)

| File | Check |
|------|-------|
| `stores/chatStore.ts` | `unreadCount` per chat from API; `setChatUnread` / `incrementUnread` |
| `composables/useChatRealtime.ts` | `messages_read` handler respects `readBy === currentUserId` |
| `views/ChatList.vue` | Badge binds to store `unreadCount`, not global `isRead` |
| `views/ChatThread.vue` | Open chat calls `GET /api/chat/:chatId` or `PUT .../read` |
| `services/chatApi.ts` | `getChats`, `getChat`, `markChatRead` |

---

## Legacy data

Older messages may have empty `readBy`. Each user may need to open the chat once so their ID is added to `readBy`. After that, counts stay independent.

---

## Related docs

- [MOBILE_REALTIME_CHAT_NOTIFICATIONS.md](./MOBILE_REALTIME_CHAT_NOTIFICATIONS.md) — socket + notifications (separate from message unread counts)
