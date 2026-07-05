# FCM Backend — Khayalami Chat Push

Backend contract for Android FCM chat notifications (APK v1.0.17+).

---

## Firebase project

| Field | Value |
|-------|--------|
| Project ID | `khayalami-app` |
| Android package | `com.khayalam.com` |

Generate a **service account JSON** from Firebase Console → Project settings → Service accounts → Generate new private key.

---

## Firebase credentials

All FCM settings including the Firebase service account are **hardcoded** in [`src/config/fcmConfig.ts`](../src/config/fcmConfig.ts). No JSON file, env vars, or server setup required.

Deploy as usual (`git pull`, build, restart). FCM initializes automatically on startup.

Verify after deploy:

```bash
curl -s https://khayamanage.co.zw/api/backend/health
```

Expected:

```json
{
  "fcm": {
    "enabled": true,
    "firebaseInitialized": true
  }
}
```

---

## Device token registration

```http
POST /api/notifications/device-token
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "token": "<fcm_registration_token>",
  "platform": "android"
}
```

Response:

```json
{ "success": true, "message": "Device token registered" }
```

Tokens are upserted per `(userId, token)`. Stale tokens are removed automatically when FCM returns invalid-token errors.

---

## When FCM is sent

### Chat messages

After each chat message is saved (portal admin, landlord, tenant, viewing/move-in, connection auto-message), for each eligible recipient:

1. Inbox notification created (badge/history)
2. Socket `notification_created` emitted (with `suppressBanner: true` when FCM active)
3. Socket `new_message` unchanged (foreground realtime)
4. **FCM push** to all Android tokens — unless recipient is actively viewing that chat (`join_chat` on that device)

Skip reasons are logged: `[FCM] skip | reason=no_firebase_init|viewing_chat|no_device_token|...`

### App notifications (non-chat)

These also send FCM when Firebase is initialized and the user has a registered device token:

- `connection_request`, `connection_accepted`, `connection_rejected`, `connection_cancelled`
- `payment_received`
- `maintenance_request`, `maintenance_update`
- `property_submitted`, `property_verified`, `property_rejected`
- `agreement_created`, `agreement_signed`, `agreement_completed`

FCM `data.type` matches the notification type; `data.notificationId` is the inbox record id.

---

## FCM payload shape

```json
{
  "notification": {
    "title": "Jane Tenant",
    "body": "Hello, is the property still available?"
  },
  "data": {
    "type": "chat",
    "messageId": "...",
    "chatId": "...",
    "landlordId": "...",
    "createdAt": "2026-07-04T12:00:00.000Z"
  },
  "android": {
    "priority": "high",
    "notification": {
      "channelId": "khayalami_messages_bg",
      "icon": "ic_stat_notification",
      "sound": "notification_chime"
    }
  }
}
```

All `data.*` values are strings.

---

## Existing notification REST (unchanged)

```http
GET  /api/notifications?page=1&limit=20
GET  /api/notifications/unread-count
PUT  /api/notifications/:id/read
PUT  /api/notifications/read-all
POST /api/notifications/device-token
```

---

## Smoke test

```bash
npx ts-node src/scripts/testFcmSetup.ts
npx ts-node src/scripts/testFcmSetup.ts <fcm_device_token_from_apk>
```

---

## Key backend files

| File | Purpose |
|------|---------|
| `src/config/firebaseAdmin.ts` | Firebase Admin init |
| `src/models/DeviceToken.ts` | Stored FCM tokens |
| `src/models/FcmPushLog.ts` | Idempotency (24h TTL) |
| `src/services/FcmService.ts` | Send + stale token cleanup |
| `src/services/PushTokenService.ts` | Token upsert/delete |
| `src/services/ChatNotificationService.ts` | Orchestrates inbox + socket + FCM (chat) |
| `src/services/AppNotificationService.ts` | Orchestrates inbox + socket + FCM (app events) |
