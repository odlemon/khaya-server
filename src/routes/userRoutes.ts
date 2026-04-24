// @ts-nocheck
import express from "express";
import { userController } from "../controllers/UserController";
import { authenticate, authorize } from "../middleware/authenticate";

const router = express.Router();

// Protected routes - require authentication
router.use(authenticate);

// Get all users (admin only)
router.get("/", (req, res, next) => userController.getUsers(req, res, next));

// Get user profile
router.get("/profile", (req, res, next) => userController.getProfile(req, res, next));

// Update user profile
router.put("/profile/name", (req, res, next) => userController.updateProfileName(req, res, next));

// Get user preferences
router.get("/preferences", (req, res, next) => userController.getPreferences(req, res, next));

// Update user preferences
router.put("/preferences", (req, res, next) => userController.updatePreferences(req, res, next));

// Delete my account (tenant or landlord)
router.delete("/me", (req, res, next) => userController.deleteMyAccount(req, res, next));

// Verify current password
router.post("/verify-password", (req, res, next) => userController.verifyCurrentPassword(req, res, next));

// Change password
router.put("/change-password", (req, res, next) => userController.changePassword(req, res, next));

// Update user by ID (admin only)
router.put("/:id", (req, res, next) => userController.updateUser(req, res, next));

// Delete user by ID (admin only)
router.delete("/:id", (req, res, next) => userController.deleteUser(req, res, next));

// Get tenants for landlord (landlord only)
router.get("/tenants", authorize(["landlord"]), (req, res, next) => userController.getTenantsForLandlord(req, res, next));

export default router; 