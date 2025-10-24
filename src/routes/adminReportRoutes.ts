// @ts-nocheck
import express from "express";
import { authenticate, authorize } from "../middleware/authenticate";
import { adminReportsController } from "../controllers/AdminReportsController";

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  authorize(["admin"]),
  (req, res, next) => adminReportsController.getReports(req, res, next)
);

export default router;





