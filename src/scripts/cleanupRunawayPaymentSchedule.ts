// @ts-nocheck
/**
 * Remove runaway scheduled rent payments created when test mode stretched
 * a 12-month lease into thousands of 10-minute installments.
 *
 * Keeps the first N pending payments per rental (N = lease months) and deletes the rest.
 *
 * Usage: npx ts-node src/scripts/cleanupRunawayPaymentSchedule.ts [landlordEmail]
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Rental } from "../models/Rental";
import { Payment } from "../models/Payment";
import { User } from "../models/User";
import { countLeaseMonthlyPayments } from "../config/testMode";

dotenv.config();

async function cleanupRunawayPaymentSchedule(landlordEmail?: string) {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is not set");

  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB");

  let landlordId: mongoose.Types.ObjectId | undefined;
  if (landlordEmail) {
    const user = await User.findOne({ email: landlordEmail.toLowerCase() });
    if (!user) throw new Error(`User not found: ${landlordEmail}`);
    landlordId = user._id;
    console.log(`🎯 Landlord: ${user.firstName} ${user.lastName} (${user.email})`);
  }

  const rentalQuery: Record<string, unknown> = {};
  if (landlordId) rentalQuery.landlordId = landlordId;

  const rentals = await Rental.find(rentalQuery);
  let totalDeleted = 0;

  for (const rental of rentals) {
    const expected = countLeaseMonthlyPayments(
      new Date(rental.startDate),
      new Date(rental.endDate)
    );

    const pendingRent = await Payment.find({
      rentalId: rental._id,
      paymentType: "rent",
      status: "pending",
    }).sort({ dueDate: 1 });

    if (pendingRent.length <= expected) continue;

    const toDelete = pendingRent.slice(expected);
    const ids = toDelete.map((p) => p._id);

    console.log(
      `\n🧹 Rental ${rental._id}: ${pendingRent.length} pending → keep ${expected}, delete ${toDelete.length}`
    );

    const result = await Payment.deleteMany({ _id: { $in: ids } });
    totalDeleted += result.deletedCount || 0;

    rental.stats.totalPaymentsDue = expected;
    await rental.save();
  }

  console.log(`\n✅ Deleted ${totalDeleted} duplicate scheduled payment(s)`);
  await mongoose.disconnect();
}

const email = process.argv[2];
cleanupRunawayPaymentSchedule(email)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
