// @ts-nocheck
import { Types } from "mongoose";
import { DeviceToken, IDeviceToken } from "../models/DeviceToken";

class PushTokenService {
  async upsertToken(
    userId: string,
    token: string,
    platform: "android" | "ios" = "android"
  ): Promise<IDeviceToken> {
    const trimmed = token.trim();
    if (!trimmed) {
      throw new Error("FCM token is required");
    }

    const doc = await DeviceToken.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), token: trimmed },
      {
        $set: { platform, updatedAt: new Date() },
        $setOnInsert: { userId: new Types.ObjectId(userId), token: trimmed },
      },
      { upsert: true, new: true }
    );

    return doc;
  }

  async removeToken(userId: string, token: string): Promise<boolean> {
    const result = await DeviceToken.deleteOne({
      userId: new Types.ObjectId(userId),
      token: token.trim(),
    });
    return (result.deletedCount ?? 0) > 0;
  }

  async removeTokenByValue(token: string): Promise<boolean> {
    const result = await DeviceToken.deleteOne({ token: token.trim() });
    return (result.deletedCount ?? 0) > 0;
  }

  async getTokensForUser(
    userId: string,
    platform?: "android" | "ios"
  ): Promise<IDeviceToken[]> {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (platform) {
      filter.platform = platform;
    }
    return DeviceToken.find(filter).lean();
  }
}

export const pushTokenService = new PushTokenService();
