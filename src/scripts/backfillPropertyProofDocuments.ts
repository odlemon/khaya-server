// @ts-nocheck
/**
 * One-time script to add propertyProofDocuments field to existing properties.
 * For all Property documents where propertyProofDocuments does not exist,
 * this sets it explicitly to null so the field is present in responses.
 */

import mongoose from "mongoose";
import { Property } from "../models/Property";
import dotenv from "dotenv";

dotenv.config();

async function backfillPropertyProofDocuments() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error("❌ MONGODB_URI not set");
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB\n");

    const filter = { propertyProofDocuments: { $exists: false } } as any;
    const update = { $set: { propertyProofDocuments: null } } as any;

    const result = await Property.updateMany(filter, update);

    console.log("📊 Backfill complete:");
    console.log("  Matched:", result.matchedCount ?? (result as any).nMatched);
    console.log("  Modified:", result.modifiedCount ?? (result as any).nModified);

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  } catch (err) {
    console.error("❌ Error running backfillPropertyProofDocuments:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

backfillPropertyProofDocuments();


