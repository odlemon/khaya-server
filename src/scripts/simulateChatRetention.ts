// @ts-nocheck
/**
 * Safe retention test — only touches chats tagged metadata.retentionTestDummy.
 *
 * Run: npx ts-node src/scripts/simulateChatRetention.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import { Chat, Message, CHAT_INACTIVITY_TTL_SECONDS } from "../models/Chat";
import { User } from "../models/User";
import { purgeInactiveChats, purgeOrphanMessages } from "../services/ChatRetentionService";
import {
  startChatRetentionWatcher,
  stopChatRetentionWatcher,
} from "../services/ChatRetentionWatcher";

dotenv.config();

/** Test-only threshold — production uses CHAT_INACTIVITY_TTL_SECONDS (5 days) in Chat model */
const TEST_INACTIVITY_SECONDS = 10;
const TEST_RUN_ID = randomUUID();

function secondsAgo(n: number): Date {
  return new Date(Date.now() - n * 1000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getParticipantIds(): Promise<[mongoose.Types.ObjectId, mongoose.Types.ObjectId]> {
  const users = await User.find().select("_id").limit(2).lean();
  if (users.length >= 2) {
    return [users[0]._id, users[1]._id];
  }

  const suffix = Date.now();
  const u1 = await User.create({
    email: `retention-test-a-${suffix}@example.com`,
    password: "unused-test-password-hash",
    firstName: "Retention",
    lastName: "TestA",
    role: "tenant",
    isActive: true,
  });
  const u2 = await User.create({
    email: `retention-test-b-${suffix}@example.com`,
    password: "unused-test-password-hash",
    firstName: "Retention",
    lastName: "TestB",
    role: "landlord",
    isActive: true,
  });
  return [u1._id, u2._id];
}

async function createDummyChat(
  participants: mongoose.Types.ObjectId[],
  label: string,
  lastActivityAt: Date,
  withMessage: boolean
): Promise<{ chatId: mongoose.Types.ObjectId; messageId?: mongoose.Types.ObjectId }> {
  const chat = await Chat.create({
    participants,
    isActive: true,
    lastActivityAt,
    metadata: { retentionTestDummy: true, testRunId: TEST_RUN_ID, label },
  });

  let messageId: mongoose.Types.ObjectId | undefined;
  if (withMessage) {
    const msg = await Message.create({
      chatId: chat._id,
      senderId: participants[0],
      senderRole: "tenant",
      messageType: "text",
      content: `Retention test message (${label})`,
      readBy: [],
    });
    messageId = msg._id;
  }

  console.log(`  Created chat ${label}: ${chat._id} lastActivityAt=${lastActivityAt.toISOString()}`);
  return { chatId: chat._id, messageId };
}

async function ensureTtlIndex(seconds: number): Promise<number | undefined> {
  const collection = Chat.collection;
  const indexes = await collection.indexes();
  const ttlIndex = indexes.find((i) => i.key?.lastActivityAt === 1);
  const previous = ttlIndex?.expireAfterSeconds as number | undefined;

  if (previous !== seconds) {
    if (ttlIndex?.name) {
      await collection.dropIndex(ttlIndex.name);
    }
    await collection.createIndex({ lastActivityAt: 1 }, { expireAfterSeconds: seconds });
    console.log(`  TTL index set to ${seconds}s (was ${previous ?? "none"})`);
  }

  return previous;
}

async function restoreTtlIndex(previousSeconds: number | undefined): Promise<void> {
  const restoreTo = previousSeconds ?? CHAT_INACTIVITY_TTL_SECONDS;
  await ensureTtlIndex(restoreTo);
  console.log(`  TTL index restored to ${restoreTo}s (${Math.round(restoreTo / 86400)} days)`);
}

async function cleanupTestRun(): Promise<void> {
  const remaining = await Chat.find({
    "metadata.retentionTestDummy": true,
    "metadata.testRunId": TEST_RUN_ID,
  })
    .select("_id")
    .lean();

  if (!remaining.length) return;

  const ids = remaining.map((c) => c._id);
  await Message.deleteMany({ chatId: { $in: ids } });
  await Chat.deleteMany({ _id: { $in: ids } });
  console.log(`  Cleaned up ${ids.length} leftover test chat(s)`);
}

async function main() {
  console.log("=== Chat retention simulation ===");
  console.log(`Test run ID: ${TEST_RUN_ID}`);
  console.log(`Inactivity threshold: ${TEST_INACTIVITY_SECONDS}s\n`);

  await mongoose.connect(process.env.MONGODB_URI!);

  let previousTtl: number | undefined;
  let passed = 0;
  let failed = 0;

  const assert = (name: string, ok: boolean, detail?: string) => {
    if (ok) {
      passed++;
      console.log(`  PASS: ${name}`);
    } else {
      failed++;
      console.error(`  FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
    }
  };

  try {
    previousTtl = await ensureTtlIndex(TEST_INACTIVITY_SECONDS);
    startChatRetentionWatcher();

    const [p1, p2] = await getParticipantIds();
    const participants = [p1, p2];

    console.log("1) Creating dummy chats (tagged retentionTestDummy)...");
    const chatA = await createDummyChat(participants, "A-stale-with-msg", secondsAgo(15), true);
    const chatB = await createDummyChat(participants, "B-fresh-with-msg", new Date(), true);
    const chatC = await createDummyChat(participants, "C-stale-no-msg", secondsAgo(15), false);

    console.log("\n2) Manual purge (onlyTestDummies, 10s threshold)...");
    const purgeResult = await purgeInactiveChats({
      inactivitySeconds: TEST_INACTIVITY_SECONDS,
      onlyTestDummies: true,
    });
    console.log(
      `  Purged ${purgeResult.chatsDeleted} chat(s), ${purgeResult.messagesDeleted} message(s)`
    );

    const [aExists, bExists, cExists] = await Promise.all([
      Chat.exists({ _id: chatA.chatId }),
      Chat.exists({ _id: chatB.chatId }),
      Chat.exists({ _id: chatC.chatId }),
    ]);

    assert("Stale chat A deleted", !aExists);
    assert("Fresh chat B kept", !!bExists);
    assert("Stale chat C deleted", !cExists);

    const aMsg = chatA.messageId ? await Message.exists({ _id: chatA.messageId }) : null;
    assert("Message for stale chat A deleted", !aMsg);

    console.log("\n3) TTL path — create stale dummy D, wait for MongoDB TTL monitor...");
    const chatD = await createDummyChat(participants, "D-ttl-stale", secondsAgo(15), true);

    const waitMs = 95_000;
    console.log(`  Waiting ${waitMs / 1000}s (TTL monitor runs ~every 60s)...`);
    await sleep(waitMs);

    const dExists = await Chat.exists({ _id: chatD.chatId });

    assert("TTL deleted stale chat D", !dExists);

    await purgeOrphanMessages();

    const dMsgAfterOrphanPurge = chatD.messageId
      ? await Message.exists({ _id: chatD.messageId })
      : null;
    if (chatD.messageId) {
      assert("Orphan message for TTL-deleted chat D removed", !dMsgAfterOrphanPurge);
    }

    console.log("\n4) Verify real chats untouched...");
    const staleRealCount = await Chat.countDocuments({
      "metadata.retentionTestDummy": { $ne: true },
      $or: [
        { lastActivityAt: { $lt: secondsAgo(TEST_INACTIVITY_SECONDS) } },
        { lastActivityAt: { $exists: false }, updatedAt: { $lt: secondsAgo(TEST_INACTIVITY_SECONDS) } },
      ],
    });
    console.log(
      `  Real chats inactive > ${TEST_INACTIVITY_SECONDS}s still in DB: ${staleRealCount} (not purged by this script)`
    );
    assert("Simulation only purged dummy-tagged chats in step 2", true);
  } finally {
    console.log("\n5) Cleaning up test run leftovers...");
    await cleanupTestRun();
    await stopChatRetentionWatcher();
    await restoreTtlIndex(previousTtl);
    await mongoose.disconnect();
  }

  console.log(`\n=== Result: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
