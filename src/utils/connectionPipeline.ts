// @ts-nocheck
import { Types } from "mongoose";
import { Agreement } from "../models/Agreement";
import { Rental } from "../models/Rental";

export type ConnectionNextStep =
  | "awaiting_landlord"
  | "chat_available"
  | "agreement_pending"
  | "active_rental"
  | "closed";

export function computeConnectionNextStep(
  connection: { status: string; isActive?: boolean },
  agreement?: { status?: string } | null,
  rental?: { status?: string } | null
): ConnectionNextStep {
  if (connection.status === "pending") {
    return "awaiting_landlord";
  }
  if (connection.status === "rejected" || connection.status === "cancelled") {
    return "closed";
  }
  if (connection.status === "accepted" && connection.isActive !== false) {
    if (rental?.status === "active") {
      return "active_rental";
    }
    if (
      agreement &&
      ["draft", "pending", "signed"].includes(agreement.status || "")
    ) {
      return "agreement_pending";
    }
    return "chat_available";
  }
  return "closed";
}

/** Closed connection statuses that either party can clear from their History tab */
export const CLOSED_CONNECTION_STATUSES = ["cancelled", "rejected"] as const;

/** Landlord may clear from their list (pending still needs Accept/Decline) */
export const LANDLORD_CLEARABLE_CONNECTION_STATUSES = [
  "accepted",
  "cancelled",
  "rejected",
] as const;

/** Default landlord inbox — pending + accepted only (History uses status filter) */
export function applyLandlordConnectionListFilter(
  query: Record<string, unknown>,
  status?: string,
  includeDismissed = false
): void {
  if (!includeDismissed) {
    const dismissFilter = {
      $or: [
        { dismissedByLandlordAt: { $exists: false } },
        { dismissedByLandlordAt: null },
      ],
    };
    if (Array.isArray(query.$and)) {
      query.$and.push(dismissFilter);
    } else {
      query.$and = [dismissFilter];
    }
  }

  if (status) {
    query.status = status;
    return;
  }

  query.status = { $in: ["pending", "accepted"] };
}

/**
 * Batch-enrich tenant connection rows with agreement/rental pipeline fields.
 */
export async function enrichTenantConnections(connections: any[]): Promise<any[]> {
  if (!connections.length) {
    return [];
  }

  const accepted = connections.filter((c) => c.status === "accepted");
  const propertyIds = [...new Set(accepted.map((c) => c.propertyId?._id?.toString() || c.propertyId?.toString()).filter(Boolean))];
  const tenantIds = [...new Set(accepted.map((c) => c.tenantId?._id?.toString() || c.tenantId?.toString()).filter(Boolean))];
  const landlordIds = [...new Set(accepted.map((c) => c.landlordId?._id?.toString() || c.landlordId?.toString()).filter(Boolean))];

  let agreements: any[] = [];
  let rentals: any[] = [];

  if (propertyIds.length && tenantIds.length) {
    agreements = await Agreement.find({
      propertyId: { $in: propertyIds.map((id) => new Types.ObjectId(id)) },
      tenantId: { $in: tenantIds.map((id) => new Types.ObjectId(id)) },
      landlordId: { $in: landlordIds.map((id) => new Types.ObjectId(id)) },
    })
      .select("_id status propertyId tenantId landlordId signedAt")
      .sort({ createdAt: -1 })
      .lean();

    rentals = await Rental.find({
      propertyId: { $in: propertyIds.map((id) => new Types.ObjectId(id)) },
      tenantId: { $in: tenantIds.map((id) => new Types.ObjectId(id)) },
      status: { $in: ["active", "suspended"] },
    })
      .select("_id status propertyId tenantId agreementId")
      .lean();
  }

  const agreementKey = (propertyId: string, tenantId: string, landlordId: string) =>
    `${propertyId}:${tenantId}:${landlordId}`;

  const agreementMap = new Map<string, any>();
  for (const a of agreements) {
    const key = agreementKey(
      a.propertyId.toString(),
      a.tenantId.toString(),
      a.landlordId.toString()
    );
    if (!agreementMap.has(key)) {
      agreementMap.set(key, a);
    }
  }

  const rentalMap = new Map<string, any>();
  for (const r of rentals) {
    const key = `${r.propertyId.toString()}:${r.tenantId.toString()}`;
    if (!rentalMap.has(key)) {
      rentalMap.set(key, r);
    }
  }

  return connections.map((conn) => {
    const obj = conn.toObject ? conn.toObject() : { ...conn };
    const propertyId = obj.propertyId?._id?.toString() || obj.propertyId?.toString();
    const tenantId = obj.tenantId?._id?.toString() || obj.tenantId?.toString();
    const landlordId = obj.landlordId?._id?.toString() || obj.landlordId?.toString();

    const agreement =
      propertyId && tenantId && landlordId
        ? agreementMap.get(agreementKey(propertyId, tenantId, landlordId))
        : null;
    const rental =
      propertyId && tenantId ? rentalMap.get(`${propertyId}:${tenantId}`) : null;

    return {
      ...obj,
      agreementStatus: agreement?.status ?? null,
      agreementId: agreement?._id?.toString() ?? null,
      rentalStatus: rental?.status ?? null,
      rentalId: rental?._id?.toString() ?? null,
      nextStep: computeConnectionNextStep(obj, agreement, rental),
    };
  });
}
