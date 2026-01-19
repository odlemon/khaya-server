// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { Property } from "../models/Property";
import { User } from "../models/User";
import { Connection } from "../models/Connection";
import { RevenueSource } from "../models/RevenueSource";
import { PaymentRequest } from "../models/PaymentRequest";
import { LandlordPreferences } from "../models/LandlordPreferences";
import { landlordSubscriptionService } from "../services/LandlordSubscriptionService";
import { favoriteService } from "../services/FavoriteService";
import { Favorite } from "../models/Favorite";
import { Types } from "mongoose";

export class PropertyController {

  // Create a new property listing (Landlord only)
  async createProperty(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      if (user.role !== "landlord" && user.role !== "admin") {
        return res.status(403).json({ 
          success: false, 
          message: "Only landlords can create property listings" 
        });
      }

      const propertyData = {
        ...req.body,
        landlordId: userId
      };

      // Validate that main image is provided
      if (!propertyData.images?.mainImage) {
        return res.status(400).json({ 
          success: false, 
          message: "Main image is required for property listing" 
        });
      }

      const property = new Property(propertyData);
      const savedProperty = await property.save();

      res.status(201).json({ 
        success: true, 
        message: "Property created successfully", 
        data: savedProperty 
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Get all properties with search and filters
  async getProperties(req: Request, res: Response, next: NextFunction) {
    try {
      // Get user info if authenticated
      const userId = (req as any).user?._id;
      const userRole = (req as any).user?.role;
      
      const {
        page = 1,
        limit = 10,
        search,
        minPrice,
        maxPrice,
        bedrooms,
        propertyType,
        furnishingLevel,
        petFriendly,
        boreholeAvailable,
        solarAvailable,
        zeroDepositAvailable,
        city,
        status = "published"
      } = req.query;

      const query: any = { status };

      // Search by title or description
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { "address.city": { $regex: search, $options: "i" } },
          { "address.street": { $regex: search, $options: "i" } }
        ];
      }

      // Price filter
      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
      }

      // Bedrooms filter
      if (bedrooms) {
        query.bedrooms = Number(bedrooms);
      }

      // Property type filter
      if (propertyType) {
        query.propertyType = propertyType;
      }

      // Furnishing level filter
      if (furnishingLevel) {
        query.furnishingLevel = furnishingLevel;
      }

      // Pet friendly filter
      if (petFriendly !== undefined) {
        query.petFriendly = petFriendly === "true";
      }

      // Infrastructure filters
      if (boreholeAvailable !== undefined) {
        query.boreholeAvailable = boreholeAvailable === "true";
      }

      if (solarAvailable !== undefined) {
        query.solarAvailable = solarAvailable === "true";
      }

      if (zeroDepositAvailable !== undefined) {
        query.zeroDepositAvailable = zeroDepositAvailable === "true";
      }

      // City filter
      if (city) {
        query["address.city"] = { $regex: city, $options: "i" };
      }

      const skip = (Number(page) - 1) * Number(limit);
      
      let properties = await Property.find(query)
        .populate("landlordId", "firstName lastName email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      // ✨ Fetch active premium boosts for all properties
      const propertyIds = properties.map(p => p._id);
      const now = new Date();
      
      // Get all active premium boosts (status: "collected", not expired)
      const activeBoosts = await RevenueSource.find({
        sourceType: "premium_boost",
        status: "collected",
        propertyId: { $in: propertyIds }
      }).populate("propertyId");
      
      // Get PaymentRequests to find boost duration
      const boostPaymentRequests = await PaymentRequest.find({
        requestType: "premium_boost",
        propertyId: { $in: propertyIds },
        status: { $in: ["approved", "processed"] }
      });
      
      // Create a map of propertyId -> boost info (duration from PaymentRequest or inferred from amount)
      const boostMap = new Map();
      const durationFromAmount = (amount: number): number => {
        if (amount === 10) return 7;
        if (amount === 15) return 30;
        if (amount === 25) return 90;
        return 30; // default
      };
      
      for (const boost of activeBoosts) {
        if (!boost.propertyId) continue;
        const propId = boost.propertyId.toString();
        
        // Find duration from PaymentRequest
        let duration = 30; // default
        const paymentRequest = boostPaymentRequests.find(
          pr => pr.propertyId?.toString() === propId && 
          pr.propertyId?.toString() === boost.propertyId.toString()
        );
        
        if (paymentRequest?.notes) {
          // Try to extract duration from notes (format: "duration:30" or similar)
          const durationMatch = paymentRequest.notes.match(/duration[:\s]+(\d+)/i);
          if (durationMatch) {
            duration = parseInt(durationMatch[1]);
          }
        }
        
        // If no duration in PaymentRequest, infer from amount
        if (duration === 30 && boost.amount) {
          duration = durationFromAmount(boost.amount);
        }
        
        // Calculate expiration date
        const boostStartDate = boost.createdAt || boost.updatedAt || now;
        const boostExpiresAt = new Date(boostStartDate);
        boostExpiresAt.setDate(boostExpiresAt.getDate() + duration);
        
        // Check if boost is still active
        if (boostExpiresAt > now) {
          boostMap.set(propId, {
            isFeatured: true,
            boostExpiresAt: boostExpiresAt.toISOString(),
            boostStartedAt: boostStartDate.toISOString(),
            duration: duration
          });
        }
      }
      
      // ✨ Fetch zero deposit protection subscription status for all landlords
      const landlordIds = [...new Set(properties.map(p => {
        const landlordId = p.landlordId?._id?.toString() || p.landlordId?.toString();
        return landlordId;
      }).filter(Boolean))];
      const zeroDepositMap = new Map();
      
      for (const landlordId of landlordIds) {
        if (!landlordId) continue;
        try {
          const zeroDepositStatus = await landlordSubscriptionService.getZeroDepositProtectionStatus(landlordId);
          zeroDepositMap.set(landlordId, zeroDepositStatus.isSubscribed);
        } catch (error) {
          // If error, assume no subscription
          zeroDepositMap.set(landlordId, false);
        }
      }

       // Add connection status if user is authenticated as a tenant
       if (userId && userRole === "tenant") {
         const propertyIds = properties.map(p => p._id);
         
         const connections = await Connection.find({
           tenantId: userId,
           propertyId: { $in: propertyIds }
           // Removed isActive: true filter to show ALL connections
         });

        // Create a map for quick lookup
        const connectionMap = new Map();
        connections.forEach(conn => {
          connectionMap.set(conn.propertyId.toString(), {
            status: conn.status,
            isActive: conn.isActive,
            canChat: conn.status === "accepted" && conn.isActive,
            message: conn.message,
            responseMessage: conn.responseMessage,
            respondedAt: conn.respondedAt,
            createdAt: conn.createdAt
          });
                 });

        // ✨ Fetch favorites for authenticated tenant (more efficient query)
        const favoritesMap = new Map();
        try {
          const favorites = await Favorite.find({
            userId: userId,
            propertyId: { $in: propertyIds }
          }).select("propertyId");
          
          favorites.forEach((favorite: any) => {
            const favPropertyId = favorite.propertyId?.toString();
            if (favPropertyId) {
              favoritesMap.set(favPropertyId, true);
            }
          });
        } catch (error) {
          // If error fetching favorites, just continue without them
          console.error("Error fetching favorites:", error);
        }

                 // Add connection status, boost info, zero deposit info, and favorite status to each property
        properties = properties.map(property => {
          const propertyObj = property.toObject();
          const propertyIdStr = property._id.toString();
          const connection = connectionMap.get(propertyIdStr);
          const boostInfo = boostMap.get(propertyIdStr);
          const landlordIdStr = property.landlordId?._id?.toString() || property.landlordId?.toString();
          const hasZeroDepositSubscription = zeroDepositMap.get(landlordIdStr) || false;
          const isFavorited = favoritesMap.get(propertyIdStr) || false;
          
          return {
            ...propertyObj,
            isConnected: !!connection,
            connectionState: connection ? connection.status : "none",
            // ✨ Premium boost info
            isFeatured: boostInfo?.isFeatured || propertyObj.isFeatured || false,
            boostInfo: boostInfo || null,
            // ✨ Zero deposit info
            zeroDepositAvailable: propertyObj.zeroDepositAvailable && hasZeroDepositSubscription,
            zeroDepositSubscriptionActive: hasZeroDepositSubscription,
            // ✨ Explicit verification status for frontend/admin
            verificationStatus: propertyObj.isVerified ? "verified" : "unverified",
            // ✨ Favorite status
            isFavorited: isFavorited
          };
        });
      } else {
        // For non-authenticated users or non-tenants, add false connection status, boost info, zero deposit info, and favorite status
        properties = properties.map(property => {
          const propertyObj = property.toObject();
          const propertyIdStr = property._id.toString();
          const boostInfo = boostMap.get(propertyIdStr);
          const landlordIdStr = property.landlordId?._id?.toString() || property.landlordId?.toString();
          const hasZeroDepositSubscription = zeroDepositMap.get(landlordIdStr) || false;
          
          return {
            ...propertyObj,
            isConnected: false,
            connectionState: "none",
            // ✨ Premium boost info
            isFeatured: boostInfo?.isFeatured || propertyObj.isFeatured || false,
            boostInfo: boostInfo || null,
            // ✨ Zero deposit info
            zeroDepositAvailable: propertyObj.zeroDepositAvailable && hasZeroDepositSubscription,
            zeroDepositSubscriptionActive: hasZeroDepositSubscription,
            // ✨ Explicit verification status for frontend/admin
            verificationStatus: propertyObj.isVerified ? "verified" : "unverified",
            // ✨ Favorite status (false for non-authenticated users)
            isFavorited: false
          };
        });
      }
      
      // ✨ Rotate boosted properties by landlord to ensure fair distribution
      // Separate boosted and non-boosted properties
      const boostedProperties: any[] = [];
      const nonBoostedProperties: any[] = [];
      
      properties.forEach(property => {
        if (property.isFeatured) {
          boostedProperties.push(property);
        } else {
          nonBoostedProperties.push(property);
        }
      });
      
      // Group boosted properties by landlord
      const boostedByLandlord = new Map();
      boostedProperties.forEach(property => {
        const landlordId = property.landlordId?._id?.toString() || property.landlordId?.toString() || 'unknown';
        if (!boostedByLandlord.has(landlordId)) {
          boostedByLandlord.set(landlordId, []);
        }
        boostedByLandlord.get(landlordId).push(property);
      });
      
      // Sort each landlord's boosted properties by creation date (newest first)
      boostedByLandlord.forEach((props, landlordId) => {
        props.sort((a: any, b: any) => {
          const aDate = new Date(a.createdAt || 0).getTime();
          const bDate = new Date(b.createdAt || 0).getTime();
          return bDate - aDate;
        });
      });
      
      // Create rotation index based on page number and time (changes every hour)
      // This ensures rotation changes over time and across pages
      // Reuse the 'now' variable declared earlier in the function
      const hourOfDay = now.getHours();
      const rotationIndex = (Number(page) - 1 + hourOfDay) % Math.max(1, boostedByLandlord.size);
      
      // Convert map to array and rotate
      const landlordGroups = Array.from(boostedByLandlord.entries());
      if (landlordGroups.length > 0) {
        // Rotate the array based on rotation index
        const rotatedGroups = [
          ...landlordGroups.slice(rotationIndex),
          ...landlordGroups.slice(0, rotationIndex)
        ];
        
        // Flatten rotated groups back into boosted properties array
        const rotatedBoosted: any[] = [];
        rotatedGroups.forEach(([landlordId, props]) => {
          rotatedBoosted.push(...props);
        });
        
        // Sort non-boosted properties by creation date (newest first)
        nonBoostedProperties.sort((a, b) => {
          const aDate = new Date(a.createdAt || 0).getTime();
          const bDate = new Date(b.createdAt || 0).getTime();
          return bDate - aDate;
        });
        
        // Combine: rotated boosted properties first, then non-boosted
        properties = [...rotatedBoosted, ...nonBoostedProperties];
      } else {
        // No boosted properties, just sort all by creation date
        properties.sort((a, b) => {
          const aDate = new Date(a.createdAt || 0).getTime();
          const bDate = new Date(b.createdAt || 0).getTime();
          return bDate - aDate;
        });
      }

      const total = await Property.countDocuments(query);

      res.status(200).json({
        success: true,
        data: properties,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
          hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
          hasPrevPage: Number(page) > 1
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Get a single property by ID with connection status
  async getProperty(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?._id;
      const userRole = (req as any).user?.role;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid property ID" });
      }

      const property = await Property.findById(id)
        .populate("landlordId", "firstName lastName email phone profile");

      if (!property) {
        return res.status(404).json({ success: false, message: "Property not found" });
      }

      // Populate verification tracking fields
      const propertyWithVerification = await Property.findById(id)
        .populate("verifiedBy", "firstName lastName email")
        .populate("rejectedBy", "firstName lastName email")
        .populate("landlordId", "firstName lastName email phone profile");

      if (!propertyWithVerification) {
        return res.status(404).json({ success: false, message: "Property not found" });
      }

      let propertyData = propertyWithVerification.toObject();

      // Check if current user is the landlord
      const isLandlord = userId && propertyWithVerification.landlordId.toString() === userId.toString();

      // Add connection status if user is authenticated as a tenant
      if (userId && userRole === "tenant") {
        const connection = await Connection.findOne({
          tenantId: userId,
          propertyId: id
          // Removed isActive: true filter to show ALL connections
        });

                 if (connection) {
           propertyData.isConnected = true;
           propertyData.connectionState = connection.status;
         } else {
           propertyData.isConnected = false;
           propertyData.connectionState = "none";
         }

        // ✨ Check if property is favorited by authenticated tenant
        let isFavorited = false;
        try {
          const favorite = await Favorite.findOne({
            userId: userId,
            propertyId: id
          });
          isFavorited = !!favorite;
        } catch (error) {
          // If error fetching favorite, just continue without it
          console.error("Error fetching favorite:", error);
        }
        propertyData.isFavorited = isFavorited;
             } else {
         // For non-authenticated users or non-tenants
         propertyData.isConnected = false;
         propertyData.connectionState = "none";
         propertyData.isFavorited = false;
       }

      // Determine verification status
      let verificationStatus = "pending";
      if (propertyWithVerification.isVerified && propertyWithVerification.verifiedAt) {
        verificationStatus = "verified";
      } else if (propertyWithVerification.rejectedAt && propertyWithVerification.verificationRejectionReason) {
        verificationStatus = "rejected";
      }

      // Add explicit verificationStatus and details (include rejection reason for landlord)
      propertyData = {
        ...propertyData,
        verificationStatus,
        // Ensure isFavorited is explicitly included (already set above for tenants/non-tenants)
        isFavorited: propertyData.isFavorited !== undefined ? propertyData.isFavorited : false,
        // Include verification details if user is the landlord or admin
        ...(isLandlord || userRole === "admin" ? {
          verificationDetails: {
            isVerified: propertyWithVerification.isVerified,
            verifiedBy: propertyWithVerification.verifiedBy ? {
              _id: (propertyWithVerification.verifiedBy as any)._id,
              name: `${(propertyWithVerification.verifiedBy as any).firstName} ${(propertyWithVerification.verifiedBy as any).lastName}`,
              email: (propertyWithVerification.verifiedBy as any).email
            } : null,
            verifiedAt: propertyWithVerification.verifiedAt || null,
            rejectedBy: propertyWithVerification.rejectedBy ? {
              _id: (propertyWithVerification.rejectedBy as any)._id,
              name: `${(propertyWithVerification.rejectedBy as any).firstName} ${(propertyWithVerification.rejectedBy as any).lastName}`,
              email: (propertyWithVerification.rejectedBy as any).email
            } : null,
            rejectedAt: propertyWithVerification.rejectedAt || null,
            rejectionReason: propertyWithVerification.verificationRejectionReason || null,
            adminFeedback: propertyWithVerification.adminFeedback || null
          }
        } : {})
      };

      res.status(200).json({ success: true, data: propertyData });
    } catch (error: any) {
      next(error);
    }
  }

  // Update property (Landlord only)
  async updateProperty(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;
      const updateData = req.body;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid property ID" });
      }

      const property = await Property.findById(id);
      if (!property) {
        return res.status(404).json({ success: false, message: "Property not found" });
      }

      // Check if user is the landlord or admin
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (property.landlordId.toString() !== userId.toString() && user.role !== "admin") {
        return res.status(403).json({ 
          success: false, 
          message: "You can only update your own properties" 
        });
      }

      // ✨ If propertyProofDocuments are being updated, reset verification status
      // This ensures new documents need to be reviewed by admin
      if (updateData.propertyProofDocuments !== undefined) {
        // Reset verification fields when documents are updated
        updateData.isVerified = false;
        updateData.verifiedBy = undefined;
        updateData.verifiedAt = undefined;
        updateData.rejectedBy = undefined;
        updateData.rejectedAt = undefined;
        updateData.verificationRejectionReason = undefined;
        // Keep adminFeedback if it exists, or clear it
        if (!updateData.propertyProofDocuments || updateData.propertyProofDocuments.length === 0) {
          updateData.adminFeedback = undefined;
        }
      }

      const updatedProperty = await Property.findByIdAndUpdate(
        id, 
        updateData, 
        { new: true, runValidators: true }
      ).populate("landlordId", "firstName lastName email phone");

      res.status(200).json({ 
        success: true, 
        message: "Property updated successfully", 
        data: updatedProperty 
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Delete property (Landlord only)
  async deleteProperty(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid property ID" });
      }

      const property = await Property.findById(id);
      if (!property) {
        return res.status(404).json({ success: false, message: "Property not found" });
      }

      // Check if user is the landlord or admin
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (property.landlordId.toString() !== userId.toString() && user.role !== "admin") {
        return res.status(403).json({ 
          success: false, 
          message: "You can only delete your own properties" 
        });
      }

      await Property.findByIdAndDelete(id);

      res.status(200).json({ 
        success: true, 
        message: "Property deleted successfully" 
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Get properties by landlord (for landlord dashboard)
  async getLandlordProperties(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { status } = req.query;

      const query: any = { landlordId: userId };
      if (status) {
        query.status = status;
      }

      const properties = await Property.find(query)
        .populate("verifiedBy", "firstName lastName email")
        .populate("rejectedBy", "firstName lastName email")
        .sort({ createdAt: -1 });

      // Add verification status and details to each property
      const propertiesWithVerification = properties.map(property => {
        const propertyObj = property.toObject();
        
        // Determine verification status
        let verificationStatus = "pending";
        if (property.isVerified && property.verifiedAt) {
          verificationStatus = "verified";
        } else if (property.rejectedAt && property.verificationRejectionReason) {
          verificationStatus = "rejected";
        }

        return {
          ...propertyObj,
          verificationStatus,
          verificationDetails: {
            isVerified: property.isVerified,
            verifiedBy: property.verifiedBy ? {
              _id: (property.verifiedBy as any)._id,
              name: `${(property.verifiedBy as any).firstName} ${(property.verifiedBy as any).lastName}`,
              email: (property.verifiedBy as any).email
            } : null,
            verifiedAt: property.verifiedAt || null,
            rejectedBy: property.rejectedBy ? {
              _id: (property.rejectedBy as any)._id,
              name: `${(property.rejectedBy as any).firstName} ${(property.rejectedBy as any).lastName}`,
              email: (property.rejectedBy as any).email
            } : null,
            rejectedAt: property.rejectedAt || null,
            rejectionReason: property.verificationRejectionReason || null,
            adminFeedback: property.adminFeedback || null
          }
        };
      });

      res.status(200).json({ 
        success: true, 
        data: propertiesWithVerification 
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Toggle property status (draft/published/inactive)
  async togglePropertyStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = (req as any).user._id;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid property ID" });
      }

      if (!["draft", "published", "inactive"].includes(status)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid status. Must be draft, published, or inactive" 
        });
      }

      const property = await Property.findById(id);
      if (!property) {
        return res.status(404).json({ success: false, message: "Property not found" });
      }

      // Check if user is the landlord or admin
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (property.landlordId.toString() !== userId.toString() && user.role !== "admin") {
        return res.status(403).json({ 
          success: false, 
          message: "You can only update your own properties" 
        });
      }

      property.status = status;
      await property.save();

      res.status(200).json({ 
        success: true, 
        message: `Property status updated to ${status}`, 
        data: property 
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Get featured properties
  async getFeaturedProperties(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit = 6 } = req.query;
      const userId = (req as any).user?._id;
      const userRole = (req as any).user?.role;

      // ✨ Get all published properties with active boosts
      const now = new Date();
      
      // Get all active premium boosts
      const activeBoosts = await RevenueSource.find({
        sourceType: "premium_boost",
        status: "collected"
      }).populate("propertyId");
      
      // Get PaymentRequests to find boost duration
      const propertyIds = activeBoosts
        .map(b => b.propertyId?._id || b.propertyId)
        .filter(Boolean);
      
      const boostPaymentRequests = await PaymentRequest.find({
        requestType: "premium_boost",
        propertyId: { $in: propertyIds },
        status: { $in: ["approved", "processed"] }
      });
      
      // Create a map of propertyId -> boost info
      const boostMap = new Map();
      const durationFromAmount = (amount: number): number => {
        if (amount === 10) return 7;
        if (amount === 15) return 30;
        if (amount === 25) return 90;
        return 30; // default
      };
      
      const featuredPropertyIds: Types.ObjectId[] = [];
      
      for (const boost of activeBoosts) {
        if (!boost.propertyId) continue;
        const propId = boost.propertyId.toString();
        
        // Find duration from PaymentRequest
        let duration = 30; // default
        const paymentRequest = boostPaymentRequests.find(
          pr => pr.propertyId?.toString() === propId
        );
        
        if (paymentRequest?.notes) {
          const durationMatch = paymentRequest.notes.match(/duration[:\s]+(\d+)/i);
          if (durationMatch) {
            duration = parseInt(durationMatch[1]);
          }
        }
        
        if (duration === 30 && boost.amount) {
          duration = durationFromAmount(boost.amount);
        }
        
        const boostStartDate = boost.createdAt || boost.updatedAt || now;
        const boostExpiresAt = new Date(boostStartDate);
        boostExpiresAt.setDate(boostExpiresAt.getDate() + duration);
        
        if (boostExpiresAt > now) {
          const propertyId = boost.propertyId._id || boost.propertyId;
          featuredPropertyIds.push(propertyId);
          boostMap.set(propId, {
            isFeatured: true,
            boostExpiresAt: boostExpiresAt.toISOString(),
            boostStartedAt: boostStartDate.toISOString(),
            duration: duration
          });
        }
      }
      
      // Get properties with active boosts (or fallback to isFeatured: true)
      let properties = await Property.find({ 
        status: "published",
        isVerified: true,
        $or: [
          { _id: { $in: featuredPropertyIds } },
          { isFeatured: true }
        ]
      })
        .populate("landlordId", "firstName lastName email phone")
        .sort({ createdAt: -1 })
        .limit(Number(limit));
      
      // ✨ Fetch zero deposit protection subscription status for all landlords
      const landlordIds = [...new Set(properties.map(p => p.landlordId?._id?.toString() || p.landlordId?.toString()).filter(Boolean))];
      const zeroDepositMap = new Map();
      
      for (const landlordId of landlordIds) {
        if (!landlordId) continue;
        try {
          const zeroDepositStatus = await landlordSubscriptionService.getZeroDepositProtectionStatus(landlordId);
          zeroDepositMap.set(landlordId, zeroDepositStatus.isSubscribed);
        } catch (error) {
          zeroDepositMap.set(landlordId, false);
        }
      }

      // Add connection status if user is authenticated as a tenant
      if (userId && userRole === "tenant") {
        const propertyIds = properties.map(p => p._id);
        const connections = await Connection.find({
          tenantId: userId,
          propertyId: { $in: propertyIds }
        });

        const connectionMap = new Map();
        connections.forEach(conn => {
          connectionMap.set(conn.propertyId.toString(), {
            status: conn.status,
            canChat: conn.status === "accepted" && conn.isActive,
            message: conn.message,
            responseMessage: conn.responseMessage,
            respondedAt: conn.respondedAt,
            createdAt: conn.createdAt
          });
        });

        properties = properties.map(property => {
          const propertyObj = property.toObject();
          const propertyIdStr = property._id.toString();
          const connection = connectionMap.get(propertyIdStr);
          const boostInfo = boostMap.get(propertyIdStr);
          const landlordIdStr = property.landlordId?._id?.toString() || property.landlordId?.toString();
          const hasZeroDepositSubscription = zeroDepositMap.get(landlordIdStr) || false;
          
          return {
            ...propertyObj,
            isConnected: !!connection,
            connectionState: connection ? connection.status : "none",
            isFeatured: boostInfo?.isFeatured || propertyObj.isFeatured || false,
            boostInfo: boostInfo || null,
            zeroDepositAvailable: propertyObj.zeroDepositAvailable && hasZeroDepositSubscription,
            zeroDepositSubscriptionActive: hasZeroDepositSubscription
          };
        });
      } else {
        properties = properties.map(property => {
          const propertyObj = property.toObject();
          const propertyIdStr = property._id.toString();
          const boostInfo = boostMap.get(propertyIdStr);
          const landlordIdStr = property.landlordId?._id?.toString() || property.landlordId?.toString();
          const hasZeroDepositSubscription = zeroDepositMap.get(landlordIdStr) || false;
          
          return {
            ...propertyObj,
            isConnected: false,
            connectionState: "none",
            isFeatured: boostInfo?.isFeatured || propertyObj.isFeatured || false,
            boostInfo: boostInfo || null,
            zeroDepositAvailable: propertyObj.zeroDepositAvailable && hasZeroDepositSubscription,
            zeroDepositSubscriptionActive: hasZeroDepositSubscription
          };
        });
      }
      
      // Sort by boost status (boosted first)
      properties.sort((a, b) => {
        const aBoosted = !!a.boostInfo;
        const bBoosted = !!b.boostInfo;
        if (aBoosted && !bBoosted) return -1;
        if (!aBoosted && bBoosted) return 1;
        return 0;
      });

      res.status(200).json({ 
        success: true, 
        data: properties 
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Get properties with connection status for tenants
  async getPropertiesWithConnectionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      
      if (userRole !== "tenant") {
        return res.status(403).json({ 
          success: false, 
          message: "This endpoint is for tenants only" 
        });
      }

      const {
        page = 1,
        limit = 10,
        connectionStatus, // Filter by connection status: "none", "pending", "accepted", "rejected"
        ...otherFilters
      } = req.query;

      // Build base query
      const query: any = { status: "published" };

      // Apply other filters (same as getProperties)
      if (otherFilters.search) {
        query.$or = [
          { title: { $regex: otherFilters.search, $options: "i" } },
          { description: { $regex: otherFilters.search, $options: "i" } },
          { "address.city": { $regex: otherFilters.search, $options: "i" } },
          { "address.street": { $regex: otherFilters.search, $options: "i" } }
        ];
      }

      if (otherFilters.minPrice || otherFilters.maxPrice) {
        query.price = {};
        if (otherFilters.minPrice) query.price.$gte = Number(otherFilters.minPrice);
        if (otherFilters.maxPrice) query.price.$lte = Number(otherFilters.maxPrice);
      }

      if (otherFilters.bedrooms) query.bedrooms = Number(otherFilters.bedrooms);
      if (otherFilters.propertyType) query.propertyType = otherFilters.propertyType;
      if (otherFilters.furnishingLevel) query.furnishingLevel = otherFilters.furnishingLevel;
      if (otherFilters.petFriendly !== undefined) query.petFriendly = otherFilters.petFriendly === "true";
      if (otherFilters.boreholeAvailable !== undefined) query.boreholeAvailable = otherFilters.boreholeAvailable === "true";
      if (otherFilters.solarAvailable !== undefined) query.solarAvailable = otherFilters.solarAvailable === "true";
      if (otherFilters.zeroDepositAvailable !== undefined) query.zeroDepositAvailable = otherFilters.zeroDepositAvailable === "true";
      if (otherFilters.city) query["address.city"] = { $regex: otherFilters.city, $options: "i" };

      const skip = (Number(page) - 1) * Number(limit);
      
      let properties = await Property.find(query)
        .populate("landlordId", "firstName lastName email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      // Get all connections for the tenant
      const propertyIds = properties.map(p => p._id);
      const connections = await Connection.find({
        tenantId: userId,
        propertyId: { $in: propertyIds }
      });

      // Create a map for quick lookup
      const connectionMap = new Map();
      connections.forEach(conn => {
        connectionMap.set(conn.propertyId.toString(), {
          status: conn.status,
          canChat: conn.status === "accepted" && conn.isActive,
          message: conn.message,
          responseMessage: conn.responseMessage,
          respondedAt: conn.respondedAt
        });
      });

      // Add connection status to each property
      properties = properties.map(property => {
        const propertyObj = property.toObject();
        const connection = connectionMap.get(property._id.toString());
        return {
          ...propertyObj,
          isConnected: !!connection,
          connectionState: connection ? connection.status : "none"
        };
      });

      // Filter by connection status if specified
      if (connectionStatus) {
        if (connectionStatus === "none") {
          properties = properties.filter(p => !p.connectionStatus);
        } else {
          properties = properties.filter(p => p.connectionStatus?.status === connectionStatus);
        }
      }

      const total = await Property.countDocuments(query);

      res.status(200).json({
        success: true,
        data: properties,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
          hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
          hasPrevPage: Number(page) > 1
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Search properties by location (for map view)
  async searchByLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        latitude, 
        longitude, 
        radius = 5000, // 5km default
        limit = 50 
      } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({ 
          success: false, 
          message: "Latitude and longitude are required" 
        });
      }

      const properties = await Property.find({
        status: "published",
        "address.coordinates": {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [Number(longitude), Number(latitude)]
            },
            $maxDistance: Number(radius)
          }
        }
      })
        .populate("landlordId", "firstName lastName")
        .limit(Number(limit));

      res.status(200).json({ 
        success: true, 
        data: properties 
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Update property images
  async updatePropertyImages(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { images } = req.body;
      const userId = (req as any).user._id;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid property ID" });
      }

      const property = await Property.findById(id);
      if (!property) {
        return res.status(404).json({ success: false, message: "Property not found" });
      }

      // Check if user is the landlord or admin
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (property.landlordId.toString() !== userId.toString() && user.role !== "admin") {
        return res.status(403).json({ 
          success: false, 
          message: "You can only update your own properties" 
        });
      }

      // Validate that main image is provided
      if (images && !images.mainImage) {
        return res.status(400).json({ 
          success: false, 
          message: "Main image is required" 
        });
      }

      const updatedProperty = await Property.findByIdAndUpdate(
        id, 
        { images }, 
        { new: true, runValidators: true }
      ).populate("landlordId", "firstName lastName email phone");

      res.status(200).json({ 
        success: true, 
        message: "Property images updated successfully", 
        data: updatedProperty 
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Check connection status for a specific property (tenant only)
  async checkPropertyConnectionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { propertyId } = req.params;
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      if (userRole !== "tenant") {
        return res.status(403).json({ 
          success: false, 
          message: "This endpoint is for tenants only" 
        });
      }

      if (!Types.ObjectId.isValid(propertyId)) {
        return res.status(400).json({ success: false, message: "Invalid property ID" });
      }

      // Check if property exists
      const property = await Property.findById(propertyId);
      if (!property) {
        return res.status(404).json({ success: false, message: "Property not found" });
      }

      // Find connection between tenant and property
      const connection = await Connection.findOne({
        tenantId: userId,
        propertyId: propertyId
      });

      const connectionStatus = connection ? {
        status: connection.status,
        canChat: connection.status === "accepted" && connection.isActive,
        message: connection.message,
        responseMessage: connection.responseMessage,
        respondedAt: connection.respondedAt,
        createdAt: connection.createdAt
      } : null;

      res.status(200).json({
        success: true,
        data: {
          propertyId,
          connectionStatus,
          isConnected: !!connection,
          canChat: connection?.status === "accepted" && connection?.isActive
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get boost history for all landlord properties
   * GET /api/properties/boosts/history
   */
  async getAllBoostsHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?._id || (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (userRole !== "landlord" && userRole !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Landlord or admin role required."
        });
      }

      // Get all premium boost revenue sources for this landlord
      const query: any = {
        sourceType: "premium_boost",
        payerId: userId
      };

      // If admin, allow filtering by landlordId
      if (userRole === "admin" && req.query.landlordId) {
        query.payerId = req.query.landlordId;
      }

      const boosts = await RevenueSource.find(query)
        .sort({ createdAt: -1 })
        .populate("propertyId", "title address")
        .populate("payerId", "firstName lastName email")
        .lean();

      // Group by property
      const boostsByProperty = boosts.reduce((acc: any, boost: any) => {
        const propId = boost.propertyId?._id?.toString() || "unknown";
        if (!acc[propId]) {
          acc[propId] = {
            property: boost.propertyId,
            boosts: [],
            totalSpent: 0
          };
        }
        acc[propId].boosts.push(boost);
        acc[propId].totalSpent += boost.amount;
        return acc;
      }, {});

      // Calculate summary
      const totalSpent = boosts.reduce((sum: number, boost: any) => sum + boost.amount, 0);
      const activeBoosts = boosts.filter((boost: any) => boost.status === "collected");
      const expiredBoosts = boosts.filter((boost: any) => boost.status === "distributed");

      res.json({
        success: true,
        data: {
          boosts,
          boostsByProperty: Object.values(boostsByProperty),
          summary: {
            total: boosts.length,
            totalSpent,
            active: activeBoosts.length,
            expired: expiredBoosts.length,
            properties: Object.keys(boostsByProperty).length
          }
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get boost history for a specific property
   * GET /api/properties/:propertyId/boosts/history
   */
  async getBoostHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { propertyId } = req.params;
      const userId = (req as any).user?._id || (req as any).user?.id;
      const userRole = (req as any).user?.role;

      // Verify property exists and user has access
      const property = await Property.findById(propertyId);
      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found"
        });
      }

      // Check if user is the landlord or admin
      if (userRole !== "admin" && property.landlordId.toString() !== userId?.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      // Get all premium boost revenue sources for this property
      const boosts = await RevenueSource.find({
        sourceType: "premium_boost",
        propertyId: propertyId,
        payerId: property.landlordId
      })
        .sort({ createdAt: -1 })
        .populate("propertyId", "title address")
        .lean();

      // Calculate summary
      const totalSpent = boosts.reduce((sum: number, boost: any) => sum + boost.amount, 0);
      const activeBoosts = boosts.filter((boost: any) => boost.status === "collected");
      const expiredBoosts = boosts.filter((boost: any) => boost.status === "distributed");

      res.json({
        success: true,
        data: {
          boosts,
          summary: {
            total: boosts.length,
            totalSpent,
            active: activeBoosts.length,
            expired: expiredBoosts.length
          }
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Admin: Verify a property listing
   * POST /api/properties/admin/:id/verify
   */
  async verifyPropertyListing(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const adminId = (req as any).user._id;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid property ID" });
      }

      const property = await Property.findById(id);
      if (!property) {
        return res.status(404).json({ success: false, message: "Property not found" });
      }

      // Check if property has proof documents uploaded
      if (!property.propertyProofDocuments || property.propertyProofDocuments.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot verify listing without propertyProofDocuments uploaded"
        });
      }

      // Verify the property
      property.isVerified = true;
      property.verifiedBy = new Types.ObjectId(adminId);
      property.verifiedAt = new Date();
      property.rejectedBy = undefined;
      property.rejectedAt = undefined;
      property.verificationRejectionReason = undefined;
      if (req.body.adminFeedback) {
        property.adminFeedback = req.body.adminFeedback;
      }
      await property.save();

      const propertyData = property.toObject();
      propertyData.verificationStatus = "verified";

      return res.status(200).json({
        success: true,
        message: "Property listing verified successfully",
        data: propertyData
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Admin: Reject a property listing
   * POST /api/properties/admin/:id/reject
   */
  async rejectPropertyListing(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const adminId = (req as any).user._id;
      const { rejectionReason, adminFeedback } = req.body;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid property ID" });
      }

      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required when rejecting a property listing"
        });
      }

      const property = await Property.findById(id);
      if (!property) {
        return res.status(404).json({ success: false, message: "Property not found" });
      }

      // Reject the property
      property.isVerified = false;
      property.rejectedBy = new Types.ObjectId(adminId);
      property.rejectedAt = new Date();
      property.verificationRejectionReason = rejectionReason;
      property.verifiedBy = undefined;
      property.verifiedAt = undefined;
      if (adminFeedback) {
        property.adminFeedback = adminFeedback;
      }
      await property.save();

      const propertyData = property.toObject();
      propertyData.verificationStatus = "rejected";

      return res.status(200).json({
        success: true,
        message: "Property listing rejected successfully",
        data: propertyData
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const propertyController = new PropertyController(); 