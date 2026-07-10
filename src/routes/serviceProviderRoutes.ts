// @ts-nocheck
import express from "express";
import { authenticate, authorize } from "../middleware/authenticate";
import { requirePermission } from "../middleware/permissions";
import { serviceProviderController } from "../controllers/ServiceProviderController";

const router = express.Router();

router.use(authenticate);

router.post(
  "/",
  authorize(["admin"]),
  requirePermission("khayalami.service_providers.create"),
  serviceProviderController.createProvider.bind(serviceProviderController)
);

router.get(
  "/",
  authorize(["admin"]),
  requirePermission("khayalami.service_providers.view"),
  serviceProviderController.getAllProviders.bind(serviceProviderController)
);

router.get(
  "/:id",
  authorize(["admin"]),
  requirePermission("khayalami.service_providers.view"),
  serviceProviderController.getProviderById.bind(serviceProviderController)
);

router.put(
  "/:id",
  authorize(["admin"]),
  requirePermission("khayalami.service_providers.edit"),
  serviceProviderController.updateProvider.bind(serviceProviderController)
);

router.post(
  "/:id/verify",
  authorize(["admin"]),
  requirePermission("khayalami.service_providers.verify"),
  serviceProviderController.verifyProvider.bind(serviceProviderController)
);

router.delete(
  "/:id",
  authorize(["admin"]),
  requirePermission("khayalami.service_providers.delete"),
  serviceProviderController.deleteProvider.bind(serviceProviderController)
);

router.get(
  "/service-type/:serviceType",
  authorize(["admin"]),
  requirePermission("khayalami.service_providers.view"),
  serviceProviderController.getProvidersByServiceType.bind(serviceProviderController)
);

export default router;
