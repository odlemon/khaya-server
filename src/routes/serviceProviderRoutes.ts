// @ts-nocheck
import express from "express";
import { authenticate, authorize } from "../middleware/authenticate";
import { serviceProviderController } from "../controllers/ServiceProviderController";

const router = express.Router();

router.use(authenticate);

// Admin only routes
router.post(
  "/",
  authorize(["admin"]),
  serviceProviderController.createProvider.bind(serviceProviderController)
);

router.get(
  "/",
  authorize(["admin"]),
  serviceProviderController.getAllProviders.bind(serviceProviderController)
);

router.get(
  "/:id",
  authorize(["admin"]),
  serviceProviderController.getProviderById.bind(serviceProviderController)
);

router.put(
  "/:id",
  authorize(["admin"]),
  serviceProviderController.updateProvider.bind(serviceProviderController)
);

router.post(
  "/:id/verify",
  authorize(["admin"]),
  serviceProviderController.verifyProvider.bind(serviceProviderController)
);

router.delete(
  "/:id",
  authorize(["admin"]),
  serviceProviderController.deleteProvider.bind(serviceProviderController)
);

router.get(
  "/service-type/:serviceType",
  authorize(["admin"]),
  serviceProviderController.getProvidersByServiceType.bind(serviceProviderController)
);

export default router;



