import express from "express";
import { UserProfileController } from "../controllers/UserProfileController";
import { authenticate, authorize } from "../middleware/authenticate";

const router = express.Router();
const userProfileController = new UserProfileController();

// Get user profile
router.get("/profile",
  authenticate,
  (req, res, next) => userProfileController.getUserProfile(req, res, next)
);

// Get specific user profile (admin only)
router.get("/:userId/profile",
  authenticate,
  authorize(["admin"]),
  (req, res, next) => userProfileController.getUserProfile(req, res, next)
);

// Update user profile
router.put("/profile",
  authenticate,
  (req, res, next) => userProfileController.updateUserProfile(req, res, next)
);

// Update specific user profile (admin only)
router.put("/:userId/profile",
  authenticate,
  authorize(["admin"]),
  (req, res, next) => userProfileController.updateUserProfile(req, res, next)
);

// Update password
router.put("/password",
  authenticate,
  (req, res, next) => userProfileController.updatePassword(req, res, next)
);

// Update specific user password (admin only)
router.put("/:userId/password",
  authenticate,
  authorize(["admin"]),
  (req, res, next) => userProfileController.updatePassword(req, res, next)
);

// Update profile picture
router.put("/profile-picture",
  authenticate,
  (req, res, next) => userProfileController.updateProfilePicture(req, res, next)
);

// Update specific user profile picture (admin only)
router.put("/:userId/profile-picture",
  authenticate,
  authorize(["admin"]),
  (req, res, next) => userProfileController.updateProfilePicture(req, res, next)
);

// Get user settings
router.get("/settings",
  authenticate,
  (req, res, next) => userProfileController.getUserSettings(req, res, next)
);

// Get specific user settings (admin only)
router.get("/:userId/settings",
  authenticate,
  authorize(["admin"]),
  (req, res, next) => userProfileController.getUserSettings(req, res, next)
);

// Update user settings
router.put("/settings",
  authenticate,
  (req, res, next) => userProfileController.updateUserSettings(req, res, next)
);

// Update specific user settings (admin only)
router.put("/:userId/settings",
  authenticate,
  authorize(["admin"]),
  (req, res, next) => userProfileController.updateUserSettings(req, res, next)
);

// Update user preferences
router.put("/preferences",
  authenticate,
  (req, res, next) => userProfileController.updateUserPreferences(req, res, next)
);

// Update specific user preferences (admin only)
router.put("/:userId/preferences",
  authenticate,
  authorize(["admin"]),
  (req, res, next) => userProfileController.updateUserPreferences(req, res, next)
);

export default router;
