// @ts-nocheck
/**
 * Promote agreements stuck in "pending" with both signatures to "signed",
 * set deferred fee status, and create rentals if missing.
 *
 * Usage: npx ts-node src/scripts/repairStuckPendingAgreements.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Agreement } from "../models/Agreement";
import { Signature } from "../models/Signature";
import { Rental } from "../models/Rental";

dotenv.config();

async function repairStuckPendingAgreements() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI environment variable is not defined");
  }

  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB");

  const stuck = await Agreement.find({ status: "pending" });
  let repaired = 0;

  for (const agreement of stuck) {
    const [landlordSig, tenantSig] = await Promise.all([
      Signature.findOne({ agreementId: agreement._id, userRole: "landlord", isActive: true }),
      Signature.findOne({ agreementId: agreement._id, userRole: "tenant", isActive: true }),
    ]);

    if (!landlordSig || !tenantSig) continue;

    console.log(`\n🔧 Repairing agreement ${agreement._id} (${agreement.title})`);

    agreement.status = "signed";
    agreement.signedAt = agreement.signedAt || tenantSig.signedAt || new Date();

    if (!agreement.agreementFeeAmount || agreement.agreementFeeAmount <= 0) {
      const { agreementFeeService } = await import("../services/AgreementFeeService");
      const { Property } = await import("../models/Property");
      const property = await Property.findById(agreement.propertyId).lean();
      agreement.agreementFeeAmount = agreementFeeService.calculateFeeForProperty(property as any);
    }

    if (agreement.agreementFeeStatus !== "charged") {
      agreement.agreementFeeStatus = agreement.agreementFeeStatus || "pending";
      if (agreement.tenantSignature) {
        const current = agreement.tenantSignature.paymentStatus;
        if (current !== "verified") {
          agreement.tenantSignature.paymentStatus = "deferred";
        }
      } else {
        agreement.tenantSignature = {
          signedAt: tenantSig.signedAt,
          signatureUrl: tenantSig.signatureUrl,
          ipAddress: tenantSig.ipAddress,
          paymentStatus: "deferred",
        } as any;
      }
    }

    await agreement.save();

    const existingRental = await Rental.findOne({ agreementId: agreement._id });
    if (!existingRental) {
      try {
        const { rentalService } = await import("../services/RentalService");
        await rentalService.createRentalFromAgreement(agreement._id.toString());
        console.log("   ✅ Rental created");
      } catch (err: any) {
        console.error(`   ❌ Rental creation failed: ${err.message}`);
      }
    } else {
      console.log("   ℹ️  Rental already exists");
      const { rentalService } = await import("../services/RentalService");
      await rentalService.markPropertyAsRented(agreement.propertyId);
    }

    repaired++;
  }

  console.log(`\n✅ Repaired ${repaired} stuck agreement(s)`);
  await mongoose.disconnect();
}

repairStuckPendingAgreements()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
