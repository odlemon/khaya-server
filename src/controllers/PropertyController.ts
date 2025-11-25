// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { Property } from "../models/Property";
import { User } from "../models/User";
import { Connection } from "../models/Connection";
import { DocumentVerificationService } from "../services/DocumentVerificationService";
import { RevenueSource } from "../models/RevenueSource";
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

      // Check if landlord is document verified (only for landlords, not admins)
      if (user.role === "landlord") {
        const isDocumentVerified = await DocumentVerificationService.isUserDocumentVerified(userId);
        if (!isDocumentVerified) {
          return res.status(403).json({
            success: false,
            message: "You must complete document verification before creating property listings. Please upload and verify your documents first.",
            requiresDocumentVerification: true
          });
        }
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

                 // Add connection status to each property
         properties = properties.map(property => {
           const propertyObj = property.toObject();
           const propertyIdStr = property._id.toString();
           const connection = connectionMap.get(propertyIdStr);
           
           return {
             ...propertyObj,
             isConnected: !!connection,
             connectionState: connection ? connection.status : "none"
           };
         });
      } else {
        // For non-authenticated users or non-tenants, add false connection status
        properties = properties.map(property => {
          const propertyObj = property.toObject();
          return {
            ...propertyObj,
            isConnected: false,
            connectionState: "none"
          };
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

      let propertyData = property.toObject();

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
             } else {
         // For non-authenticated users or non-tenants
         propertyData.isConnected = false;
         propertyData.connectionState = "none";
       }

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
        .sort({ createdAt: -1 });

      res.status(200).json({ 
        success: true, 
        data: properties 
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

      let properties = await Property.find({ 
        status: "published", 
        isFeatured: true,
        isVerified: true 
      })
        .populate("landlordId", "firstName lastName")
        .sort({ createdAt: -1 })
        .limit(Number(limit));

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
            canChat: conn.status === "accepted" && conn.isActive,
            message: conn.message,
            responseMessage: conn.responseMessage,
            respondedAt: conn.respondedAt,
            createdAt: conn.createdAt
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
      } else {
        // For non-authenticated users or non-tenants, add false connection status
        properties = properties.map(property => {
          const propertyObj = property.toObject();
          return {
            ...propertyObj,
            isConnected: false,
            connectionState: "none"
          };
        });
      }

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
}

export const propertyController = new PropertyController(); 