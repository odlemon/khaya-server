// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { Connection, IConnection } from "../models/Connection";
import { User } from "../models/User";
import { Property } from "../models/Property";
import { Types } from "mongoose";
import { chatService } from "../services/ChatService";
import { emailNotificationService } from "../services/EmailNotificationService";
import { appNotificationService } from "../services/AppNotificationService";
import { enrichTenantConnections, applyLandlordConnectionListFilter, LANDLORD_CLEARABLE_CONNECTION_STATUSES } from "../utils/connectionPipeline";
import { emitChatMessageRealtime } from "../utils/chatRealtime";

export class ConnectionController {

  /**
   * Send connection request (tenant only)
   */
  async sendConnectionRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { 
        propertyId, 
        landlordId, 
        message,
        expectedMoveInDate,
        expectedBudgetMin,
        expectedBudgetMax,
        numberOfOccupants,
        employmentStatus,
        leaseDurationMonths,
        hasPets,
        petDetails,
        specialRequirements
      } = req.body;

      // Only tenants can send connection requests
      if (userRole !== "tenant") {
        return res.status(403).json({
          success: false,
          message: "Only tenants can send connection requests"
        });
      }

      // Validate required fields
      if (!propertyId || !landlordId || !message) {
        return res.status(400).json({
          success: false,
          message: "Property ID, landlord ID, and message are required"
        });
      }

