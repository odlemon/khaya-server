// @ts-nocheck
import { Types } from "mongoose";
import { LandlordBalance } from "../models/LandlordBalance";
import { LandlordPreferences } from "../models/LandlordPreferences";
import { landlordPreferencesService } from "./LandlordPreferencesService";

const BALANCE_ON_INSERT = {
  availableBalance: 0,
  pendingBalance: 0,
  totalEarnings: 0,
  totalWithdrawn: 0,
  transactions: [],
  stats: {
    totalPaymentsReceived: 0,
    totalRentCollected: 0,
    totalDepositsCollected: 0,
    averageMonthlyIncome: 0,
  },
};

function normalizePhone(p: string): string {
  return String(p || "")
    .trim()
    .replace(/\s+/g, "");
}

export class LandlordPayoutMethodService {
  /**
   * Current selection for profile UI. Only one of `bank` / `ecocash` is active.
   */
  async getPayoutMethod(landlordId: string) {
    const lb = await LandlordBalance.findOne({
      landlordId: new Types.ObjectId(landlordId),
    }).lean();

    if (!lb) {
      return {
        payoutMethod: null,
        bank: null,
        ecocash: null,
        legacyMobileMoney: null,
      };
    }

    if (lb.payoutMethod === "bank" && lb.bankDetails?.bankName && lb.bankDetails?.accountNumber) {
      return {
        payoutMethod: "bank",
        bank: {
          accountHolderName: lb.bankDetails.accountName || "",
          bankName: lb.bankDetails.bankName,
          accountNumber: lb.bankDetails.accountNumber,
          branchCode: lb.bankDetails.branchCode ?? null,
        },
        ecocash: null,
        legacyMobileMoney: null,
      };
    }

    if (
      lb.payoutMethod === "ecocash" &&
      lb.ecocashDetails?.registeredName &&
      lb.ecocashDetails?.phoneNumber
    ) {
      return {
        payoutMethod: "ecocash",
        bank: null,
        ecocash: {
          registeredName: lb.ecocashDetails.registeredName,
          phoneNumber: lb.ecocashDetails.phoneNumber,
        },
        legacyMobileMoney: null,
      };
    }

    if (lb.bankDetails?.bankName && lb.bankDetails?.accountNumber) {
      return {
        payoutMethod: "bank",
        bank: {
          accountHolderName: lb.bankDetails.accountName || "",
          bankName: lb.bankDetails.bankName,
          accountNumber: lb.bankDetails.accountNumber,
          branchCode: lb.bankDetails.branchCode ?? null,
        },
        ecocash: null,
        legacyMobileMoney: null,
        note: "legacy_no_explicit_method",
      };
    }

    if (lb.mobileMoneyDetails?.phoneNumber) {
      return {
        payoutMethod: null,
        bank: null,
        ecocash: null,
        legacyMobileMoney: {
          provider: lb.mobileMoneyDetails.provider,
          phoneNumber: lb.mobileMoneyDetails.phoneNumber,
          accountName: lb.mobileMoneyDetails.accountName ?? null,
        },
        note: "legacy_mobile_money_update_via_new_endpoint",
      };
    }

    return {
      payoutMethod: null,
      bank: null,
      ecocash: null,
      legacyMobileMoney: null,
    };
  }

  async setBankPayout(landlordId: string, bank: any) {
    const accountHolderName = String(bank?.accountHolderName || bank?.accountName || "").trim();
    const bankName = String(bank?.bankName || "").trim();
    const accountNumber = String(bank?.accountNumber || "").trim();
    const branchCode = bank?.branchCode != null ? String(bank.branchCode).trim() : undefined;

    if (!accountHolderName || !bankName || !accountNumber) {
      throw new Error(
        "Bank payout requires accountHolderName, bankName, and accountNumber.",
      );
    }

    const oid = new Types.ObjectId(landlordId);
    await LandlordBalance.findOneAndUpdate(
      { landlordId: oid },
      {
        $setOnInsert: { landlordId: oid, ...BALANCE_ON_INSERT },
        $set: {
          payoutMethod: "bank",
          bankDetails: {
            accountName: accountHolderName,
            bankName,
            accountNumber,
            branchCode: branchCode || undefined,
          },
        },
        $unset: { ecocashDetails: "", mobileMoneyDetails: "" },
      },
      { upsert: true, new: true },
    );

    await landlordPreferencesService.updatePaymentReceptionMethod(
      landlordId,
      "bank_transfer",
      {
        bankDetails: {
          bankName,
          accountNumber,
          accountHolderName,
          branchName: branchCode,
        },
      },
    );

    await LandlordPreferences.updateOne(
      { landlordId: oid },
      { $unset: { mobileMoneyDetails: 1 } },
    );

    return this.getPayoutMethod(landlordId);
  }

  async setEcocashPayout(landlordId: string, ecocash: any) {
    const registeredName = String(ecocash?.registeredName || "").trim();
    const phoneNumber = normalizePhone(ecocash?.phoneNumber || "");

    if (!registeredName || !phoneNumber) {
      throw new Error("EcoCash payout requires registeredName and phoneNumber.");
    }

    const oid = new Types.ObjectId(landlordId);
    await LandlordBalance.findOneAndUpdate(
      { landlordId: oid },
      {
        $setOnInsert: { landlordId: oid, ...BALANCE_ON_INSERT },
        $set: {
          payoutMethod: "ecocash",
          ecocashDetails: {
            registeredName,
            phoneNumber,
          },
        },
        $unset: { bankDetails: "", mobileMoneyDetails: "" },
      },
      { upsert: true, new: true },
    );

    await landlordPreferencesService.updatePaymentReceptionMethod(
      landlordId,
      "mobile_money",
      {
        mobileMoneyDetails: {
          provider: "ecocash",
          phoneNumber,
          accountName: registeredName,
        },
      },
    );

    await LandlordPreferences.updateOne(
      { landlordId: oid },
      { $unset: { bankDetails: 1 } },
    );

    return this.getPayoutMethod(landlordId);
  }
}

export const landlordPayoutMethodService = new LandlordPayoutMethodService();
