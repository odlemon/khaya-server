// @ts-nocheck
import path from "path";

/** Firebase project khayalami-app — shared with mobile google-services.json */
export const FCM_PROJECT_ID = "khayalami-app";

/** Always on — no env toggle */
export const FCM_ENABLED = true;

/** Android notification channel (matches APK AndroidManifest) */
export const FCM_ANDROID_CHANNEL = "khayalami_messages_bg";
export const FCM_ANDROID_ICON = "ic_stat_notification";
export const FCM_ANDROID_SOUND = "notification_chime";

/**
 * Firebase Admin service account (khayalami-app).
 * File lives at project root — gitignored.
 */
export const FIREBASE_SERVICE_ACCOUNT_PATH = path.join(
  process.cwd(),
  "khayalami-app-firebase-adminsdk-fbsvc-3885e73667.json"
);
