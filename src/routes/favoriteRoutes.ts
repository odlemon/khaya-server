// @ts-nocheck
import express from "express";
import { favoriteController } from "../controllers/FavoriteController";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authenticate";

const router = express.Router();

// All favorite routes require authentication
router.use(authenticate);

// Tenant-only routes
router.post("/", authorize(["tenant"]), (req, res, next) => favoriteController.addToFavorites(req, res, next));
router.delete("/:propertyId", authorize(["tenant"]), (req, res, next) => favoriteController.removeFromFavorites(req, res, next));
router.get("/", authorize(["tenant"]), (req, res, next) => favoriteController.getUserFavorites(req, res, next));
router.put("/:propertyId", authorize(["tenant"]), (req, res, next) => favoriteController.updateFavorite(req, res, next));
router.get("/check/:propertyId", authorize(["tenant"]), (req, res, next) => favoriteController.checkIfFavorited(req, res, next));
router.get("/reminders", authorize(["tenant"]), (req, res, next) => favoriteController.getUpcomingReminders(req, res, next));
router.post("/bulk", authorize(["tenant"]), (req, res, next) => favoriteController.bulkAddToFavorites(req, res, next));
router.get("/stats", authorize(["tenant"]), (req, res, next) => favoriteController.getFavoriteStats(req, res, next));

// Public route for getting favorite count (no auth required)
router.get("/count/:propertyId", (req, res, next) => favoriteController.getPropertyFavoriteCount(req, res, next));

export default router; 