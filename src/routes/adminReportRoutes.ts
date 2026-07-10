// @ts-nocheck
import express from "express";
import { authenticate, authorize } from "../middleware/authenticate";
import { requirePermission } from "../middleware/permissions";
import { adminReportsController } from "../controllers/AdminReportsController";

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  authorize(["admin"]),
  requirePermission("khayalami.reports.view"),
  (req, res, next) => adminReportsController.getReports(req, res, next)
);

export default router;





