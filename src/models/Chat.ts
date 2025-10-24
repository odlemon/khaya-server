// @ts-nocheck
import mongoose, { Schema, Document } from "mongoose";

export interface IChat extends Document {
  participants: mongoose.Types.ObjectId[];
  propertyId: mongoose.Types.ObjectId;
  lastMessage?: {
    content: string;
    senderId: mongoose.Types.ObjectId;
    timestamp: Date;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderRole: "landlord" | "tenant" | "admin";
  messageType: "text" | "image" | "document" | "viewing_request" | "move_in_request";
  content: string;
  // For private messages: who can see this message
  visibleTo?: mongoose.Types.ObjectId[]; // If empty/null, visible to all participants
  taggedUser?: "landlord" | "tenant" | "admin"; // Who was tagged (@landlord, @tenant, or @admin)
  attachments?: {
    type: "image" | "document";
    url: string;
    filename: string;
    size: number;
  }[];
  viewingRequest?: {
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
  };
  moveInRequest?: {
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
  };
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  }],
  propertyId: {
    type: Schema.Types.ObjectId,
    ref: "Property",
    required: true
  },
  lastMessage: {
    content: String,
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    timestamp: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const messageSchema = new Schema<IMessage>({
  chatId: {
    type: Schema.Types.ObjectId,
    ref: "Chat",
    required: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  senderRole: {
    type: String,
    enum: ["landlord", "tenant", "admin"],
    required: true
  },
  messageType: {
    type: String,
    enum: ["text", "image", "document", "viewing_request", "move_in_request"],
    default: "text"
  },
  content: {
    type: String,
    required: true
  },
  // For admin private messages
  visibleTo: [{
    type: Schema.Types.ObjectId,
    ref: "User"
  }],
  taggedUser: {
    type: String,
    enum: ["landlord", "tenant", "admin"]
  },
  attachments: [{
    type: {
      type: String,
      enum: ["image", "document"]
    },
    url: String,
    filename: String,
    size: Number
  }],
  viewingRequest: {
    preferredDate: Date,
    preferredTime: String,
    alternativeDates: [Date],
    alternativeTimes: [String],
    message: String,
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "rescheduled"],
      default: "pending"
    },
    landlordResponse: {
      acceptedDate: Date,
      acceptedTime: String,
      message: String,
      responseDate: {
        type: Date,
        default: Date.now
      }
    }
  },
  moveInRequest: {
    preferredMoveInDate: Date,
    tenancyDuration: Number,
    message: String,
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending"
    },
    landlordResponse: {
      acceptedMoveInDate: Date,
      acceptedDuration: Number,
      message: String,
      responseDate: {
        type: Date,
        default: Date.now
      }
    }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date
}, {
  timestamps: true
});

// Indexes for better performance
chatSchema.index({ participants: 1 });
chatSchema.index({ propertyId: 1 });
chatSchema.index({ "lastMessage.timestamp": -1 });

messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ isRead: 1 });

// Virtual for unread message count
chatSchema.virtual("unreadCount", {
  ref: "Message",
  localField: "_id",
  foreignField: "chatId",
  count: true,
  match: { isRead: false }
});

// Pre-save middleware to update last message
chatSchema.pre("save", function(next) {
  if (this.isModified("lastMessage")) {
    this.updatedAt = new Date();
  }
  next();
});

export const Chat = mongoose.model<IChat>("Chat", chatSchema);
export const Message = mongoose.model<IMessage>("Message", messageSchema); 