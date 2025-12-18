// @ts-nocheck
import { rentalReminderService } from "../services/RentalReminderService";
import { logger } from "../utils/logger";

/**
 * Rental Reminder Cron Job
 * 
 * This job runs daily to check for upcoming rent payments and send reminders
 * Configure in your cron scheduler to run daily at 9 AM
 * 
 * Example cron: "0 9 * * *" (runs at 9 AM every day)
 */

export async function runRentalReminderJob() {
  try {
    logger.info("🔄 Running rental reminder job check...");
    await rentalReminderService.checkAndSendReminders();
    logger.info("✅ Rental reminder job completed");
  } catch (error: any) {
    logger.error("❌ Rental reminder job failed:", error);
    throw error;
  }
}

// If running directly (for testing)
if (require.main === module) {
  require("dotenv").config();
  
  // Import database connection
  import("../utils/database").then(({ dbConnection }) => {
    dbConnection.connect()
      .then(() => {
        return runRentalReminderJob();
      })
      .then(() => {
        logger.info("✅ Rental reminder job completed");
        process.exit(0);
      })
      .catch((error) => {
        logger.error("❌ Rental reminder job error:", error);
        process.exit(1);
      });
  });
}

