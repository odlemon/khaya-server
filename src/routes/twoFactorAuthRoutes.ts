import express from "express";
import { twoFactorAuthController } from "../controllers/TwoFactorAuthController";
import { authenticate, authorize } from "../middleware/authenticate";

const router = express.Router();

// 2FA routes that require authentication
router.get("/settings", authenticate, authorize(["tenant", "landlord", "admin"]), twoFactorAuthController.getSettings.bind(twoFactorAuthController));
router.post("/toggle", authenticate, authorize(["tenant", "landlord", "admin"]), twoFactorAuthController.toggle2FA.bind(twoFactorAuthController));
router.post("/verify", authenticate, authorize(["tenant", "landlord", "admin"]), twoFactorAuthController.verify2FA.bind(twoFactorAuthController));

// Resend endpoint (no authentication required - used during login)
router.post("/resend", twoFactorAuthController.resend2FACode.bind(twoFactorAuthController));

export default router;
