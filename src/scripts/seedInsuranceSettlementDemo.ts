/**
 * Seed demo data for bank-admin insurance settlement flows.
 *
 * Prerequisites: MONGODB_URI in .env
 * Bank login: run `npm run seed:portal-admins` (e.g. admin@metbank / Admin@123)
 *
 * Run: npm run seed:insurance-settlement
 *
 * Re-running removes ONLY documents this script created before (notes contain
 * "seed:insurance-settlement-demo"). It does not delete other payouts or escrow.
 *
 * Bank admin URLs:
 *   GET /api/bank-admin/payouts              → landlord rent payouts only
 *   GET /api/bank-admin/insurance-payouts    → insurance partner batches
 */

// @ts-nocheck
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Types } from "mongoose";
import { User } from "../models/User";
import { Payment } from "../models/Payment";
import { EscrowTransaction, Payout } from "../models/Escrow";

dotenv.config();

const MARKER = "seed:insurance-settlement-demo";

async function removePreviousSeed() {
  const markerRegex = new RegExp(
    MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    "i",
  );
  const payouts = await Payout.find({ notes: markerRegex }).lean();
  for (const p of payouts) {
    const ids = (p.escrowTransactionIds || []).filter(Boolean);
    if (ids.length) {
      await EscrowTransaction.deleteMany({ _id: { $in: ids } });
    }
  }
  await Payout.deleteMany({ notes: markerRegex });
  await Payment.deleteMany({ notes: markerRegex });
}

async function findOrCreateUser(
  email: string,
  role: "landlord" | "tenant",
  firstName: string,
  lastName: string,
) {
  let u = await User.findOne({ email: email.toLowerCase().trim() });
  if (u) return u;
  u = await User.create({
    email: email.toLowerCase().trim(),
    password: "SeedDemo@123",
    firstName,
    lastName,
    role,
    isVerified: true,
    isActive: true,
  });
  console.log(`✅ Created ${role}: ${u.email}`);
  return u;
}

