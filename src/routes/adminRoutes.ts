// @ts-nocheck
import express from "express";
import { adminController } from "../controllers/AdminController";
import { authenticate, authorize } from "../middleware/authenticate";

const router = express.Router();

// Apply authentication middleware to all admin routes
router.use(authenticate);
router.use(authorize(["admin"]));

// User management (specific paths before generic /users if extended later)
router.get("/users/terminated", adminController.getTerminatedUsers.bind(adminController));
router.post("/users/:userId/terminate", adminController.terminateUserAccount.bind(adminController));
router.post("/users/:userId/reinstate", adminController.reinstateUserAccount.bind(adminController));

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
