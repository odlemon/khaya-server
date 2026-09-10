// @ts-nocheck
import { invoiceReminderService } from "../services/InvoiceReminderService";
import { logger } from "../utils/logger";

/**
 * Invoice Reminder Job
 *
 * Chases invoices that are due soon or already overdue, and moves past-due
 * invoices to the "overdue" status nothing else ever set. Safe to run
 * repeatedly — each stage is only announced once per invoice.
 *
 * Example cron: "0 9 * * *" (runs at 9 AM every day)
 */

export async function runInvoiceReminderJob() {
  try {
    logger.info("🔄 Running invoice reminder job check...");
    const result = await invoiceReminderService.checkAndSendReminders();
    logger.info("✅ Invoice reminder job completed");
    return result;
  } catch (error: any) {
    logger.error("❌ Invoice reminder job failed:", error);
    throw error;
  }
}

// If running directly (for testing)
if (require.main === module) {
  require("dotenv").config();

  import("../utils/database").then(({ dbConnection }) => {
    dbConnection
      .connect()
      .then(() => runInvoiceReminderJob())
      .then(() => {
        logger.info("✅ Invoice reminder job completed");
        process.exit(0);
      })
      .catch((error) => {
        logger.error("❌ Invoice reminder job error:", error);
        process.exit(1);
      });
  });
}
