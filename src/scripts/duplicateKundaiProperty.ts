// @ts-nocheck
/**
 * Duplicate Kundai Karata's existing property with a new title; copy all other fields; mark verified + published.
 *
 * Usage: npx ts-node src/scripts/duplicateKundaiProperty.ts
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../models/User";
import { Property } from "../models/Property";

dotenv.config();

const NEW_TITLE = "Kundai Karata Residence (Copy)";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  await mongoose.connect(uri);
  console.log("Connected to MongoDB\n");

  let owner = await User.findOne({
    role: "landlord",
    firstName: { $regex: /^kundai$/i },
    lastName: { $regex: /^karata$/i },
  });

  if (!owner) {
    owner = await User.findOne({
      role: "landlord",
      $or: [
        { firstName: { $regex: /kundai/i } },
        { lastName: { $regex: /karata/i } },
      ],
    });
  }

  if (!owner) throw new Error("Landlord Kundai Karata not found");

  console.log(`Landlord: ${owner.firstName} ${owner.lastName} (${owner.email})`);

  const properties = await Property.find({ landlordId: owner._id }).sort({ createdAt: 1 });
  if (!properties.length) {
    throw new Error("No properties found for this landlord");
  }

  console.log(`Found ${properties.length} propert(ies):`);
  properties.forEach((p) => {
    console.log(`  - ${p.title} | status=${p.status} verified=${p.isVerified} id=${p._id}`);
  });

  const source = properties[0];
  const sourceObj = source.toObject();
  delete sourceObj._id;
  delete sourceObj.__v;
  delete sourceObj.createdAt;
  delete sourceObj.updatedAt;

  const existingTitles = new Set(properties.map((p) => p.title.toLowerCase()));
  let newTitle = NEW_TITLE;
  let n = 2;
  while (existingTitles.has(newTitle.toLowerCase())) {
    newTitle = `${NEW_TITLE} ${n}`;
    n++;
  }

  const adminUser = await User.findOne({ role: "admin" }).select("_id");

  const duplicate = new Property({
    ...sourceObj,
    title: newTitle,
    status: "published",
    isVerified: true,
    verifiedAt: new Date(),
    verifiedBy: adminUser?._id,
    rejectedBy: undefined,
    rejectedAt: undefined,
    verificationRejectionReason: undefined,
    adminFeedback: undefined,
    isFeatured: false,
  });

  await duplicate.save();

  console.log("\nDuplicated property created:");
  console.log(`  Source:  "${source.title}" (${source._id})`);
  console.log(`  New:     "${duplicate.title}" (${duplicate._id})`);
  console.log(`  status:  ${duplicate.status}`);
  console.log(`  verified: ${duplicate.isVerified}`);
  console.log(`  price:   ${duplicate.price}`);
  console.log(`  city:    ${duplicate.address?.city}`);

  await mongoose.disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
