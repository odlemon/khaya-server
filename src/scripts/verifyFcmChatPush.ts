// @ts-nocheck
/**
 * Verify chat notification → FCM pipeline (simulates portal message to a tenant).
 *
 * Run: npx ts-node src/scripts/verifyFcmChatPush.ts
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import {
  initializeFirebaseAdmin,
  isFirebaseInitialized,
} from "../config/firebaseAdmin";
import { DeviceToken } from "../models/DeviceToken";
import { User } from "../models/User";
import { Chat } from "../models/Chat";
import { chatNotificationService } from "../services/ChatNotificationService";

dotenv.config();

async function main() {
  console.log("=== Verify chat → FCM pipeline ===\n");

  initializeFirebaseAdmin();
  console.log(`Firebase initialized: ${isFirebaseInitialized()}\n`);

  await mongoose.connect(process.env.MONGODB_URI!);

  const tokenDoc = await DeviceToken.findOne({ platform: "android" }).lean();
  if (!tokenDoc) {
    console.error("FAIL: No Android device tokens in DB");
    process.exit(1);
  }

  const recipient = await User.findById(tokenDoc.userId)
    .select("_id firstName lastName email role")
    .lean();
  if (!recipient) {
    console.error("FAIL: Token owner not found");
    process.exit(1);
  }

  const chat = await Chat.findOne({ participants: recipient._id }).lean();
  if (!chat) {
    console.error("FAIL: No chat found for token owner");
    process.exit(1);
  }

  const sender = await User.findOne({
    _id: { $in: chat.participants, $ne: recipient._id },
  })
    .select("_id firstName lastName role")
    .lean();

  if (!sender) {
    console.error("FAIL: No other participant in chat");
    process.exit(1);
  }

  const messageId = new mongoose.Types.ObjectId();
  const content = `Portal FCM verify ${new Date().toISOString()}`;

  console.log(`Recipient: ${recipient.firstName} ${recipient.lastName} (${recipient.email})`);
  console.log(`Sender: ${sender.firstName} ${sender.lastName}`);
  console.log(`Chat: ${chat._id}`);
  console.log(`MessageId: ${messageId}\n`);

  await chatNotificationService.dispatch({
    type: "new_message",
    recipientId: recipient._id.toString(),
    senderId: sender._id.toString(),
    chatId: chat._id.toString(),
    propertyId: chat.propertyId?.toString?.() || "",
    messageContent: content,
    messageType: "text",
    landlordId: "",
    data: { messageId, isPrivate: false },
  });

  console.log("\nDone — check logs above for [FCM] send/delivered or skip reason.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
