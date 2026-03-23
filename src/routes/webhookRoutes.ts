// @ts-nocheck
import express from "express";
import { paynowService } from "../services/PaynowService";
import { authenticate } from "../middleware/authenticate";
import { logger } from "../utils/logger";

const router = express.Router();

/**
 * POST /api/webhooks/paynow
 * Receives payment status updates from Paynow (server-to-server).
 * No auth required -- Paynow sends this directly.
 */
router.post("/paynow", async (req, res) => {
  try {
    logger.info("[Paynow] Webhook POST /paynow received", { bodyKeys: Object.keys(req.body || {}), reference: req.body?.reference, status: req.body?.status });
    const result = await paynowService.processWebhook(req.body);

    if (result.success) {
      logger.info("[Paynow] Webhook response: success", { message: result.message });
      return res.status(200).json({ success: true, message: result.message });
    } else {
      logger.warn("[Paynow] Webhook response: rejected", { message: result.message });
      return res.status(400).json({ success: false, message: result.message });
    }
  } catch (error: any) {
    logger.error("[Paynow] Webhook error", { message: error.message });
    return res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
});

/**
 * GET /api/webhooks/paynow
 * Health check for the Paynow webhook endpoint.
 */
router.get("/paynow", (req, res) => {
  res.status(200).json({ success: true, message: "Paynow webhook endpoint is active" });
});

/**
 * GET /api/payments/:paymentId/paynow-status
 * Frontend polls this to check if a Paynow payment has been confirmed.
 * Requires authentication.
 */
router.get("/payment-status/:paymentId", authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = (req as any).user?._id?.toString() || (req as any).user?.id;

    const result = await paynowService.pollAndConfirmPayment(paymentId, userId);

    return res.status(200).json({
      success: result.success,
      data: {
        paid: result.paid,
        status: result.status,
        payment: result.payment || null
      },
      ...(result.error && { message: result.error })
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
