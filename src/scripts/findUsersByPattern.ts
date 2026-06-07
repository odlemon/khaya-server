// @ts-nocheck
import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/User";

dotenv.config();

const patterns = process.argv.slice(2).length ? process.argv.slice(2) : ["mukaro", "wisdom", "tafadzwa"];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  for (const k of patterns) {
    const users = await User.find({ email: { $regex: k, $options: "i" } })
      .select("email firstName lastName isVerified isActive")
      .lean();
    if (users.length) {
      console.log(`Pattern "${k}":`);
      for (const u of users) {
        console.log(`  ${u.email} | ${u.firstName} ${u.lastName} | verified=${u.isVerified}`);
      }
    }
  }
  await mongoose.disconnect();
}

main();
