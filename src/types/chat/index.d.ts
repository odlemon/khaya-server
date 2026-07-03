// @ts-nocheck

export interface IChat {
  _id: string;
  participants: IUser[];
  propertyId: IProperty;
  lastMessage?: {
    content: string;
    senderId: IUser;
    timestamp: Date;
  };
  isActive: boolean;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
  unreadCount?: number;
}

export interface IMessage {
  _id: string;
  chatId: string;
  senderId: IUser;
  senderRole: "landlord" | "tenant";
  messageType: "text" | "image" | "document" | "viewing_request" | "move_in_request";
  content: string;
  attachments?: IAttachment[];
  viewingRequest?: IViewingRequest;
  moveInRequest?: IMoveInRequest;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttachment {
  type: "image" | "document";
  url: string;
  filename: string;
  size: number;
}

export interface IViewingRequest {
  preferredDate: Date;
  preferredTime: string;
  alternativeDates?: Date[];
  alternativeTimes?: string[];
  message: string;
  status: "pending" | "accepted" | "rejected" | "rescheduled";
  landlordResponse?: {
    acceptedDate?: Date;
    acceptedTime?: string;
    message?: string;
    responseDate: Date;
  };
}

export interface IMoveInRequest {
  preferredMoveInDate: Date;
  tenancyDuration: number; // in months
  message: string;
  status: "pending" | "accepted" | "rejected";
  landlordResponse?: {
    acceptedMoveInDate?: Date;
    acceptedDuration?: number;
    message?: string;
    responseDate: Date;
  };
}

export interface IUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "landlord" | "tenant" | "admin";
  phone?: string;
}

export interface IProperty {
  _id: string;
  title: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  price: number;
  images?: {
    mainImage?: string;
    gallery?: string[];
  };
  landlordId?: string;
}

// Request/Response interfaces
export interface CreateChatRequest {
  propertyId: string;
  landlordId: string;
}

export interface SendMessageRequest {
  chatId: string;
  content: string;
  messageType?: "text" | "image" | "document";
  attachments?: IAttachment[];
}

export interface ViewingRequestData {
  chatId: string;
  preferredDate: string; // ISO date string
  preferredTime: string;
  alternativeDates?: string[]; // ISO date strings
  alternativeTimes?: string[];
  message: string;
}

export interface MoveInRequestData {
  chatId: string;
  preferredMoveInDate: string; // ISO date string
  tenancyDuration: number;
  message: string;
}

export interface ViewingResponseData {
  messageId: string;
  status: "accepted" | "rejected" | "rescheduled";
  acceptedDate?: string; // ISO date string
  acceptedTime?: string;
  message?: string;
}

export interface MoveInResponseData {
  messageId: string;
  status: "accepted" | "rejected";
  acceptedMoveInDate?: string; // ISO date string
  acceptedDuration?: number;
  message?: string;
}

// API Response interfaces
export interface ChatResponse {
  success: boolean;
  message: string;
  data: IChat;
}

export interface ChatsResponse {
  success: boolean;
  message: string;
  data: IChat[];
}

export interface ChatWithMessagesResponse {
  success: boolean;
  message: string;
  data: {
    chat: IChat;
    messages: IMessage[];
  };
}

export interface MessageResponse {
  success: boolean;
  message: string;
  data: IMessage;
}

export interface ViewingRequestsResponse {
  success: boolean;
  message: string;
  data: IMessage[];
}

export interface MoveInRequestsResponse {
  success: boolean;
  message: string;
  data: IMessage[];
}

export interface PendingRequestsResponse {
  success: boolean;
  message: string;
  data: {
    viewingRequests: IMessage[];
    moveInRequests: IMessage[];
  };
}

export interface ChatStatsResponse {
  success: boolean;
  message: string;
  data: {
    totalChats: number;
    unreadCount: number;
    pendingViewingRequests: number;
    pendingMoveInRequests: number;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  message: string;
  data: {
    unreadCount: number;
  };
}

// Enums
export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  DOCUMENT = "document",
  VIEWING_REQUEST = "viewing_request",
  MOVE_IN_REQUEST = "move_in_request"
}

export enum ViewingRequestStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  RESCHEDULED = "rescheduled"
}

export enum MoveInRequestStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected"
}

export enum UserRole {
  LANDLORD = "landlord",
  TENANT = "tenant",
  ADMIN = "admin"
} 