// @ts-nocheck
import express from "express";
import { adminController } from "../controllers/AdminController";
import { authenticate, authorize } from "../middleware/authenticate";
import { requirePermission } from "../middleware/permissions";
import staffRoutes from "./staffRoutes";

const router = express.Router();

router.use(authenticate);
router.use(authorize(["admin"]));

router.use("/staff", staffRoutes);

router.get(
  "/users/terminated",
  requirePermission("khayalami.users.view"),
  adminController.getTerminatedUsers.bind(adminController)
);
router.post(
  "/users/:userId/terminate",
  requirePermission("khayalami.users.terminate"),
  adminController.terminateUserAccount.bind(adminController)
);
router.post(
  "/users/:userId/reinstate",
  requirePermission("khayalami.users.reinstate"),
  adminController.reinstateUserAccount.bind(adminController)
);

router.get(
  "/dashboard/stats",
  requirePermission("khayalami.dashboard.view"),
  adminController.getDashboardStats.bind(adminController)
);
router.get(
  "/analytics",
  requirePermission("khayalami.analytics.view"),
  adminController.getAnalytics.bind(adminController)
);

router.get(
  "/users",
  requirePermission("khayalami.users.view"),
  adminController.getUsers.bind(adminController)
);
router.delete(
  "/users/:userId",
  requirePermission("khayalami.users.delete"),
  adminController.hardDeleteUser.bind(adminController)
);
router.put(
  "/users/:userId/status",
  requirePermission("khayalami.users.update_status"),
  adminController.updateUserStatus.bind(adminController)
);

router.get(
  "/properties",
  requirePermission("khayalami.properties.view"),
  adminController.getProperties.bind(adminController)
);
router.put(
  "/properties/:propertyId/status",
  requirePermission("khayalami.properties.update_status"),
  adminController.updatePropertyStatus.bind(adminController)
);

router.get(
  "/connections",
  requirePermission("khayalami.connections.view"),
  adminController.getConnections.bind(adminController)
);

router.get(
  "/agreements",
  requirePermission("khayalami.agreements.view"),
  adminController.getAgreements.bind(adminController)
);

export default router;
