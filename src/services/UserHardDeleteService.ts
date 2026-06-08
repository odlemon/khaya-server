// @ts-nocheck

import { Types } from "mongoose";
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
import { Notification } from "../models/Notification";

export interface HardDeleteUserResult {
  deleted: boolean;
  user: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  } | null;
  deletedCounts: Record<string, number>;
}

function trackCount(
  summary: Record<string, number>,
  label: string,
  result: { deletedCount?: number }
) {
  const n = result.deletedCount ?? 0;
  if (n > 0) {
    summary[label] = n;
  }
  return n;
}

export class UserHardDeleteService {
  async hardDeleteByUserId(userId: string): Promise<HardDeleteUserResult> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("INVALID_USER_ID");
    }

    const user = await User.findById(userId);
    if (!user) {
      return { deleted: false, user: null, deletedCounts: {} };
    }

    const userObjectId = user._id;
    const uid = userObjectId.toString();
    const email = user.email;
    const roleOr = [{ landlordId: userObjectId }, { tenantId: userObjectId }];
    const roleOrStr = [{ landlordId: uid }, { tenantId: uid }];
    const deletedCounts: Record<string, number> = {};

    const properties = await Property.find({ landlordId: userObjectId }).select("_id").lean();
    const propertyIds = properties.map((p) => p._id);

    const agreements = await Agreement.find({ $or: roleOr }).select("_id").lean();
    const agreementIds = agreements.map((a) => a._id);

    const rentals = await Rental.find({ $or: roleOr }).select("_id").lean();
    const rentalIds = rentals.map((r) => r._id);

    const chats = await Chat.find({
      $or: [
        { participants: userObjectId },
        ...(propertyIds.length ? [{ propertyId: { $in: propertyIds } }] : []),
      ],
    })
      .select("_id")
      .lean();
    const chatIds = chats.map((c) => c._id);

    const payments = await Payment.find({ $or: roleOr }).select("_id").lean();
    const paymentIds = payments.map((p) => p._id);

    if (chatIds.length) {
      trackCount(
        deletedCounts,
        "messagesByChat",
        await Message.deleteMany({ chatId: { $in: chatIds } })
      );
    }
    trackCount(
      deletedCounts,
      "messagesBySender",
      await Message.deleteMany({ senderId: userObjectId })
    );
    trackCount(
      deletedCounts,
      "chats",
      await Chat.deleteMany({
        $or: [
          { participants: userObjectId },
          ...(propertyIds.length ? [{ propertyId: { $in: propertyIds } }] : []),
        ],
      })
    );

    if (paymentIds.length) {
      trackCount(
        deletedCounts,
        "escrowTransactionsByPayment",
        await EscrowTransaction.deleteMany({ paymentId: { $in: paymentIds } })
      );
    }
    trackCount(
      deletedCounts,
      "escrowTransactions",
      await EscrowTransaction.deleteMany({ $or: roleOr })
    );
    trackCount(deletedCounts, "payouts", await Payout.deleteMany({ recipientId: userObjectId }));
    trackCount(
      deletedCounts,
      "revenueSources",
      await RevenueSource.deleteMany({
        $or: [
          { payerId: userObjectId },
          { recipientId: userObjectId },
          ...(paymentIds.length ? [{ paymentId: { $in: paymentIds } }] : []),
        ],
      })
    );
    trackCount(deletedCounts, "payments", await Payment.deleteMany({ $or: roleOr }));
    trackCount(deletedCounts, "paymentRequests", await PaymentRequest.deleteMany({ $or: roleOr }));
    trackCount(deletedCounts, "invoices", await Invoice.deleteMany({ $or: roleOr }));
    trackCount(deletedCounts, "commissions", await Commission.deleteMany({ $or: roleOrStr }));
    trackCount(deletedCounts, "withdrawals", await Withdrawal.deleteMany({ landlordId: userObjectId }));
    trackCount(
      deletedCounts,
      "landlordBalances",
      await LandlordBalance.deleteMany({ landlordId: userObjectId })
    );

    trackCount(
      deletedCounts,
      "signatures",
      await Signature.deleteMany({
        $or: [{ userId: userObjectId }, ...(agreementIds.length ? [{ agreementId: { $in: agreementIds } }] : [])],
      })
    );
    trackCount(
      deletedCounts,
      "conditionLogs",
      await ConditionLog.deleteMany({
        $or: [
          { tenantId: userObjectId },
          ...(rentalIds.length ? [{ rentalId: { $in: rentalIds } }] : []),
          ...(agreementIds.length ? [{ agreementId: { $in: agreementIds } }] : []),
          ...(propertyIds.length ? [{ propertyId: { $in: propertyIds } }] : []),
        ],
      })
    );
    trackCount(
      deletedCounts,
      "maintenanceRequests",
      await MaintenanceRequest.deleteMany({ $or: roleOr })
    );
    trackCount(deletedCounts, "subscriptions", await Subscription.deleteMany({ tenantId: userObjectId }));
    trackCount(
      deletedCounts,
      "rentalReminders",
      await RentalReminder.deleteMany({ tenantId: userObjectId })
    );
    trackCount(
      deletedCounts,
      "serviceReminders",
      await ServiceReminder.deleteMany({ $or: roleOr })
    );
    trackCount(deletedCounts, "serviceBookings", await ServiceBooking.deleteMany({ $or: roleOr }));
    trackCount(deletedCounts, "rentals", await Rental.deleteMany({ $or: roleOr }));
    trackCount(deletedCounts, "agreements", await Agreement.deleteMany({ $or: roleOr }));

    trackCount(
      deletedCounts,
      "bills",
      await Bill.deleteMany({
        $or: [
          { createdBy: userObjectId },
          ...(propertyIds.length ? [{ propertyId: { $in: propertyIds } }] : []),
        ],
      })
    );
    trackCount(deletedCounts, "connections", await Connection.deleteMany({ $or: roleOr }));
    trackCount(
      deletedCounts,
      "favorites",
      await Favorite.deleteMany({
        $or: [
          { userId: userObjectId },
          ...(propertyIds.length ? [{ propertyId: { $in: propertyIds } }] : []),
        ],
      })
    );
    trackCount(deletedCounts, "properties", await Property.deleteMany({ landlordId: userObjectId }));

    trackCount(
      deletedCounts,
      "agreementTemplates",
      await AgreementTemplate.deleteMany({ createdBy: userObjectId })
    );
    trackCount(
      deletedCounts,
      "serviceProviders",
      await ServiceProvider.deleteMany({ createdBy: userObjectId })
    );
    trackCount(
      deletedCounts,
      "landlordPreferences",
      await LandlordPreferences.deleteMany({ landlordId: userObjectId })
    );
    trackCount(
      deletedCounts,
      "landlordOnboarding",
      await LandlordOnboarding.deleteMany({ userId: userObjectId })
    );
    trackCount(
      deletedCounts,
      "tenantOnboarding",
      await TenantOnboarding.deleteMany({ userId: userObjectId })
    );
    trackCount(
      deletedCounts,
      "passwordResetTokens",
      await PasswordResetToken.deleteMany({ userId: userObjectId })
    );
    trackCount(
      deletedCounts,
      "emailVerifications",
      await EmailVerification.deleteMany({ email })
    );
    trackCount(
      deletedCounts,
      "twoFactorAuth",
      await TwoFactorAuth.deleteMany({ $or: [{ email }, { userId: userObjectId }] })
    );
    trackCount(
      deletedCounts,
      "notifications",
      await Notification.deleteMany({ userId: userObjectId })
    );

    await User.deleteOne({ _id: userObjectId });
    deletedCounts.user = 1;

    const stillExists = await User.findById(userObjectId);
    if (stillExists) {
      throw new Error("DELETE_FAILED");
    }

    return {
      deleted: true,
      user: {
        id: uid,
        email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      deletedCounts,
    };
  }

  async hardDeleteByEmail(email: string): Promise<HardDeleteUserResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return { deleted: false, user: null, deletedCounts: {} };
    }
    return this.hardDeleteByUserId(user._id.toString());
  }
}

export const userHardDeleteService = new UserHardDeleteService();
