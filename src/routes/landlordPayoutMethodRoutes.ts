// @ts-nocheck
import express from "express";
import { landlordPayoutMethodController } from "../controllers/LandlordPayoutMethodController";
import { authenticate, authorize } from "../middleware/authenticate";

const router = express.Router();

router.use(authenticate);
router.use(authorize(["landlord"]));

router.get("/", (req, res, next) =>
  landlordPayoutMethodController.get(req, res, next),
);

router.put("/", (req, res, next) =>
  landlordPayoutMethodController.put(req, res, next),
);

export default router;
