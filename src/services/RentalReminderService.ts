// @ts-nocheck
import { Payment } from "../models/Payment";
import { RentalReminder } from "../models/RentalReminder";
import { Rental } from "../models/Rental";
import { Property } from "../models/Property";
import { User } from "../models/User";
import { Invoice } from "../models/Invoice";
import { emailNotificationService } from "./EmailNotificationService";
import { invoiceService } from "./InvoiceService";
import { Types } from "mongoose";
import { logger } from "../utils/logger";
import { TEST_MODE, daysToMinutes, addDays, addMonths } from "../config/testMode";

export class RentalReminderService {
  /**
   * Check for upcoming payments and send reminders
   * This should be called daily via cron job
   */
  async checkAndSendReminders(): Promise<void> {
    try {
      const now = new Date();
      logger.info("🔄 ========================================");
      logger.info("🔄 RENTAL REMINDER CRON JOB STARTED");
      logger.info(`🔄 Current Time: ${now.toISOString()}`);
      logger.info(`🔄 Test Mode: ${TEST_MODE ? 'ENABLED (7 days = 4 minutes)' : 'DISABLED (normal days)'}`);
      logger.info("🔄 Checking for upcoming rent payments that need reminders...");

      // DEBUG: Check all pending payments first
      const allPendingPayments = await Payment.find({
        status: "pending",
        paymentType: "rent"
      }).select("_id dueDate amount rentalId tenantId").limit(10);
      
      logger.info(`🔍 DEBUG: Found ${allPendingPayments.length} total pending rent payments in database`);
      if (allPendingPayments.length > 0) {
        logger.info(`🔍 DEBUG: Pending Payment Details:`);
        allPendingPayments.forEach((p, idx) => {
          const dueDate = new Date(p.dueDate);
          const minutesUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60);
          logger.info(`   ${idx + 1}. Payment ID: ${p._id}`);
          logger.info(`      Due Date: ${dueDate.toISOString()}`);
          logger.info(`      Minutes Until Due: ${minutesUntilDue.toFixed(2)}`);
          logger.info(`      Amount: K${p.amount}`);
        });
      }

      // In test mode: Get ALL pending payments and filter by calculated "test days"
      // In production: look ahead 30 days
      let upcomingPayments;
      
      if (TEST_MODE) {
        // Test mode: Get all pending payments, we'll filter by test timing logic
        logger.info(`🔄 Test Mode: Fetching ALL pending rent payments (will filter by test timing)`);
        upcomingPayments = await Payment.find({
          status: "pending",
          paymentType: "rent"
        })
          .populate({
            path: "rentalId",
            select: "propertyId landlordId tenantId",
            populate: [
              { path: "propertyId", select: "title address" },
              { path: "landlordId", select: "firstName lastName email" },
              { path: "tenantId", select: "firstName lastName email" }
            ]
          })
          .populate("propertyId", "title address")
          .populate("tenantId", "firstName lastName email")
          .populate("landlordId", "firstName lastName email");
      } else {
        // Production mode: Normal date-based filtering
        const searchWindow = (() => {
          const date = new Date(now);
          date.setDate(date.getDate() + 30);
          return date;
        })();
        
        const overdueWindow = (() => {
          const date = new Date(now);
          date.setDate(date.getDate() - 7);
          return date;
        })();
        
        logger.info(`🔄 Production Mode: Looking for payments due between ${overdueWindow.toISOString()} and ${searchWindow.toISOString()}`);
        
        upcomingPayments = await Payment.find({
          status: "pending",
          dueDate: {
            $gte: overdueWindow,
            $lte: searchWindow
          },
          paymentType: "rent"
        })
          .populate({
            path: "rentalId",
            select: "propertyId landlordId tenantId",
            populate: [
              { path: "propertyId", select: "title address" },
              { path: "landlordId", select: "firstName lastName email" },
              { path: "tenantId", select: "firstName lastName email" }
            ]
          })
          .populate("propertyId", "title address")
          .populate("tenantId", "firstName lastName email")
          .populate("landlordId", "firstName lastName email");
      }

      // In test mode: Filter payments by test timing (only process those within test window)
      if (TEST_MODE) {
        const filteredPayments = [];
        for (const payment of upcomingPayments) {
          const daysUntilDue = this.calculateDaysUntilDue(payment.dueDate);
          // Only include payments that are:
          // - Due within next 1 month (10 minutes) = daysUntilDue <= 17 (10 min / 0.57 min per day)
          // - Or overdue within last 7 days (4 minutes) = daysUntilDue >= -7
          if (daysUntilDue <= 17 && daysUntilDue >= -7) {
            filteredPayments.push(payment);
          }
        }
        upcomingPayments = filteredPayments;
        logger.info(`📊 Test Mode: Filtered to ${upcomingPayments.length} payments within test window (out of ${allPendingPayments.length} total)`);
      } else {
        logger.info(`📊 Found ${upcomingPayments.length} upcoming rent payments`);
      }
      
      if (upcomingPayments.length > 0) {
        logger.info(`📊 Payment Details:`);
        upcomingPayments.forEach((p, idx) => {
          logger.info(`   ${idx + 1}. Payment ID: ${p._id}, Due: ${p.dueDate?.toISOString()}, Amount: K${p.amount}`);
        });
      }

      let remindersSent = 0;
      let remindersSkipped = 0;

      for (const payment of upcomingPayments) {
        if (!payment.dueDate || !payment.rentalId || !payment.tenantId) {
          logger.warn(`⚠️  Skipping payment ${payment._id}: missing required data`);
          continue;
        }

        const daysUntilDue = this.calculateDaysUntilDue(payment.dueDate);
        const reminderTypes = this.getReminderTypesForDays(daysUntilDue);
        
        logger.info(`📋 Processing Payment ${payment._id}:`);
        logger.info(`   - Due Date: ${payment.dueDate.toISOString()}`);
        logger.info(`   - Days Until Due: ${daysUntilDue} ${TEST_MODE ? '(minutes in test mode)' : '(days)'}`);
        logger.info(`   - Reminder Types to Check: ${reminderTypes.length > 0 ? reminderTypes.join(', ') : 'none'}`);

        for (const reminderType of reminderTypes) {
          logger.info(`   🔔 Checking ${reminderType} reminder...`);
          
          // Check if reminder already sent
          const existingReminder = await RentalReminder.findOne({
            paymentId: payment._id,
            reminderType
          });

          if (existingReminder) {
            logger.info(`   ⏭️  ${reminderType} reminder already sent at ${existingReminder.sentAt.toISOString()}, skipping`);
            remindersSkipped++;
            continue;
          }
          
          logger.info(`   ✅ ${reminderType} reminder needs to be sent`);

          // Check if invoice exists for this payment (from previous reminder)
          let invoiceId = null;
          const existingInvoice = await Invoice.findOne({ paymentId: payment._id });
          
          // If this is the first reminder (7_days), create invoice
          if (reminderType === "7_days" && !existingInvoice) {
            logger.info(`   📄 Creating invoice for payment ${payment._id} (first reminder)`);
            try {
              const invoice = await invoiceService.generateInvoiceForPayment(
                payment._id.toString(),
                payment.tenantId.toString()
              );
              // Find the created invoice to get its ID
              const createdInvoice = await Invoice.findOne({ invoiceNumber: invoice.invoiceNumber });
              if (createdInvoice) {
                invoiceId = createdInvoice._id;
                logger.info(`   ✅ Invoice created: ${invoice.invoiceNumber} (ID: ${invoiceId})`);
              }
            } catch (error: any) {
              logger.error(`   ❌ Failed to create invoice for payment ${payment._id}:`, error.message);
              // Continue with reminder even if invoice creation fails
            }
          } else if (existingInvoice) {
            // Use existing invoice for subsequent reminders
            invoiceId = existingInvoice._id;
            logger.info(`   📄 Using existing invoice: ${existingInvoice.invoiceNumber} (ID: ${invoiceId})`);
          }

          // Send reminder
          try {
            logger.info(`   📧 Sending ${reminderType} reminder email...`);
            await this.sendReminderEmail(payment, reminderType, daysUntilDue);
            logger.info(`   ✅ Email sent successfully`);
            
            // Create reminder record with invoice ID
            logger.info(`   💾 Creating reminder record...`);
            await RentalReminder.create({
              rentalId: payment.rentalId,
              tenantId: payment.tenantId,
              paymentId: payment._id,
              invoiceId: invoiceId,
              reminderType,
              dueDate: payment.dueDate,
              sentAt: new Date(),
              status: "sent"
            });
            logger.info(`   ✅ Reminder record created`);

            // Update payment reminders array
            if (!payment.reminders) {
              payment.reminders = [];
            }
            payment.reminders.push({
              sentAt: new Date(),
              type: "email",
              status: "sent"
            });
            await payment.save();

            remindersSent++;
            logger.info(`   ✅ ${reminderType} reminder COMPLETE for payment ${payment._id}${invoiceId ? ` (invoice: ${invoiceId})` : ''}`);
          } catch (error: any) {
            logger.error(`   ❌ Failed to send ${reminderType} reminder for payment ${payment._id}:`, error.message);
            
            // Create reminder record with failed status
            await RentalReminder.create({
              rentalId: payment.rentalId,
              tenantId: payment.tenantId,
              paymentId: payment._id,
              invoiceId: invoiceId,
              reminderType,
              dueDate: payment.dueDate,
              sentAt: new Date(),
              status: "pending" // Mark as pending if email failed
            });
          }
        }
      }

      logger.info("🔄 ========================================");
      logger.info(`✅ REMINDER CHECK COMPLETE`);
      logger.info(`   - Reminders Sent: ${remindersSent}`);
      logger.info(`   - Reminders Skipped: ${remindersSkipped}`);
      logger.info(`   - Total Payments Processed: ${upcomingPayments.length}`);
      logger.info("🔄 ========================================");
    } catch (error: any) {
      logger.error("❌ ========================================");
      logger.error("❌ ERROR IN REMINDER CHECK");
      logger.error(`❌ Error: ${error.message}`);
      logger.error(`❌ Stack: ${error.stack}`);
      logger.error("❌ ========================================");
      throw error;
    }
  }

  /**
   * Send reminder email to tenant
   */
  private async sendReminderEmail(
    payment: any,
    reminderType: "7_days" | "3_days" | "1_day",
    daysUntilDue: number
  ): Promise<void> {
    const tenant = payment.tenantId;
    const property = payment.propertyId;
    const landlord = payment.landlordId;

    if (!tenant || !property) {
      throw new Error("Missing tenant or property data for reminder");
    }

    const propertyAddress = property.address
      ? `${property.address.street || ""}, ${property.address.city || ""}`.trim()
      : property.title || "Your rental property";

    await emailNotificationService.sendRentReminder({
      tenantEmail: tenant.email,
      tenantName: `${tenant.firstName} ${tenant.lastName}`,
      propertyAddress,
      rentAmount: payment.amount,
      dueDate: payment.dueDate,
      daysUntilDue,
      reminderType
    });
  }

  /**
   * Calculate days until due date
   * In test mode: uses minutes (7 days = 4 minutes, 3 days = ~1.7 minutes, 1 day = ~0.57 minutes)
   * In production: uses actual days
   */
  private calculateDaysUntilDue(dueDate: Date): number {
    const now = new Date();
    let due = new Date(dueDate);
    
    if (TEST_MODE) {
      // Test mode: If payment is due more than 1 hour in the future, normalize it to 10 minutes (1 month)
      // This handles cases where agreements were created with real future dates
      const diffTime = due.getTime() - now.getTime();
      const diffMinutes = diffTime / (1000 * 60);
      const oneHourInMinutes = 60;
      
      if (diffMinutes > oneHourInMinutes) {
        // Payment is way in the future - normalize to 10 minutes (1 month in test mode)
        logger.info(`   ⚠️  Test Mode: Payment due date ${due.toISOString()} is ${diffMinutes.toFixed(2)} minutes away (too far)`);
        logger.info(`   📅 Normalizing to: 10 minutes from now (1 month in test mode)`);
        due = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now
      }
      
      // Calculate minutes and convert to "days" for comparison
      const normalizedDiffTime = due.getTime() - now.getTime();
      const normalizedDiffMinutes = normalizedDiffTime / (1000 * 60);
      
      // Convert minutes to "days" using test ratio (7 days = 4 minutes)
      // So 1 "day" = 4/7 minutes ≈ 0.57 minutes
      const minutesPerDay = 4 / 7;
      const daysUntilDue = Math.ceil(normalizedDiffMinutes / minutesPerDay);
      
      // Return negative values for overdue payments (don't clamp to 0)
      return daysUntilDue;
    }
    
    // Production mode: normal day calculation
    now.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Get which reminder types should be sent based on days until due
   * In test mode: 7 days = 4 minutes, 3 days = ~1.7 minutes, 1 day = ~0.57 minutes
   */
  private getReminderTypesForDays(daysUntilDue: number): Array<"7_days" | "3_days" | "1_day"> {
    const types: Array<"7_days" | "3_days" | "1_day"> = [];

    if (TEST_MODE) {
      // Test mode: 
      // - 7-day reminder: payment due in ~4 minutes (7 days = 4 minutes)
      // - 3-day reminder: payment due in ~1.7 minutes (3 days = 1.7 minutes)
      // - 1-day reminder: payment due in ~0.57 minutes (1 day = 0.57 minutes)
      // Allow some flexibility for timing (±0.5 minutes)
      // Also send reminders for overdue payments (negative daysUntilDue)
      if (daysUntilDue >= 6 && daysUntilDue <= 8) {  // ~4 minutes before (7 days)
        types.push("7_days");
      } else if (daysUntilDue >= 1.5 && daysUntilDue <= 2.5) {  // ~1.7 minutes before (3 days)
        types.push("3_days");
      } else if (daysUntilDue >= -1 && daysUntilDue <= 1) {  // ~0.57 minutes before/after (1 day) - include overdue
        types.push("1_day");
      } else if (daysUntilDue < -1 && daysUntilDue >= -7) {  // Overdue but within 7 days - send 1_day reminder
        types.push("1_day");
      }
    } else {
      // Production mode: exact day matching
      if (daysUntilDue === 7) {
        types.push("7_days");
      } else if (daysUntilDue === 3) {
        types.push("3_days");
      } else if (daysUntilDue === 1) {
        types.push("1_day");
      }
    }

    return types;
  }

  /**
   * Get upcoming payments with reminder status for a tenant
   */
  async getUpcomingPaymentsForTenant(tenantId: string): Promise<any[]> {
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // Get upcoming payments
      const payments = await Payment.find({
        tenantId: new Types.ObjectId(tenantId),
        status: { $in: ["pending", "overdue"] },
        dueDate: {
          $gte: now,
          $lte: thirtyDaysFromNow
        },
        paymentType: "rent"
      })
        .populate("propertyId", "title address")
        .populate("landlordId", "firstName lastName")
        .populate("rentalId", "status")
        .sort({ dueDate: 1 })
        .limit(10);

      // Get reminder records for these payments
      const paymentIds = payments.map(p => p._id);
      const reminders = await RentalReminder.find({
        paymentId: { $in: paymentIds }
      })
        .populate("invoiceId", "invoiceNumber");

      // Create a map of paymentId -> reminders
      const reminderMap = new Map();
      reminders.forEach(reminder => {
        const paymentId = reminder.paymentId.toString();
        if (!reminderMap.has(paymentId)) {
          reminderMap.set(paymentId, []);
        }
        reminderMap.get(paymentId).push({
          type: reminder.reminderType,
          sentAt: reminder.sentAt,
          status: reminder.status,
          invoiceId: reminder.invoiceId?._id || null,
          invoiceNumber: reminder.invoiceId?.invoiceNumber || null
        });
      });

      // Combine payments with reminder info
      return payments.map(payment => {
        const daysUntilDue = this.calculateDaysUntilDue(payment.dueDate);
        const sentReminders = reminderMap.get(payment._id.toString()) || [];
        
        // Get invoice ID from first reminder (7_days) if exists
        const firstReminder = sentReminders.find(r => r.type === "7_days");
        const invoiceId = firstReminder?.invoiceId || null;
        const invoiceNumber = firstReminder?.invoiceNumber || null;

        return {
          _id: payment._id,
          amount: payment.amount,
          dueDate: payment.dueDate,
          daysUntilDue,
          status: payment.status,
          property: payment.propertyId,
          landlord: payment.landlordId,
          invoiceId,
          invoiceNumber,
          reminders: {
            sent: sentReminders,
            upcoming: this.getUpcomingReminderTypes(daysUntilDue, sentReminders)
          }
        };
      });
    } catch (error: any) {
      logger.error("❌ Error getting upcoming payments for tenant:", error);
      throw error;
    }
  }

  /**
   * Get which reminder types are still upcoming (not yet sent)
   */
  private getUpcomingReminderTypes(
    daysUntilDue: number,
    sentReminders: Array<{ type: string }>
  ): Array<"7_days" | "3_days" | "1_day"> {
    const allTypes: Array<"7_days" | "3_days" | "1_day"> = ["7_days", "3_days", "1_day"];
    const sentTypes = sentReminders.map(r => r.type);
    
    const upcoming: Array<"7_days" | "3_days" | "1_day"> = [];
    
    if (daysUntilDue > 7 && !sentTypes.includes("7_days")) {
      upcoming.push("7_days");
    }
    if (daysUntilDue > 3 && daysUntilDue <= 7 && !sentTypes.includes("3_days")) {
      upcoming.push("3_days");
    }
    if (daysUntilDue > 1 && daysUntilDue <= 3 && !sentTypes.includes("1_day")) {
      upcoming.push("1_day");
    }
    if (daysUntilDue === 1 && !sentTypes.includes("1_day")) {
      upcoming.push("1_day");
    }
    
    return upcoming;
  }
}

export const rentalReminderService = new RentalReminderService();

