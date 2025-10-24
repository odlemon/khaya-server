// @ts-nocheck
import { Chat, IChat, Message, IMessage } from "../models/Chat";
import { User } from "../models/User";
import { Property } from "../models/Property";
import { Types } from "mongoose";
import { Connection } from "../models/Connection";
import { parseMessageMentions } from "../utils/messageParser";

export interface CreateMessageData {
  chatId: string;
  senderId: string;
  senderRole: "landlord" | "tenant" | "admin";
  messageType?: "text" | "image" | "document" | "viewing_request" | "move_in_request";
  content: string;
  attachments?: {
    type: "image" | "document";
    url: string;
    filename: string;
    size: number;
  }[];
}

export interface ViewingRequestData {
  chatId: string;
  senderId: string;
  preferredDate: Date;
  preferredTime: string;
  alternativeDates?: Date[];
  alternativeTimes?: string[];
  message: string;
}

export interface MoveInRequestData {
  chatId: string;
  senderId: string;
  preferredMoveInDate: Date;
  tenancyDuration: number;
  message: string;
}

export interface ViewingResponseData {
  messageId: string;
  landlordId: string;
  status: "accepted" | "rejected" | "rescheduled";
  acceptedDate?: Date;
  acceptedTime?: string;
  message?: string;
}

export interface MoveInResponseData {
  messageId: string;
  landlordId: string;
  status: "accepted" | "rejected";
  acceptedMoveInDate?: Date;
  acceptedDuration?: number;
  message?: string;
}

export interface ChatNotification {
  type: "new_message" | "viewing_request" | "move_in_request" | "viewing_response" | "move_in_response";
  recipientId: string;
  senderId: string;
  chatId: string;
  propertyId: string;
  message: string;
  data?: any;
}

export class ChatService {

