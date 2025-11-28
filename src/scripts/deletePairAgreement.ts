// @ts-nocheck
import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../models/User";
import { Agreement } from "../models/Agreement";

dotenv.config();

const TARGET_EMAILS = [
  "farainyariechimoto@gmail.com",
  "brookechimoto@gmail.com"
];

async function deleteAgreementPair() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI environment variable is not defined");
  }

  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB");

  const users = await User.find({
    email: { $in: TARGET_EMAILS }
  });

  if (users.length === 0) {
    console.log("⚠️  No users found with those emails");
    await mongoose.disconnect();
    return;
  }

  const userIds = users.map(u => u._id);

  const agreements = await Agreement.find({
    landlordId: { $in: userIds },
    tenantId: { $in: userIds }
  });

  if (agreements.length === 0) {
    console.log("ℹ️  No agreement found between the two users");
  } else {
    const ids = agreements.map(a => a._id);
    const result = await Agreement.deleteMany({ _id: { $in: ids } });
    console.log(`🗑️  Deleted ${result.deletedCount} agreement(s)`);
  }

  await mongoose.disconnect();
  console.log("✅ Disconnected from MongoDB");
}

deleteAgreementPair()
  .then(() => {
    console.log("✅ Script complete");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });


