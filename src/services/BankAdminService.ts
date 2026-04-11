// @ts-nocheck
import mongoose from "mongoose";
import { EscrowTransaction, Payout } from "../models/Escrow";
import { LandlordBalance } from "../models/LandlordBalance";
import { Rental } from "../models/Rental";
import { User } from "../models/User";
import { emailNotificationService } from "./EmailNotificationService";
import { escrowService } from "./EscrowService";
import { logger } from "../utils/logger";

function isLandlordPayout(doc: any) {
  return (
    doc &&
    doc.recipientType === "landlord" &&
    (doc.payoutType === "landlord" || doc.payoutType === "bulk_landlord")
  );
}

/** Populated Property subdoc on an escrow row */
function isPopulatedProperty(prop: any): boolean {
  return prop && typeof prop === "object" && prop._id && prop.title != null;
}

function toPropertyDto(prop: any) {
  if (!prop || !prop._id) return null;
  return {
    propertyId: prop._id,
    title: prop.title,
    address: prop.address,
  };
}

async function rentalIdToPropertyMap(
  rows: any[],
): Promise<Map<string, { _id: any; title?: string; address?: any }>> {
  const map = new Map<
    string,
    { _id: any; title?: string; address?: any }
  >();
  const rentalIds = new Set<string>();
  for (const t of rows) {
    if (!isPopulatedProperty(t.propertyId) && t.rentalId) {
      rentalIds.add(t.rentalId.toString());
    }
  }
  if (rentalIds.size === 0) return map;

  const rentals = await Rental.find({
    _id: { $in: [...rentalIds].map((id) => new mongoose.Types.ObjectId(id)) },
  })
    .populate("propertyId", "title address")
    .lean();

  for (const r of rentals) {
    const p = r.propertyId as any;
    if (p && p._id) {
      map.set(r._id.toString(), p);
    }
  }
  return map;
}

function formatEscrowLineForBankAdmin(
  t: any,
  rentalPropertyMap: Map<string, { _id: any; title?: string; address?: any }>,
) {
  let propDoc = isPopulatedProperty(t.propertyId) ? t.propertyId : null;
  if (!propDoc && t.rentalId) {
    const viaRental = rentalPropertyMap.get(t.rentalId.toString());
    if (viaRental && viaRental._id) {
      propDoc = viaRental;
    }
  }

  const property = toPropertyDto(propDoc);
  let propertyDisplayTitle: string;
  if (property?.title) {
    propertyDisplayTitle = property.title;
  } else if (t.paymentType === "service") {
    propertyDisplayTitle = "Service / platform (no property on file)";
  } else if (t.paymentType === "rent") {
    propertyDisplayTitle = "Rent (property not linked on escrow)";
  } else {
    propertyDisplayTitle = "Not linked to a property";
  }

  const st = t.status;
  return {
    escrowTransactionId: t._id,
    totalAmount: t.totalAmount,
    landlordAmount: t.landlordAmount,
    khayalamiAmount: t.khayalamiAmount,
    escrowStatus: st,
    status: st,
    landlordPayoutStatus: t.landlordPayoutStatus,
    landlordPayoutDate: t.landlordPayoutDate ?? null,
    paymentType: t.paymentType,
    distributedAt: t.distributedAt ?? null,
    property,
    propertyDisplayTitle,
    propertyDisplaySubtitle: property?.address?.city ?? null,
    rentalId: t.rentalId ?? null,
  };
}

