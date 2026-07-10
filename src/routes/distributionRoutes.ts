// @ts-nocheck
import { Router } from "express";
import { distributionController } from "../controllers/DistributionController";
import { authenticate, authorize } from "../middleware/authenticate";
import { requirePermission } from "../middleware/permissions";

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize(["admin"]));

// Manual distribution (admin triggered)
router.post("/manual", requirePermission("khayalami.distribution.manual"), distributionController.manualDistribution.bind(distributionController));

router.get("/summary", requirePermission("khayalami.distribution.view"), distributionController.getDistributionSummary.bind(distributionController));

router.get("/pending", requirePermission("khayalami.distribution.view"), distributionController.getPendingDistribution.bind(distributionController));

export default router;







