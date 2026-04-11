// @ts-nocheck
/**
 * Single source for how Escrow / Payout snapshots landlord destination details.
 * Only one active path: bank OR EcoCash (plus legacy rows without payoutMethod).
 */

export type ResolvedPayoutMethod = "bank_transfer" | "mobile_money" | "internal_transfer";

export function resolveLandlordPayoutFromBalance(lb: any): {
  payoutMethod: ResolvedPayoutMethod;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    branchCode?: string;
  };
  mobileMoneyDetails?: {
    provider: string;
    phoneNumber: string;
    accountName: string;
  };
} {
  if (!lb) {
    return { payoutMethod: "internal_transfer" };
  }

  const pm = lb.payoutMethod;

  if (pm === "bank" && lb.bankDetails?.bankName && lb.bankDetails?.accountNumber) {
    return {
      payoutMethod: "bank_transfer",
      bankDetails: {
        accountName: lb.bankDetails.accountName || "",
        accountNumber: String(lb.bankDetails.accountNumber).trim(),
        bankName: lb.bankDetails.bankName,
        branchCode: lb.bankDetails.branchCode,
      },
    };
  }

  if (
    pm === "ecocash" &&
    lb.ecocashDetails?.phoneNumber &&
    lb.ecocashDetails?.registeredName
  ) {
    return {
      payoutMethod: "mobile_money",
      mobileMoneyDetails: {
        provider: "EcoCash",
        phoneNumber: String(lb.ecocashDetails.phoneNumber).trim(),
        accountName: String(lb.ecocashDetails.registeredName).trim(),
      },
    };
  }

  if (lb.bankDetails?.bankName && lb.bankDetails?.accountNumber) {
    return {
      payoutMethod: "bank_transfer",
      bankDetails: {
        accountName: lb.bankDetails.accountName || "",
        accountNumber: String(lb.bankDetails.accountNumber).trim(),
        bankName: lb.bankDetails.bankName,
        branchCode: lb.bankDetails.branchCode,
      },
    };
  }

  if (lb.mobileMoneyDetails?.phoneNumber) {
    return {
      payoutMethod: "mobile_money",
      mobileMoneyDetails: {
        provider: lb.mobileMoneyDetails.provider || "other",
        phoneNumber: String(lb.mobileMoneyDetails.phoneNumber).trim(),
        accountName: lb.mobileMoneyDetails.accountName || "",
      },
    };
  }

  return { payoutMethod: "internal_transfer" };
}
