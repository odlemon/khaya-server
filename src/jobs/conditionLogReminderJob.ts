// @ts-nocheck
import { conditionLogScheduleService } from "../services/ConditionLogScheduleService";
import { logger } from "../utils/logger";

/**
 * Quarterly Condition Report Reminder Job
 *
 * Nudges tenants whose three-monthly property condition report is due or
 * overdue. Safe to run repeatedly — each checkpoint is only announced once.
 *
 * Example cron: "0 9 * * *" (runs at 9 AM every day)
 */

export async function runConditionLogReminderJob() {
  try {
    logger.info("🔄 Running condition log reminder job check...");
    const result = await conditionLogScheduleService.checkAndSendReminders();
    logger.info("✅ Condition log reminder job completed");
    return result;
  } catch (error: any) {
    logger.error("❌ Condition log reminder job failed:", error);
    throw error;
  }
}

// If running directly (for testing)
if (require.main === module) {
  require("dotenv").config();

  import("../utils/database").then(({ dbConnection }) => {
    dbConnection
      .connect()
      .then(() => runConditionLogReminderJob())
      .then(() => {
        logger.info("✅ Condition log reminder job completed");
        process.exit(0);
      })
      .catch((error) => {
        logger.error("❌ Condition log reminder job error:", error);
        process.exit(1);
      });
  });
}
