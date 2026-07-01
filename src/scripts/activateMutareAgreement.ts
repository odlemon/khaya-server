// @ts-nocheck
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Agreement } from "../models/Agreement";
import { Rental } from "../models/Rental";
import { Property } from "../models/Property";
import { Payment } from "../models/Payment";
import { Signature } from "../models/Signature";
import { rentalService } from "../services/RentalService";
import { agreementService } from "../services/AgreementService";

dotenv.config();

const AGREEMENT_ID = "6a268efb5c07a1f3bdf82c85";

async function activateMutareAgreement() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("✅ Connected");

  const agreement = await Agreement.findById(AGREEMENT_ID);
  if (!agreement) throw new Error("Agreement not found");

  console.log("\n📋 Before:", {
    status: agreement.status,
    startDate: agreement.startDate,
    landlordSigned: !!agreement.landlordSignature?.signedAt,
    tenantSigned: !!agreement.tenantSignature?.signedAt,
  });

  // Sync signatures from Signature collection
  const [landlordSig, tenantSig] = await Promise.all([
    Signature.findOne({ agreementId: agreement._id, userRole: "landlord", isActive: { $ne: false } }),
    Signature.findOne({ agreementId: agreement._id, userRole: "tenant", isActive: { $ne: false } }),
  ]);

  if (landlordSig) {
    agreement.landlordSignature = {
      signedAt: landlordSig.signedAt,
      signatureUrl: landlordSig.signatureUrl,
      ipAddress: landlordSig.ipAddress,
    };
  }
  if (tenantSig) {
    agreement.tenantSignature = {
      signedAt: tenantSig.signedAt,
      signatureUrl: tenantSig.signatureUrl,
      ipAddress: tenantSig.ipAddress,
      paymentStatus: agreement.tenantSignature?.paymentStatus || "deferred",
    };
  }

  // Promote to active — move start date to today so lease is in force
  const now = new Date();
  agreement.startDate = now;
  agreement.status = "signed"; // pre-save hook will promote to active
  agreement.signedAt = agreement.signedAt || tenantSig?.signedAt || now;
  agreement.activatedAt = now;

  if (agreement.agreementFeeStatus !== "charged") {
    agreement.agreementFeeStatus = agreement.agreementFeeStatus || "pending";
    if (agreement.tenantSignature && agreement.tenantSignature.paymentStatus !== "verified") {
      agreement.tenantSignature.paymentStatus = "deferred";
    }
  }

  await agreement.save();
  console.log("✅ Agreement saved:", agreement.status, agreement.startDate);

  // Ensure rental exists and is active
  let rental = await Rental.findOne({ agreementId: agreement._id });
  if (!rental) {
    rental = await rentalService.createRentalFromAgreement(agreement._id.toString());
    console.log("✅ Rental created:", rental._id);
  } else {
    rental.status = "active";
    rental.startDate = agreement.startDate;
    rental.nextPaymentDue = rental.nextPaymentDue || agreement.startDate;
    await rental.save();
    await rentalService.markPropertyAsRented(agreement.propertyId);
    console.log("✅ Rental updated:", rental._id, rental.status);

    const paymentCount = await Payment.countDocuments({ rentalId: rental._id, paymentType: "rent" });
    if (paymentCount === 0) {
      await rentalService.createPaymentSchedule(rental);
      console.log("✅ Payment schedule created");
    } else {
      console.log(`ℹ️  ${paymentCount} rent payments already exist`);
    }
  }

  const property = await Property.findById(agreement.propertyId);
  if (property && property.status !== "rented") {
    property.status = "rented";
    await property.save();
    console.log("✅ Property marked rented");
  }

  // Verify API list shape for tenant
  const tenantId = agreement.tenantId.toString();
  const list = await agreementService.getUserAgreements(tenantId, "tenant");
  const item = list.find((a) => a._id.toString() === AGREEMENT_ID);
  console.log("\n📤 Tenant list item:", {
    status: item?.status,
    landlordSignedAt: item?.landlordSignature?.signedAt,
    tenantSignedAt: item?.tenantSignature?.signedAt,
    tenantPaymentStatus: item?.tenantSignature?.paymentStatus,
  });

  const rentalFinal = await Rental.findOne({ agreementId: agreement._id });
  const propFinal = await Property.findById(agreement.propertyId);
  console.log("\n✅ Final state:", {
    agreementStatus: agreement.status,
    propertyStatus: propFinal?.status,
    rentalStatus: rentalFinal?.status,
  });

  await mongoose.disconnect();
}

activateMutareAgreement()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
