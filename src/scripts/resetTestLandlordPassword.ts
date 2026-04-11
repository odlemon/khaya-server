/**
 * Find one landlord (test DB) and set password to 12345.
 * npx ts-node src/scripts/resetTestLandlordPassword.ts
 */

import mongoose from "mongoose";
import { User } from "../models/User";
import dotenv from "dotenv";

dotenv.config();

const NEW_PASSWORD = "12345";

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI not set");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  const landlord = await User.findOne({ role: "landlord" }).sort({ createdAt: 1 });

  if (!landlord) {
    console.error("No landlord user found.");
    process.exit(1);
  }

  landlord.password = NEW_PASSWORD;
  landlord.isVerified = true;
  landlord.isActive = true;
  await landlord.save();

  console.log("EMAIL_FOR_LOGIN=" + landlord.email);
  console.log("PASSWORD=" + NEW_PASSWORD);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
