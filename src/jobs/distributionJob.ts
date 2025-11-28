// @ts-nocheck
import { distributionService } from "../services/DistributionService";
import { logger } from "../utils/logger";

/**
 * Monthly Distribution Cron Job
 * 
 * This job runs daily to check if it's time for monthly distribution
 * Configure in your cron scheduler to run daily at midnight
 * 
 * Example cron: "0 0 * * *" (runs at midnight every day)
 */

export async function runDistributionJob() {
  try {
    logger.info("🔄 Running distribution job check...");
    await distributionService.checkAndDistribute();
  } catch (error: any) {
    logger.error("❌ Distribution job failed:", error);
  }
}

// If running directly (for testing)
if (require.main === module) {
  runDistributionJob()
    .then(() => {
      logger.info("✅ Distribution job completed");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("❌ Distribution job error:", error);
      process.exit(1);
    });
}







