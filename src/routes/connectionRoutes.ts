// @ts-nocheck
import express from "express";
import { connectionController } from "../controllers/ConnectionController";
import { authenticate, authorize } from "../middleware/authenticate";

const router = express.Router();

// All connection routes require authentication
router.use(authenticate);

// Send connection request (tenant only)
router.post("/request", 
  authorize(["tenant"]), 
  (req, res, next) => connectionController.sendConnectionRequest(req, res, next)
);

// Get connection requests for landlord
router.get("/landlord", 
  (req, res, next) => connectionController.getLandlordConnections(req, res, next)
);

// Get connection requests for tenant
router.get("/tenant/requests", 
  authorize(["tenant"]), 
  (req, res, next) => connectionController.getTenantConnectionRequests(req, res, next)
);

// Accept connection request (landlord only)
router.put("/:connectionId/accept", 
  (req, res, next) => connectionController.acceptConnection(req, res, next)
);

// Reject connection request (landlord only)
router.put("/:connectionId/reject", 
  (req, res, next) => connectionController.rejectConnection(req, res, next)
);

// Cancel pending connection request (tenant only) — sets status to `cancelled`, notifies landlord
router.put("/:connectionId/cancel-request",
  authorize(["tenant"]),
  (req, res, next) => connectionController.cancelConnectionRequest(req, res, next)
);

// Cancel/Deactivate connection (landlord only)
router.put("/:connectionId/cancel", 
  (req, res, next) => connectionController.cancelLandlordConnection(req, res, next)
);

// Get connection status between tenant and landlord for a property
router.get("/status/:propertyId/:landlordId", 
  (req, res, next) => connectionController.getConnectionStatus(req, res, next)
);

// Get connection statistics
router.get("/stats", 
  (req, res, next) => connectionController.getConnectionStats(req, res, next)
);

// Cancel connection request (tenant only)
router.delete("/:requestId", 
  authorize(["tenant"]), 
  (req, res, next) => connectionController.cancelConnectionRequest(req, res, next)
);

export default router;

