/**
 * Deletes all application data EXCEPT the `users` collection (User documents).
 *
 * DESTRUCTIVE. Requires explicit confirmation via environment variable.
 *
 *   Windows (PowerShell):
 *     $env:WIPE_ALL_EXCEPT_USERS="YES"; npm run wipe:keep-users
 *
 *   Unix:
 *     WIPE_ALL_EXCEPT_USERS=YES npm run wipe:keep-users
 *
 * Prerequisites: MONGODB_URI in .env
 *
 * Preserved: User collection only (login accounts, roles, profiles).
 * Removed: properties, rentals, agreements, payments, escrow, payouts, chats,
 * connections, balances, onboarding, tokens, etc.
 */

// @ts-nocheck
import mongoose from "mongoose";
import dotenv from "dotenv";

import { Agreement } from "../models/Agreement";
import { AgreementTemplate } from "../models/AgreementTemplate";
import { Bill, Expense } from "../models/Bill";
import { Chat, Message } from "../models/Chat";
import Commission from "../models/Commission";
import { ConditionLog } from "../models/ConditionLog";
import { Connection } from "../models/Connection";
import { EmailVerification } from "../models/EmailVerification";
import {
  EscrowAccount,
  EscrowTransaction,
  Payout,
} from "../models/Escrow";
import { Favorite } from "../models/Favorite";
import { Invoice } from "../models/Invoice";
import { LandlordBalance } from "../models/LandlordBalance";
import { LandlordPreferences } from "../models/LandlordPreferences";
import {
  LandlordOnboarding,
  TenantOnboarding,
} from "../models/Onboarding";
import { MaintenanceRequest } from "../models/MaintenanceRequest";
import { PasswordResetToken } from "../models/PasswordResetToken";
import { Payment } from "../models/Payment";
import { PaymentRequest } from "../models/PaymentRequest";
import { Property } from "../models/Property";
import { Rental } from "../models/Rental";
import { RentalReminder } from "../models/RentalReminder";
import { RevenueSource } from "../models/RevenueSource";
import { ServiceBooking } from "../models/ServiceBooking";
import { ServiceProvider } from "../models/ServiceProvider";
import { ServiceReminder } from "../models/ServiceReminder";
import { Signature } from "../models/Signature";
import { Subscription } from "../models/Subscription";
import { TwoFactorAuth } from "../models/TwoFactorAuth";
import { User } from "../models/User";
import { Withdrawal } from "../models/Withdrawal";

dotenv.config();

const CONFIRM = process.env.WIPE_ALL_EXCEPT_USERS === "YES";

/** Order: leaf / high-dependency collections first (clarity only; Mongo has no FK enforcement). */
const DELETES: { name: string; model: { deleteMany: (f: any) => Promise<any> } }[] = [
  { name: "Message", model: Message },
  { name: "Chat", model: Chat },
  { name: "EscrowTransaction", model: EscrowTransaction },
  { name: "Payout", model: Payout },
  { name: "EscrowAccount", model: EscrowAccount },
  { name: "Payment", model: Payment },
  { name: "PaymentRequest", model: PaymentRequest },
  { name: "Invoice", model: Invoice },
  { name: "Bill", model: Bill },
  { name: "Expense", model: Expense },
  { name: "Commission", model: Commission },
  { name: "Withdrawal", model: Withdrawal },
  { name: "LandlordBalance", model: LandlordBalance },
  { name: "RevenueSource", model: RevenueSource },
  { name: "Subscription", model: Subscription },
  { name: "ConditionLog", model: ConditionLog },
  { name: "Signature", model: Signature },
  { name: "Agreement", model: Agreement },
  { name: "AgreementTemplate", model: AgreementTemplate },
  { name: "RentalReminder", model: RentalReminder },
  { name: "Rental", model: Rental },
  { name: "Property", model: Property },
  { name: "MaintenanceRequest", model: MaintenanceRequest },
  { name: "Favorite", model: Favorite },
  { name: "Connection", model: Connection },
  { name: "LandlordPreferences", model: LandlordPreferences },
  { name: "ServiceBooking", model: ServiceBooking },
  { name: "ServiceReminder", model: ServiceReminder },
  { name: "ServiceProvider", model: ServiceProvider },
  { name: "LandlordOnboarding", model: LandlordOnboarding },
  { name: "TenantOnboarding", model: TenantOnboarding },
  { name: "PasswordResetToken", model: PasswordResetToken },
  { name: "EmailVerification", model: EmailVerification },
  { name: "TwoFactorAuth", model: TwoFactorAuth },
];

async function main() {
  if (!CONFIRM) {
    console.error(
      "Refusing to run: set WIPE_ALL_EXCEPT_USERS=YES to confirm full wipe (users collection is kept).",
    );
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB.\n");

  const userCountBefore = await User.countDocuments();
  console.log(`Users preserved (count before): ${userCountBefore}\n`);

  for (const { name, model } of DELETES) {
    const r = await model.deleteMany({});
    console.log(`Deleted ${name}: ${r.deletedCount}`);
  }

  const userCountAfter = await User.countDocuments();
  console.log(`\nUsers after wipe: ${userCountAfter}`);
  if (userCountBefore !== userCountAfter) {
    console.error("ERROR: User count changed — this script must never delete users.");
    process.exitCode = 1;
  } else {
    console.log("OK: User collection unchanged.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log("\nDisconnected.");
  });
