//@ts-nocheck
import { User, IUser } from "../models/User";
import { Types } from "mongoose";

export class UserProfileService {
  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<IUser | null> {
    return await User.findById(userId)
      .select("-password -googleId")
      .lean();
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    updateData: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      profile?: {
        avatar?: string;
        bio?: string;
        location?: string;
        dateOfBirth?: Date;
        idNumber?: string;
        idType?: "passport" | "national_id" | "drivers_license";
      };
      preferences?: {
        theme?: string;
        language?: string;
        notifications?: { 
          email?: boolean; 
          sms?: boolean;
          push?: boolean;
          rentReminders?: boolean;
          maintenanceUpdates?: boolean;
          agreementAlerts?: boolean;
        };
        autoReloadReminder?: {
          enabled: boolean;
          time: string;
          date: number;
        };
      };
      settings?: {
        zeroDepositMode?: boolean;
        maintenanceApproval?: boolean;
        runnerMode?: boolean;
        emergencyContact?: {
          name: string;
          phone: string;
          relationship: string;
        };
      };
    }
  ): Promise<IUser> {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error("User not found");
    }

    // Update basic fields
    if (updateData.firstName) user.firstName = updateData.firstName;
    if (updateData.lastName) user.lastName = updateData.lastName;
    if (updateData.phone) user.phone = updateData.phone;

    // Update profile fields
    if (updateData.profile) {
      if (updateData.profile.avatar) user.profile.avatar = updateData.profile.avatar;
      if (updateData.profile.bio) user.profile.bio = updateData.profile.bio;
      if (updateData.profile.location) user.profile.location = updateData.profile.location;
      if (updateData.profile.dateOfBirth) user.profile.dateOfBirth = updateData.profile.dateOfBirth;
      if (updateData.profile.idNumber) user.profile.idNumber = updateData.profile.idNumber;
      if (updateData.profile.idType) user.profile.idType = updateData.profile.idType;
    }

    // Update preferences
    if (updateData.preferences) {
      if (updateData.preferences.theme) user.preferences.theme = updateData.preferences.theme;
      if (updateData.preferences.language) user.preferences.language = updateData.preferences.language;
      if (updateData.preferences.notifications) {
        user.preferences.notifications = {
          ...user.preferences.notifications,
          ...updateData.preferences.notifications
        };
      }
      if (updateData.preferences.autoReloadReminder) {
        user.preferences.autoReloadReminder = {
          ...user.preferences.autoReloadReminder,
          ...updateData.preferences.autoReloadReminder
        };
      }
    }

    // Update settings
    if (updateData.settings) {
      if (updateData.settings.zeroDepositMode !== undefined) {
        user.settings.zeroDepositMode = updateData.settings.zeroDepositMode;
      }
      if (updateData.settings.maintenanceApproval !== undefined) {
        user.settings.maintenanceApproval = updateData.settings.maintenanceApproval;
      }
      if (updateData.settings.runnerMode !== undefined) {
        user.settings.runnerMode = updateData.settings.runnerMode;
      }
      if (updateData.settings.emergencyContact) {
        user.settings.emergencyContact = updateData.settings.emergencyContact;
      }
    }

    await user.save();
    
    // Return user without sensitive data
    const updatedUser = await User.findById(userId)
      .select("-password -googleId")
      .lean();
    
    return updatedUser as IUser;
  }

  /**
   * Update user password
   */
  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return true;
  }

  /**
   * Upload profile picture
   */
  async updateProfilePicture(
    userId: string,
    profilePictureUrl: string
  ): Promise<IUser> {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error("User not found");
    }

    user.profile.avatar = profilePictureUrl;
    await user.save();

    // Return updated user without sensitive data
    const updatedUser = await User.findById(userId)
      .select("-password -googleId")
      .lean();
    
    return updatedUser as IUser;
  }

  /**
   * Get user settings
   */
  async getUserSettings(userId: string): Promise<any> {
    const user = await User.findById(userId)
      .select("preferences settings role")
      .lean();
    
    if (!user) {
      throw new Error("User not found");
    }

    return {
      preferences: user.preferences,
      settings: user.settings,
      role: user.role
    };
  }

  /**
   * Update user settings only
   */
  async updateUserSettings(
    userId: string,
    settings: {
      zeroDepositMode?: boolean;
      maintenanceApproval?: boolean;
      runnerMode?: boolean;
      emergencyContact?: {
        name: string;
        phone: string;
        relationship: string;
      };
    }
  ): Promise<IUser> {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error("User not found");
    }

    // Update settings
    if (settings.zeroDepositMode !== undefined) {
      user.settings.zeroDepositMode = settings.zeroDepositMode;
    }
    if (settings.maintenanceApproval !== undefined) {
      user.settings.maintenanceApproval = settings.maintenanceApproval;
    }
    if (settings.runnerMode !== undefined) {
      user.settings.runnerMode = settings.runnerMode;
    }
    if (settings.emergencyContact) {
      user.settings.emergencyContact = settings.emergencyContact;
    }

    await user.save();

    // Return updated user without sensitive data
    const updatedUser = await User.findById(userId)
      .select("-password -googleId")
      .lean();
    
    return updatedUser as IUser;
  }

  /**
   * Update user preferences only
   */
  async updateUserPreferences(
    userId: string,
    preferences: {
      theme?: string;
      language?: string;
      notifications?: { 
        email?: boolean; 
        sms?: boolean;
        push?: boolean;
        rentReminders?: boolean;
        maintenanceUpdates?: boolean;
        agreementAlerts?: boolean;
      };
      autoReloadReminder?: {
        enabled: boolean;
        time: string;
        date: number;
      };
    }
  ): Promise<IUser> {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error("User not found");
    }

    // Update preferences
    if (preferences.theme) user.preferences.theme = preferences.theme;
    if (preferences.language) user.preferences.language = preferences.language;
    if (preferences.notifications) {
      user.preferences.notifications = {
        ...user.preferences.notifications,
        ...preferences.notifications
      };
    }
    if (preferences.autoReloadReminder) {
      user.preferences.autoReloadReminder = {
        ...user.preferences.autoReloadReminder,
        ...preferences.autoReloadReminder
      };
    }

    await user.save();

    // Return updated user without sensitive data
    const updatedUser = await User.findById(userId)
      .select("-password -googleId")
      .lean();
    
    return updatedUser as IUser;
  }
}
