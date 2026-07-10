// @ts-nocheck
import express from "express";
import { staffController } from "../controllers/StaffController";
import { requirePermission } from "../middleware/permissions";

const router = express.Router();

router.get(
  "/permissions",
  requirePermission("khayalami.staff.roles.manage", "khayalami.staff.users.manage"),
  staffController.getPermissionCatalog.bind(staffController)
);

router.get(
  "/roles",
  requirePermission("khayalami.staff.roles.manage"),
  staffController.listRoles.bind(staffController)
);

router.post(
  "/roles",
  requirePermission("khayalami.staff.roles.manage"),
  staffController.createRole.bind(staffController)
);

router.put(
  "/roles/:id",
  requirePermission("khayalami.staff.roles.manage"),
  staffController.updateRole.bind(staffController)
);

router.delete(
  "/roles/:id",
  requirePermission("khayalami.staff.roles.manage"),
  staffController.deactivateRole.bind(staffController)
);

router.get(
  "/users",
  requirePermission("khayalami.staff.users.manage"),
  staffController.listStaffUsers.bind(staffController)
);

router.post(
  "/users",
  requirePermission("khayalami.staff.users.manage"),
  staffController.createStaffUser.bind(staffController)
);

router.put(
  "/users/:id",
  requirePermission("khayalami.staff.users.manage"),
  staffController.updateStaffUser.bind(staffController)
);

router.post(
  "/users/:id/reset-password",
  requirePermission("khayalami.staff.users.manage"),
  staffController.resetStaffPassword.bind(staffController)
);

export default router;
