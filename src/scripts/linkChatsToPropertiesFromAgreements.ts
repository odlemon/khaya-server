// @ts-nocheck
/**
 * Migration script to link old chats (without propertyId) to properties
 * 
 * Strategy:
 * 1. Find all chats without propertyId
 * 2. For each chat between landlord and tenant:
 *    - Look for agreements between both parties
 *    - Use the propertyId from the agreement
 *    - If no agreement exists, assign the first property owned by that landlord
 * 3. Update all chats to have a propertyId
 * 
 * Usage: ts-node src/scripts/linkChatsToPropertiesFromAgreements.ts
 */

import mongoose from "mongoose";
import { Chat } from "../models/Chat";
import { Agreement } from "../models/Agreement";
import { Property } from "../models/Property";
import { User } from "../models/User";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

// Create a log file for output
const logFile = path.join(process.cwd(), "migration_log.txt");
const log = (message: string) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  try {
    fs.appendFileSync(logFile, logMessage);
  } catch (err) {
    // If file write fails, at least log to console
    console.error("Failed to write to log file:", err);
  }
};

async function linkChatsToPropertiesFromAgreements() {
  try {
    // Clear previous log
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }
    
    log("🚀 Starting migration script...");
    
    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      log("❌ ERROR: MONGODB_URI not found in environment variables");
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGODB_URI!);
    log("✅ Connected to MongoDB\n");

    // Find all chats without propertyId
    const chatsWithoutProperty = await Chat.find({
      $or: [
        { propertyId: { $exists: false } },
        { propertyId: null }
      ],
      isActive: true
    }).populate("participants", "role");

    log(`📊 Found ${chatsWithoutProperty.length} chats without propertyId\n`);

    if (chatsWithoutProperty.length === 0) {
      log("✅ All chats already have propertyId!");
      await mongoose.disconnect();
      return;
    }

    let linkedFromAgreement = 0;
    let linkedFromLandlordProperty = 0;
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
          const pId = p._id?.toString?.() || p.toString();
          
          if (p.role === 'tenant') {
            tenantId = pId;
          } else if (p.role === 'landlord') {
            landlordId = pId;
          }
        }

        if (!tenantId || !landlordId) {
          log(`⚠️  Chat ${chat._id}: Cannot determine tenant/landlord roles`);
          failedChats.push({
            chatId: chat._id,
            reason: "Cannot determine tenant/landlord roles"
          });
          failedCount++;
          continue;
        }

        // Step 1: Look for agreements between tenant and landlord
        const agreements = await Agreement.find({
          tenantId: tenantId,
          landlordId: landlordId
        }).sort({ createdAt: -1 }); // Get most recent first

        let propertyId: string | null = null;
        let linkMethod = "";

        if (agreements.length > 0) {
          // Use propertyId from the most recent agreement
          propertyId = agreements[0].propertyId?.toString?.() || agreements[0].propertyId;
          linkMethod = "agreement";
          log(`✅ Chat ${chat._id}: Found agreement, using property ${propertyId}`);
        } else {
          // Step 2: No agreement found, get first property owned by landlord
          const landlordProperties = await Property.find({
            landlordId: landlordId,
            status: { $in: ["published", "draft", "rented"] } // Include active properties
          }).sort({ createdAt: 1 }); // Get first property (oldest)

          if (landlordProperties.length > 0) {
            propertyId = landlordProperties[0]._id?.toString?.() || landlordProperties[0]._id;
            linkMethod = "landlord_first_property";
            log(`✅ Chat ${chat._id}: No agreement, using landlord's first property ${propertyId}`);
          } else {
            log(`⚠️  Chat ${chat._id}: No agreement and no properties found for landlord`);
            failedChats.push({
              chatId: chat._id,
              tenantId,
              landlordId,
              reason: "No agreement and no properties found for landlord"
            });
            failedCount++;
            continue;
          }
        }

        // Update chat with propertyId
        if (propertyId) {
          chat.propertyId = propertyId as any;
          await chat.save();
          
          if (linkMethod === "agreement") {
            linkedFromAgreement++;
          } else {
            linkedFromLandlordProperty++;
          }
        }

      } catch (error: any) {
        log(`❌ Error processing chat ${chat._id}: ${error.message}`);
        failedChats.push({
          chatId: chat._id,
          reason: `Error: ${error.message}`
        });
        failedCount++;
      }
    }

    // Verify all chats now have propertyId
    const remainingChatsWithoutProperty = await Chat.countDocuments({
      $or: [
        { propertyId: { $exists: false } },
        { propertyId: null }
      ],
      isActive: true
    });

    // Summary
    log("\n" + "=".repeat(60));
    log("📊 MIGRATION SUMMARY");
    log("=".repeat(60));
    log(`✅ Linked from agreements: ${linkedFromAgreement} chats`);
    log(`✅ Linked from landlord's first property: ${linkedFromLandlordProperty} chats`);
    log(`⚠️  Failed to link: ${failedCount} chats`);
    log(`📝 Total processed: ${chatsWithoutProperty.length} chats`);
    log(`\n🔍 Verification:`);
    log(`   Chats still without propertyId: ${remainingChatsWithoutProperty}`);

    if (remainingChatsWithoutProperty === 0) {
      log(`\n✅ SUCCESS: All chats now have a propertyId!`);
    } else {
      log(`\n⚠️  WARNING: ${remainingChatsWithoutProperty} chats still don't have propertyId`);
    }

    if (failedChats.length > 0) {
      log("\n⚠️  Failed chats (need manual review):");
      failedChats.forEach((failed, index) => {
        log(`   ${index + 1}. Chat ID: ${failed.chatId}`);
        log(`      Reason: ${failed.reason}`);
        if (failed.tenantId && failed.landlordId) {
          log(`      Tenant: ${failed.tenantId}, Landlord: ${failed.landlordId}`);
        }
      });
    }

    await mongoose.disconnect();
    log("\n✅ Migration completed!");
    log(`\n📄 Full log saved to: ${logFile}`);
  } catch (error: any) {
    log(`❌ Migration failed: ${error.message}`);
    log(`Stack: ${error.stack}`);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the migration
linkChatsToPropertiesFromAgreements();


