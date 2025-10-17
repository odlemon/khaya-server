// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { chatService, CreateMessageData, ViewingRequestData, MoveInRequestData, ViewingResponseData, MoveInResponseData } from "../services/ChatService";

export class ChatController {

  /**
   * Get or create chat between tenant and landlord for a property
   */
  async getOrCreateChat(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { propertyId, landlordId } = req.body;

      if (!propertyId || !landlordId) {
        return res.status(400).json({
          success: false,
          message: "Property ID and landlord ID are required"
        });
      }

      const chat = await chatService.getOrCreateChat(userId, landlordId, propertyId);

      res.status(200).json({
        success: true,
        message: "Chat retrieved/created successfully",
        data: chat
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get user's chats
   */
  async getUserChats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      const chats = await chatService.getUserChats(userId, userRole);

      res.status(200).json({
        success: true,
        message: "Chats retrieved successfully",
        data: chats
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get chat by ID with messages
   */
  async getChatById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id?.toString();
      const { chatId } = req.params;

      const { chat, messages } = await chatService.getChatById(chatId, userId);

      // Compute counterpart (the other participant)
      const counterpart = (chat.participants as any[]).find((p: any) => p._id?.toString?.() !== userId);

      // Map messages to include isMine flag for easy UI rendering
      const messagesWithFlags = messages.map((m: any) => {
        const messageObj = m.toObject ? m.toObject() : m;
        
        // Get sender ID - handle both populated and unpopulated cases
        let senderIdStr = '';
        if (messageObj.senderId) {
          if (typeof messageObj.senderId === 'object' && messageObj.senderId._id) {
            senderIdStr = messageObj.senderId._id.toString();
          } else {
            senderIdStr = messageObj.senderId.toString();
          }
        }
        
        const isMine = senderIdStr === userId;
        
        return {
          ...messageObj,
          isMine,
          // Also add senderRole for additional clarity
          isFromCurrentUser: isMine
        };
      });

      // Mark messages as read (mark all unread messages in this chat as read)
      const unreadMessageIds = messages
        .filter((m: any) => {
          const senderIdStr = (m.senderId?._id || m.senderId)?.toString?.() || "";
          return senderIdStr !== userId && !m.isRead;
        })
        .map((m: any) => m._id.toString());
      
      if (unreadMessageIds.length > 0) {
        await chatService.markMessagesAsRead(chatId, unreadMessageIds, userId);
      }

      res.status(200).json({
        success: true,
        message: "Chat retrieved successfully",
        data: { 
          chat: {
            ...chat.toObject?.() ?? chat,
            counterpart
          }, 
          messages: messagesWithFlags 
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Send a message
   */
  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { chatId } = req.params;
      const { content, messageType = "text", attachments } = req.body || {};

      if (!content) {
        return res.status(400).json({
          success: false,
          message: "Message content is required"
        });
      }

      const messageData: CreateMessageData = {
        chatId,
        senderId: userId,
        senderRole: userRole,
        messageType,
        content,
        attachments
      };

      const message = await chatService.sendMessage(messageData);

      // Add isMine flag to the response
      const messageObj = message.toObject ? message.toObject() : message;
      const messageWithFlag = {
        ...messageObj,
        isMine: true, // Always true for the sender
        isFromCurrentUser: true
      };

      // Emit real-time message to chat participants
      const socketService = (req as any).app.get('socketService');
      if (socketService) {
        socketService.emitNewMessage(chatId, messageWithFlag);
      }

      res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: messageWithFlag
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Send a simple message by tenantId + landlordId (+ propertyId)
   * Body: { tenantId, landlordId, propertyId, content, messageType?, attachments? }
   * Sender is the authenticated user; we validate they match tenantId or landlordId
   */
  async sendSimpleMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const authUserId = (req as any).user._id?.toString();
      const authUserRole = (req as any).user.role;
      const { tenantId, landlordId, propertyId, content, messageType = "text", attachments } = req.body;

      if (!tenantId || !landlordId || !propertyId || !content) {
        return res.status(400).json({
          success: false,
          message: "tenantId, landlordId, propertyId and content are required"
        });
      }

      // Ensure the caller is one of the participants
      if (authUserId !== tenantId && authUserId !== landlordId) {
        return res.status(403).json({ success: false, message: "You are not a participant in this chat" });
      }

      // Get or create chat for this pair and property
      const chat = await chatService.getOrCreateChat(tenantId, landlordId, propertyId);

      // Derive senderRole from authenticated user
      const senderRole = authUserId === landlordId ? "landlord" : "tenant";

      const message = await chatService.sendMessage({
        chatId: chat._id.toString(),
        senderId: authUserId,
        senderRole,
        messageType,
        content,
        attachments
      });

      // Emit real-time message to chat participants
      const socketService = (req as any).app.get('socketService');
      if (socketService) {
        socketService.emitNewMessage(chat._id.toString(), message);
      }

      return res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: message
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { chatId } = req.params; // Get chatId from URL params
      const { messageIds } = req.body; // Get messageIds from body

      console.log('markMessagesAsRead called with:', { chatId, messageIds, userId });

      if (!chatId) {
        return res.status(400).json({
          success: false,
          message: "Chat ID is required"
        });
      }

      // If no messageIds provided, mark all unread messages in the chat as read
      let messageIdsToMark = messageIds;
      if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
        // Get all unread messages in this chat
        const { messages } = await chatService.getChatById(chatId, userId);
        messageIdsToMark = messages
          .filter((m: any) => {
            const senderIdStr = (m.senderId?._id || m.senderId)?.toString?.() || "";
            return senderIdStr !== userId && !m.isRead;
          })
          .map((m: any) => m._id.toString());
      }

      if (messageIdsToMark.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No messages to mark as read",
          data: { modifiedCount: 0, messageIds: [] }
        });
      }

      const result = await chatService.markMessagesAsRead(chatId, messageIdsToMark, userId);

      // Emit read receipt to other participants
      const socketService = (req as any).app.get('socketService');
      if (socketService) {
        socketService.emitMessageRead(chatId, messageIdsToMark, userId);
      }

      res.status(200).json({
        success: true,
        message: "Messages marked as read",
        data: result
      });
    } catch (error: any) {
      console.error('Error in markMessagesAsRead:', error);
      next(error);
    }
  }

  /**
   * Get online users for a chat
   */
  async getOnlineUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const socketService = (req as any).app.get('socketService');
      
      if (!socketService) {
        return res.status(500).json({
          success: false,
          message: "Socket service not available"
        });
      }

      const onlineUsers = socketService.getOnlineUsers();

      res.status(200).json({
        success: true,
        message: "Online users retrieved",
        data: { onlineUsers }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Send viewing request (tenant only)
   */
  async sendViewingRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      if (userRole !== "tenant") {
        return res.status(403).json({
          success: false,
          message: "Only tenants can send viewing requests"
        });
      }

      const { chatId, preferredDate, preferredTime, alternativeDates, alternativeTimes, message } = req.body;

      if (!chatId || !preferredDate || !preferredTime || !message) {
        return res.status(400).json({
          success: false,
          message: "Chat ID, preferred date, preferred time, and message are required"
        });
      }

      const viewingRequestData: ViewingRequestData = {
        chatId,
        senderId: userId,
        preferredDate: new Date(preferredDate),
        preferredTime,
        alternativeDates: alternativeDates?.map((date: string) => new Date(date)),
        alternativeTimes,
        message
      };

      const messageObj = await chatService.sendViewingRequest(viewingRequestData);

      res.status(201).json({
        success: true,
        message: "Viewing request sent successfully",
        data: messageObj
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Send move-in request (tenant only)
   */
  async sendMoveInRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      if (userRole !== "tenant") {
        return res.status(403).json({
          success: false,
          message: "Only tenants can send move-in requests"
        });
      }

      const { chatId, preferredMoveInDate, tenancyDuration, message } = req.body;

      if (!chatId || !preferredMoveInDate || !tenancyDuration || !message) {
        return res.status(400).json({
          success: false,
          message: "Chat ID, preferred move-in date, tenancy duration, and message are required"
        });
      }

      const moveInRequestData: MoveInRequestData = {
        chatId,
        senderId: userId,
        preferredMoveInDate: new Date(preferredMoveInDate),
        tenancyDuration,
        message
      };

      const messageObj = await chatService.sendMoveInRequest(moveInRequestData);

      res.status(201).json({
        success: true,
        message: "Move-in request sent successfully",
        data: messageObj
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Respond to viewing request (landlord only)
   */
  async respondToViewingRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      if (userRole !== "landlord") {
        return res.status(403).json({
          success: false,
          message: "Only landlords can respond to viewing requests"
        });
      }

      const { messageId, status, acceptedDate, acceptedTime, message } = req.body;

      if (!messageId || !status) {
        return res.status(400).json({
          success: false,
          message: "Message ID and status are required"
        });
      }

      const viewingResponseData: ViewingResponseData = {
        messageId,
        landlordId: userId,
        status,
        acceptedDate: acceptedDate ? new Date(acceptedDate) : undefined,
        acceptedTime,
        message
      };

      const responseMessage = await chatService.respondToViewingRequest(viewingResponseData);

      res.status(200).json({
        success: true,
        message: "Viewing request response sent successfully",
        data: responseMessage
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Respond to move-in request (landlord only)
   */
  async respondToMoveInRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      if (userRole !== "landlord") {
        return res.status(403).json({
          success: false,
          message: "Only landlords can respond to move-in requests"
        });
      }

      const { messageId, status, acceptedMoveInDate, acceptedDuration, message } = req.body;

      if (!messageId || !status) {
        return res.status(400).json({
          success: false,
          message: "Message ID and status are required"
        });
      }

      const moveInResponseData: MoveInResponseData = {
        messageId,
        landlordId: userId,
        status,
        acceptedMoveInDate: acceptedMoveInDate ? new Date(acceptedMoveInDate) : undefined,
        acceptedDuration,
        message
      };

      const responseMessage = await chatService.respondToMoveInRequest(moveInResponseData);

      res.status(200).json({
        success: true,
        message: "Move-in request response sent successfully",
        data: responseMessage
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { chatId } = req.params;

      await chatService.markMessagesAsRead(chatId, userId);

      res.status(200).json({
        success: true,
        message: "Messages marked as read"
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;

      const count = await chatService.getUnreadCount(userId);

      res.status(200).json({
        success: true,
        message: "Unread count retrieved successfully",
        data: { unreadCount: count }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get landlord's viewing requests
   */
  async getLandlordViewingRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      if (userRole !== "landlord") {
        return res.status(403).json({
          success: false,
          message: "Only landlords can access viewing requests"
        });
      }

      const viewingRequests = await chatService.getLandlordViewingRequests(userId);

      res.status(200).json({
        success: true,
        message: "Viewing requests retrieved successfully",
        data: viewingRequests
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get landlord's move-in requests
   */
  async getLandlordMoveInRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      if (userRole !== "landlord") {
        return res.status(403).json({
          success: false,
          message: "Only landlords can access move-in requests"
        });
      }

      const moveInRequests = await chatService.getLandlordMoveInRequests(userId);

      res.status(200).json({
        success: true,
        message: "Move-in requests retrieved successfully",
        data: moveInRequests
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get tenant's pending requests
   */
  async getTenantPendingRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      if (userRole !== "tenant") {
        return res.status(403).json({
          success: false,
          message: "Only tenants can access pending requests"
        });
      }

      const pendingRequests = await chatService.getTenantPendingRequests(userId);

      res.status(200).json({
        success: true,
        message: "Pending requests retrieved successfully",
        data: pendingRequests
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Archive chat
   */
  async archiveChat(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { chatId } = req.params;

      await chatService.archiveChat(chatId, userId);

      res.status(200).json({
        success: true,
        message: "Chat archived successfully"
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get chat statistics
   */
  async getChatStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      const unreadCount = await chatService.getUnreadCount(userId);
      
      let pendingRequests = { viewingRequests: [], moveInRequests: [] };
      if (userRole === "landlord") {
        const viewingRequests = await chatService.getLandlordViewingRequests(userId);
        const moveInRequests = await chatService.getLandlordMoveInRequests(userId);
        pendingRequests = { viewingRequests, moveInRequests };
      } else if (userRole === "tenant") {
        pendingRequests = await chatService.getTenantPendingRequests(userId);
      }

      const chats = await chatService.getUserChats(userId, userRole);

      res.status(200).json({
        success: true,
        message: "Chat statistics retrieved successfully",
        data: {
          totalChats: chats.length,
          unreadCount,
          pendingViewingRequests: pendingRequests.viewingRequests.length,
          pendingMoveInRequests: pendingRequests.moveInRequests.length
        }
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const chatController = new ChatController(); 