  /**
   * Get or create chat between tenant and landlord for a property
   */
  async getOrCreateChat(tenantId: any, landlordId: any, propertyId: any): Promise<IChat> {
    // Convert to strings for consistent comparison
    const tenantIdStr = tenantId?.toString?.() || tenantId;
    const landlordIdStr = landlordId?.toString?.() || landlordId;
    const propertyIdStr = propertyId?.toString?.() || propertyId;

    // Check if connection exists and is accepted
    const connection = await Connection.findOne({
      tenantId: tenantIdStr,
      landlordId: landlordIdStr,
      propertyId: propertyIdStr,
      status: "accepted"
    });

    if (!connection) {
      throw new Error("Connection not established. Please send a connection request first.");
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [tenantIdStr, landlordIdStr] },
      propertyId: propertyIdStr,
      isActive: true
    }).populate("participants", "firstName lastName email role");

    if (!chat) {
      // Create new chat
      chat = new Chat({
        participants: [tenantIdStr, landlordIdStr],
        propertyId: propertyIdStr,
        isActive: true
      });
      await chat.save();
      await chat.populate("participants", "firstName lastName email role");
      
      console.log('✅ Chat created successfully:', {
        chatId: chat._id,
        participants: chat.participants.map(p => p?.toString?.()),
        propertyId: propertyIdStr
      });
    }

    return chat;
  }

  /**
   * Get user's chats (both as tenant and landlord)
   */
  async getUserChats(userId: string, userRole: string): Promise<any[]> {
    const chats = await Chat.find({
      participants: userId,
      isActive: true
    })
    .populate("participants", "firstName lastName email role")
    .populate("propertyId", "title address price images")
    .populate("lastMessage.senderId", "firstName lastName")
    .sort({ "lastMessage.timestamp": -1, updatedAt: -1 });

    // Compute unread counts per chat for this user (exclude user's own messages)
    const chatIds = chats.map((c: any) => c._id);
    if (chatIds.length === 0) {
      return [];
    }

    const unreadAgg = await Message.aggregate([
      {
        $match: {
          chatId: { $in: chatIds },
          isRead: false,
          senderId: { $ne: new Types.ObjectId(userId) }
        }
      },
      { $group: { _id: "$chatId", count: { $sum: 1 } } }
    ]);

    const unreadMap = new Map<string, number>();
    unreadAgg.forEach((row: any) => {
      unreadMap.set(row._id.toString(), row.count);
    });

    // Attach unreadCount to each chat
    const chatsWithUnread = chats.map((chat: any) => {
      const obj = chat.toObject();
      obj.unreadCount = unreadMap.get(chat._id.toString()) || 0;
      return obj;
    });

    return chatsWithUnread;
  }

  /**
   * Get chat by ID with messages
   */
  async getChatById(chatId: string, userId: string): Promise<{ chat: IChat; messages: IMessage[] }> {
    const chat = await Chat.findById(chatId)
      .populate("participants", "firstName lastName email role")
      .populate("propertyId", "title address price images landlordId");

    if (!chat) {
      throw new Error("Chat not found");
    }

    // Verify user is participant (normalize both sides to string)
    if (!chat.participants.some((p: any) => p._id?.toString?.() === userId?.toString())) {
      throw new Error("Access denied");
    }

    const messages = await Message.find({ chatId })
      .populate("senderId", "firstName lastName email role")
      .sort({ createdAt: 1 });

    return { chat, messages };
  }

  /**
   * Send a message
   */
  async sendMessage(data: CreateMessageData): Promise<IMessage> {
    const { chatId, senderId, senderRole, messageType = "text", content, attachments } = data;

    // Verify chat exists and user is participant
    const chat = await Chat.findById(chatId).populate("participants", "role");
    if (!chat) {
      throw new Error("Chat not found");
    }

    // Verify user is participant (convert both to string for comparison)
    const senderIdStr = senderId?.toString?.() || senderId;
    const isParticipant = chat.participants.some((p: any) => {
      const participantId = p?._id?.toString?.() || p?.toString?.() || p;
      return participantId === senderIdStr;
    });

    if (!isParticipant) {
      console.error('Access denied - User not participant:', {
        senderId: senderIdStr,
        participants: chat.participants.map((p: any) => p?.toString?.()),
        chatId
      });
      throw new Error("Access denied");
    }

    // Parse message for @mentions (any user can tag)
    let visibleTo: any[] = [];
    let taggedUser: "landlord" | "tenant" | "admin" | null = null;

    const parsed = parseMessageMentions(content);
    if (parsed.hasTag && parsed.taggedUser) {
      taggedUser = parsed.taggedUser;
      
      // Find the tagged user in participants
      const currentUserId = senderId;
      const targetUser = chat.participants.find((p: any) => p.role === parsed.taggedUser);
      
      if (targetUser) {
        visibleTo = [currentUserId, targetUser._id.toString()];
        console.log(`${senderRole} tagged ${parsed.taggedUser}. Message visible to:`, visibleTo);
      }
    }
    // If no tag or tag not found, visible to all (empty visibleTo array)

    // Create message
    const message = new Message({
      chatId,
      senderId,
      senderRole,
      messageType,
      content,
      attachments,
      visibleTo: visibleTo.length > 0 ? visibleTo : undefined,
      taggedUser: taggedUser || undefined
    });

    await message.save();
    await message.populate("senderId", "firstName lastName email role");

    // Update chat's last message (show for everyone or mention visibility)
    chat.lastMessage = {
      content: taggedUser ? `[Private to ${taggedUser}] ${content.substring(0, 50)}...` : content,
      senderId: senderId,
      timestamp: new Date()
    };
    await chat.save();

    // Send notification to recipients
    const recipients = visibleTo.length > 0 
      ? chat.participants.filter((p: any) => {
          const pId = p._id?.toString?.() || p.toString();
          return visibleTo.includes(pId) && pId !== senderIdStr;
        })
      : chat.participants.filter((p: any) => {
          const pId = p._id?.toString?.() || p.toString();
          return pId !== senderIdStr;
        });

    for (const recipient of recipients) {
      const recipientId = recipient._id?.toString?.() || recipient.toString();
      await this.sendChatNotification({
        type: "new_message",
        recipientId,
        senderId: senderId,
        chatId: chatId,
        propertyId: chat.propertyId.toString(),
        message: `New message from ${message.senderId.firstName} ${message.senderId.lastName}`,
        data: { messageId: message._id, isPrivate: visibleTo.length > 0 }
      });
    }

    return message;
  }

  /**
   * Send viewing request
   */
  async sendViewingRequest(data: ViewingRequestData): Promise<IMessage> {
    const { chatId, senderId, preferredDate, preferredTime, alternativeDates, alternativeTimes, message } = data;

    // Verify sender is tenant
    const user = await User.findById(senderId);
    if (!user || user.role !== "tenant") {
      throw new Error("Only tenants can send viewing requests");
    }

    const messageData: CreateMessageData = {
      chatId,
      senderId,
      senderRole: "tenant",
      messageType: "viewing_request",
      content: message,
      attachments: []
    };

    const newMessage = await this.sendMessage(messageData);

    // Add viewing request data
    newMessage.viewingRequest = {
      preferredDate,
      preferredTime,
      alternativeDates,
      alternativeTimes,
      message,
      status: "pending"
    };

    await newMessage.save();

    // Send notification to landlord
    const chat = await Chat.findById(chatId);
    const landlordId = chat.participants.find(p => p.toString() !== senderId);
    
    if (landlordId) {
      await this.sendChatNotification({
        type: "viewing_request",
        recipientId: landlordId.toString(),
        senderId: senderId,
        chatId: chatId,
        propertyId: chat.propertyId.toString(),
        message: `New viewing request for ${preferredDate.toDateString()} at ${preferredTime}`,
        data: { 
          messageId: newMessage._id,
          preferredDate,
          preferredTime
        }
      });
    }

    return newMessage;
  }

  /**
   * Send move-in request
   */
  async sendMoveInRequest(data: MoveInRequestData): Promise<IMessage> {
    const { chatId, senderId, preferredMoveInDate, tenancyDuration, message } = data;

    // Verify sender is tenant
    const user = await User.findById(senderId);
    if (!user || user.role !== "tenant") {
      throw new Error("Only tenants can send move-in requests");
    }

    const messageData: CreateMessageData = {
      chatId,
      senderId,
      senderRole: "tenant",
      messageType: "move_in_request",
      content: message,
      attachments: []
    };

    const newMessage = await this.sendMessage(messageData);

    // Add move-in request data
    newMessage.moveInRequest = {
      preferredMoveInDate,
      tenancyDuration,
      message,
      status: "pending"
    };

    await newMessage.save();

    // Send notification to landlord
    const chat = await Chat.findById(chatId);
    const landlordId = chat.participants.find(p => p.toString() !== senderId);
    
    if (landlordId) {
      await this.sendChatNotification({
        type: "move_in_request",
        recipientId: landlordId.toString(),
        senderId: senderId,
        chatId: chatId,
        propertyId: chat.propertyId.toString(),
        message: `New move-in request for ${preferredMoveInDate.toDateString()} (${tenancyDuration} months)`,
        data: { 
          messageId: newMessage._id,
          preferredMoveInDate,
          tenancyDuration
        }
      });
    }

    return newMessage;
  }

  /**
   * Respond to viewing request (landlord only)
   */
  async respondToViewingRequest(data: ViewingResponseData): Promise<IMessage> {
    const { messageId, landlordId, status, acceptedDate, acceptedTime, message } = data;

    // Verify sender is landlord
    const user = await User.findById(landlordId);
    if (!user || user.role !== "landlord") {
      throw new Error("Only landlords can respond to viewing requests");
    }

    const originalMessage = await Message.findById(messageId);
    if (!originalMessage || originalMessage.messageType !== "viewing_request") {
      throw new Error("Viewing request not found");
    }

    // Update viewing request status
    originalMessage.viewingRequest.status = status;
    originalMessage.viewingRequest.landlordResponse = {
      acceptedDate,
      acceptedTime,
      message,
      responseDate: new Date()
    };

    await originalMessage.save();

    // Send response message
    const responseContent = status === "accepted" 
      ? `Viewing request accepted for ${acceptedDate?.toDateString()} at ${acceptedTime}. ${message || ""}`
      : status === "rejected"
      ? `Viewing request declined. ${message || ""}`
      : `Viewing request rescheduled for ${acceptedDate?.toDateString()} at ${acceptedTime}. ${message || ""}`;

    const responseMessage = await this.sendMessage({
      chatId: originalMessage.chatId.toString(),
      senderId: landlordId,
      senderRole: "landlord",
      messageType: "text",
      content: responseContent
    });

    // Send notification to tenant
    await this.sendChatNotification({
      type: "viewing_response",
      recipientId: originalMessage.senderId.toString(),
      senderId: landlordId,
      chatId: originalMessage.chatId.toString(),
      propertyId: (await Chat.findById(originalMessage.chatId)).propertyId.toString(),
      message: `Viewing request ${status}`,
      data: { 
        messageId: originalMessage._id,
        status,
        acceptedDate,
        acceptedTime
      }
    });

    return responseMessage;
  }

  /**
   * Respond to move-in request (landlord only)
   */
  async respondToMoveInRequest(data: MoveInResponseData): Promise<IMessage> {
    const { messageId, landlordId, status, acceptedMoveInDate, acceptedDuration, message } = data;

    // Verify sender is landlord
    const user = await User.findById(landlordId);
    if (!user || user.role !== "landlord") {
      throw new Error("Only landlords can respond to move-in requests");
    }

    const originalMessage = await Message.findById(messageId);
    if (!originalMessage || originalMessage.messageType !== "move_in_request") {
      throw new Error("Move-in request not found");
    }

    // Update move-in request status
    originalMessage.moveInRequest.status = status;
    originalMessage.moveInRequest.landlordResponse = {
      acceptedMoveInDate,
      acceptedDuration,
      message,
      responseDate: new Date()
    };

    await originalMessage.save();

    // Send response message
    const responseContent = status === "accepted" 
      ? `Move-in request accepted for ${acceptedMoveInDate?.toDateString()} (${acceptedDuration} months). ${message || ""}`
      : `Move-in request declined. ${message || ""}`;

    const responseMessage = await this.sendMessage({
      chatId: originalMessage.chatId.toString(),
      senderId: landlordId,
      senderRole: "landlord",
      messageType: "text",
      content: responseContent
    });

    // Send notification to tenant
    await this.sendChatNotification({
      type: "move_in_response",
      recipientId: originalMessage.senderId.toString(),
      senderId: landlordId,
      chatId: originalMessage.chatId.toString(),
      propertyId: (await Chat.findById(originalMessage.chatId)).propertyId.toString(),
      message: `Move-in request ${status}`,
      data: { 
        messageId: originalMessage._id,
        status,
        acceptedMoveInDate,
        acceptedDuration
      }
    });

    return responseMessage;
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    await Message.updateMany(
      { 
        chatId, 
        senderId: { $ne: userId }, 
        isRead: false 
      },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );
  }

  /**
   * Get unread message count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const count = await Message.countDocuments({
      senderId: { $ne: userId },
      isRead: false,
      chatId: {
        $in: await Chat.find({ participants: userId }).distinct("_id")
      }
    });
    return count;
  }

  /**
   * Get viewing requests for landlord
   */
  async getLandlordViewingRequests(landlordId: string): Promise<IMessage[]> {
    const chats = await Chat.find({ participants: landlordId });
    const chatIds = chats.map(chat => chat._id);

    const viewingRequests = await Message.find({
      chatId: { $in: chatIds },
      messageType: "viewing_request",
      "viewingRequest.status": "pending"
    })
    .populate("senderId", "firstName lastName email phone")
    .populate("chatId")
    .populate({
      path: "chatId",
      populate: { path: "propertyId", select: "title address price images" }
    })
    .sort({ createdAt: -1 });

    return viewingRequests;
  }

  /**
   * Get move-in requests for landlord
   */
  async getLandlordMoveInRequests(landlordId: string): Promise<IMessage[]> {
    const chats = await Chat.find({ participants: landlordId });
    const chatIds = chats.map(chat => chat._id);

    const moveInRequests = await Message.find({
      chatId: { $in: chatIds },
      messageType: "move_in_request",
      "moveInRequest.status": "pending"
    })
    .populate("senderId", "firstName lastName email phone")
    .populate("chatId")
    .populate({
      path: "chatId",
      populate: { path: "propertyId", select: "title address price images" }
    })
    .sort({ createdAt: -1 });

    return moveInRequests;
  }

  /**
   * Get tenant's pending requests
   */
  async getTenantPendingRequests(tenantId: string): Promise<{
    viewingRequests: IMessage[];
    moveInRequests: IMessage[];
  }> {
    const chats = await Chat.find({ participants: tenantId });
    const chatIds = chats.map(chat => chat._id);

    const viewingRequests = await Message.find({
      chatId: { $in: chatIds },
      senderId: tenantId,
      messageType: "viewing_request",
      "viewingRequest.status": "pending"
    })
    .populate("chatId")
    .populate({
      path: "chatId",
      populate: { path: "propertyId", select: "title address price images" }
    })
    .sort({ createdAt: -1 });

    const moveInRequests = await Message.find({
      chatId: { $in: chatIds },
      senderId: tenantId,
      messageType: "move_in_request",
      "moveInRequest.status": "pending"
    })
    .populate("chatId")
    .populate({
      path: "chatId",
      populate: { path: "propertyId", select: "title address price images" }
    })
    .sort({ createdAt: -1 });

    return { viewingRequests, moveInRequests };
  }

  /**
   * Archive/close chat
   */
  async archiveChat(chatId: string, userId: string): Promise<void> {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    if (!chat.participants.some(p => p.toString() === userId)) {
      throw new Error("Access denied");
    }

    chat.isActive = false;
    await chat.save();
  }

  /**
   * Send chat notification (placeholder for notification system)
   */
  private async sendChatNotification(notification: ChatNotification): Promise<void> {
    // This would integrate with your notification system
    // For now, we'll just log it
    console.log("Chat Notification:", notification);
    
    // TODO: Integrate with push notifications, email, SMS, etc.
    // Example integration:
    // await notificationService.sendPushNotification(notification.recipientId, notification.message);
    // await emailService.sendChatNotification(notification.recipientId, notification);
  }

  /**
   * Mark messages as read by a user
   */
  async markMessagesAsRead(chatId: string, messageIdsOrUserId: string[] | string, userId?: string) {
    // Handle two signatures:
    // 1. markMessagesAsRead(chatId, messageIds, userId) - mark specific messages
    // 2. markMessagesAsRead(chatId, userId) - mark all unread messages
    
    let messageIds: string[] | null = null;
    let actualUserId: string;
    
    if (Array.isArray(messageIdsOrUserId)) {
      // Signature 1: specific messages
      messageIds = messageIdsOrUserId;
      actualUserId = userId!;
    } else {
      // Signature 2: all unread messages
      actualUserId = messageIdsOrUserId;
      messageIds = null;
    }

    // Build query
    const query: any = {
      chatId: new Types.ObjectId(chatId),
      senderId: { $ne: new Types.ObjectId(actualUserId) }, // Don't mark own messages as read
      isRead: false
    };

    // If specific messageIds provided, filter by them
    if (messageIds && messageIds.length > 0) {
      query._id = { $in: messageIds.map(id => new Types.ObjectId(id)) };
    }

    const result = await Message.updateMany(
      query,
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    return {
      modifiedCount: result.modifiedCount,
      messageIds: messageIds
    };
  }

  /**
   * Admin joins a chat conversation
   */
  async adminJoinChat(chatId: string, adminId: string): Promise<IChat> {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    // Check if admin already in participants
    const adminIdStr = adminId.toString();
    const isAlreadyParticipant = chat.participants.some(p => 
      p.toString() === adminIdStr
    );

    if (isAlreadyParticipant) {
      // Already in chat, just return it
      return await Chat.findById(chatId).populate("participants", "firstName lastName email role");
    }

    // Add admin to participants
    chat.participants.push(new Types.ObjectId(adminId));
    await chat.save();

    console.log(`Admin ${adminId} joined chat ${chatId}`);

    return await Chat.findById(chatId).populate("participants", "firstName lastName email role");
  }

  /**
   * Get all chats (Admin only)
   */
  async getAllChats(page: number = 1, limit: number = 50): Promise<{ chats: IChat[], total: number }> {
    const skip = (page - 1) * limit;

    const chats = await Chat.find({ isActive: true })
      .populate("participants", "firstName lastName email role")
      .populate("propertyId", "title address images")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Chat.countDocuments({ isActive: true });

    return { chats, total };
  }

  /**
   * Get chat messages filtered by visibility
   */
  async getChatMessagesForUser(chatId: string, userId: string, userRole: string): Promise<IMessage[]> {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    // Get all messages
    const allMessages = await Message.find({ chatId })
      .populate("senderId", "firstName lastName email role")
      .sort({ createdAt: 1 });

    // Filter based on visibility
    const visibleMessages = allMessages.filter(msg => {
      // No visibility restriction - everyone sees it
      if (!msg.visibleTo || msg.visibleTo.length === 0) {
        return true;
      }

      // Admin sees everything
      if (userRole === "admin") {
        return true;
      }

      // Check if user is in visibleTo list
      const visibleToIds = msg.visibleTo.map(id => id.toString());
      return visibleToIds.includes(userId.toString());
    });

    return visibleMessages;
  }
}

export const chatService = new ChatService(); 