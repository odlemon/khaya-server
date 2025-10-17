// @ts-nocheck
import express from "express";
import { adminController } from "../controllers/AdminController";
import { authenticate, authorize } from "../middleware/authenticate";

const router = express.Router();

// Apply authentication middleware to all admin routes
router.use(authenticate);

// Remove admin authorization - allow any authenticated user to access admin endpoints
// router.use(authorize(["admin"]));

// Dashboard routes
router.get("/dashboard/stats", adminController.getDashboardStats.bind(adminController));
router.get("/analytics", adminController.getAnalytics.bind(adminController));

// User management routes
router.get("/users", adminController.getUsers.bind(adminController));
router.put("/users/:userId/status", adminController.updateUserStatus.bind(adminController));

// Property management routes
router.get("/properties", adminController.getProperties.bind(adminController));
router.put("/properties/:propertyId/status", adminController.updatePropertyStatus.bind(adminController));

// Connection management routes
router.get("/connections", adminController.getConnections.bind(adminController));

// Agreement management routes
router.get("/agreements", adminController.getAgreements.bind(adminController));

export default router;