export class BankAdminService {
  /**
   * Dashboard headline numbers: escrow health + landlord payout pipeline.
   */
  async getSummary() {
    const escrow = await escrowService.getEscrowSummary();

    const [pendingSlice] = await Payout.aggregate([
      {
        $match: {
          recipientType: "landlord",
          payoutType: { $in: ["landlord", "bulk_landlord"] },
          status: { $in: ["pending", "processing"] },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const [completedSlice] = await Payout.aggregate([
      {
        $match: {
          recipientType: "landlord",
          payoutType: { $in: ["landlord", "bulk_landlord"] },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const [awaitingBankTransfer] = await EscrowTransaction.aggregate([
      {
        $match: {
          status: "distributed",
          landlordPayoutStatus: "pending",
          landlordPayoutId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalLandlordAmount: { $sum: "$landlordAmount" },
        },
      },
    ]);

    return {
      escrow: {
        totalHeld: escrow.totalHeld,
        pendingLandlordShareInEscrow: escrow.pendingLandlordPayouts,
        pendingKhayalamiShareInEscrow: escrow.pendingKhayalamiPayouts,
        transactionCounts: escrow.transactionCounts,
        accountHighlights: {
          totalDistributedLifetime: escrow.account?.totalDistributed ?? 0,
          totalLandlordPayoutsLifetime: escrow.account?.totalLandlordPayouts ?? 0,
          lastDistributionDate: escrow.account?.lastDistributionDate ?? null,
        },
      },
      landlordPayouts: {
        recordsAwaitingSettlement: {
          count: pendingSlice?.count ?? 0,
          totalAmount: pendingSlice?.totalAmount ?? 0,
        },
        settledOutsideSystemLifetime: {
          count: completedSlice?.count ?? 0,
          totalAmount: completedSlice?.totalAmount ?? 0,
        },
        distributedEscrowRowsAwaitingBankConfirmation: {
          escrowTransactionCount: awaitingBankTransfer?.count ?? 0,
          totalLandlordAmount: awaitingBankTransfer?.totalLandlordAmount ?? 0,
        },
      },
      notes: {
        currency:
          "All amounts are stored in the platform's primary currency (same as Escrow / Payment models).",
        markPaid:
          "Use mark-paid on a landlord Payout after funds leave the bank. Linked escrow rows are updated to landlordPayoutStatus paid.",
        preDistribution:
          "pendingLandlordShareInEscrow is rent still in escrow (held) before Khayalami runs distribution.recordsAwaitingSettlement is Payout documents waiting for your transfer.",
      },
    };
  }

  /**
   * Held escrow balances grouped by landlord (pre-distribution — not yet a Payout row).
   */
  async getHeldLandlordBreakdown() {
    const rows = await EscrowTransaction.aggregate([
      {
        $match: {
          status: "held",
          landlordPayoutStatus: "pending",
        },
      },
      {
        $group: {
          _id: "$landlordId",
          transactionCount: { $sum: 1 },
          totalLandlordAmount: { $sum: "$landlordAmount" },
        },
      },
      { $sort: { totalLandlordAmount: -1 } },
    ]);

    const landlordIds = rows.map((r) => r._id).filter(Boolean);
    const landlords = await User.find({
      _id: { $in: landlordIds },
    }).select("firstName lastName email phone bankAccount bankName").lean();

    const byId = new Map(landlords.map((u) => [u._id.toString(), u]));

    return rows.map((r) => {
      const u = byId.get(r._id.toString());
      return {
        landlordId: r._id,
        landlord: u
          ? {
              firstName: u.firstName,
              lastName: u.lastName,
              email: u.email,
              phone: u.phone ?? null,
              bankAccount: u.bankAccount ?? null,
              bankName: u.bankName ?? null,
            }
          : null,
        heldTransactionCount: r.transactionCount,
        totalLandlordAmount: r.totalLandlordAmount,
      };
    });
  }

  async listLandlordPayouts(params: {
    page: number;
    limit: number;
    status: string;
  }) {
    const page = Math.max(1, params.page);
    const limit = Math.min(100, Math.max(1, params.limit));
    const skip = (page - 1) * limit;

    const query: any = {
      recipientType: "landlord",
      payoutType: { $in: ["landlord", "bulk_landlord"] },
    };

    if (
      params.status &&
      params.status !== "all" &&
      ["pending", "processing", "completed", "failed", "cancelled"].includes(
        params.status,
      )
    ) {
      query.status = params.status;
    }

    const [total, payouts] = await Promise.all([
      Payout.countDocuments(query),
      Payout.find(query)
        .populate("recipientId", "firstName lastName email phone bankAccount bankName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const data = payouts.map((p) => ({
      payoutId: p._id,
      payoutType: p.payoutType,
      amount: p.amount,
      status: p.status,
      payoutMethod: p.payoutMethod,
      bankDetails: p.bankDetails ?? null,
      mobileMoneyDetails: p.mobileMoneyDetails ?? null,
      externalReference: p.externalReference ?? null,
      processedAt: p.processedAt ?? null,
      notes: p.notes ?? null,
      createdAt: p.createdAt,
      landlord: p.recipientId
        ? {
            userId: p.recipientId._id,
            firstName: p.recipientId.firstName,
            lastName: p.recipientId.lastName,
            email: p.recipientId.email,
            phone: p.recipientId.phone ?? null,
            bankAccount: p.recipientId.bankAccount ?? null,
            bankName: p.recipientId.bankName ?? null,
          }
        : null,
      escrowTransactionCount: p.escrowTransactionIds?.length ?? 0,
    }));

    return {
      payouts: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async getLandlordPayoutById(payoutId: string) {
    if (!mongoose.Types.ObjectId.isValid(payoutId)) {
      return { error: "invalid_id" as const };
    }

    const p = await Payout.findById(payoutId)
      .populate("recipientId", "firstName lastName email phone bankAccount bankName")
      .lean();

    if (!p || !isLandlordPayout(p)) {
      return { error: "not_found" as const };
    }

    const escrowRows = await EscrowTransaction.find({
      _id: { $in: p.escrowTransactionIds || [] },
    })
      .select(
        "totalAmount landlordAmount khayalamiAmount status landlordPayoutStatus landlordPayoutDate paymentType createdAt distributedAt propertyId rentalId",
      )
      .populate("propertyId", "title address")
      .lean();

    const rentalPropertyMap = await rentalIdToPropertyMap(escrowRows);
    const escrowTransactions = escrowRows.map((t) =>
      formatEscrowLineForBankAdmin(t, rentalPropertyMap),
    );

    let bankDetails = p.bankDetails ?? null;
    let mobileMoneyDetails = p.mobileMoneyDetails ?? null;
    if (
      !bankDetails &&
      !mobileMoneyDetails &&
      p.recipientId?._id
    ) {
      const lb = await LandlordBalance.findOne({
        landlordId: p.recipientId._id,
      })
        .select("bankDetails mobileMoneyDetails")
        .lean();
      if (lb) {
        bankDetails = lb.bankDetails ?? bankDetails;
        mobileMoneyDetails = lb.mobileMoneyDetails ?? mobileMoneyDetails;
      }
    }

    return {
      data: {
        payoutId: p._id,
        payoutType: p.payoutType,
        amount: p.amount,
        status: p.status,
        payoutMethod: p.payoutMethod,
        bankDetails,
        mobileMoneyDetails,
        externalReference: p.externalReference ?? null,
        processedAt: p.processedAt ?? null,
        processedBy: p.processedBy ?? null,
        notes: p.notes ?? null,
        createdAt: p.createdAt,
        landlord: p.recipientId
          ? {
              userId: p.recipientId._id,
              firstName: p.recipientId.firstName,
              lastName: p.recipientId.lastName,
              email: p.recipientId.email,
              phone: p.recipientId.phone ?? null,
              bankAccount: p.recipientId.bankAccount ?? null,
              bankName: p.recipientId.bankName ?? null,
            }
          : null,
        escrowTransactions,
      },
    };
  }

  /**
   * After the bank pays the landlord outside the platform, mark the payout complete
   * and sync escrow rows to landlordPayoutStatus paid.
   */
  async markLandlordPayoutPaid(
    payoutId: string,
    bankAdminId: string,
    opts: { externalReference?: string; notes?: string },
  ) {
    if (!mongoose.Types.ObjectId.isValid(payoutId)) {
      return { error: "invalid_id" as const };
    }

    const payout = await Payout.findById(payoutId);
    if (!payout || !isLandlordPayout(payout)) {
      return { error: "not_found" as const };
    }

    if (payout.status === "completed") {
      return { error: "already_completed" as const };
    }

    if (payout.status === "cancelled") {
      return { error: "cancelled_payout" as const };
    }

    const now = new Date();
    payout.status = "completed";
    payout.processedAt = now;
    payout.processedBy = new mongoose.Types.ObjectId(bankAdminId);

    if (opts.externalReference != null && opts.externalReference !== "") {
      payout.externalReference = String(opts.externalReference).trim();
    }

    if (opts.notes != null && opts.notes !== "") {
      const tag = `[bank mark-paid ${now.toISOString()}] ${opts.notes.trim()}`;
      payout.notes = payout.notes ? `${payout.notes}\n${tag}` : tag;
    }

    await payout.save();

    const ids = (payout.escrowTransactionIds || []).filter(Boolean);
    if (ids.length > 0) {
      await EscrowTransaction.updateMany(
        { _id: { $in: ids } },
        {
          $set: {
            landlordPayoutStatus: "paid",
            landlordPayoutDate: now,
          },
        },
      );
    }

    let emailSent = false;
    try {
      const landlord = await User.findById(payout.recipientId)
        .select("firstName lastName email")
        .lean();
      if (landlord?.email) {
        await emailNotificationService.sendLandlordBankPayoutConfirmed({
          landlordEmail: landlord.email,
          landlordName: `${landlord.firstName} ${landlord.lastName}`.trim(),
          amount: payout.amount,
          payoutId: payout._id.toString(),
          externalReference: payout.externalReference || undefined,
          processedAt: now,
        });
        emailSent = true;
      }
    } catch (emailErr: any) {
      logger.warn("BankAdminService: landlord payout email failed", {
        payoutId: payout._id.toString(),
        message: emailErr?.message,
      });
    }

    return {
      data: {
        payoutId: payout._id,
        status: payout.status,
        processedAt: payout.processedAt,
        externalReference: payout.externalReference ?? null,
        emailSent,
      },
    };
  }
}

export const bankAdminService = new BankAdminService();
