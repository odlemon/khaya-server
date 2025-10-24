import express from "express";
import { tenantDashboardController } from "../controllers/TenantDashboardController";
import { authenticate, authorize } from "../middleware/authenticate";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Tenant dashboard route
router.get("/dashboard", authorize(["tenant"]), tenantDashboardController.getTenantDashboard.bind(tenantDashboardController));

export default router;
