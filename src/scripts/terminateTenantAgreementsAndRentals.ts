// @ts-nocheck
/**
 * Terminate every open agreement and rental for a tenant.
 *
 * Dry run (default):  npx ts-node src/scripts/terminateTenantAgreementsAndRentals.ts tenant@email.com
 * Apply:              npx ts-node src/scripts/terminateTenantAgreementsAndRentals.ts tenant@email.com --apply
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../models/User";
import { Agreement } from "../models/Agreement";
import { Rental } from "../models/Rental";
import { Payment } from "../models/Payment";
import { Property } from "../models/Property";

dotenv.config();

const OPEN_AGREEMENT_STATUSES = ["active", "signed", "pending", "draft"];
const OPEN_RENTAL_STATUSES = ["active", "suspended"];
const OPEN_PAYMENT_STATUSES = ["pending", "overdue", "disputed"];

async function main() {
  const email = process.argv[2];
  const apply = process.argv.includes("--apply");

  if (!email) {
    throw new Error("Usage: terminateTenantAgreementsAndRentals.ts <email> [--apply]");
  }

  await mongoose.connect(process.env.MONGODB_URI!);

  const tenant = await User.findOne({ email }).select("_id email role firstName lastName");
  if (!tenant) {
    console.log(`No user found for ${email}`);
    await mongoose.disconnect();
    return;
  }

  console.log(
    `${apply ? "APPLY" : "DRY RUN"} | tenant ${tenant.email} (${tenant.role}) id=${tenant._id}\n`
  );

  const agreements = await Agreement.find({
    tenantId: tenant._id,
    status: { $in: OPEN_AGREEMENT_STATUSES },
  });

  const rentals = await Rental.find({
    tenantId: tenant._id,
    status: { $in: OPEN_RENTAL_STATUSES },
  });

  console.log(`Open agreements: ${agreements.length}`);
  for (const a of agreements) {
    console.log(`  ${a._id} status=${a.status} title="${a.title}" property=${a.propertyId}`);
  }

  console.log(`\nOpen rentals: ${rentals.length}`);
  for (const r of rentals) {
    const openPayments = await Payment.countDocuments({
      rentalId: r._id,
      status: { $in: OPEN_PAYMENT_STATUSES },
    });
    console.log(
      `  ${r._id} status=${r.status} agreement=${r.agreementId} property=${r.propertyId} openPayments=${openPayments}`
    );
  }

  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to terminate.");
    await mongoose.disconnect();
    return;
  }

  const now = new Date();
  const touchedPropertyIds = new Set<string>();

  for (const rental of rentals) {
    rental.status = "ended";
    rental.endedAt = now;
    await rental.save();

    const cancelled = await Payment.updateMany(
      { rentalId: rental._id, status: { $in: OPEN_PAYMENT_STATUSES } },
      { $set: { status: "cancelled" } }
    );

    touchedPropertyIds.add(String(rental.propertyId?._id ?? rental.propertyId));
    console.log(
      `Ended rental ${rental._id} | cancelled ${cancelled.modifiedCount} outstanding payment(s)`
    );
  }

  for (const agreement of agreements) {
    agreement.status = "terminated";
    agreement.terminatedAt = now;
    await agreement.save();

    touchedPropertyIds.add(String(agreement.propertyId?._id ?? agreement.propertyId));
    console.log(`Terminated agreement ${agreement._id}`);
  }

  for (const propertyId of touchedPropertyIds) {
    if (!propertyId || propertyId === "undefined") continue;
    await Property.findByIdAndUpdate(propertyId, { status: "inactive" });
    console.log(`Property ${propertyId} set inactive (off search)`);
  }

  const remainingAgreements = await Agreement.countDocuments({
    tenantId: tenant._id,
    status: { $in: OPEN_AGREEMENT_STATUSES },
  });
  const remainingRentals = await Rental.countDocuments({
    tenantId: tenant._id,
    status: { $in: OPEN_RENTAL_STATUSES },
  });

  console.log(
    `\nDone. Remaining open agreements=${remainingAgreements} rentals=${remainingRentals}`
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
