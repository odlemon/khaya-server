// @ts-nocheck
import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/User";
import { EmailVerification } from "../models/EmailVerification";

dotenv.config();

const TARGETS = [
  "ryanndadzungira@gmail.com",
  "gilbertfarayichimoto@yahoo.com",
];

const KEYWORDS = [
  "ryan",
  "dadzung",
  "dazung",
  "dzung",
  "zungira",
  "gilbert",
  "farayi",
  "faray",
  "chimoto",
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("=== EXACT EMAIL LOOKUP (users) ===\n");

  for (const email of TARGETS) {
    const u = await User.findOne({ email: email.toLowerCase() }).lean();
    console.log(
      email + ":",
      u
        ? `FOUND - ${u.firstName} ${u.lastName}, role=${u.role}, verified=${u.isVerified}, active=${u.isActive}, id=${u._id}`
        : "NOT FOUND"
    );
  }

  console.log("\n=== EXACT EMAIL LOOKUP (pending verifications) ===\n");

  for (const email of TARGETS) {
    const records = await EmailVerification.find({ email: email.toLowerCase() })
      .sort({ createdAt: -1 })
      .lean();

    if (!records.length) {
      console.log(`${email}: no verification records`);
      continue;
    }

    for (const r of records) {
      console.log(
        `${email}: pin=${r.pin}, used=${r.isUsed}, role=${r.role}, name=${r.firstName} ${r.lastName}, created=${r.createdAt}, expires=${r.expiresAt}`
      );
    }
  }

  console.log("\n=== FUZZY USER SEARCH (keywords) ===\n");

  const or = KEYWORDS.flatMap((k) => [
    { email: { $regex: k, $options: "i" } },
    { firstName: { $regex: k, $options: "i" } },
    { lastName: { $regex: k, $options: "i" } },
  ]);

  const users = await User.find({ $or: or })
    .select("email firstName lastName role isVerified isActive createdAt")
    .sort({ email: 1 })
    .lean();

  if (!users.length) {
    console.log("No similar users found");
  } else {
    for (const u of users) {
      console.log(
        `- ${u.email} | ${u.firstName} ${u.lastName} | role=${u.role} | verified=${u.isVerified} | created=${u.createdAt}`
      );
    }
  }

  console.log("\n=== FUZZY VERIFICATION SEARCH (keywords) ===\n");

  const verifs = await EmailVerification.find({
    $or: KEYWORDS.map((k) => ({ email: { $regex: k, $options: "i" } })),
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  if (!verifs.length) {
    console.log("No similar verification records");
  } else {
    for (const v of verifs) {
      console.log(
        `- ${v.email} | ${v.firstName} ${v.lastName} | role=${v.role} | used=${v.isUsed} | pin=${v.pin} | created=${v.createdAt}`
      );
    }
  }

  console.log("\n=== TYPO VARIANT CHECK ===\n");

  const variants = [
    "ryandadzungira@gmail.com",
    "ryanndadzungira@gmail.com",
    "ndadzungira",
    "gilbertfarai",
    "gilbertfarayi",
    "farayichimoto",
    "farainyariechimoto",
  ];

  for (const v of variants) {
    const matchedUsers = await User.find({ email: { $regex: v, $options: "i" } })
      .select("email firstName lastName isVerified isActive")
      .lean();
    if (matchedUsers.length) {
      console.log(`Variant "${v}":`);
      for (const x of matchedUsers) {
        console.log(`  [user] ${x.email} | ${x.firstName} ${x.lastName} | verified=${x.isVerified}`);
      }
    }
  }

  console.log("\n=== PATTERN SEARCH (users + verifications) ===\n");

  const patterns = ["dadz", "gilbert", "faray", "chimoto", "ryan", "yahoo"];
  for (const p of patterns) {
    const matchedUsers = await User.find({ email: { $regex: p, $options: "i" } })
      .select("email firstName lastName role isVerified")
      .lean();
    const matchedVerifs = await EmailVerification.find({ email: { $regex: p, $options: "i" } })
      .select("email firstName lastName role isUsed createdAt")
      .lean();

    if (!matchedUsers.length && !matchedVerifs.length) continue;

    console.log(`Pattern "${p}":`);
    for (const x of matchedUsers) {
      console.log(`  [user] ${x.email} | ${x.firstName} ${x.lastName} | verified=${x.isVerified}`);
    }
    for (const x of matchedVerifs) {
      console.log(`  [verify] ${x.email} | ${x.firstName} ${x.lastName} | used=${x.isUsed} | created=${x.createdAt}`);
    }
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
