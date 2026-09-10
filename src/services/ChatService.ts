// @ts-nocheck
import { Chat, IChat, Message, IMessage } from "../models/Chat";
import { User } from "../models/User";
import { Property } from "../models/Property";
import { Types } from "mongoose";
import { Connection } from "../models/Connection";
import { parseMessageMentions } from "../utils/messageParser";
import { chatNotificationService } from "./ChatNotificationService";
import { resolveTaggedRecipientUserIds } from "../utils/taggedMessageRecipients";
import {
  isMessageReadByUser,
  unreadMessagesFilterForUser,
} from "../utils/messageReadStatus";
import { archiveInactiveChats, purgeOrphanMessages, purgeOrphanChatNotifications } from "./ChatRetentionService";

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
  /** @deprecated use messageContent — kept for callers that still pass summary text */
  message?: string;
  messageContent?: string;
  messageType?: string;
  landlordId?: string;
  data?: any;
}

export class ChatService {

  /**
   * Get or create chat between tenant and landlord for a property
   * 
   * IMPORTANT: Each chat is tied to exactly ONE property.
   * - One chat = One property (enforced at database level)
   * - If a landlord has multiple properties, they will have separate chats for each property
   * - The propertyId is required and unique per chat
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

    // Reuse existing chat (including archived) for same tenant + landlord + property
    let chat = await Chat.findOne({
      participants: { $all: [tenantIdStr, landlordIdStr] },
      propertyId: propertyIdStr,
    })
    .populate("participants", "firstName lastName email role profile.avatar")
    .populate("propertyId", "title address price serviceFeePayer images propertyType status bedrooms bathrooms landlordId");

    if (chat && !chat.isActive) {
      chat.isActive = true;
      chat.archivedAt = undefined;
      await chat.save();
    }

    if (!chat) {
      // Create new chat
      chat = new Chat({
        participants: [tenantIdStr, landlordIdStr],
        propertyId: propertyIdStr,
        isActive: true,
        lastActivityAt: new Date(),
      });
      await chat.save();
      await chat.populate("participants", "firstName lastName email role profile.avatar");
      await chat.populate("propertyId", "title address price serviceFeePayer images propertyType status bedrooms bathrooms landlordId");
      
      console.log('✅ Chat created successfully:', {
        chatId: chat._id,
        participants: chat.participants.map(p => p?.toString?.()),
        propertyId: propertyIdStr
      });
    }

    return chat;
  }

  /**
   * Open a support conversation between a staff member and a tenant or landlord.
   *
   * getOrCreateChat cannot be reused: it demands an accepted Connection for a
   * tenant/landlord/property triple, and support staff are party to no such
   * connection. The chat is still tied to a property — support always starts
   * from a specific rented unit — so it stays the shape every read path expects
   * and shows up in the recipient's list like any other conversation.
   */
  async startSupportChat(staffId: any, targetUserId: any, propertyId: any): Promise<IChat> {
    const staffIdStr = staffId?.toString?.() || staffId;
    const targetIdStr = targetUserId?.toString?.() || targetUserId;
    const propertyIdStr = propertyId?.toString?.() || propertyId;

    if (!staffIdStr || !targetIdStr || !propertyIdStr) {
      throw new Error("Staff, recipient and property are all required");
    }
    if (staffIdStr === targetIdStr) {
      throw new Error("Cannot start a support chat with yourself");
    }

    const target = await User.findById(targetIdStr).select("_id role");
    if (!target) {
      throw new Error("Recipient not found");
    }

    let chat = await Chat.findOne({
      participants: { $all: [staffIdStr, targetIdStr] },
      propertyId: propertyIdStr,
    })
      .populate("participants", "firstName lastName email role profile.avatar")
      .populate("propertyId", "title address price serviceFeePayer images propertyType status bedrooms bathrooms landlordId");

    if (chat && !chat.isActive) {
      chat.isActive = true;
      chat.archivedAt = undefined;
      await chat.save();
    }

    if (!chat) {
      chat = new Chat({
        participants: [staffIdStr, targetIdStr],
        propertyId: propertyIdStr,
        isActive: true,
        lastActivityAt: new Date(),
      });
      await chat.save();
      await chat.populate("participants", "firstName lastName email role profile.avatar");
      await chat.populate(
        "propertyId",
        "title address price serviceFeePayer images propertyType status bedrooms bathrooms landlordId"
      );
      console.log(`✅ Support chat opened: staff ${staffIdStr} → user ${targetIdStr}`);
    }

    return chat;
  }

