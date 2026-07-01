// @ts-nocheck
/**
 * Create active agreement + rental for rent payment testing.
 * Usage: npx ts-node src/scripts/setupKundaiPaymentTestRental.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import crypto from "crypto";
import { Agreement } from "../models/Agreement";
import { Signature } from "../models/Signature";
import { Rental } from "../models/Rental";
import { Property } from "../models/Property";
import { Payment } from "../models/Payment";
import { User } from "../models/User";
import { rentalService } from "../services/RentalService";
import { agreementFeeService } from "../services/AgreementFeeService";

dotenv.config();

const PROPERTY_TITLE = "Kundai Karata Residence (Copy)";
const LANDLORD_EMAIL = "karatakundai@gmail.com";
const TENANT_EMAIL = "nyashakarata1@gmail.com";

const DUMMY_SIG_URL =
  "https://firebasestorage.googleapis.com/v0/b/khayalami-app.firebasestorage.app/o/signatures%2Ftest-setup-signature.png?alt=media";

async function createDummySignature(
  agreementId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  userRole: "landlord" | "tenant",
  signedAt: Date
) {
  const existing = await Signature.findOne({ agreementId, userRole, isActive: { $ne: false } });
  if (existing) return existing;

  return Signature.create({
    agreementId,
    userId,
    userRole,
    signatureUrl: DUMMY_SIG_URL,
    signatureHash: crypto.createHash("sha256").update(`${agreementId}-${userRole}-test`).digest("hex"),
    signatureType: "uploaded",
    ipAddress: "127.0.0.1",
    userAgent: "setupKundaiPaymentTestRental-script",
    deviceInfo: { type: "script", os: "node", browser: "n/a" },
    signedAt,
    verificationMethod: "none",
    consentGiven: true,
    termsAccepted: true,
    privacyPolicyAccepted: true,
    sessionId: `test-${Date.now()}`,
    isActive: true,
  });
}

async function setup() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("✅ Connected to MongoDB\n");

  const landlord = await User.findOne({ email: LANDLORD_EMAIL });
  const tenant = await User.findOne({ email: TENANT_EMAIL });
  const property = await Property.findOne({ title: PROPERTY_TITLE });

  if (!landlord) throw new Error(`Landlord not found: ${LANDLORD_EMAIL}`);
  if (!tenant) throw new Error(`Tenant not found: ${TENANT_EMAIL}`);
  if (!property) throw new Error(`Property not found: ${PROPERTY_TITLE}`);

  if (!property.landlordId.equals(landlord._id)) {
    throw new Error("Property does not belong to the specified landlord");
  }

  console.log("Landlord:", landlord.firstName, landlord.lastName, landlord._id.toString());
  console.log("Tenant:", tenant.firstName, tenant.lastName, tenant._id.toString());
  console.log("Property:", property.title, property._id.toString(), `rent=$${property.price}`);

  // End any stale active agreement on this property (testing cleanup)
  const stale = await Agreement.find({
    propertyId: property._id,
    status: { $in: ["active", "signed", "pending"] },
  });
  for (const a of stale) {
    console.log(`ℹ️  Ending stale agreement ${a._id} (${a.status})`);
    a.status = "terminated";
    a.terminatedAt = new Date();
    await a.save();
    const staleRental = await Rental.findOne({ agreementId: a._id, status: "active" });
    if (staleRental) {
      staleRental.status = "ended";
      staleRental.endedAt = new Date();
      await staleRental.save();
    }
  }

  const now = new Date();
  const endDate = new Date(now);
  endDate.setFullYear(endDate.getFullYear() + 1);

  const rentAmount = property.price || 1500;
  const agreementFeeAmount = agreementFeeService.calculateFeeForProperty(property);

  const agreement = await Agreement.create({
    propertyId: property._id,
    landlordId: landlord._id,
    tenantId: tenant._id,
    status: "signed",
    type: "tenancy",
    title: property.title,
    description: `Test rental agreement for ${property.title}`,
    startDate: now,
    endDate,
    rentAmount,
    depositAmount: 0,
    zeroDeposit: true,
    agreementFeeAmount,
    agreementFeeStatus: "pending",
    signedAt: now,
    landlordSignature: {
      signedAt: now,
      signatureUrl: DUMMY_SIG_URL,
      ipAddress: "127.0.0.1",
    },
    tenantSignature: {
      signedAt: now,
      signatureUrl: DUMMY_SIG_URL,
      ipAddress: "127.0.0.1",
      paymentStatus: "deferred",
    },
    paymentSchedule: {
      frequency: "monthly",
      dueDay: 1,
      lateFee: 100,
      gracePeriod: 5,
    },
    terms: [
      "Tenant shall pay rent on time",
      "Tenant shall maintain the property in good condition",
    ],
    specialConditions: [],
    attachments: [],
    utilitiesIncluded: false,
    utilitiesList: [],
    maintenanceIncluded: false,
    notifications: {
      rentReminder: true,
      maintenanceUpdates: true,
      agreementAlerts: true,
    },
    khayalamiProtection: {
      enabled: false,
      planType: "basic",
      monthlyFee: 0,
      coverage: [],
    },
  });

  await createDummySignature(agreement._id, landlord._id, "landlord", now);
  await createDummySignature(agreement._id, tenant._id, "tenant", now);

  // Pre-save hook: signed + startDate <= now → active
  agreement.status = "signed";
  agreement.startDate = now;
  await agreement.save();

  console.log("\n✅ Agreement created:", agreement._id.toString(), "status:", agreement.status);

  let rental = await Rental.findOne({ agreementId: agreement._id });
  if (!rental) {
    rental = await rentalService.createRentalFromAgreement(agreement._id.toString());
    console.log("✅ Rental created:", rental._id.toString());
  } else {
    rental.status = "active";
    rental.startDate = now;
    rental.endDate = endDate;
    rental.monthlyRent = rentAmount;
    rental.nextPaymentDue = rental.nextPaymentDue || now;
    await rental.save();
    await rentalService.markPropertyAsRented(property._id);
    console.log("✅ Rental updated:", rental._id.toString());
  }

  const paymentCount = await Payment.countDocuments({
    rentalId: rental._id,
    paymentType: "rent",
  });
  if (paymentCount === 0) {
    await rentalService.createPaymentSchedule(rental);
    console.log("✅ Payment schedule created");
  } else {
    console.log(`ℹ️  ${paymentCount} rent payment(s) already on schedule`);
  }

  const pendingRent = await Payment.findOne({
    rentalId: rental._id,
    paymentType: "rent",
    status: "pending",
  }).sort({ dueDate: 1 });

  const propertyFinal = await Property.findById(property._id);
  console.log("\n========== READY FOR PAYMENT TEST ==========");
  console.log({
    agreementId: agreement._id.toString(),
    agreementStatus: agreement.status,
    rentalId: rental._id.toString(),
    rentalStatus: rental.status,
    propertyStatus: propertyFinal?.status,
    monthlyRent: rental.monthlyRent,
    tenantEmail: TENANT_EMAIL,
    landlordEmail: LANDLORD_EMAIL,
    nextPendingPayment: pendingRent
      ? {
          paymentId: pendingRent._id.toString(),
          amount: pendingRent.amount,
          dueDate: pendingRent.dueDate,
          status: pendingRent.status,
        }
      : null,
    payRentEndpoint: `POST /api/payments/rental/${rental._id}/create`,
    sampleBody: {
      paymentMethod: "ecocash",
      paymentType: "rent",
      amount: pendingRent?.amount ?? rentAmount,
    },
  });
  console.log("============================================\n");

  await mongoose.disconnect();
}

setup()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
