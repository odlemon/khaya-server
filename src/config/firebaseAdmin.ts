// @ts-nocheck
import admin from "firebase-admin";
import { logger } from "../utils/logger";
import { FCM_ENABLED, FIREBASE_SERVICE_ACCOUNT } from "./fcmConfig";

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
    const credential = admin.credential.cert(
      FIREBASE_SERVICE_ACCOUNT as admin.ServiceAccount
    );
    admin.initializeApp({ credential });
    initialized = true;
    logger.info(
      `[FCM] Firebase Admin initialized (project=${FIREBASE_SERVICE_ACCOUNT.project_id})`
    );
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
