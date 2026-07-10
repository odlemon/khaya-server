// @ts-nocheck
import express from "express";
import { adminDashboardController } from "../controllers/AdminDashboardController";
import { authenticate, authorize } from "../middleware/authenticate";
import { requirePermission } from "../middleware/permissions";

const router = express.Router();

// All admin dashboard routes require authentication
router.use(authenticate);

// Get comprehensive admin dashboard metrics
router.get("/metrics", 
  authorize(["admin"]),
  requirePermission("khayalami.dashboard.view"),
  (req, res, next) => adminDashboardController.getDashboardMetrics(req, res, next)
);

export default router;



