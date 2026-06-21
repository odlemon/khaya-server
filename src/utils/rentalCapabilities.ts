// @ts-nocheck
import { IRental } from "../models/Rental";

export type RentalCapabilityFlags = {
  statusLabel: string;
  isActive: boolean;
  isEnded: boolean;
  isSuspended: boolean;
  /** Tenant/landlord can pay rent or book new services */
  canPayRent: boolean;
  canBookServices: boolean;
  canRequestMaintenance: boolean;
  canUploadConditionLogs: boolean;
  /** Read-only history (payments, logs, maintenance list) */
  isReadOnlyHistory: boolean;
};

export function getRentalCapabilities(rental: Pick<IRental, "status">): RentalCapabilityFlags {
  const isActive = rental.status === "active";
  const isSuspended = rental.status === "suspended";
  const isEnded = rental.status === "ended";

  let statusLabel = "Active";
  if (isEnded) statusLabel = "No longer active";
  else if (isSuspended) statusLabel = "Suspended";

  const canOperate = isActive;

  return {
    statusLabel,
    isActive,
    isEnded,
    isSuspended,
    canPayRent: canOperate,
    canBookServices: canOperate,
    canRequestMaintenance: canOperate,
    canUploadConditionLogs: canOperate,
    isReadOnlyHistory: isEnded || isSuspended,
  };
}

export function enrichRentalWithCapabilities<T extends Record<string, unknown>>(
  rental: T
): T & RentalCapabilityFlags {
  const caps = getRentalCapabilities(rental as Pick<IRental, "status">);
  return { ...rental, ...caps };
}

/** Block tenant payment / new service actions on inactive rentals */
export function assertRentalAcceptsTenantPayments(rental: Pick<IRental, "status">): void {
  if (rental.status !== "active") {
    throw new Error(
      "This rental is no longer active. Rent payments and new service requests are disabled."
    );
  }
}

export function assertRentalAcceptsNewBookings(rental: Pick<IRental, "status">): void {
  if (rental.status !== "active") {
    throw new Error(
      "This rental is no longer active. You cannot request new services or maintenance."
    );
  }
}
