// @ts-nocheck
import express from "express";
import { runRentalReminderJob } from "../jobs/rentalReminderJob";
import { runDistributionJob } from "../jobs/distributionJob";
import { logger } from "../utils/logger";

const router = express.Router();

/**
 * Vercel Cron Jobs
 * 
 * These endpoints are called by Vercel's cron scheduler
 * They require VERCEL_CRON_SECRET header for security
 */

// No secret verification for dev mode
// TODO: Add secret verification for production

/**
 * Rental Reminder Cron Job
 * Runs every minute for testing (normally daily at 9 AM UTC)
 * GET /api/cron/rental-reminders
 */
router.get("/rental-reminders", async (req, res) => {
  try {
    logger.info("🔄 Cron job triggered: Rental Reminders");
    await runRentalReminderJob();
    res.status(200).json({ 
      success: true, 
      message: "Rental reminder job completed",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error("❌ Cron job failed: Rental Reminders", error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Distribution Cron Job
 * Runs every minute for testing (normally daily at midnight UTC)
 * GET /api/cron/distribution
 */
router.get("/distribution", async (req, res) => {
  try {
    logger.info("🔄 Cron job triggered: Distribution");
    await runDistributionJob();
    res.status(200).json({ 
      success: true, 
      message: "Distribution job completed",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error("❌ Cron job failed: Distribution", error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
