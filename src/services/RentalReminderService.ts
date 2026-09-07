// @ts-nocheck
import { Payment } from "../models/Payment";
import { RentalReminder } from "../models/RentalReminder";
import { Rental } from "../models/Rental";
import { Property } from "../models/Property";
import { User } from "../models/User";
import { Invoice } from "../models/Invoice";
import { emailNotificationService } from "./EmailNotificationService";
import { appNotificationService } from "./AppNotificationService";
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
          // Also check by rentalId + dueDate to prevent duplicates for same period
          let invoiceId = null;
          const existingInvoice = await Invoice.findOne({ 
            paymentId: payment._id 
          });
          
          // Also check if there's an invoice for this rental with the same due date (prevent duplicates)
          const duplicateInvoice = existingInvoice ? null : await Invoice.findOne({
            rentalId: payment.rentalId,
            dueDate: payment.dueDate,
            status: { $in: ["pending", "partially_paid", "overdue"] }
          });
          
          if (duplicateInvoice) {
            logger.warn(`   ⚠️  Found duplicate invoice for same rental and due date: ${duplicateInvoice.invoiceNumber}`);
            logger.warn(`   ⚠️  Payment ${payment._id} due ${payment.dueDate.toISOString()} already has invoice ${duplicateInvoice._id}`);
            invoiceId = duplicateInvoice._id;
            logger.info(`   📄 Using existing invoice: ${duplicateInvoice.invoiceNumber} (ID: ${invoiceId})`);
          } else if (existingInvoice) {
            // Use existing invoice for subsequent reminders
            invoiceId = existingInvoice._id;
            logger.info(`   📄 Using existing invoice: ${existingInvoice.invoiceNumber} (ID: ${invoiceId})`);
          } else if (reminderType === "due_date") {
            // Create invoice on due-date reminder if none exists
            logger.info(`   📄 Creating invoice for payment ${payment._id} (due-date reminder)`);
            logger.info(`   📄 Payment tenantId: ${payment.tenantId} (type: ${typeof payment.tenantId})`);
            logger.info(`   📄 Payment tenantId string: ${payment.tenantId?.toString() || 'MISSING'}`);
            try {
              const tenantIdStr = payment.tenantId?.toString() || payment.tenantId?._id?.toString() || payment.tenantId;
              if (!tenantIdStr) {
                throw new Error(`Missing tenantId for payment ${payment._id}`);
              }
              logger.info(`   📄 Calling generateInvoiceForPayment with paymentId: ${payment._id.toString()}`);
              // tenantId will be extracted from payment/rental in the service
              const invoice = await invoiceService.generateInvoiceForPayment(
                payment._id.toString()
              );
              logger.info(`   📄 Invoice service returned: ${JSON.stringify({ invoiceNumber: invoice.invoiceNumber })}`);
              // Find the created invoice to get its ID (double-check after creation)
              const createdInvoice = await Invoice.findOne({ 
                $or: [
                  { invoiceNumber: invoice.invoiceNumber },
                  { paymentId: payment._id }
                ]
              });
              if (createdInvoice) {
                invoiceId = createdInvoice._id;
                logger.info(`   ✅ Invoice created: ${invoice.invoiceNumber} (ID: ${invoiceId})`);
              } else {
                logger.error(`   ❌ Invoice creation returned but not found in DB: ${invoice.invoiceNumber}`);
                logger.error(`   ❌ Searched for invoiceNumber: ${invoice.invoiceNumber} or paymentId: ${payment._id}`);
              }
            } catch (error: any) {
              logger.error(`   ❌ Failed to create invoice for payment ${payment._id}:`);
              logger.error(`   ❌ Error message: ${error.message}`);
              logger.error(`   ❌ Error stack: ${error.stack}`);
              // Continue with reminder even if invoice creation fails
            }
          }

          // Send reminder
          try {
            logger.info(`   📧 Sending ${reminderType} reminder email...`);
            await this.sendReminderEmail(payment, reminderType, daysUntilDue);
            logger.info(`   ✅ Email sent successfully`);

            await this.sendReminderAppNotification(payment, daysUntilDue);
            logger.info(`   ✅ In-app/push notification sent`);
            
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
    reminderType: "7_days" | "3_days" | "1_day" | "due_date",
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
   * Send in-app + FCM rent due notification to tenant.
   */
  private async sendReminderAppNotification(payment: any, daysUntilDue: number): Promise<void> {
    const tenant = payment.tenantId;
    const property = payment.propertyId;
    const tenantId =
      tenant?._id?.toString?.() || tenant?.toString?.() || String(tenant || "");
    const rentalId =
      payment.rentalId?._id?.toString?.() ||
      payment.rentalId?.toString?.() ||
      String(payment.rentalId || "");

    if (!tenantId) {
      throw new Error("Missing tenant for rent due notification");
    }

    const propertyLabel =
      property?.title ||
      (property?.address
        ? `${property.address.street || ""}, ${property.address.city || ""}`.trim()
        : "your rental");

    const dueLabel =
      daysUntilDue === 0 ? "due today" : daysUntilDue === 1 ? "due tomorrow" : `due in ${daysUntilDue} days`;

    await appNotificationService.notify({
      userId: tenantId,
      type: "rent_due",
      title: "Rent payment due",
      body: `K${Number(payment.amount || 0).toFixed(2)} for ${propertyLabel} is ${dueLabel}.`,
      data: {
        rentalId,
        paymentId: payment._id?.toString?.() || String(payment._id),
        suppressBanner: false,
      },
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
   * Get which reminder types should be sent based on days until due.
   * One notification on the rent due date only.
   */
  private getReminderTypesForDays(daysUntilDue: number): Array<"due_date"> {
    if (TEST_MODE) {
      if (daysUntilDue >= -1 && daysUntilDue <= 1) {
        return ["due_date"];
      }
      return [];
    }

    if (daysUntilDue === 0) {
      return ["due_date"];
    }

    return [];
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
        const firstReminder = sentReminders.find((r) => r.type === "due_date");
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
  ): Array<"due_date"> {
    const sentTypes = sentReminders.map((r) => r.type);
    if (daysUntilDue === 0 && !sentTypes.includes("due_date")) {
      return ["due_date"];
    }
    return [];
  }
}

export const rentalReminderService = new RentalReminderService();




