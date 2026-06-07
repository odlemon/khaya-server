/**
 * Hard delete a user and all related records by email.
 *
 * Usage:
 *   npx ts-node src/scripts/hardDeleteUserByEmail.ts user@example.com
 *
 * Requires MONGODB_URI in environment (.env)
 */

// @ts-nocheck

import mongoose from "mongoose";
import dotenv from "dotenv";

import { User } from "../models/User";
import { EmailVerification } from "../models/EmailVerification";
import { TwoFactorAuth } from "../models/TwoFactorAuth";
import { PasswordResetToken } from "../models/PasswordResetToken";
import { Favorite } from "../models/Favorite";
import { LandlordOnboarding, TenantOnboarding } from "../models/Onboarding";
import { LandlordPreferences } from "../models/LandlordPreferences";
import { Subscription } from "../models/Subscription";
import { RentalReminder } from "../models/RentalReminder";
import { ServiceReminder } from "../models/ServiceReminder";
import { Agreement } from "../models/Agreement";
import { AgreementTemplate } from "../models/AgreementTemplate";
import { Rental } from "../models/Rental";
import { Property } from "../models/Property";
import { Connection } from "../models/Connection";
import { Chat, Message } from "../models/Chat";
import { Bill } from "../models/Bill";
import { Payment } from "../models/Payment";
import { PaymentRequest } from "../models/PaymentRequest";
import { Invoice } from "../models/Invoice";
import Commission from "../models/Commission";
import { LandlordBalance } from "../models/LandlordBalance";
import { Withdrawal } from "../models/Withdrawal";
import { MaintenanceRequest } from "../models/MaintenanceRequest";
import { ConditionLog } from "../models/ConditionLog";
import { Signature } from "../models/Signature";
import { ServiceBooking } from "../models/ServiceBooking";
import { ServiceProvider } from "../models/ServiceProvider";
import { EscrowTransaction, Payout } from "../models/Escrow";
import { RevenueSource } from "../models/RevenueSource";

dotenv.config();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function deleteCount(label: string, result: { deletedCount?: number }) {
  const n = result.deletedCount ?? 0;
  console.log(`  - ${label}: ${n}`);
  return n;
}