  /**
   * Get user's chats (both as tenant and landlord)
   * Handles old chats without propertyId by attempting to link them via Connections
   */
  async getUserChats(userId: string, userRole: string, status: "active" | "archived" = "active"): Promise<any[]> {
    archiveInactiveChats().catch((err) => {
      console.error("Background chat archive job failed:", err.message || err);
    });
    purgeOrphanMessages().catch((err) => {
      console.error("Background orphan message purge failed:", err.message || err);
    });
    purgeOrphanChatNotifications().catch((err) => {
      console.error("Background orphan chat notification purge failed:", err.message || err);
    });

    const isArchived = status === "archived";

    const chats = await Chat.find({
      participants: userId,
      isActive: !isArchived
    })
    .populate("participants", "firstName lastName email role profile.avatar")
    .populate("propertyId", "title address price serviceFeePayer images propertyType status bedrooms bathrooms landlordId")
    .populate("lastMessage.senderId", "firstName lastName profile.avatar")
    .sort({ "lastMessage.timestamp": -1, updatedAt: -1 });

    // Try to link old chats without propertyId (in background, don't block response)
    const linkPromises = chats
      .filter(chat => !chat.propertyId || !chat.propertyId._id)
      .map(chat => this.tryLinkChatToProperty(chat).catch(err => {
        console.error(`Error linking chat ${chat._id}:`, err);
        return false;
      }));
    
    // Don't await - let it run in background
    Promise.all(linkPromises).catch(() => {}); // Silently handle errors

    return this.attachUnreadCounts(chats, userId);
  }

  /**
   * Get chat by ID with messages
   * All chats should now have propertyId after migration
   */
  async getChatById(chatId: string, userId: string): Promise<{ chat: IChat; messages: IMessage[] }> {
    const chat = await Chat.findById(chatId)
      .populate("participants", "firstName lastName email role profile.avatar")
      .populate("propertyId", "title address price serviceFeePayer images propertyType status bedrooms bathrooms landlordId");

    if (!chat) {
      throw new Error("Chat not found");
    }

    // Verify user is participant (normalize both sides to string)
    if (!chat.participants.some((p: any) => p._id?.toString?.() === userId?.toString())) {
      throw new Error("Access denied");
    }

    // Ensure property data is populated (in case it wasn't populated properly)
    if (chat.propertyId && !chat.propertyId._id && typeof chat.propertyId === 'object') {
      // PropertyId exists but might not be populated, re-populate it
      await chat.populate("propertyId", "title address price serviceFeePayer images propertyType status bedrooms bathrooms landlordId");
    }

    const messages = await Message.find({ chatId })
      .populate("senderId", "firstName lastName email role profile.avatar")
      .sort({ createdAt: 1 });

    return { chat, messages };
  }

