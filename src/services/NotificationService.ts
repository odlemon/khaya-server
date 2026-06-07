// @ts-nocheck
import { Types } from "mongoose";
import { Notification, INotification, NotificationType, INotificationData } from "../models/Notification";
import { User } from "../models/User";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: INotificationData;
}

export class NotificationService {
  async create(input: CreateNotificationInput): Promise<INotification | null> {
    const user = await User.findById(input.userId).select("_id");
    if (!user) {
      return null;
    }

    const notification = await Notification.create({
      userId: new Types.ObjectId(input.userId),
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data || {},
      read: false,
    });

    return notification;
  }

  async list(
    userId: string,
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {}
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };

    if (options.unreadOnly) {
      filter.read = false;
    }

    const [items, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({
      userId: new Types.ObjectId(userId),
      read: false,
    });
  }

  async markRead(notificationId: string, userId: string): Promise<INotification | null> {
    return Notification.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userId),
      },
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    );
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await Notification.updateMany(
      { userId: new Types.ObjectId(userId), read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    return result.modifiedCount || 0;
  }

  /**
   * Mark unread notifications tied to a chat (user opened/read messages directly).
   */
  async markReadByChatId(
    userId: string,
    chatId: string
  ): Promise<{ modifiedCount: number; notificationIds: string[] }> {
    const userOid = new Types.ObjectId(userId);

    const unread = await Notification.find({
      userId: userOid,
      read: false,
      "data.chatId": chatId,
    })
      .select("_id")
      .lean();

    if (!unread.length) {
      return { modifiedCount: 0, notificationIds: [] };
    }

    const notificationIds = unread.map((n) => n._id.toString());
    const now = new Date();

    await Notification.updateMany(
      { _id: { $in: unread.map((n) => n._id) }, userId: userOid },
      { $set: { read: true, readAt: now } }
    );

    return { modifiedCount: notificationIds.length, notificationIds };
  }
}

export const notificationService = new NotificationService();
