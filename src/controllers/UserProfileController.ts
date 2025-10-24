import { Request, Response, NextFunction } from "express";
import { UserProfileService } from "../services/UserProfileService";

const userProfileService = new UserProfileService();

export class UserProfileController {
  /**
   * Get user profile
   */
  async getUserProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required"
        });
      }

      const userProfile = await userProfileService.getUserProfile(userId);

      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: "User profile not found"
        });
      }

      res.json({
        success: true,
        data: userProfile
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required"
        });
      }

      const updateData = req.body;
      
      // Validate required fields
      if (updateData.firstName && updateData.firstName.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "First name cannot be empty"
        });
      }

      if (updateData.lastName && updateData.lastName.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Last name cannot be empty"
        });
      }

      if (updateData.phone && updateData.phone.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Phone number cannot be empty"
        });
      }

      const updatedUser = await userProfileService.updateUserProfile(userId, updateData);

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: updatedUser
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user password
   */
  async updatePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      const { currentPassword, newPassword } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required"
        });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password and new password are required"
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters long"
        });
      }

      await userProfileService.updatePassword(userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: "Password updated successfully"
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update profile picture
   */
  async updateProfilePicture(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      const { profilePictureUrl } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required"
        });
      }

      if (!profilePictureUrl) {
        return res.status(400).json({
          success: false,
          message: "Profile picture URL is required"
        });
      }

      const updatedUser = await userProfileService.updateProfilePicture(userId, profilePictureUrl);

      res.json({
        success: true,
        message: "Profile picture updated successfully",
        data: updatedUser
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user settings
   */
  async getUserSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required"
        });
      }

      const settings = await userProfileService.getUserSettings(userId);

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user settings
   */
  async updateUserSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      const settings = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required"
        });
      }

      const updatedUser = await userProfileService.updateUserSettings(userId, settings);

      res.json({
        success: true,
        message: "Settings updated successfully",
        data: updatedUser
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      const preferences = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required"
        });
      }

      const updatedUser = await userProfileService.updateUserPreferences(userId, preferences);

      res.json({
        success: true,
        message: "Preferences updated successfully",
        data: updatedUser
      });
    } catch (error) {
      next(error);
    }
  }
}
