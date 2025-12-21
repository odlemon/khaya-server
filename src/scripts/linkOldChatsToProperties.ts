// @ts-nocheck
/**
 * Migration script to link old chats (without propertyId) to properties
 * 
 * This script:
 * 1. Finds all chats without propertyId
 * 2. Tries to link them to properties using Connections
 * 3. Reports which chats were linked and which couldn't be linked
 * 
 * Usage: ts-node src/scripts/linkOldChatsToProperties.ts
 */

import mongoose from "mongoose";
import { Chat } from "../models/Chat";
import { Connection } from "../models/Connection";
import { User } from "../models/User";
import dotenv from "dotenv";

dotenv.config();

async function linkOldChatsToProperties() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ Connected to MongoDB");

    // Find all chats without propertyId
    const chatsWithoutProperty = await Chat.find({
      $or: [
        { propertyId: { $exists: false } },
        { propertyId: null }
      ],
      isActive: true
    }).populate("participants", "role");

    console.log(`\n📊 Found ${chatsWithoutProperty.length} chats without propertyId\n`);

    if (chatsWithoutProperty.length === 0) {
      console.log("✅ All chats already have propertyId!");
      await mongoose.disconnect();
      return;
    }

    let linkedCount = 0;
    let failedCount = 0;
    const failedChats: any[] = [];

    for (const chat of chatsWithoutProperty) {
      try {
        const participants = chat.participants;
        
        // Find tenant and landlord
        let tenantId: string | null = null;
        let landlordId: string | null = null;

        for (const participant of participants) {
          const p = participant as any;
          if (p.role === 'tenant') {
            tenantId = p._id?.toString?.() || p.toString();
          } else if (p.role === 'landlord') {
            landlordId = p._id?.toString?.() || p.toString();
          }
        }

        if (!tenantId || !landlordId) {
          console.log(`⚠️  Chat ${chat._id}: Cannot determine tenant/landlord roles`);
          failedChats.push({
            chatId: chat._id,
            reason: "Cannot determine tenant/landlord roles"
          });
          failedCount++;
          continue;
        }

        // Find an accepted connection between these users
        const connection = await Connection.findOne({
          tenantId: tenantId,
          landlordId: landlordId,
          status: "accepted",
          isActive: true
        }).sort({ createdAt: -1 });

        if (connection && connection.propertyId) {
          chat.propertyId = connection.propertyId;
          await chat.save();
          console.log(`✅ Linked chat ${chat._id} to property ${connection.propertyId}`);
          linkedCount++;
        } else {
          console.log(`⚠️  Chat ${chat._id}: No accepted connection found`);
          failedChats.push({
            chatId: chat._id,
            tenantId,
            landlordId,
            reason: "No accepted connection found"
          });
          failedCount++;
        }
      } catch (error: any) {
        console.error(`❌ Error processing chat ${chat._id}:`, error.message);
        failedChats.push({
          chatId: chat._id,
          reason: `Error: ${error.message}`
        });
        failedCount++;
      }
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(50));
    console.log(`✅ Successfully linked: ${linkedCount} chats`);
    console.log(`⚠️  Failed to link: ${failedCount} chats`);
    console.log(`📝 Total processed: ${chatsWithoutProperty.length} chats`);

    if (failedChats.length > 0) {
      console.log("\n⚠️  Failed chats (may need manual linking):");
      failedChats.forEach((failed, index) => {
        console.log(`   ${index + 1}. Chat ID: ${failed.chatId}`);
        console.log(`      Reason: ${failed.reason}`);
        if (failed.tenantId && failed.landlordId) {
          console.log(`      Tenant: ${failed.tenantId}, Landlord: ${failed.landlordId}`);
        }
      });
      console.log("\n💡 Tip: Use POST /api/chat/admin/link-to-property to manually link these chats");
    }

    await mongoose.disconnect();
    console.log("\n✅ Migration completed!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the migration
linkOldChatsToProperties();



