// @ts-nocheck
import { Types } from "mongoose";
import { Rental, IRental } from "../models/Rental";

/** Tenant is still bound to the rental (payments, history) even if suspended */
export const TENANT_ACTIVE_RENTAL_STATUSES = ["active", "suspended"] as const;

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
  return Rental.findOne(filter).select("_id propertyId status tenantId").lean();
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