async function main() {
  const inputEmail = process.argv[2];
  if (!inputEmail) {
    console.error("❌ Please provide an email address.");
    console.error("   Example: npx ts-node src/scripts/hardDeleteUserByEmail.ts user@example.com");
    process.exit(1);
  }

  const email = normalizeEmail(inputEmail);

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("❌ MONGODB_URI environment variable is not set");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`✅ No user found for ${email} (nothing to delete).`);
      return;
    }

    const userId = user._id;
    const uid = userId.toString();
    const roleOr = [{ landlordId: userId }, { tenantId: userId }];
    const roleOrStr = [{ landlordId: uid }, { tenantId: uid }];

    console.log(`\n🗑️  Hard-deleting user: ${email}`);
    console.log(`   ID: ${uid} | Role: ${user.role} | Name: ${user.firstName} ${user.lastName}\n`);

    const properties = await Property.find({ landlordId: userId }).select("_id").lean();
    const propertyIds = properties.map((p) => p._id);

    const agreements = await Agreement.find({ $or: roleOr }).select("_id").lean();
    const agreementIds = agreements.map((a) => a._id);

    const rentals = await Rental.find({ $or: roleOr }).select("_id").lean();
    const rentalIds = rentals.map((r) => r._id);

    const chats = await Chat.find({
      $or: [
        { participants: userId },
        ...(propertyIds.length ? [{ propertyId: { $in: propertyIds } }] : []),
      ],
    })
      .select("_id")
      .lean();
    const chatIds = chats.map((c) => c._id);

    const payments = await Payment.find({ $or: roleOr }).select("_id").lean();
    const paymentIds = payments.map((p) => p._id);

    console.log("Deleting related records...\n");

    // Messages & chats
    if (chatIds.length) {
      await deleteCount("Message (by chat)", await Message.deleteMany({ chatId: { $in: chatIds } }));
    }
    await deleteCount("Message (by sender)", await Message.deleteMany({ senderId: userId }));
    await deleteCount(
      "Chat",
      await Chat.deleteMany({
        $or: [
          { participants: userId },
          ...(propertyIds.length ? [{ propertyId: { $in: propertyIds } }] : []),
        ],
      })
    );

    // Financial / transactional (before agreements/rentals)
    if (paymentIds.length) {
      await deleteCount(
        "EscrowTransaction (by payment)",
        await EscrowTransaction.deleteMany({ paymentId: { $in: paymentIds } })
      );
    }
    await deleteCount("EscrowTransaction (by user)", await EscrowTransaction.deleteMany({ $or: roleOr }));
    await deleteCount("Payout", await Payout.deleteMany({ recipientId: userId }));
    await deleteCount(
      "RevenueSource",
      await RevenueSource.deleteMany({
        $or: [
          { payerId: userId },
          { recipientId: userId },
          ...(paymentIds.length ? [{ paymentId: { $in: paymentIds } }] : []),
        ],
      })
    );
    await deleteCount("Payment", await Payment.deleteMany({ $or: roleOr }));
    await deleteCount("PaymentRequest", await PaymentRequest.deleteMany({ $or: roleOr }));
    await deleteCount("Invoice", await Invoice.deleteMany({ $or: roleOr }));
    await deleteCount("Commission", await Commission.deleteMany({ $or: roleOrStr }));
    await deleteCount("Withdrawal", await Withdrawal.deleteMany({ landlordId: userId }));
    await deleteCount("LandlordBalance", await LandlordBalance.deleteMany({ landlordId: userId }));

    // Agreements & rentals
    await deleteCount(
      "Signature",
      await Signature.deleteMany({
        $or: [{ userId }, ...(agreementIds.length ? [{ agreementId: { $in: agreementIds } }] : [])],
      })
    );
    await deleteCount(
      "ConditionLog",
      await ConditionLog.deleteMany({
        $or: [
          { tenantId: userId },
          ...(rentalIds.length ? [{ rentalId: { $in: rentalIds } }] : []),
          ...(agreementIds.length ? [{ agreementId: { $in: agreementIds } }] : []),
          ...(propertyIds.length ? [{ propertyId: { $in: propertyIds } }] : []),
        ],
      })
    );
    await deleteCount("MaintenanceRequest", await MaintenanceRequest.deleteMany({ $or: roleOr }));
    await deleteCount("Subscription", await Subscription.deleteMany({ tenantId: userId }));
    await deleteCount("RentalReminder", await RentalReminder.deleteMany({ tenantId: userId }));
    await deleteCount("ServiceReminder", await ServiceReminder.deleteMany({ $or: roleOr }));
    await deleteCount("ServiceBooking", await ServiceBooking.deleteMany({ $or: roleOr }));
    await deleteCount("Rental", await Rental.deleteMany({ $or: roleOr }));
    await deleteCount("Agreement", await Agreement.deleteMany({ $or: roleOr }));

    // Properties & connections
    await deleteCount(
      "Bill",
      await Bill.deleteMany({
        $or: [
          { createdBy: userId },
          ...(propertyIds.length ? [{ propertyId: { $in: propertyIds } }] : []),
        ],
      })
    );
    await deleteCount("Connection", await Connection.deleteMany({ $or: roleOr }));
    await deleteCount(
      "Favorite",
      await Favorite.deleteMany({
        $or: [
          { userId },
          ...(propertyIds.length ? [{ propertyId: { $in: propertyIds } }] : []),
        ],
      })
    );
    await deleteCount("Property", await Property.deleteMany({ landlordId: userId }));

    // Auth & profile artifacts
    await deleteCount("AgreementTemplate", await AgreementTemplate.deleteMany({ createdBy: userId }));
    await deleteCount("ServiceProvider", await ServiceProvider.deleteMany({ createdBy: userId }));
    await deleteCount("LandlordPreferences", await LandlordPreferences.deleteMany({ landlordId: userId }));
    await deleteCount("LandlordOnboarding", await LandlordOnboarding.deleteMany({ userId }));
    await deleteCount("TenantOnboarding", await TenantOnboarding.deleteMany({ userId }));
    await deleteCount("PasswordResetToken", await PasswordResetToken.deleteMany({ userId }));
    await deleteCount("EmailVerification", await EmailVerification.deleteMany({ email }));
    await deleteCount(
      "TwoFactorAuth",
      await TwoFactorAuth.deleteMany({ $or: [{ email }, { userId }] })
    );

    await User.deleteOne({ _id: userId });
    console.log("  - User: 1");

    const stillExists = await User.findOne({ email });
    if (stillExists) {
      console.error("\n❌ User record still exists after deletion.");
      process.exitCode = 1;
      return;
    }

    console.log(`\n✅ Fully deleted account and related data for ${email}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("❌ Hard delete failed:", err);
  process.exitCode = 1;
});
