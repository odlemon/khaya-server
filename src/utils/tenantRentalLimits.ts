// @ts-nocheck
import { Types } from "mongoose";
import { Rental, IRental } from "../models/Rental";
import { Agreement } from "../models/Agreement";

/** Tenant is still bound to the rental (payments, history) even if suspended */
export const TENANT_ACTIVE_RENTAL_STATUSES = ["active", "suspended"] as const;

/** Agreement states after which a rental has no business still being active. */
const ENDED_AGREEMENT_STATUSES = ["terminated", "expired"] as const;

export const TENANT_ACTIVE_RENTAL_MESSAGE =
  "You already have an active rental. You can only have one active rental at a time. Please terminate your current rental before starting a new one.";

export async function findTenantActiveRental(
  tenantId: string,
  excludeRentalId?: string
): Promise<IRental | null> {
  const filter: Record<string, unknown> = {
    tenantId: new Types.ObjectId(tenantId),
    status: { $in: [...TENANT_ACTIVE_RENTAL_STATUSES] },
  };
  if (excludeRentalId) {
    filter._id = { $ne: new Types.ObjectId(excludeRentalId) };
  }

  const candidates = await Rental.find(filter)
    .select("_id propertyId status tenantId agreementId")
    .lean();
  if (candidates.length === 0) return null;

  // A rental whose agreement has already ended should not still read as active.
  // Termination used to leave these behind when its cleanup step failed, and the
  // tenant was then blocked from ever renting again with no way back. Treat those
  // as ended here — and repair them — so an old failure cannot strand anyone.
  const agreementIds = candidates.map((r) => r.agreementId).filter(Boolean);
  const endedAgreements = agreementIds.length
    ? await Agreement.find({
        _id: { $in: agreementIds },
        status: { $in: [...ENDED_AGREEMENT_STATUSES] },
      })
        .select("_id")
        .lean()
    : [];

  if (endedAgreements.length === 0) return candidates[0] as IRental;

  const endedIds = new Set(endedAgreements.map((a) => a._id.toString()));
  const isStale = (r: any) => r.agreementId && endedIds.has(r.agreementId.toString());

  const stale = candidates.filter(isStale);
  if (stale.length > 0) {
    await Rental.updateMany(
      { _id: { $in: stale.map((r) => r._id) } },
      { $set: { status: "ended", endedAt: new Date() } }
    );
    console.warn(
      `⚠️  Repaired ${stale.length} rental(s) left active after their agreement ended (tenant ${tenantId})`
    );
  }

  return (candidates.find((r) => !isStale(r)) as IRental) || null;
}

export async function assertTenantHasNoActiveRental(
  tenantId: string,
  excludeRentalId?: string
): Promise<void> {
  const existing = await findTenantActiveRental(tenantId, excludeRentalId);
  if (existing) {
    throw new Error(TENANT_ACTIVE_RENTAL_MESSAGE);
  }
}
