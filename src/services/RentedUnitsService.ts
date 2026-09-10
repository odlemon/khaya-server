// @ts-nocheck
import { Rental } from "../models/Rental";
import { RentalReminder } from "../models/RentalReminder";
import { Notification } from "../models/Notification";
import { Types } from "mongoose";

/**
 * Read model for the customer-service view of occupied properties.
 *
 * Support staff had no way to see who is currently renting what, and no way to
 * tell which reminders a tenant had already been sent — so they could not tell
 * a tenant who had been chased four times from one who had never been contacted.
 */

/** Notification types that represent a reminder we sent to a tenant. */
const REMINDER_NOTIFICATION_TYPES = ["rent_due", "condition_log_due", "invoice_due"] as const;

export class RentedUnitsService {
  /**
   * Currently occupied units, with the parties and a count of reminders sent.
   */
  async listRentedUnits(): Promise<any[]> {
    const rentals = await Rental.find({ status: { $in: ["active", "suspended"] } })
      .populate("propertyId", "title address propertyType status")
      .populate("tenantId", "firstName lastName email phone")
      .populate("landlordId", "firstName lastName email phone")
      .sort({ createdAt: -1 })
      .lean();

    if (rentals.length === 0) return [];

    const rentalIds = rentals.map((r: any) => r._id);
    const tenantIds = rentals.map((r: any) => r.tenantId?._id).filter(Boolean);

    // Two sources: scheduled rent reminders, and the notifications every other
    // reminder job writes. Counted together so staff see one total per unit.
    const [reminderCounts, notificationCounts] = await Promise.all([
      RentalReminder.aggregate([
        { $match: { rentalId: { $in: rentalIds } } },
        { $group: { _id: "$rentalId", count: { $sum: 1 }, lastSentAt: { $max: "$sentAt" } } },
      ]),
      Notification.aggregate([
        {
          $match: {
            userId: { $in: tenantIds },
            type: { $in: [...REMINDER_NOTIFICATION_TYPES] },
          },
        },
        { $group: { _id: "$userId", count: { $sum: 1 }, lastSentAt: { $max: "$createdAt" } } },
      ]),
    ]);

    const byRental = new Map(reminderCounts.map((r: any) => [r._id.toString(), r]));
    const byTenant = new Map(notificationCounts.map((n: any) => [n._id.toString(), n]));

    return rentals.map((rental: any) => {
      const rentalKey = rental._id.toString();
      const tenantKey = rental.tenantId?._id?.toString();
      const scheduled = byRental.get(rentalKey);
      const notified = tenantKey ? byTenant.get(tenantKey) : null;

      const lastSentCandidates = [scheduled?.lastSentAt, notified?.lastSentAt].filter(Boolean);
      const lastReminderAt = lastSentCandidates.length
        ? new Date(Math.max(...lastSentCandidates.map((d: any) => new Date(d).getTime())))
        : null;

      return {
        rentalId: rentalKey,
        status: rental.status,
        startDate: rental.startDate,
        endDate: rental.endDate,
        monthlyRent: rental.monthlyRent,
        nextPaymentDue: rental.nextPaymentDue,
        property: rental.propertyId
          ? {
              id: rental.propertyId._id,
              title: rental.propertyId.title,
              address: rental.propertyId.address,
              status: rental.propertyId.status,
            }
          : null,
        tenant: rental.tenantId
          ? {
              id: rental.tenantId._id,
              name: `${rental.tenantId.firstName || ""} ${rental.tenantId.lastName || ""}`.trim(),
              email: rental.tenantId.email,
              phone: rental.tenantId.phone,
            }
          : null,
        landlord: rental.landlordId
          ? {
              id: rental.landlordId._id,
              name: `${rental.landlordId.firstName || ""} ${rental.landlordId.lastName || ""}`.trim(),
              email: rental.landlordId.email,
              phone: rental.landlordId.phone,
            }
          : null,
        reminders: {
          total: (scheduled?.count || 0) + (notified?.count || 0),
          lastSentAt: lastReminderAt,
        },
      };
    });
  }

  /**
   * Every reminder sent for one unit, newest first, so staff can see exactly
   * what a tenant has already received before contacting them.
   */
  async listRemindersForRental(rentalId: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(rentalId)) {
      throw new Error("Invalid rental ID");
    }

    const rental = await Rental.findById(rentalId).select("tenantId").lean();
    if (!rental) throw new Error("Rental not found");

    const [scheduled, notified] = await Promise.all([
      RentalReminder.find({ rentalId: new Types.ObjectId(rentalId) })
        .select("reminderType dueDate sentAt status")
        .lean(),
      rental.tenantId
        ? Notification.find({
            userId: rental.tenantId,
            type: { $in: [...REMINDER_NOTIFICATION_TYPES] },
          })
            .select("type title body createdAt read")
            .lean()
        : Promise.resolve([]),
    ]);

    const rows = [
      ...scheduled.map((r: any) => ({
        kind: "rent",
        label: `Rent reminder (${String(r.reminderType).replace(/_/g, " ")})`,
        detail: r.dueDate ? `Payment due ${new Date(r.dueDate).toISOString().slice(0, 10)}` : "",
        sentAt: r.sentAt,
        status: r.status,
        read: null,
      })),
      ...notified.map((n: any) => ({
        kind: n.type,
        label: n.title,
        detail: n.body,
        sentAt: n.createdAt,
        status: "sent",
        read: Boolean(n.read),
      })),
    ];

    return rows.sort(
      (a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime()
    );
  }
}

export const rentedUnitsService = new RentedUnitsService();
