// @ts-nocheck
/**
 * One-time: replace full unique index on connections with partial (isActive: true only)
 * so withdrawn rows stay in History when tenant re-applies.
 *
 * Run: npx ts-node --transpile-only src/scripts/migrateConnectionPartialIndex.ts
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Connection } from "../models/Connection";

dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const coll = Connection.collection;
  const indexes = await coll.indexes();
  console.log(
    "Before:",
    indexes.map((i) => ({ name: i.name, key: i.key, unique: i.unique, partial: i.partialFilterExpression }))
  );

  const legacyName = "tenantId_1_landlordId_1_propertyId_1";
  try {
    await coll.dropIndex(legacyName);
    console.log("Dropped legacy index:", legacyName);
  } catch (e: any) {
    if (e?.codeName === "IndexNotFound") {
      console.log("Legacy index already absent");
    } else {
      throw e;
    }
  }

  await Connection.syncIndexes();
  const after = await coll.indexes();
  console.log(
    "After:",
    after.map((i) => ({ name: i.name, key: i.key, unique: i.unique, partial: i.partialFilterExpression }))
  );

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
