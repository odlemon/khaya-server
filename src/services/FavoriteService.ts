// @ts-nocheck
import { Favorite, IFavorite } from "../models/Favorite";
import { Property } from "../models/Property";
import { User } from "../models/User";
import { Types } from "mongoose";

export interface CreateFavoriteData {
  userId: string;
  propertyId: string;
  notes?: string;
  priority?: "low" | "medium" | "high";
  reminderDate?: Date;
}

export interface UpdateFavoriteData {
  notes?: string;
  priority?: "low" | "medium" | "high";
  reminderDate?: Date;
}

export class FavoriteService {
  
  /**
   * Add a property to user's favorites
   */
  async addToFavorites(data: CreateFavoriteData): Promise<IFavorite> {
    // Validate that the user exists and is a tenant
    const user = await User.findById(data.userId);
    if (!user) {
      throw new Error("User not found");
    }
    if (user.role !== "tenant") {
      throw new Error("Only tenants can add properties to favorites");
    }

    // Validate that the property exists and is published
    const property = await Property.findById(data.propertyId);
    if (!property) {
      throw new Error("Property not found");
    }
    if (property.status !== "published") {
      throw new Error("Can only favorite published properties");
    }

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({
      userId: data.userId,
      propertyId: data.propertyId
    });

    if (existingFavorite) {
      throw new Error("Property is already in your favorites");
    }

    // Create the favorite
    const favorite = new Favorite({
      userId: data.userId,
      propertyId: data.propertyId,
      notes: data.notes,
      priority: data.priority || "medium",
      reminderDate: data.reminderDate
    });

    await favorite.save();
    return favorite;
  }

  /**
   * Remove a property from user's favorites
   */
  async removeFromFavorites(userId: string, propertyId: string): Promise<void> {
    const favorite = await Favorite.findOneAndDelete({
      userId: userId,
      propertyId: propertyId
    });

    if (!favorite) {
      throw new Error("Property not found in favorites");
    }
  }

  /**
   * Get user's favorite properties
   */
  async getUserFavorites(userId: string, options: {
    page?: number;
    limit?: number;
    priority?: "low" | "medium" | "high";
    sortBy?: "addedAt" | "priority" | "reminderDate";
    sortOrder?: "asc" | "desc";
  } = {}): Promise<{
    favorites: IFavorite[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      priority,
      sortBy = "addedAt",
      sortOrder = "desc"
    } = options;

    const query: any = { userId };
    if (priority) {
      query.priority = priority;
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      Favorite.find(query)
        .populate({
          path: "propertyId",
          select: "title description address price images status landlordId",
          populate: {
            path: "landlordId",
            select: "firstName lastName email phone"
          }
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(limit),
      Favorite.countDocuments(query)
    ]);

    return {
      favorites,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Update favorite details
   */
  async updateFavorite(userId: string, propertyId: string, updates: UpdateFavoriteData): Promise<IFavorite> {
    const favorite = await Favorite.findOneAndUpdate(
      { userId, propertyId },
      updates,
      { new: true, runValidators: true }
    ).populate({
      path: "propertyId",
      select: "title description address price images status"
    });

    if (!favorite) {
      throw new Error("Favorite not found");
    }

    return favorite;
  }

  /**
   * Check if a property is favorited by user
   */
  async isFavorited(userId: string, propertyId: string): Promise<boolean> {
    const favorite = await Favorite.findOne({ userId, propertyId });
    return !!favorite;
  }

  /**
   * Get favorite count for a property
   */
  async getPropertyFavoriteCount(propertyId: string): Promise<number> {
    return await Favorite.countDocuments({ propertyId });
  }

  /**
   * Get upcoming reminders for a user
   */
  async getUpcomingReminders(userId: string, days: number = 7): Promise<IFavorite[]> {
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + days);

    return await Favorite.find({
      userId,
      reminderDate: { $lte: reminderDate, $gte: new Date() }
    }).populate({
      path: "propertyId",
      select: "title description address price images status"
    });
  }

  /**
   * Bulk add properties to favorites
   */
  async bulkAddToFavorites(userId: string, propertyIds: string[]): Promise<{
    added: number;
    skipped: number;
    errors: string[];
  }> {
    const results = {
      added: 0,
      skipped: 0,
      errors: []
    };

    for (const propertyId of propertyIds) {
      try {
        await this.addToFavorites({
          userId,
          propertyId
        });
        results.added++;
      } catch (error: any) {
        if (error.message.includes("already in your favorites")) {
          results.skipped++;
        } else {
          results.errors.push(`Property ${propertyId}: ${error.message}`);
        }
      }
    }

    return results;
  }

  /**
   * Get favorite statistics for a user
   */
  async getFavoriteStats(userId: string): Promise<{
    total: number;
    byPriority: { low: number; medium: number; high: number };
    withReminders: number;
    recentAdditions: number;
  }> {
    const [total, priorityStats, withReminders, recentAdditions] = await Promise.all([
      Favorite.countDocuments({ userId }),
      Favorite.aggregate([
        { $match: { userId: new Types.ObjectId(userId) } },
        { $group: { _id: "$priority", count: { $sum: 1 } } }
      ]),
      Favorite.countDocuments({ 
        userId, 
        reminderDate: { $exists: true, $ne: null } 
      }),
      Favorite.countDocuments({ 
        userId, 
        addedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
      })
    ]);

    const byPriority = { low: 0, medium: 0, high: 0 };
    priorityStats.forEach(stat => {
      byPriority[stat._id] = stat.count;
    });

    return {
      total,
      byPriority,
      withReminders,
      recentAdditions
    };
  }
}

export const favoriteService = new FavoriteService(); 