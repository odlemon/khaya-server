import express from "express";
import { emailVerificationController } from "../controllers/EmailVerificationController";

const router = express.Router();

// Email verification routes
router.post("/send", emailVerificationController.sendVerificationEmail.bind(emailVerificationController));
router.post("/verify", emailVerificationController.verifyPin.bind(emailVerificationController));
router.post("/resend", emailVerificationController.resendVerificationEmail.bind(emailVerificationController));

export default router;
