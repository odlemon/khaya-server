// @ts-nocheck
/**
 * FCM integration test — token storage + Firebase init + optional live push.
 *
 * Run: npx ts-node src/scripts/testFcmSetup.ts
 * With live push: place config/firebase-service-account.json then pass token as arg:
 *   npx ts-node src/scripts/testFcmSetup.ts <fcm_device_token>
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import {
  initializeFirebaseAdmin,
  isFirebaseInitialized,
  isFcmEnabled,
} from "../config/firebaseAdmin";
import { FIREBASE_SERVICE_ACCOUNT_PATH } from "../config/fcmConfig";
import { DeviceToken } from "../models/DeviceToken";
import { User } from "../models/User";
import { pushTokenService } from "../services/PushTokenService";
import { fcmService } from "../services/FcmService";

dotenv.config();

async function main() {
  console.log("=== FCM integration test ===\n");
  console.log(`Service account path: ${FIREBASE_SERVICE_ACCOUNT_PATH}`);

  initializeFirebaseAdmin();

  console.log(`FCM enabled (hardcoded): ${isFcmEnabled()}`);
  console.log(`Firebase initialized: ${isFirebaseInitialized()}\n`);

  await mongoose.connect(process.env.MONGODB_URI!);

  const existingTokens = await DeviceToken.countDocuments();
  console.log(`Device tokens in DB: ${existingTokens}`);

  const user = await User.findOne().select("_id firstName lastName role").lean();
  if (!user) {
    console.error("FAIL: No users in DB");
    process.exit(1);
  }

  const testToken = `test-token-${Date.now()}`;
  const userId = user._id.toString();

  await pushTokenService.upsertToken(userId, testToken, "android");
  const found = await DeviceToken.findOne({ userId: user._id, token: testToken });
  console.log(found ? "PASS: device token upsert" : "FAIL: device token upsert");
  await DeviceToken.deleteOne({ userId: user._id, token: testToken });

  const liveToken = process.argv[2];
  if (liveToken && isFirebaseInitialized()) {
    console.log(`\nSending live test push to token prefix ${liveToken.slice(0, 16)}...`);
    const ok = await fcmService.sendChatPush({
      token: liveToken,
      recipientUserId: userId,
      sender: user,
      landlordId: "",
      message: {
        _id: new mongoose.Types.ObjectId(),
        chatId: new mongoose.Types.ObjectId(),
        content: "FCM test from Khayalami backend",
        messageType: "text",
        createdAt: new Date(),
      },
    });
    console.log(ok ? "PASS: live FCM push sent" : "FAIL: live FCM push");
  } else if (liveToken && !isFirebaseInitialized()) {
    console.log("\nSKIP live push: add config/firebase-service-account.json first");
  } else if (!isFirebaseInitialized()) {
    console.log("\nSKIP live push: no service account file (see config/firebase-service-account.example.json)");
  } else {
    console.log("\nSKIP live push: pass device token as CLI arg to test send");
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
