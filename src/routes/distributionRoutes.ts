// @ts-nocheck
import { Router } from "express";
import { distributionController } from "../controllers/DistributionController";
import { authenticate, authorize } from "../middleware/authenticate";

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize(["admin"]));

// Manual distribution (admin triggered)
router.post("/manual", distributionController.manualDistribution.bind(distributionController));

// Get distribution summary
router.get("/summary", distributionController.getDistributionSummary.bind(distributionController));

// Get pending transactions ready for distribution
router.get("/pending", distributionController.getPendingDistribution.bind(distributionController));

export default router;




