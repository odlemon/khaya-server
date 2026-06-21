// @ts-nocheck
import { Agreement } from "../models/Agreement";
import { enrichRentalWithCapabilities } from "./rentalCapabilities";

/**
 * Attach UI capability flags + agreement termination context for portal lists/detail.
 */
export async function enrichRentalForApi(rental: any): Promise<any> {
  const obj = rental.toObject ? rental.toObject() : { ...rental };
  const enriched = enrichRentalWithCapabilities(obj);

  if (rental.agreementId) {
    const agreement =
      typeof rental.agreementId === "object" && rental.agreementId.status
        ? rental.agreementId
        : await Agreement.findById(rental.agreementId).select("status terminatedAt").lean();

    if (agreement) {
      enriched.agreementStatus = agreement.status;
      enriched.terminatedAt = agreement.terminatedAt ?? null;
    }
  }

  if (enriched.isEnded && enriched.endedAt) {
    enriched.statusSubtitle = `Ended ${new Date(enriched.endedAt).toLocaleDateString()}`;
  }

  return enriched;
}

export async function enrichRentalsForApi(rentals: any[]): Promise<any[]> {
  return Promise.all(rentals.map((r) => enrichRentalForApi(r)));
}
