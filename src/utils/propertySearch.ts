// @ts-nocheck
import { Rental } from "../models/Rental";

/**
 * Tenant-facing search should not return properties that already have an active rental,
 * even if listing status was not updated to "rented".
 */
export async function excludeActivelyRentedProperties(
  query: Record<string, unknown>
): Promise<void> {
  const rentedPropertyIds = await Rental.distinct("propertyId", { status: "active" });
  if (!rentedPropertyIds.length) return;

  const rentedFilter = { _id: { $nin: rentedPropertyIds } };

  if (query._id) {
    const existingIdFilter = { _id: query._id };
    delete query._id;
    const andClause = Array.isArray(query.$and) ? query.$and : [];
    query.$and = [...andClause, existingIdFilter, rentedFilter];
  } else {
    query._id = rentedFilter._id;
  }
}
