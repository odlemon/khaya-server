// @ts-nocheck
import { Connection } from "../models/Connection";
import { Types } from "mongoose";

export class ConnectionStatusService {
  
  /**
   * Check if a tenant is connected to a landlord for a specific property
   * @param tenantId - The tenant's user ID
   * @param propertyId - The property ID
   * @returns Connection status object or null if no connection exists
   */
  static async checkTenantPropertyConnection(tenantId: string, propertyId: string) {
    try {
      if (!Types.ObjectId.isValid(tenantId) || !Types.ObjectId.isValid(propertyId)) {
        return null;
      }

      const connection = await Connection.findOne({
        tenantId,
        propertyId,
        isActive: true
      });

      if (!connection) {
        return null;
      }

      return {
        status: connection.status,
        canChat: connection.status === "accepted" && connection.isActive,
        message: connection.message,
        responseMessage: connection.responseMessage,
        respondedAt: connection.respondedAt,
        createdAt: connection.createdAt,
        isConnected: true
      };
    } catch (error) {
      console.error("Error checking tenant property connection:", error);
      return null;
    }
  }

  /**
   * Check if a tenant can chat with a landlord for a specific property
   * @param tenantId - The tenant's user ID
   * @param propertyId - The property ID
   * @returns Boolean indicating if chat is allowed
   */
  static async canTenantChatWithLandlord(tenantId: string, propertyId: string): Promise<boolean> {
    try {
      const connection = await this.checkTenantPropertyConnection(tenantId, propertyId);
      return connection?.canChat || false;
    } catch (error) {
      console.error("Error checking chat permission:", error);
      return false;
    }
  }

  /**
   * Get all properties where a tenant has connections
   * @param tenantId - The tenant's user ID
   * @param status - Optional filter by connection status
   * @returns Array of property IDs with connection status
   */
  static async getTenantConnectedProperties(tenantId: string, status?: string) {
    try {
      if (!Types.ObjectId.isValid(tenantId)) {
        return [];
      }

      const query: any = {
        tenantId,
        isActive: true
      };

      if (status) {
        query.status = status;
      }

      const connections = await Connection.find(query)
        .populate("propertyId", "title address images")
        .populate("landlordId", "firstName lastName");

      return connections.map(conn => ({
        propertyId: conn.propertyId,
        landlordId: conn.landlordId,
        status: conn.status,
        canChat: conn.status === "accepted" && conn.isActive,
        message: conn.message,
        responseMessage: conn.responseMessage,
        respondedAt: conn.respondedAt,
        createdAt: conn.createdAt
      }));
    } catch (error) {
      console.error("Error getting tenant connected properties:", error);
      return [];
    }
  }

  /**
   * Get connection status for multiple properties at once
   * @param tenantId - The tenant's user ID
   * @param propertyIds - Array of property IDs to check
   * @returns Map of propertyId to connection status
   */
  static async getBulkConnectionStatus(tenantId: string, propertyIds: string[]) {
    try {
      if (!Types.ObjectId.isValid(tenantId) || !propertyIds.length) {
        return new Map();
      }

      const validPropertyIds = propertyIds.filter(id => Types.ObjectId.isValid(id));
      
      if (!validPropertyIds.length) {
        return new Map();
      }

      const connections = await Connection.find({
        tenantId,
        propertyId: { $in: validPropertyIds },
        isActive: true
      });

      const connectionMap = new Map();
      
      connections.forEach(conn => {
        connectionMap.set(conn.propertyId.toString(), {
          status: conn.status,
          canChat: conn.status === "accepted" && conn.isActive,
          message: conn.message,
          responseMessage: conn.responseMessage,
          respondedAt: conn.respondedAt,
          createdAt: conn.createdAt,
          isConnected: true
        });
      });

      return connectionMap;
    } catch (error) {
      console.error("Error getting bulk connection status:", error);
      return new Map();
    }
  }

  /**
   * Check if a tenant has any active connections
   * @param tenantId - The tenant's user ID
   * @returns Boolean indicating if tenant has any connections
   */
  static async hasAnyConnections(tenantId: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(tenantId)) {
        return false;
      }

      const count = await Connection.countDocuments({
        tenantId,
        isActive: true
      });

      return count > 0;
    } catch (error) {
      console.error("Error checking if tenant has connections:", error);
      return false;
    }
  }

  /**
   * Get connection statistics for a tenant
   * @param tenantId - The tenant's user ID
   * @returns Object with connection counts by status
   */
  static async getTenantConnectionStats(tenantId: string) {
    try {
      if (!Types.ObjectId.isValid(tenantId)) {
        return {
          total: 0,
          pending: 0,
          accepted: 0,
          rejected: 0
        };
      }

      const stats = await Connection.aggregate([
        {
          $match: {
            tenantId: new Types.ObjectId(tenantId),
            isActive: true
          }
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]);

      const result = {
        total: 0,
        pending: 0,
        accepted: 0,
        rejected: 0
      };

      stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
      });

      return result;
    } catch (error) {
      console.error("Error getting tenant connection stats:", error);
      return {
        total: 0,
        pending: 0,
        accepted: 0,
        rejected: 0
      };
    }
  }
}















