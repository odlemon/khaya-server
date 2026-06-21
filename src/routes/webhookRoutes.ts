// @ts-nocheck
import express from "express";
import { paynowService } from "../services/PaynowService";
import { contipayService } from "../services/ContipayService";
import { paymentGatewayService } from "../services/PaymentGatewayService";
import { authenticate } from "../middleware/authenticate";
import { logger } from "../utils/logger";

const router = express.Router();

/**
 * POST /api/webhooks/paynow
 * Receives payment status updates from Paynow (server-to-server).
 */
router.post("/paynow", async (req, res) => {
  try {
    logger.info("[Paynow] Webhook POST /paynow received", {
      bodyKeys: Object.keys(req.body || {}),
      reference: req.body?.reference,
      status: req.body?.status,
    });
    const result = await paynowService.processWebhook(req.body);

    if (result.success) {
      logger.info("[Paynow] Webhook response: success", { message: result.message });
      return res.status(200).json({ success: true, message: result.message });
    }
    logger.warn("[Paynow] Webhook response: rejected", { message: result.message });
    return res.status(400).json({ success: false, message: result.message });
  } catch (error: any) {
    logger.error("[Paynow] Webhook error", { message: error.message });
    return res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
});

router.get("/paynow", (req, res) => {
  res.status(200).json({ success: true, message: "Paynow webhook endpoint is active" });
});

/**
 * POST /api/webhooks/contipay
 * Receives payment status updates from ContiPay (server-to-server).
 */
router.post("/contipay", async (req, res) => {
  try {
    logger.info("[ContiPay] Webhook POST /contipay received", {
      bodyKeys: Object.keys(req.body || {}),
      body: req.body,
    });
    const result = await contipayService.processWebhook(req.body);

    if (result.success) {
      logger.info("[ContiPay] Webhook response: success", { message: result.message });
      return res.status(200).json({ success: true, message: result.message });
    }
    logger.warn("[ContiPay] Webhook response: rejected", { message: result.message });
    return res.status(400).json({ success: false, message: result.message });
  } catch (error: any) {
    logger.error("[ContiPay] Webhook error", { message: error.message });
    return res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
});

router.get("/contipay", (req, res) => {
  res.status(200).json({ success: true, message: "ContiPay webhook endpoint is active" });
});

/**
 * GET /api/webhooks/payment-status/:paymentId
 * Frontend polls this to check if an online payment has been confirmed.
 */
router.get("/payment-status/:paymentId", authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = (req as any).user?._id?.toString() || (req as any).user?.id;

    const result = await paymentGatewayService.pollAndConfirmPayment(paymentId, userId);

    return res.status(200).json({
      success: result.success,
      data: {
        paid: result.paid,
        status: result.status,
        payment: result.payment || null,
        gateway: paymentGatewayService.provider,
      },
      ...(result.error && { message: result.error }),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
