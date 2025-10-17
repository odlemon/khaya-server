// @ts-nocheck
import express from "express";
import { onboardingController } from "../controllers/OnboardingController";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authenticate";

const router = express.Router();

// All onboarding routes require authentication
router.use(authenticate);

// Get onboarding status and progress
router.get("/status", (req, res, next) => onboardingController.getOnboardingStatus(req, res, next));

// Get onboarding progress
router.get("/progress", (req, res, next) => onboardingController.getOnboardingProgress(req, res, next));

// Get onboarding requirements for user type
router.get("/requirements", (req, res, next) => onboardingController.getOnboardingRequirements(req, res, next));

// Update landlord onboarding (landlord only)
router.put("/landlord", 
  authorize(["landlord"]), 
  (req, res, next) => onboardingController.updateLandlordOnboarding(req, res, next)
);

// Update tenant onboarding (tenant only)
router.put("/tenant", 
  authorize(["tenant"]), 
  (req, res, next) => onboardingController.updateTenantOnboarding(req, res, next)
);

// Skip onboarding step (for testing or optional steps)
router.post("/skip", (req, res, next) => onboardingController.skipOnboardingStep(req, res, next));

// Reset onboarding (for testing or re-onboarding)
router.delete("/reset", (req, res, next) => onboardingController.resetOnboarding(req, res, next));

export default router; 