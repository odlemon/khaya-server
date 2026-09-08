// @ts-nocheck
import express from "express";
import { runRentalReminderJob } from "../jobs/rentalReminderJob";
import { runDistributionJob } from "../jobs/distributionJob";
import { runConditionLogReminderJob } from "../jobs/conditionLogReminderJob";
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
  const timestamp = new Date().toISOString();
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  
  try {
    logger.info("========================================");
    logger.info("🔄 CRON ENDPOINT HIT: Rental Reminders");
    logger.info(`🔄 Timestamp: ${timestamp}`);
    logger.info(`🔄 Client IP: ${clientIp}`);
    logger.info(`🔄 User-Agent: ${req.get('user-agent') || 'unknown'}`);
    logger.info("========================================");
    
    await runRentalReminderJob();
    
    logger.info("✅ Rental reminder job completed successfully");
    
    res.status(200).json({ 
      success: true, 
      message: "Rental reminder job completed",
      timestamp: timestamp
    });
  } catch (error: any) {
    logger.error("========================================");
    logger.error("❌ CRON JOB FAILED: Rental Reminders");
    logger.error(`❌ Timestamp: ${timestamp}`);
    logger.error(`❌ Error: ${error.message}`);
    logger.error("========================================");
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: timestamp
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

/**
 * Quarterly Condition Report Reminder Cron Job
 * Normally daily at 9 AM UTC — each checkpoint is only announced once, so a
 * daily run simply picks up whichever tenancies have reached one.
 * GET /api/cron/condition-log-reminders
 */
router.get("/condition-log-reminders", async (req, res) => {
  const timestamp = new Date().toISOString();

  try {
    logger.info("🔄 Cron job triggered: Condition Log Reminders");
    const result = await runConditionLogReminderJob();

    res.status(200).json({
      success: true,
      message: "Condition log reminder job completed",
      ...result,
      timestamp,
    });
  } catch (error: any) {
    logger.error("❌ Cron job failed: Condition Log Reminders", error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp,
    });
  }
});

export default router;




