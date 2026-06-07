/**
 * Smoke test: notification module + socket registry load correctly.
 * Run: npx ts-node src/scripts/testRealtimeNotifications.ts
 */
// @ts-nocheck
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const { getSocketCorsOrigins } = await import("../utils/socketCors");
  const { emitChatMessageRealtime } = await import("../utils/chatRealtime");
  const { notificationService } = await import("../services/NotificationService");
  const { chatNotificationService } = await import("../services/ChatNotificationService");
  const { Notification } = await import("../models/Notification");

  console.log("socketCors origins:", getSocketCorsOrigins());
  console.log("emitChatMessageRealtime:", typeof emitChatMessageRealtime);
  console.log("notificationService:", typeof notificationService.create);
  console.log("chatNotificationService:", typeof chatNotificationService.dispatch);
  console.log("Notification model:", Notification.modelName);

  // Production health (optional)
  try {
    const res = await fetch("http://31.220.82.129:4002/health");
    const json = await res.json();
    console.log("Production health:", json.status || json);
  } catch (e: any) {
    console.log("Production health check skipped:", e.message);
  }

  console.log("\nSmoke test passed — modules load OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
