// @ts-nocheck
import express from "express";
import { propertyController } from "../controllers/PropertyController";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authenticate";

const router = express.Router();

// Public routes (no authentication required)
router.get("/featured", (req, res, next) => propertyController.getFeaturedProperties(req, res, next));
router.get("/search/location", (req, res, next) => propertyController.searchByLocation(req, res, next));

// Main properties route - now requires authentication
router.get("/", authenticate, (req, res, next) => propertyController.getProperties(req, res, next));

// Tenant routes - properties with connection status
router.get("/tenant/with-connections", (req, res, next) => propertyController.getPropertiesWithConnectionStatus(req, res, next));
router.get("/tenant/connection-status/:propertyId", (req, res, next) => propertyController.checkPropertyConnectionStatus(req, res, next));

// Single property route - must come after tenant routes to avoid conflicts
router.get("/:id", authenticate, (req, res, next) => propertyController.getProperty(req, res, next));

// Landlord routes (require authentication only)
router.post("/", authenticate, (req, res, next) => propertyController.createProperty(req, res, next));
router.put("/:id", authenticate, (req, res, next) => propertyController.updateProperty(req, res, next));
router.delete("/:id", authenticate, (req, res, next) => propertyController.deleteProperty(req, res, next));
router.get("/landlord/my-properties", authenticate, (req, res, next) => propertyController.getLandlordProperties(req, res, next));
router.patch("/:id/status", authenticate, (req, res, next) => propertyController.togglePropertyStatus(req, res, next));

// Image management routes
router.patch("/:id/images", authenticate, (req, res, next) => propertyController.updatePropertyImages(req, res, next));

export default router; 