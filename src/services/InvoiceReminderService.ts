// @ts-nocheck
import { Invoice } from "../models/Invoice";
import { Notification } from "../models/Notification";
import { appNotificationService } from "./AppNotificationService";
import { logger } from "../utils/logger";

/**
 * Invoice reminders.
 *
 * The existing rent reminders are keyed to Payment records, not invoices, so an
 * unpaid invoice was never chased and nothing ever moved one to "overdue" —
 * that status existed in the schema but was only ever read, never written.
 *
 * Two stages, each announced once per invoice:
 *   due_soon — inside the notice window and not yet due
 *   overdue  — past the due date
 */

/** Days before the due date at which the first reminder goes out. */
export const INVOICE_DUE_SOON_DAYS = 3;

/** Invoice states that still expect payment. */
const UNSETTLED_STATUSES = ["pending", "partially_paid", "overdue"] as const;

export type InvoiceReminderStage = "due_soon" | "overdue";

function money(amount: number | undefined): string {
  const n = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  return `$${n.toFixed(2)}`;
}

export class InvoiceReminderService {
  /**
   * Which stage an invoice is at, or null when it needs no reminder yet.
   */
  stageFor(invoice: any, now: Date = new Date()): InvoiceReminderStage | null {
    if (!invoice?.dueDate) return null;

    const due = new Date(invoice.dueDate);
    if (Number.isNaN(due.getTime())) return null;

    if (due.getTime() < now.getTime()) return "overdue";

    const msUntilDue = due.getTime() - now.getTime();
    const daysUntilDue = msUntilDue / (24 * 60 * 60 * 1000);
    return daysUntilDue <= INVOICE_DUE_SOON_DAYS ? "due_soon" : null;
  }

  async checkAndSendReminders(): Promise<{
    invoicesChecked: number;
    remindersSent: number;
    markedOverdue: number;
  }> {
    const now = new Date();

    const invoices = await Invoice.find({
      status: { $in: [...UNSETTLED_STATUSES] },
      dueDate: { $ne: null },
    }).lean();

    let remindersSent = 0;
    let markedOverdue = 0;

    for (const invoice of invoices as any[]) {
      try {
        const stage = this.stageFor(invoice, now);
        if (!stage) continue;

        const invoiceId = invoice._id?.toString?.() || String(invoice._id);

        // Nothing was ever writing this status, so an overdue invoice still read
        // as pending everywhere it was displayed.
        if (stage === "overdue" && invoice.status !== "overdue") {
          await Invoice.updateOne({ _id: invoice._id }, { $set: { status: "overdue" } });
          markedOverdue++;
        }

        const tenantId = invoice.tenantId?.toString?.() || String(invoice.tenantId || "");
        if (!tenantId) continue;

        // One reminder per stage per invoice, however often this runs.
        const already = await Notification.findOne({
          userId: tenantId,
          type: "invoice_due",
          "data.invoiceId": invoiceId,
          "data.stage": stage,
        }).lean();

        if (already) continue;

        const propertyLabel = invoice.property?.title || "your rental";
        const amount = money(invoice.amountDue ?? invoice.total);
        const body =
          stage === "overdue"
            ? `Invoice ${invoice.invoiceNumber} for ${propertyLabel} is overdue. ${amount} is outstanding.`
            : `Invoice ${invoice.invoiceNumber} for ${propertyLabel} is due soon. ${amount} is outstanding.`;

        await appNotificationService.notify({
          userId: tenantId,
          type: "invoice_due",
          title: stage === "overdue" ? "Invoice overdue" : "Invoice due soon",
          body,
          data: {
            invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            rentalId: invoice.rentalId?.toString?.() || String(invoice.rentalId || ""),
            stage,
            dueDate: invoice.dueDate,
            amountDue: invoice.amountDue ?? invoice.total,
            path: "/rental-dashboard",
          },
        });

        remindersSent++;
        logger.info(
          `[Invoices] Reminded tenant ${tenantId} about invoice ${invoice.invoiceNumber} (${stage})`
        );
      } catch (error: any) {
        // One bad invoice should not stop the rest of the run.
        logger.error(
          `[Invoices] Failed while checking invoice ${invoice?._id}: ${error?.message || error}`
        );
      }
    }

    logger.info(
      `[Invoices] Checked ${invoices.length} unsettled invoice(s), sent ${remindersSent} reminder(s), marked ${markedOverdue} overdue`
    );

    return { invoicesChecked: invoices.length, remindersSent, markedOverdue };
  }
}

export const invoiceReminderService = new InvoiceReminderService();