async function createPaymentAndEscrow(opts: {
  landlordId: Types.ObjectId;
  tenantId: Types.ObjectId;
  totalAmount: number;
  processingFee: number;
  insurancePremium: number;
  subscriptionFee?: number;
  batchNote: string;
  receiptSuffix: string;
}) {
  const sub = opts.subscriptionFee ?? 0;
  const proc = opts.processingFee;
  const ins = opts.insurancePremium;
  const totalDed = sub + proc + ins;
  const landlordAmount = opts.totalAmount - totalDed;

  const payment = await Payment.create({
    landlordId: opts.landlordId,
    tenantId: opts.tenantId,
    paymentType: "rent",
    amount: opts.totalAmount,
    totalAmount: opts.totalAmount,
    paymentMethod: "in_app",
    status: "verified",
    paymentDate: new Date(),
    verifiedAt: new Date(),
    notes: `${MARKER} ${opts.batchNote}`,
    receiptNumber: `REC-SEED-INS-${Date.now()}-${opts.receiptSuffix}`,
  });

  const escrow = await EscrowTransaction.create({
    paymentId: payment._id,
    landlordId: opts.landlordId,
    tenantId: opts.tenantId,
    totalAmount: opts.totalAmount,
    landlordAmount,
    khayalamiAmount: totalDed,
    deductions: {
      subscriptionFee: sub,
      processingFee: proc,
      insurancePremium: ins,
      totalDeductions: totalDed,
    },
    paymentMethod: "in_app",
    paymentType: "rent",
    paymentSource: "in_app",
    status: "distributed",
    distributedAt: new Date(),
    distributedBy: opts.landlordId,
    distributionMethod: "manual",
    landlordPayoutStatus: "paid",
    landlordPayoutDate: new Date(),
    khayalamiPayoutStatus: "paid",
    khayalamiPayoutDate: new Date(),
    revenueSourceIds: [],
    notes: `${MARKER} ${opts.batchNote}`,
  });

  return { payment, escrow };
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("❌ MONGODB_URI is not set");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB\n");

  await removePreviousSeed();
  console.log("🧹 Cleared any previous insurance-settlement seed data\n");

  const landlord = await findOrCreateUser(
    "seed.insurance.landlord@demo.local",
    "landlord",
    "Demo",
    "Landlord",
  );
  const tenant = await findOrCreateUser(
    "seed.insurance.tenant@demo.local",
    "tenant",
    "Demo",
    "Tenant",
  );

  // --- Batch A: modern insurance_partner payout (2 escrow lines) ---
  const batchANote = "batch-A-insurance-partner";
  const a1 = await createPaymentAndEscrow({
    landlordId: landlord._id,
    tenantId: tenant._id,
    totalAmount: 5000,
    processingFee: 150,
    insurancePremium: 200,
    batchNote: batchANote,
    receiptSuffix: "a1",
  });
  const a2 = await createPaymentAndEscrow({
    landlordId: landlord._id,
    tenantId: tenant._id,
    totalAmount: 3200,
    processingFee: 80,
    insurancePremium: 120,
    batchNote: batchANote,
    receiptSuffix: "a2",
  });

  const insuranceTotalA = 200 + 120;
  const payoutA = await Payout.create({
    payoutType: "insurance_partner",
    recipientType: "insurance_partner",
    amount: insuranceTotalA,
    escrowTransactionIds: [a1.escrow._id, a2.escrow._id],
    payoutMethod: "internal_transfer",
    status: "pending",
    distributionBatchId: new Types.ObjectId(),
    notes: `Insurance premium distribution - seed demo (insurance_partner). ${MARKER} ${batchANote}`,
  });

  await EscrowTransaction.updateMany(
    { _id: { $in: [a1.escrow._id, a2.escrow._id] } },
    {
      $set: {
        insurancePartnerPayoutId: payoutA._id,
        insurancePartnerPayoutStatus: "pending",
      },
    },
  );

  console.log("✅ Batch A (insurance_partner):");
  console.log(`   payoutId: ${payoutA._id}`);
  console.log(`   amount: ${insuranceTotalA} (premiums 200 + 120)`);
  console.log(`   escrow lines: 2\n`);

  // --- Batch B: legacy khayalami + insurance notes (1 line, no insurancePartnerPayoutId yet) ---
  const batchBNote = "batch-B-legacy-khayalami-insurance";
  const b1 = await createPaymentAndEscrow({
    landlordId: landlord._id,
    tenantId: tenant._id,
    totalAmount: 4100,
    processingFee: 100,
    insurancePremium: 95,
    batchNote: batchBNote,
    receiptSuffix: "b1",
  });

  const payoutB = await Payout.create({
    payoutType: "khayalami",
    recipientType: "khayalami",
    amount: 95,
    escrowTransactionIds: [b1.escrow._id],
    payoutMethod: "internal_transfer",
    status: "pending",
    distributionBatchId: new Types.ObjectId(),
    notes: `Insurance premium distribution - seed demo (legacy khayalami row). ${MARKER} ${batchBNote}`,
  });

  console.log("✅ Batch B (legacy khayalami insurance notes):");
  console.log(`   payoutId: ${payoutB._id}`);
  console.log(`   amount: 95`);
  console.log(`   isLegacyKhayalamiInsuranceBatch will be true in API\n`);

  // --- Batch C: one completed payout (already settled) ---
  const batchCNote = "batch-C-completed";
  const c1 = await createPaymentAndEscrow({
    landlordId: landlord._id,
    tenantId: tenant._id,
    totalAmount: 2800,
    processingFee: 60,
    insurancePremium: 55,
    batchNote: batchCNote,
    receiptSuffix: "c1",
  });

  const payoutC = await Payout.create({
    payoutType: "insurance_partner",
    recipientType: "insurance_partner",
    amount: 55,
    escrowTransactionIds: [c1.escrow._id],
    payoutMethod: "internal_transfer",
    status: "completed",
    processedAt: new Date(),
    externalReference: "SEED-DEMO-ALREADY-SETTLED",
    distributionBatchId: new Types.ObjectId(),
    notes: `Insurance premium distribution - seed demo (pre-settled). ${MARKER} ${batchCNote}`,
  });

  await EscrowTransaction.updateOne(
    { _id: c1.escrow._id },
    {
      $set: {
        insurancePartnerPayoutId: payoutC._id,
        insurancePartnerPayoutStatus: "paid",
        insurancePartnerPayoutDate: new Date(),
      },
    },
  );

  console.log("✅ Batch C (completed — for list filter testing):");
  console.log(`   payoutId: ${payoutC._id}`);
  console.log(`   status: completed\n`);

  // --- Batch D: landlord payout (same marker) so GET /api/bank-admin/payouts is not empty ---
  const batchDNote = "batch-D-landlord-pending";
  const dTotal = 6000;
  const dProc = 300;
  const dIns = 0;
  const dSub = 0;
  const dDed = dSub + dProc + dIns;
  const dLandlordAmount = dTotal - dDed;

  const paymentD = await Payment.create({
    landlordId: landlord._id,
    tenantId: tenant._id,
    paymentType: "rent",
    amount: dTotal,
    totalAmount: dTotal,
    paymentMethod: "in_app",
    status: "verified",
    paymentDate: new Date(),
    verifiedAt: new Date(),
    notes: `${MARKER} ${batchDNote}`,
    receiptNumber: `REC-SEED-INS-${Date.now()}-d1`,
  });

  const escrowD = await EscrowTransaction.create({
    paymentId: paymentD._id,
    landlordId: landlord._id,
    tenantId: tenant._id,
    totalAmount: dTotal,
    landlordAmount: dLandlordAmount,
    khayalamiAmount: dDed,
    deductions: {
      subscriptionFee: dSub,
      processingFee: dProc,
      insurancePremium: dIns,
      totalDeductions: dDed,
    },
    paymentMethod: "in_app",
    paymentType: "rent",
    paymentSource: "in_app",
    status: "distributed",
    distributedAt: new Date(),
    distributedBy: landlord._id,
    distributionMethod: "manual",
    landlordPayoutStatus: "pending",
    khayalamiPayoutStatus: "paid",
    khayalamiPayoutDate: new Date(),
    revenueSourceIds: [],
    notes: `${MARKER} ${batchDNote}`,
  });

  const payoutD = await Payout.create({
    payoutType: "landlord",
    recipientType: "landlord",
    recipientId: landlord._id,
    amount: dLandlordAmount,
    escrowTransactionIds: [escrowD._id],
    payoutMethod: "internal_transfer",
    status: "pending",
    distributionBatchId: new Types.ObjectId(),
    notes: `Landlord rent payout seed demo. ${MARKER} ${batchDNote}`,
  });

  await EscrowTransaction.updateOne(
    { _id: escrowD._id },
    { $set: { landlordPayoutId: payoutD._id, landlordPayoutStatus: "pending" } },
  );

  console.log("✅ Batch D (landlord /api/bank-admin/payouts):");
  console.log(`   payoutId: ${payoutD._id}`);
  console.log(`   amount: ${dLandlordAmount} (pending landlord settlement)\n`);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Next steps:");
  console.log("  • Login as bank_admin (e.g. admin@metbank / Admin@123)");
  console.log("  • GET /api/bank-admin/payouts?status=pending  (landlord)");
  console.log("  • GET /api/bank-admin/insurance-payouts?status=pending");
  console.log("  • GET /api/bank-admin/insurance-payouts/<payoutId>");
  console.log("  • POST /api/bank-admin/insurance-payouts/<payoutId>/mark-paid");
  console.log(`  • Marker in DB notes: "${MARKER}"`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  });