  /**
   * Send a message
   */
  async sendMessage(data: CreateMessageData): Promise<IMessage> {
    const { chatId, senderId, senderRole, messageType = "text", content, attachments } = data;

    // Verify chat exists and user is participant
    const chat = await Chat.findById(chatId).populate("participants", "firstName lastName role");
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

    // Unarchive on new message
    if (!chat.isActive) {
      chat.isActive = true;
      chat.archivedAt = undefined;
    }

    // Parse message for @mentions (any user can tag)
    let visibleTo: any[] = [];
    let taggedUser: "landlord" | "tenant" | "admin" | null = null;

    const parsed = parseMessageMentions(content);
    let privateRecipientIds: string[] = [];

    if (parsed.hasTag && parsed.taggedUser) {
      taggedUser = parsed.taggedUser;
      privateRecipientIds = await resolveTaggedRecipientUserIds(
        chat.participants,
        parsed.taggedUser,
        senderIdStr
      );

      if (privateRecipientIds.length) {
        visibleTo = [senderIdStr, ...privateRecipientIds];
        console.log(
          `${senderRole} tagged @${parsed.taggedUser}. Private to:`,
          visibleTo
        );
      }
    }
    // No tag — visible to all participants (empty visibleTo)

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

    const isPrivate = visibleTo.length > 0;
    const recipientIds = new Set<string>();

    if (isPrivate) {
      // @mention — notify ONLY the tagged party (not sender, not other participants)
      for (const recipientId of privateRecipientIds) {
        recipientIds.add(recipientId);
      }
    } else {
      // Public — notify other participants only (exclude admins unless @admin tagged).
      for (const p of chat.participants) {
        const pId = p._id?.toString?.() || p.toString();
        if (pId === senderIdStr) continue;
        if (p.role === "admin") continue;
        recipientIds.add(pId);
      }
    }

    const notificationType =
      messageType === "viewing_request"
        ? "viewing_request"
        : messageType === "move_in_request"
        ? "move_in_request"
        : "new_message";

    recipientIds.delete(senderIdStr);

    const landlordParticipant = chat.participants.find(
      (p: any) => p?.role === "landlord"
    );
    const landlordId =
      landlordParticipant?._id?.toString?.() ||
      landlordParticipant?.toString?.() ||
      "";

    console.log(
      `[REALTIME] notifying ${recipientIds.size} recipient(s) | chatId=${chatId} private=${isPrivate}${isPrivate && taggedUser ? ` tag=@${taggedUser}` : ""}`
    );

    for (const recipientId of recipientIds) {
      await this.sendChatNotification({
        type: notificationType,
        recipientId,
        senderId: senderId,
        chatId: chatId,
        propertyId: chat.propertyId?.toString?.() || String(chat.propertyId),
        messageContent: content,
        messageType,
        landlordId,
        data: {
          messageId: message._id,
          isPrivate: visibleTo.length > 0,
          landlordId,
        },
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

    return responseMessage;
  }

  /**
   * Get unread message count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const chatIds = await Chat.find({ participants: userId }).distinct("_id");
    if (!chatIds.length) {
      return 0;
    }

    const count = await Message.countDocuments({
      chatId: { $in: chatIds },
      ...unreadMessagesFilterForUser(userId),
    });
    return count;
  }

  /**
   * Attach per-viewer unreadCount to a list of chats.
   */
  async attachUnreadCounts(chats: any[], viewerUserId: string): Promise<any[]> {
    const chatIds = chats.map((c) => c._id);
    if (!chatIds.length) {
      return [];
    }

    const unreadAgg = await Message.aggregate([
      {
        $match: {
          chatId: { $in: chatIds },
          ...unreadMessagesFilterForUser(viewerUserId),
        },
      },
      { $group: { _id: "$chatId", count: { $sum: 1 } } },
    ]);

    const unreadMap = new Map<string, number>();
    unreadAgg.forEach((row: any) => {
      unreadMap.set(row._id.toString(), row.count);
    });

    return chats.map((chat: any) => {
      const obj = chat.toObject ? chat.toObject() : { ...chat };
      obj.unreadCount = unreadMap.get(chat._id.toString()) || 0;
      return obj;
    });
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
      populate: { path: "propertyId", select: "title address price serviceFeePayer images propertyType status bedrooms bathrooms landlordId" }
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
      populate: { path: "propertyId", select: "title address price serviceFeePayer images propertyType status bedrooms bathrooms landlordId" }
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
      populate: { path: "propertyId", select: "title address price serviceFeePayer images propertyType status bedrooms bathrooms landlordId" }
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
      populate: { path: "propertyId", select: "title address price serviceFeePayer images propertyType status bedrooms bathrooms landlordId" }
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
    chat.archivedAt = new Date();
    await chat.save();
  }

  /**
   * Send chat notification (placeholder for notification system)
   */
  private async sendChatNotification(notification: ChatNotification): Promise<void> {
    try {
      await chatNotificationService.dispatch(notification);
    } catch (error: any) {
      console.error("Chat notification dispatch failed:", error.message || error);
    }
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

    const userOid = new Types.ObjectId(actualUserId);

    const query: any = {
      chatId: new Types.ObjectId(chatId),
      senderId: { $ne: userOid },
      readBy: { $nin: [userOid] },
    };

    if (messageIds && messageIds.length > 0) {
      query._id = { $in: messageIds.map((id) => new Types.ObjectId(id)) };
    }

    const result = await Message.updateMany(query, {
      $addToSet: { readBy: userOid },
      $set: { readAt: new Date() },
    });

    return {
      modifiedCount: result.modifiedCount,
      messageIds: messageIds || [],
      readBy: actualUserId,
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
      return await Chat.findById(chatId)
        .populate("participants", "firstName lastName email role")
        .populate("propertyId", "title address price serviceFeePayer images propertyType status bedrooms bathrooms landlordId");
    }

    // Add admin to participants (only if not already present)
    const adminObjectId = new Types.ObjectId(adminId);
    if (!chat.participants.some(p => p.toString() === adminIdStr)) {
      chat.participants.push(adminObjectId);
      await chat.save();
      console.log(`Admin ${adminId} joined chat ${chatId}`);
    }

    // Clean up any duplicate participants before returning
    const uniqueParticipants = [...new Set(chat.participants.map(p => p.toString()))];
    if (uniqueParticipants.length !== chat.participants.length) {
      chat.participants = uniqueParticipants.map(id => new Types.ObjectId(id));
      await chat.save();
      console.log(`Cleaned up duplicate participants in chat ${chatId}`);
    }

    return await Chat.findById(chatId)
      .populate("participants", "firstName lastName email role")
      .populate("propertyId", "title address price serviceFeePayer images propertyType status bedrooms bathrooms landlordId");
  }

  /**
   * Clean up duplicate participants in all chats (Admin only)
   */
  async cleanupDuplicateParticipants(): Promise<{ cleanedChats: number }> {
    const chats = await Chat.find({ isActive: true });
    let cleanedChats = 0;

    for (const chat of chats) {
      const uniqueParticipants = [...new Set(chat.participants.map(p => p.toString()))];
      if (uniqueParticipants.length !== chat.participants.length) {
        chat.participants = uniqueParticipants.map(id => new Types.ObjectId(id));
        await chat.save();
        cleanedChats++;
        console.log(`Cleaned up duplicate participants in chat ${chat._id}`);
      }
    }

    return { cleanedChats };
  }

  /**
   * Get all chats (Admin only)
   */
  async getAllChats(
    page: number = 1,
    limit: number = 50,
    viewerUserId?: string
  ): Promise<{ chats: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const chats = await Chat.find({ isActive: true })
      .populate("participants", "firstName lastName email role")
      .populate("propertyId", "title address images propertyType status bedrooms bathrooms price serviceFeePayer landlordId")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Chat.countDocuments({ isActive: true });

    const chatsWithUnread = viewerUserId
      ? await this.attachUnreadCounts(chats, viewerUserId)
      : chats.map((c) => (c.toObject ? c.toObject() : c));

    return { chats: chatsWithUnread, total };
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
      .populate("senderId", "firstName lastName email role profile.avatar")
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

  /**
   * Try to link an old chat (without propertyId) to a property using Connections
   * This is a helper method for migrating old chats
   */
  private async tryLinkChatToProperty(chat: any): Promise<boolean> {
    try {
      const participants = chat.participants.map((p: any) => p._id?.toString?.() || p.toString());
      
      // Find tenant and landlord by role
      let tenantId: string | null = null;
      let landlordId: string | null = null;

      for (const participant of chat.participants) {
        const pId = participant._id?.toString?.() || participant.toString();
        if ((participant as any).role === 'tenant') {
          tenantId = pId;
        } else if ((participant as any).role === 'landlord') {
          landlordId = pId;
        }
      }

      if (!tenantId || !landlordId) {
        console.log(`⚠️ Cannot link chat ${chat._id}: Missing tenant or landlord`);
        return false;
      }

      // Find an accepted connection between these users
      const connection = await Connection.findOne({
        tenantId: tenantId,
        landlordId: landlordId,
        status: "accepted",
        isActive: true
      }).sort({ createdAt: -1 }); // Get most recent connection

      if (connection && connection.propertyId) {
        console.log(`✅ Linking chat ${chat._id} to property ${connection.propertyId}`);
        chat.propertyId = connection.propertyId;
        await chat.save();
        return true;
      } else {
        console.log(`⚠️ No connection found for chat ${chat._id}`);
        return false;
      }
    } catch (error) {
      console.error(`Error linking chat ${chat._id} to property:`, error);
      return false;
    }
  }

  /**
   * Manually link a chat to a property (for admin/migration purposes)
   */
  async linkChatToProperty(chatId: string, propertyId: string): Promise<IChat> {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    // Verify property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      throw new Error("Property not found");
    }

    chat.propertyId = propertyId as any;
    await chat.save();
    await chat.populate("propertyId", "title address price serviceFeePayer images propertyType status bedrooms bathrooms landlordId");
    await chat.populate("participants", "firstName lastName email role profile.avatar");

    console.log(`✅ Chat ${chatId} linked to property ${propertyId}`);
    return chat;
  }
}

export const chatService = new ChatService(); 