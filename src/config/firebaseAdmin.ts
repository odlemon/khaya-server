// @ts-nocheck
import fs from "fs";
import admin from "firebase-admin";
import { logger } from "../utils/logger";
import {
  FCM_ENABLED,
  FIREBASE_SERVICE_ACCOUNT_PATH,
} from "./fcmConfig";

let initialized = false;

export function isFcmEnabled(): boolean {
  return FCM_ENABLED;
}

export function isFirebaseInitialized(): boolean {
  return initialized && admin.apps.length > 0;
}

export function initializeFirebaseAdmin(): void {
  if (!FCM_ENABLED) {
    return;
  }

  if (admin.apps.length) {
    initialized = true;
    return;
  }

  try {
    if (!fs.existsSync(FIREBASE_SERVICE_ACCOUNT_PATH)) {
      logger.warn(
        `[FCM] Service account not found at ${FIREBASE_SERVICE_ACCOUNT_PATH} — push disabled until file is added`
      );
      return;
    }

    const serviceAccount = JSON.parse(
      fs.readFileSync(FIREBASE_SERVICE_ACCOUNT_PATH, "utf8")
    );
    const credential = admin.credential.cert(serviceAccount);

    admin.initializeApp({ credential });
    initialized = true;
    logger.info(`[FCM] Firebase Admin initialized (project=${serviceAccount.project_id})`);
  } catch (error: any) {
    logger.error(`[FCM] Firebase Admin init failed: ${error.message}`);
  }
}

export function getFirebaseMessaging(): admin.messaging.Messaging | null {
  if (!isFirebaseInitialized()) {
    return null;
  }
  return admin.messaging();
}