      // Validate property exists and belongs to landlord
      const property = await Property.findById(propertyId);
      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found"
        });
      }

      if (property.landlordId.toString() !== landlordId) {
        return res.status(400).json({
          success: false,
          message: "Property does not belong to this landlord"
        });
      }

      // Block duplicate live requests (pending or accepted on same property)
      const activeConnection = await Connection.findOne({
        tenantId: userId,
        landlordId,
        propertyId,
        isActive: true,
        status: { $in: ["pending", "accepted"] },
      });

      if (activeConnection) {
        return res.status(409).json({
          success: false,
          message: "Connection request already exists",
          data: {
            status: activeConnection.status,
            canChat: activeConnection.status === "accepted"
          }
        });
      }

      // Legacy rows: rejected but still marked active — archive so tenant can re-apply
      await Connection.updateMany(
        {
          tenantId: userId,
          landlordId,
          propertyId,
          isActive: true,
          status: { $in: ["rejected", "cancelled"] },
        },
        { $set: { isActive: false } }
      );

      const tenantDetails: any = {};
      if (expectedMoveInDate) tenantDetails.expectedMoveInDate = new Date(expectedMoveInDate);
      if (expectedBudgetMin !== undefined || expectedBudgetMax !== undefined) {
        const min = expectedBudgetMin !== undefined ? Number(expectedBudgetMin) : undefined;
        const max = expectedBudgetMax !== undefined ? Number(expectedBudgetMax) : undefined;

        if (min !== undefined && (!Number.isFinite(min) || min < 0)) {
          return res.status(400).json({
            success: false,
            message: "expectedBudgetMin must be a number >= 0"
          });
        }
        if (max !== undefined && (!Number.isFinite(max) || max < 0)) {
          return res.status(400).json({
            success: false,
            message: "expectedBudgetMax must be a number >= 0"
          });
        }
        if (min !== undefined && max !== undefined && min > max) {
          return res.status(400).json({
            success: false,
            message: "expectedBudgetMin cannot be greater than expectedBudgetMax"
          });
        }

        if (min !== undefined) tenantDetails.expectedBudgetMin = min;
        if (max !== undefined) tenantDetails.expectedBudgetMax = max;
      }
      if (numberOfOccupants !== undefined) tenantDetails.numberOfOccupants = Number(numberOfOccupants);
      if (employmentStatus) tenantDetails.employmentStatus = employmentStatus;
      if (leaseDurationMonths !== undefined) tenantDetails.leaseDurationMonths = Number(leaseDurationMonths);
      if (hasPets !== undefined) tenantDetails.hasPets = Boolean(hasPets);
      if (petDetails) tenantDetails.petDetails = petDetails.trim();
      if (specialRequirements) tenantDetails.specialRequirements = specialRequirements.trim();

      let connection;
      // Always create a new row so withdrawn/declined history is preserved
      connection = new Connection({
        tenantId: userId,
        landlordId,
        propertyId,
        message: message.trim(),
        status: "pending",
        ...tenantDetails
      });
      await connection.save();

      const notifyLandlordId = String(landlordId);
      const notifyPropertyId = String(propertyId);
      const notifyConnectionId = connection._id.toString();

      // Populate user and property details for response
      await connection.populate([
        { path: "tenantId", select: "firstName lastName email isVerified profile" },
        { path: "landlordId", select: "firstName lastName email" },
        { path: "propertyId", select: "title address images" }
      ]);

      const tenantUser = connection.tenantId as any;
      const propertyDoc = connection.propertyId as any;
      const tenantName = tenantUser
        ? `${tenantUser.firstName || ""} ${tenantUser.lastName || ""}`.trim() || "A tenant"
        : "A tenant";
      const propertyTitle = propertyDoc?.title || "Your listing";

      try {
        await appNotificationService.notify({
          userId: notifyLandlordId,
          type: "connection_request",
          title: "New rental request",
          body: `${tenantName} requested to rent ${propertyTitle}`,
          data: {
            connectionId: notifyConnectionId,
            propertyId: notifyPropertyId,
            senderId: userId.toString(),
          },
        });
      } catch (notifyErr) {
        console.error("In-app notify (connection request):", notifyErr?.message || notifyErr);
      }

      res.status(201).json({
        success: true,
        message: "Connection request sent successfully",
        data: connection
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get connection requests for landlord
   */
  async getLandlordConnectionRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { status, page = 1, limit = 20, includeDismissed } = req.query;

      // Only landlords can view connection requests
      if (userRole !== "landlord") {
        return res.status(403).json({
          success: false,
          message: "Only landlords can view connection requests"
        });
      }

      const query: any = { landlordId: userId };
      applyLandlordConnectionListFilter(
        query,
        status as string | undefined,
        includeDismissed === "true"
      );

      const skip = (Number(page) - 1) * Number(limit);

      // Get connection requests with pagination
      const connections = await Connection.find(query)
        .populate("tenantId", "firstName lastName email isVerified profile")
        .populate("propertyId", "title address images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await Connection.countDocuments(query);

      res.status(200).json({
        success: true,
        data: connections,
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

  /**
   * Get connection requests for tenant
   */
  async getTenantConnectionRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { status, page = 1, limit = 20, includeDismissed } = req.query;

      // Only tenants can view their connection requests
      if (userRole !== "tenant") {
        return res.status(403).json({
          success: false,
          message: "Only tenants can view their connection requests"
        });
      }

      // Build query
      const query: any = { tenantId: userId };
      if (status) {
        query.status = status;
      }
      if (includeDismissed !== "true") {
        query.$or = [
          { dismissedByTenantAt: { $exists: false } },
          { dismissedByTenantAt: null },
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);

      // Get connection requests with pagination
      const connections = await Connection.find(query)
        .populate("landlordId", "firstName lastName email")
        .populate("propertyId", "title address images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await Connection.countDocuments(query);
      const enriched = await enrichTenantConnections(connections);

      res.status(200).json({
        success: true,
        data: enriched,
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

  /**
   * Respond to connection request (landlord only)
   */
  async respondToConnectionRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { requestId } = req.params;
      const { status, message } = req.body;

      // Only landlords can respond to connection requests
      if (userRole !== "landlord") {
        return res.status(403).json({
          success: false,
          message: "Only landlords can respond to connection requests"
        });
      }

      // Validate status
      if (!["accepted", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be 'accepted' or 'rejected'"
        });
      }

      // Find connection request
      const connection = await Connection.findById(requestId);
      if (!connection) {
        return res.status(404).json({
          success: false,
          message: "Connection request not found"
        });
      }

      // Check if landlord owns this connection request
      if (connection.landlordId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only respond to your own connection requests"
        });
      }

      // Check if already responded
      if (connection.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Connection request has already been responded to"
        });
      }

      // Update connection
      connection.status = status;
      connection.responseMessage = message?.trim();
      connection.respondedAt = new Date();
      connection.respondedBy = userId;
      if (status === "rejected") {
        connection.isActive = false;
      }

      await connection.save();

      // Populate details for response
      await connection.populate([
        { path: "tenantId", select: "firstName lastName email isVerified profile" },
        { path: "landlordId", select: "firstName lastName email" },
        { path: "propertyId", select: "title address images" }
      ]);

      res.status(200).json({
        success: true,
        message: `Connection request ${status} successfully`,
        data: connection
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get connection status between tenant and landlord for a property
   */
  async getConnectionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { propertyId, landlordId } = req.params;

      // Validate property and landlord
      const property = await Property.findById(propertyId);
      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found"
        });
      }

      const landlord = await User.findById(landlordId);
      if (!landlord || landlord.role !== "landlord") {
        return res.status(404).json({
          success: false,
          message: "Landlord not found"
        });
      }

      // Current live request for this property (ignore archived history rows)
      const connection = await Connection.findOne({
        tenantId: userRole === "tenant" ? userId : null,
        landlordId,
        propertyId,
        isActive: true,
      }).sort({ createdAt: -1 });

      if (!connection) {
        return res.status(200).json({
          success: true,
          data: {
            status: "none",
            canChat: false,
            requestId: null
          }
        });
      }

      res.status(200).json({
        success: true,
        data: {
          status: connection.status,
          canChat: connection.status === "accepted" && connection.isActive,
          isActive: connection.isActive,
          requestId: connection._id,
          message: connection.message,
          responseMessage: connection.responseMessage,
          createdAt: connection.createdAt,
          respondedAt: connection.respondedAt
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      let query: any = {};
      if (userRole === "landlord") {
        query.landlordId = userId;
      } else if (userRole === "tenant") {
        query.tenantId = userId;
      } else {
        return res.status(403).json({
          success: false,
          message: "Invalid user role"
        });
      }

      const listQuery = { ...query };
      const includeDismissed = req.query.includeDismissed === "true";
      if (userRole === "landlord") {
        applyLandlordConnectionListFilter(listQuery, undefined, includeDismissed);
      } else if (userRole === "tenant" && !includeDismissed) {
        listQuery.$or = [
          { dismissedByTenantAt: { $exists: false } },
          { dismissedByTenantAt: null },
        ];
      }

      const [pending, accepted, rejected, cancelled, total] = await Promise.all([
        Connection.countDocuments({ ...listQuery, status: "pending" }),
        Connection.countDocuments({ ...listQuery, status: "accepted" }),
        Connection.countDocuments({ ...listQuery, status: "rejected" }),
        Connection.countDocuments({ ...listQuery, status: "cancelled" }),
        Connection.countDocuments(listQuery),
      ]);

      res.status(200).json({
        success: true,
        data: {
          pending,
          accepted,
          rejected,
          cancelled,
          total,
          acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Cancel connection request (tenant only). Sets status to `cancelled`, deactivates row
   * so the tenant can send a new request later (same tenant/landlord/property unique key).
   */
  async cancelConnectionRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const connectionId = req.params.requestId || req.params.connectionId;

      // Only tenants can cancel their connection requests
      if (userRole !== "tenant") {
        return res.status(403).json({
          success: false,
          message: "Only tenants can cancel connection requests"
        });
      }

      if (!Types.ObjectId.isValid(connectionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid connection ID"
        });
      }

      const { cancelReason } = req.body || {};

      const connection = await Connection.findById(connectionId);
      if (!connection) {
        return res.status(404).json({
          success: false,
          message: "Connection request not found"
        });
      }

      if (connection.tenantId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only cancel your own connection requests"
        });
      }

      if (connection.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Can only cancel pending connection requests"
        });
      }

      const tenant = await User.findById(userId).select("firstName lastName email");
      const landlord = await User.findById(connection.landlordId).select("firstName lastName email");
      const property = await Property.findById(connection.propertyId).select("title");

      const tenantName = tenant
        ? `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim() || "A tenant"
        : "A tenant";
      const notifyLandlordId = connection.landlordId.toString();
      const notifyPropertyId = connection.propertyId.toString();
      const notifyConnectionId = connection._id.toString();

      connection.status = "cancelled";
      connection.isActive = false;
      connection.dismissedByTenantAt = undefined;
      connection.dismissedByLandlordAt = undefined;
      connection.responseMessage =
        typeof cancelReason === "string" && cancelReason.trim()
          ? cancelReason.trim().slice(0, 500)
          : "Cancelled by tenant";
      connection.respondedAt = new Date();
      connection.respondedBy = userId;
      await connection.save();

      await connection.populate([
        { path: "tenantId", select: "firstName lastName email isVerified profile" },
        { path: "landlordId", select: "firstName lastName email" },
        { path: "propertyId", select: "title address images" }
      ]);

      if (landlord?.email) {
        const landlordName =
          `${landlord.firstName || ""} ${landlord.lastName || ""}`.trim() || "Landlord";
        try {
          await emailNotificationService.sendTenantCancelledConnectionRequest({
            landlordEmail: landlord.email,
            landlordName,
            tenantName,
            propertyTitle: property?.title || "Your listing",
            cancelReason:
              typeof cancelReason === "string" && cancelReason.trim() ? cancelReason.trim() : undefined
          });
        } catch (emailErr) {
          console.error("Landlord notify (connection cancelled):", emailErr?.message || emailErr);
        }
      }

      try {
        await appNotificationService.notify({
          userId: notifyLandlordId,
          type: "connection_cancelled",
          title: "Rental request withdrawn",
          body: `${tenantName} withdrew their request for ${property?.title || "your listing"}`,
          data: {
            connectionId: notifyConnectionId,
            propertyId: notifyPropertyId,
            senderId: userId.toString(),
          },
        });
      } catch (notifyErr) {
        console.error("In-app notify (connection cancelled):", notifyErr?.message || notifyErr);
      }

      res.status(200).json({
        success: true,
        message: "Connection request cancelled successfully",
        data: connection
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get connection requests for a landlord
   */
  async getLandlordConnections(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { status, propertyId, includeDismissed } = req.query;

      const query: any = { landlordId: new Types.ObjectId(userId) };

      applyLandlordConnectionListFilter(
        query,
        status as string | undefined,
        includeDismissed === "true"
      );

      if (propertyId) {
        query.propertyId = propertyId;
      }

      const connections = await Connection.find(query)
        .populate("tenantId", "firstName lastName email phone")
        .populate("propertyId", "title address images")
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: connections
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Accept connection request (landlord only)
   */
  async acceptConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { connectionId } = req.params;
      const { responseMessage } = req.body || {};

      if (!Types.ObjectId.isValid(connectionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid connection ID"
        });
      }

      const connection = await Connection.findById(connectionId);
      if (!connection) {
        return res.status(404).json({
          success: false,
          message: "Connection not found"
        });
      }

      // Verify the landlord owns this connection
      if (connection.landlordId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only respond to your own connection requests"
        });
      }

      if (connection.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Connection is not in pending status"
        });
      }

      connection.status = "accepted";
      connection.responseMessage = responseMessage || "Connection accepted";
      connection.respondedAt = new Date();
      await connection.save();

      const notifyTenantId = connection.tenantId.toString();
      const notifyLandlordId = connection.landlordId.toString();
      const notifyPropertyId = connection.propertyId.toString();
      const notifyConnectionId = connection._id.toString();

      await connection.populate([
        { path: "propertyId", select: "title" },
        { path: "landlordId", select: "firstName lastName" },
      ]);

      const propertyDoc = connection.propertyId as any;
      const landlordUser = connection.landlordId as any;
      const landlordName =
        `${landlordUser?.firstName || ""} ${landlordUser?.lastName || ""}`.trim() || "Landlord";

      try {
        await appNotificationService.notify({
          userId: notifyTenantId,
          type: "connection_accepted",
          title: "Rental request accepted",
          body: `${landlordName} accepted your request for ${propertyDoc?.title || "the property"}`,
          data: {
            connectionId: notifyConnectionId,
            propertyId: notifyPropertyId,
            senderId: userId.toString(),
          },
        });
      } catch (notifyErr) {
        console.error("In-app notify (connection accepted):", notifyErr?.message || notifyErr);
      }

      // Create chat and send initial message
      try {
        console.log("🔍 DEBUG: Creating chat for accepted connection");
        
        // Create or get chat between tenant and landlord
        const chat = await chatService.getOrCreateChat(
          notifyTenantId,
          notifyLandlordId,
          notifyPropertyId
        );

        // Send initial message from landlord
        const initialMessage = responseMessage || "Thank you for contacting me! I'd be happy to help you with this property. How can I assist you today?";
        
        const initialMsg = await chatService.sendMessage({
          chatId: chat._id.toString(),
          senderId: notifyLandlordId,
          senderRole: "landlord",
          messageType: "text",
          content: initialMessage
        });

        emitChatMessageRealtime(req, chat._id.toString(), initialMsg, {
          senderId: notifyLandlordId,
        });

        console.log("🔍 DEBUG: Chat created and initial message sent successfully");
      } catch (chatError) {
        console.log("❌ ERROR creating chat:", chatError.message);
        // Don't fail the connection acceptance if chat creation fails
      }

      res.status(200).json({
        success: true,
        message: "Connection accepted successfully",
        data: connection
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Reject connection request (landlord only)
   */
  async rejectConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { connectionId } = req.params;
      const { responseMessage } = req.body || {};

      if (!Types.ObjectId.isValid(connectionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid connection ID"
        });
      }

      const connection = await Connection.findById(connectionId);
      if (!connection) {
        return res.status(404).json({
          success: false,
          message: "Connection not found"
        });
      }

      // Verify the landlord owns this connection
      if (connection.landlordId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only respond to your own connection requests"
        });
      }

      if (connection.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Connection is not in pending status"
        });
      }

      connection.status = "rejected";
      connection.responseMessage = responseMessage || "Connection rejected";
      connection.respondedAt = new Date();
      connection.isActive = false;
      await connection.save();

      const notifyTenantId = connection.tenantId.toString();
      const notifyPropertyId = connection.propertyId.toString();
      const notifyConnectionId = connection._id.toString();

      await connection.populate([
        { path: "propertyId", select: "title" },
        { path: "landlordId", select: "firstName lastName" },
      ]);

      const propertyDoc = connection.propertyId as any;
      const landlordUser = connection.landlordId as any;
      const landlordName =
        `${landlordUser?.firstName || ""} ${landlordUser?.lastName || ""}`.trim() || "Landlord";

      try {
        await appNotificationService.notify({
          userId: notifyTenantId,
          type: "connection_rejected",
          title: "Rental request declined",
          body: `${landlordName} declined your request for ${propertyDoc?.title || "the property"}`,
          data: {
            connectionId: notifyConnectionId,
            propertyId: notifyPropertyId,
            senderId: userId.toString(),
          },
        });
      } catch (notifyErr) {
        console.error("In-app notify (connection rejected):", notifyErr?.message || notifyErr);
      }

      res.status(200).json({
        success: true,
        message: "Connection rejected successfully",
        data: connection
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Cancel/Deactivate connection (landlord only)
   */
  async cancelLandlordConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { connectionId } = req.params;

      if (!Types.ObjectId.isValid(connectionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid connection ID"
        });
      }

      const connection = await Connection.findById(connectionId);
      if (!connection) {
        return res.status(404).json({
          success: false,
          message: "Connection not found"
        });
      }

      // Verify the landlord owns this connection
      if (connection.landlordId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only cancel your own connections"
        });
      }

      if (!connection.isActive) {
        return res.status(400).json({
          success: false,
          message: "Connection is already inactive"
        });
      }

      connection.isActive = false;
      await connection.save();

      res.status(200).json({
        success: true,
        message: "Connection cancelled successfully",
        data: connection
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Soft-dismiss a request from landlord list (accepted, withdrawn, or declined — not pending).
   */
  async dismissLandlordConnectionRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { connectionId } = req.params;

      if (userRole !== "landlord") {
        return res.status(403).json({
          success: false,
          message: "Only landlords can dismiss connection requests",
        });
      }

      if (!Types.ObjectId.isValid(connectionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid connection ID",
        });
      }

      const connection = await Connection.findById(connectionId);
      if (!connection) {
        return res.status(404).json({
          success: false,
          message: "Connection request not found",
        });
      }

      if (connection.landlordId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only dismiss your own connection requests",
        });
      }

      if (!LANDLORD_CLEARABLE_CONNECTION_STATUSES.includes(connection.status as any)) {
        return res.status(400).json({
          success: false,
          message: "Pending requests cannot be cleared. Accept or decline first.",
        });
      }

      connection.dismissedByLandlordAt = new Date();
      await connection.save();

      res.status(200).json({
        success: true,
        message: "Request removed from your list",
        data: connection,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Bulk-clear accepted, withdrawn, and declined landlord requests not yet dismissed.
   */
  async dismissAllLandlordClosedRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      if (userRole !== "landlord") {
        return res.status(403).json({
          success: false,
          message: "Only landlords can dismiss connection requests",
        });
      }

      const result = await Connection.updateMany(
        {
          landlordId: userId,
          status: { $in: [...LANDLORD_CLEARABLE_CONNECTION_STATUSES] },
          $or: [{ dismissedByLandlordAt: { $exists: false } }, { dismissedByLandlordAt: null }],
        },
        { $set: { dismissedByLandlordAt: new Date() } }
      );

      res.status(200).json({
        success: true,
        message: "Requests cleared from your list",
        data: { clearedCount: result.modifiedCount },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Soft-dismiss a cancelled or rejected request from tenant list (tenant only)
   */
  async dismissConnectionRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { connectionId } = req.params;

      if (userRole !== "tenant") {
        return res.status(403).json({
          success: false,
          message: "Only tenants can dismiss connection requests",
        });
      }

      if (!Types.ObjectId.isValid(connectionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid connection ID",
        });
      }

      const connection = await Connection.findById(connectionId);
      if (!connection) {
        return res.status(404).json({
          success: false,
          message: "Connection request not found",
        });
      }

      if (connection.tenantId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only dismiss your own connection requests",
        });
      }

      if (!["cancelled", "rejected"].includes(connection.status)) {
        return res.status(400).json({
          success: false,
          message: "Only cancelled or rejected requests can be dismissed",
        });
      }

      connection.dismissedByTenantAt = new Date();
      await connection.save();

      res.status(200).json({
        success: true,
        message: "Connection request removed from your list",
        data: connection,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Bulk-dismiss all cancelled/rejected tenant requests not yet dismissed
   */
  async dismissAllWithdrawnRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      if (userRole !== "tenant") {
        return res.status(403).json({
          success: false,
          message: "Only tenants can dismiss connection requests",
        });
      }

      const result = await Connection.updateMany(
        {
          tenantId: userId,
          status: { $in: ["cancelled", "rejected"] },
          $or: [{ dismissedByTenantAt: { $exists: false } }, { dismissedByTenantAt: null }],
        },
        { $set: { dismissedByTenantAt: new Date() } }
      );

      res.status(200).json({
        success: true,
        message: "Withdrawn and declined requests cleared from your list",
        data: { clearedCount: result.modifiedCount },
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const connectionController = new ConnectionController();

