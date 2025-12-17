// @ts-nocheck
import express from "express";
import { tenantDashboardController } from "../controllers/TenantDashboardController";
import { tenantController } from "../controllers/TenantController";
import { authenticate, authorize } from "../middleware/authenticate";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Tenant dashboard route
router.get("/dashboard", authorize(["tenant"]), tenantDashboardController.getTenantDashboard.bind(tenantDashboardController));

// Rental reminders
router.get("/rental-reminders", authorize(["tenant"]), tenantController.getUpcomingRentReminders.bind(tenantController));

// Invoice generation
router.get("/invoices", authorize(["tenant"]), tenantController.getAllInvoices.bind(tenantController));
router.get("/invoices/:paymentId", authorize(["tenant"]), tenantController.generateInvoice.bind(tenantController));

export default router;
