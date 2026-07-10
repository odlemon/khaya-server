// @ts-nocheck
import express from "express";
import { authenticate, authorize } from "../middleware/authenticate";
import { requirePermission } from "../middleware/permissions";
import { maintenanceController } from "../controllers/MaintenanceController";

const router = express.Router();

router.use(authenticate);

// Tenant create
router.post(
  "/:rentalId/requests",
  authorize(["tenant", "landlord"]),
  maintenanceController.createRequest.bind(maintenanceController)
);

// My requests (role-aware)
router.get(
  "/my",
  authorize(["tenant", "landlord"]),
  maintenanceController.getMyRequests.bind(maintenanceController)
);

// Get one
router.get(
  "/requests/:id",
  authorize(["tenant", "landlord", "admin"]),
  maintenanceController.getById.bind(maintenanceController)
);

// Tenant cancel
router.post(
  "/requests/:id/cancel",
  authorize(["tenant"]),
  maintenanceController.cancel.bind(maintenanceController)
);

// Landlord list
router.get(
  "/landlord",
  authorize(["landlord"]),
  maintenanceController.landlordList.bind(maintenanceController)
);

// Landlord actions
router.post(
  "/requests/:id/approve",
  authorize(["landlord"]),
  maintenanceController.approve.bind(maintenanceController)
);
router.post(
  "/requests/:id/reject",
  authorize(["landlord"]),
  maintenanceController.reject.bind(maintenanceController)
);
router.post(
  "/requests/:id/progress",
  authorize(["landlord"]),
  maintenanceController.progress.bind(maintenanceController)
);

// Complete (tenant only - they verify work is done)
router.post(
  "/requests/:id/complete",
  authorize(["tenant"]),
  maintenanceController.complete.bind(maintenanceController)
);

// Admin maintenance management
router.get(
  "/admin/awaiting-vendor",
  authorize(["admin"]),
  requirePermission("khayalami.maintenance.view"),
  maintenanceController.getAwaitingVendorRequests.bind(maintenanceController)
);

router.get(
  "/admin/all",
  authorize(["admin"]),
  requirePermission("khayalami.maintenance.view"),
  maintenanceController.getAllRequests.bind(maintenanceController)
);

router.post(
  "/admin/requests/:id/assign-vendor",
  authorize(["admin"]),
  requirePermission("khayalami.maintenance.assign_vendor"),
  maintenanceController.assignVendor.bind(maintenanceController)
);

router.post(
  "/admin/requests/:id/update-eta",
  authorize(["admin"]),
  requirePermission("khayalami.maintenance.update_eta"),
  maintenanceController.updateVendorETA.bind(maintenanceController)
);

router.post(
  "/admin/requests/:id/mark-arrived",
  authorize(["admin"]),
  requirePermission("khayalami.maintenance.mark_arrived"),
  maintenanceController.markVendorArrived.bind(maintenanceController)
);

export default router;


