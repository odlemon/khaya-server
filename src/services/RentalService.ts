// @ts-nocheck
import { Rental, IRental } from "../models/Rental";
import { ConditionLog } from "../models/ConditionLog";
import { Payment } from "../models/Payment";
import { Agreement } from "../models/Agreement";
import { Types } from "mongoose";
import { TEST_MODE, addMonths } from "../config/testMode";

export class RentalService {
  /**
   * Auto-create rental when agreement is fully signed
   */
  async createRentalFromAgreement(agreementId: string): Promise<IRental> {
    const agreement = await Agreement.findById(agreementId);
    
    if (!agreement) {
      throw new Error("Agreement not found");
    }

    // Check if both parties have signed
    if (!agreement.landlordSignature || !agreement.tenantSignature) {
      throw new Error("Agreement must be fully signed by both parties");
    }

    // Check if rental already exists for this agreement
    const existingRental = await Rental.findOne({ agreementId });
    if (existingRental) {
      console.log(`✅ Rental already exists for agreement: ${agreementId}`);
      return existingRental;
    }

    // Create rental
    const rental = new Rental({
      agreementId: agreement._id,
      propertyId: agreement.propertyId,
      landlordId: agreement.landlordId,
      tenantId: agreement.tenantId,
      status: "active",
      startDate: agreement.startDate,
      endDate: agreement.endDate,
      monthlyRent: agreement.rentAmount,
      depositAmount: agreement.depositAmount || 0,
      nextPaymentDue: agreement.startDate, // First payment due on move-in
      moveInConfirmed: false
    });

    await rental.save();
    console.log(`🎉 Rental created for agreement: ${agreementId}`);

    // Create initial payment records
    console.log(`📅 Creating payment schedule for rental: ${rental._id}`);
    await this.createPaymentSchedule(rental);
    console.log(`✅ Payment schedule created for rental: ${rental._id}`);

    return rental;
  }

  /**
   * Create payment schedule for the rental period
   * In test mode: 1 month = 10 minutes
   */
  async createPaymentSchedule(rental: IRental): Promise<void> {
    // Check if payment schedule already exists for this rental
    const existingPayments = await Payment.countDocuments({ 
      rentalId: rental._id,
      paymentType: "rent"
    });
    
    if (existingPayments > 0) {
      console.log(`⚠️  Payment schedule already exists for rental ${rental._id}`);
      console.log(`   Found ${existingPayments} existing payments. Skipping schedule creation.`);
      console.log(`   If you need to recreate, delete existing payments first.`);
      return;
    }

    let startDate = new Date(rental.startDate);
    const endDate = new Date(rental.endDate);
    
    // In test mode: if startDate is in the future (more than 1 hour), adjust it to now + 10 minutes
    // This ensures payments are within the test window
    if (TEST_MODE) {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      
      if (startDate > oneHourFromNow) {
        console.log(`⚠️  Test Mode: Agreement startDate (${startDate.toISOString()}) is too far in future.`);
        console.log(`   Adjusting first payment to: ${now.toISOString()} (now)`);
        startDate = new Date(now); // Set first payment to now
      }
    }
    
    let currentDate = new Date(startDate);

    console.log(`📊 Payment Schedule Creation Started:`);
    console.log(`   - Rental ID: ${rental._id}`);
    console.log(`   - Start Date: ${startDate.toISOString()}`);
    console.log(`   - End Date: ${endDate.toISOString()}`);
    console.log(`   - Monthly Rent: K${rental.monthlyRent}`);
    console.log(`   - Test Mode: ${TEST_MODE ? 'ENABLED (1 month = 10 minutes)' : 'DISABLED (normal months)'}`);

    let paymentCount = 0;

    while (currentDate <= endDate) {
      const payment = await Payment.create({
        rentalId: rental._id,
        agreementId: rental.agreementId,
        propertyId: rental.propertyId,
        landlordId: rental.landlordId,
        tenantId: rental.tenantId,
        paymentType: "rent",
        amount: rental.monthlyRent,
        dueDate: new Date(currentDate),
        status: "pending",
        paymentMethod: "in_app" // Required field - default to in_app for scheduled payments
      });

      paymentCount++;
      console.log(`   ✅ Payment ${paymentCount} created: ID=${payment._id}, Due=${currentDate.toISOString()}, Amount=K${rental.monthlyRent}`);
      
      // Move to next month
      if (TEST_MODE) {
        // Test mode: 1 month = 10 minutes
        const oldDate = new Date(currentDate);
        currentDate = addMonths(currentDate, 1);
        console.log(`   ⏭️  Next payment: ${oldDate.toISOString()} → ${currentDate.toISOString()} (10 minutes later in test mode)`);
      } else {
        // Production mode: actual months
        const oldDate = new Date(currentDate);
        currentDate.setMonth(currentDate.getMonth() + 1);
        console.log(`   ⏭️  Next payment: ${oldDate.toISOString()} → ${currentDate.toISOString()} (1 month later)`);
      }
    }

    // Update rental stats
    rental.stats.totalPaymentsDue = paymentCount;
    await rental.save();

    console.log(`💰 Payment Schedule Complete:`);
    console.log(`   - Total Payments Created: ${paymentCount}`);
    console.log(`   - Rental ID: ${rental._id}`);
    console.log(`   - Test Mode: ${TEST_MODE ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Get rental dashboard (for both landlord and tenant)
   */
  async getRentalDashboard(rentalId: string, userId: string, userRole: string): Promise<any> {
    const rental = await Rental.findById(rentalId)
      .populate("propertyId", "title address images")
      .populate("landlordId", "firstName lastName email phone")
      .populate("tenantId", "firstName lastName email phone")
      .populate("agreementId");

    if (!rental) {
      throw new Error("Rental not found");
    }

    // Verify user is part of this rental
    const landlordIdStr = rental.landlordId._id?.toString() || rental.landlordId.toString();
    const tenantIdStr = rental.tenantId._id?.toString() || rental.tenantId.toString();
    const userIdStr = userId.toString();

    if (landlordIdStr !== userIdStr && tenantIdStr !== userIdStr) {
      throw new Error("Access denied");
    }

    // Get payments
    const payments = await Payment.find({ rentalId: rental._id })
      .sort({ dueDate: 1 });

    // Get condition logs
    const conditionLogs = await ConditionLog.find({ rentalId: rental._id })
      .sort({ dueDate: 1 });

    // Calculate next action required
    let nextAction = null;
    const now = new Date();

    // Check for overdue payments
    const overduePayment = payments.find(p => p.status === 'pending' && p.dueDate < now);
    if (overduePayment) {
      nextAction = {
        type: "payment_overdue",
        message: "Payment overdue",
        dueDate: overduePayment.dueDate
      };
    } else {
      // Check for upcoming payments (within 5 days)
      const upcomingPayment = payments.find(p => {
        if (p.status !== 'pending') return false;
        const daysUntilDue = Math.ceil((p.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDue >= 0 && daysUntilDue <= 5;
      });

      if (upcomingPayment) {
        const daysUntilDue = Math.ceil((upcomingPayment.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        nextAction = {
          type: "payment_due_soon",
          message: `Rent due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
          dueDate: upcomingPayment.dueDate
        };
      } else {
        // Check for overdue condition logs
        const overdueLog = conditionLogs.find(l => l.status === 'pending' && l.dueDate < now);
        if (overdueLog) {
          nextAction = {
            type: "condition_log_overdue",
            message: `${overdueLog.logType} video overdue`,
            dueDate: overdueLog.dueDate
          };
        } else {
          // Check for upcoming condition logs (within 7 days)
          const upcomingLog = conditionLogs.find(l => {
            if (l.status !== 'pending') return false;
            const daysUntilDue = Math.ceil((l.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return daysUntilDue >= 0 && daysUntilDue <= 7;
          });

          if (upcomingLog) {
            const daysUntilDue = Math.ceil((upcomingLog.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            nextAction = {
              type: "condition_log_due_soon",
              message: `${upcomingLog.logType} video due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
              dueDate: upcomingLog.dueDate
            };
          }
        }
      }
    }

    return {
      rental,
      payments,
      conditionLogs,
      nextAction
    };
  }

  /**
   * Get user's rentals (landlord or tenant)
   */
  async getUserRentals(userId: string, userRole: string): Promise<IRental[]> {
    const query: any = {};
    
    if (userRole === "landlord") {
      query.landlordId = userId;
    } else if (userRole === "tenant") {
      query.tenantId = userId;
    } else {
      throw new Error("Invalid user role");
    }

    const rentals = await Rental.find(query)
      .populate("propertyId", "title address images")
      .populate("landlordId", "firstName lastName email")
      .populate("tenantId", "firstName lastName email")
      .sort({ createdAt: -1 });

    return rentals;
  }

  /**
   * Create condition log
   */
  async createConditionLog(
    rentalId: string,
    userId: string,
    userRole: string,
    data: {
      logType: string;
      customLabel?: string;
      videoUrl: string;
      photoUrls?: string[];
      notes?: string;
    }
  ): Promise<any> {
    const rental = await Rental.findById(rentalId);
    
    if (!rental) {
      throw new Error("Rental not found");
    }

    // Verify user is tenant or landlord of this rental
    const tenantIdStr = rental.tenantId.toString();
    const landlordIdStr = rental.landlordId.toString();
    const userIdStr = userId.toString();

    if (tenantIdStr !== userIdStr && landlordIdStr !== userIdStr) {
      throw new Error("Access denied");
    }

    // Validate photo count
    if (data.photoUrls && data.photoUrls.length > 3) {
      throw new Error("Maximum 3 photos allowed");
    }

    // Create log
    const log = await ConditionLog.create({
      rentalId: rental._id,
      agreementId: rental.agreementId,
      propertyId: rental.propertyId,
      tenantId: rental.tenantId,
      logType: data.logType,
      customLabel: data.customLabel,
      videoUrl: data.videoUrl,
      photoUrls: data.photoUrls || [],
      notes: data.notes,
      uploadedBy: userRole as "tenant" | "landlord",
      uploadedAt: new Date()
    });

    // Update rental stats
    rental.stats.conditionLogsUploaded += 1;
    
    // Mark move-in as confirmed if this is move-in log
    if (data.logType === "move-in" && !rental.moveInConfirmed) {
      rental.moveInConfirmed = true;
      rental.moveInConfirmedAt = new Date();
    }

    await rental.save();

    console.log(`📹 Condition log created: ${data.logType} for rental: ${rentalId}`);

    return log;
  }

  /**
   * Update condition log (change stage or edit)
   */
  async updateConditionLog(
    conditionLogId: string,
    userId: string,
    userRole: string,
    data: {
      logType?: string;
      customLabel?: string;
      videoUrl?: string;
      photoUrls?: string[];
      notes?: string;
    }
  ): Promise<any> {
    const log = await ConditionLog.findById(conditionLogId);

    if (!log) {
      throw new Error("Condition log not found");
    }

    // Verify user is tenant or landlord of this rental
    const rental = await Rental.findById(log.rentalId);
    if (!rental) {
      throw new Error("Rental not found");
    }

    const tenantIdStr = rental.tenantId.toString();
    const landlordIdStr = rental.landlordId.toString();
    const userIdStr = userId.toString();

    if (tenantIdStr !== userIdStr && landlordIdStr !== userIdStr) {
      throw new Error("Access denied");
    }

    // Validate photo count
    if (data.photoUrls && data.photoUrls.length > 3) {
      throw new Error("Maximum 3 photos allowed");
    }

    // Update fields
    if (data.logType !== undefined) log.logType = data.logType as any;
    if (data.customLabel !== undefined) log.customLabel = data.customLabel;
    if (data.videoUrl !== undefined) log.videoUrl = data.videoUrl;
    if (data.photoUrls !== undefined) log.photoUrls = data.photoUrls;
    if (data.notes !== undefined) log.notes = data.notes;

    await log.save();

    console.log(`✏️ Condition log updated: ${conditionLogId}`);

    return log;
  }

  /**
   * Delete condition log
   */
  async deleteConditionLog(
    conditionLogId: string,
    userId: string,
    userRole: string
  ): Promise<void> {
    const log = await ConditionLog.findById(conditionLogId);

    if (!log) {
      throw new Error("Condition log not found");
    }

    // Verify user is tenant or landlord of this rental
    const rental = await Rental.findById(log.rentalId);
    if (!rental) {
      throw new Error("Rental not found");
    }

    const tenantIdStr = rental.tenantId.toString();
    const landlordIdStr = rental.landlordId.toString();
    const userIdStr = userId.toString();

    if (tenantIdStr !== userIdStr && landlordIdStr !== userIdStr) {
      throw new Error("Access denied");
    }

    // Delete log
    await ConditionLog.findByIdAndDelete(conditionLogId);

    // Update rental stats
    rental.stats.conditionLogsUploaded -= 1;
    await rental.save();

    console.log(`🗑️ Condition log deleted: ${conditionLogId}`);
  }

  /**
   * Submit payment proof
   */
  async submitPaymentProof(
    paymentId: string,
    userId: string,
    userRole: string,
    data: {
      proofOfPayment: string;
      paymentMethod: string;
      paymentDate: Date;
      utilityReceipts?: any[];
      notes?: string;
    }
  ): Promise<any> {
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      throw new Error("Payment not found");
    }

    // Verify user is the tenant of this rental
    const tenantIdStr = payment.tenantId.toString();
    const userIdStr = userId.toString();

    if (tenantIdStr !== userIdStr && userRole !== "tenant") {
      throw new Error("Only the tenant can submit payment proof");
    }

    if (payment.status === "paid" || payment.status === "verified") {
      throw new Error("Payment already submitted");
    }

    // Update payment
    payment.proofOfPayment = data.proofOfPayment;
    payment.paymentMethod = data.paymentMethod as any;
    payment.paymentDate = data.paymentDate;
    payment.utilityReceipts = data.utilityReceipts;
    payment.notes = data.notes;
    payment.status = "paid"; // Will be "verified" after landlord approval

    await payment.save();

    // Update rental stats
    const rental = await Rental.findById(payment.rentalId);
    if (rental) {
      rental.stats.paidPayments += 1;
      
      // Update next payment due
      const nextPendingPayment = await Payment.findOne({
        rentalId: rental._id,
        status: "pending"
      }).sort({ dueDate: 1 });

      if (nextPendingPayment) {
        rental.nextPaymentDue = nextPendingPayment.dueDate;
      }

      await rental.save();
    }

    console.log(`💰 Payment proof submitted for rental: ${payment.rentalId}`);

    return payment;
  }

  /**
   * Verify payment (landlord)
   */
  async verifyPayment(
    paymentId: string,
    userId: string,
    userRole: string,
    data: {
      verificationNotes?: string;
    }
  ): Promise<any> {
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      throw new Error("Payment not found");
    }

    // Verify user is the landlord
    const landlordIdStr = payment.landlordId.toString();
    const userIdStr = userId.toString();

    if (landlordIdStr !== userIdStr && userRole !== "landlord") {
      throw new Error("Only the landlord can verify payments");
    }

    if (payment.status !== "paid") {
      throw new Error("Can only verify payments with submitted proof");
    }

    // Verify payment
    payment.status = "verified";
    payment.verifiedBy = userId as any;
    payment.verifiedAt = new Date();
    payment.verificationNotes = data.verificationNotes;

    await payment.save();

    console.log(`✅ Payment verified by landlord: ${paymentId}`);

    return payment;
  }

  /**
   * Reject payment (landlord)
   */
  async rejectPayment(
    paymentId: string,
    userId: string,
    userRole: string,
    data: {
      rejectionReason: string;
    }
  ): Promise<any> {
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      throw new Error("Payment not found");
    }

    // Verify user is the landlord
    const landlordIdStr = payment.landlordId.toString();
    const userIdStr = userId.toString();

    if (landlordIdStr !== userIdStr && userRole !== "landlord") {
      throw new Error("Only the landlord can reject payments");
    }

    if (payment.status !== "paid") {
      throw new Error("Can only reject payments with submitted proof");
    }

    // Reject payment - revert to pending for tenant to resubmit
    payment.status = "pending";
    payment.rejectionReason = data.rejectionReason;
    payment.proofOfPayment = undefined; // Clear rejected proof
    payment.paymentDate = undefined;

    await payment.save();

    // Update rental stats
    const rental = await Rental.findById(payment.rentalId);
    if (rental) {
      rental.stats.paidPayments -= 1;
      await rental.save();
    }

    console.log(`❌ Payment rejected by landlord: ${paymentId}`);

    return payment;
  }

  /**
   * Mark payment as disputed (both parties)
   */
  async disputePayment(
    paymentId: string,
    userId: string,
    userRole: string,
    data: {
      disputeReason: string;
    }
  ): Promise<any> {
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      throw new Error("Payment not found");
    }

    // Verify user is either landlord or tenant
    const landlordIdStr = payment.landlordId.toString();
    const tenantIdStr = payment.tenantId.toString();
    const userIdStr = userId.toString();

    if (landlordIdStr !== userIdStr && tenantIdStr !== userIdStr) {
      throw new Error("Access denied");
    }

    payment.status = "disputed";
    payment.notes = `${payment.notes || ""}\n\nDISPUTE: ${data.disputeReason}`;

    await payment.save();

    console.log(`⚠️ Payment disputed: ${paymentId}`);

    return payment;
  }

  /**
   * Get payment statistics for rental
   */
  async getPaymentStats(rentalId: string, userId: string, userRole: string): Promise<any> {
    const rental = await Rental.findById(rentalId);
    
    if (!rental) {
      throw new Error("Rental not found");
    }

    // Verify user is part of this rental
    const landlordIdStr = rental.landlordId.toString();
    const tenantIdStr = rental.tenantId.toString();
    const userIdStr = userId.toString();

    if (landlordIdStr !== userIdStr && tenantIdStr !== userIdStr) {
      throw new Error("Access denied");
    }

    // Get all payments
    const allPayments = await Payment.find({ rentalId });

    // Calculate statistics
    const stats = {
      total: allPayments.length,
      pending: allPayments.filter(p => p.status === "pending").length,
      paid: allPayments.filter(p => p.status === "paid").length,
      verified: allPayments.filter(p => p.status === "verified").length,
      overdue: allPayments.filter(p => p.status === "overdue").length,
      disputed: allPayments.filter(p => p.status === "disputed").length,
      totalPaid: allPayments
        .filter(p => p.status === "paid" || p.status === "verified")
        .reduce((sum, p) => sum + (p.totalAmount || p.amount), 0),
      totalOutstanding: allPayments
        .filter(p => p.status === "pending" || p.status === "overdue")
        .reduce((sum, p) => sum + (p.totalAmount || p.amount), 0),
      totalLateFees: allPayments.reduce((sum, p) => sum + (p.lateFee || 0), 0),
      onTimePaymentRate: allPayments.filter(p => p.status === "paid" || p.status === "verified").length > 0
        ? Math.round((allPayments.filter(p => (p.status === "paid" || p.status === "verified") && (p.daysLate || 0) === 0).length / allPayments.filter(p => p.status === "paid" || p.status === "verified").length) * 100)
        : 100
    };

    return stats;
  }

  /**
   * End rental (when agreement terminates or expires)
   */
  async endRental(rentalId: string): Promise<IRental> {
    const rental = await Rental.findById(rentalId);

    if (!rental) {
      throw new Error("Rental not found");
    }

    rental.status = "ended";
    rental.endedAt = new Date();

    await rental.save();

    console.log(`🔚 Rental ended: ${rentalId}`);

    return rental;
  }

  /**
   * Get condition logs for a rental
   */
  async getConditionLogs(rentalId: string, userId: string, userRole: string): Promise<any[]> {
    const rental = await Rental.findById(rentalId);
    
    if (!rental) {
      throw new Error("Rental not found");
    }

    // Verify user is part of this rental
    const landlordIdStr = rental.landlordId.toString();
    const tenantIdStr = rental.tenantId.toString();
    const userIdStr = userId.toString();

    if (landlordIdStr !== userIdStr && tenantIdStr !== userIdStr) {
      throw new Error("Access denied");
    }

    const logs = await ConditionLog.find({ rentalId })
      .sort({ dueDate: 1 });

    return logs;
  }

  /**
   * Get payments for a rental
   */
  async getPayments(rentalId: string, userId: string, userRole: string): Promise<any[]> {
    const rental = await Rental.findById(rentalId);
    
    if (!rental) {
      throw new Error("Rental not found");
    }

    // Verify user is part of this rental
    const landlordIdStr = rental.landlordId.toString();
    const tenantIdStr = rental.tenantId.toString();
    const userIdStr = userId.toString();

    if (landlordIdStr !== userIdStr && tenantIdStr !== userIdStr) {
      throw new Error("Access denied");
    }

    const payments = await Payment.find({ rentalId })
      .sort({ dueDate: 1 });

    return payments;
  }

  /**
   * Get maintenance requests for a rental
   */
  async getMaintenanceRequests(rentalId: string, userId: string, userRole: string): Promise<any[]> {
    const { MaintenanceRequest } = await import("../models/MaintenanceRequest");
    
    const rental = await Rental.findById(rentalId);
    
    if (!rental) {
      throw new Error("Rental not found");
    }

    // Verify user is part of this rental
    const landlordIdStr = rental.landlordId.toString();
    const tenantIdStr = rental.tenantId.toString();
    const userIdStr = userId.toString();

    if (landlordIdStr !== userIdStr && tenantIdStr !== userIdStr) {
      throw new Error("Access denied");
    }

    const requests = await MaintenanceRequest.find({ rentalId })
      .sort({ createdAt: -1 });

    return requests;
  }

  /**
   * Create maintenance request (tenant)
   */
  async createMaintenanceRequest(
    rentalId: string,
    userId: string,
    userRole: string,
    data: {
      issueType: string;
      urgency: string;
      title: string;
      description: string;
      photoUrls?: string[];
      videoUrls?: string[];
    }
  ): Promise<any> {
    const { MaintenanceRequest } = await import("../models/MaintenanceRequest");
    
    const rental = await Rental.findById(rentalId);
    
    if (!rental) {
      throw new Error("Rental not found");
    }

    // Verify user is the tenant
    const tenantIdStr = rental.tenantId.toString();
    const userIdStr = userId.toString();

    if (tenantIdStr !== userIdStr && userRole !== "tenant") {
      throw new Error("Only the tenant can create maintenance requests");
    }

    const request = await MaintenanceRequest.create({
      rentalId: rental._id,
      agreementId: rental.agreementId,
      propertyId: rental.propertyId,
      landlordId: rental.landlordId,
      tenantId: rental.tenantId,
      issueType: data.issueType,
      urgency: data.urgency,
      title: data.title,
      description: data.description,
      photoUrls: data.photoUrls || [],
      videoUrls: data.videoUrls || [],
      status: "pending"
    });

    // Update rental stats
    rental.stats.maintenanceRequests += 1;
    await rental.save();

    console.log(`🔧 Maintenance request created for rental: ${rentalId}`);

    return request;
  }

  /**
   * Get service bookings for a rental
   */
  async getServiceBookings(rentalId: string, userId: string, userRole: string): Promise<any[]> {
    const { ServiceBooking } = await import("../models/ServiceBooking");
    
    const rental = await Rental.findById(rentalId);
    
    if (!rental) {
      throw new Error("Rental not found");
    }

    // Verify user is part of this rental
    const landlordIdStr = rental.landlordId.toString();
    const tenantIdStr = rental.tenantId.toString();
    const userIdStr = userId.toString();

    if (landlordIdStr !== userIdStr && tenantIdStr !== userIdStr) {
      throw new Error("Access denied");
    }

    const bookings = await ServiceBooking.find({ rentalId })
      .sort({ scheduledDate: 1 });

    return bookings;
  }

  /**
   * Create service booking (tenant)
   */
  async createServiceBooking(
    rentalId: string,
    userId: string,
    userRole: string,
    data: {
      serviceType: string;
      title: string;
      description?: string;
      scheduledDate: Date;
      cost: number;
      paidBy: string;
      serviceProvider?: string;
      notes?: string;
    }
  ): Promise<any> {
    const { ServiceBooking } = await import("../models/ServiceBooking");
    
    const rental = await Rental.findById(rentalId);
    
    if (!rental) {
      throw new Error("Rental not found");
    }

    // Verify user is the tenant
    const tenantIdStr = rental.tenantId.toString();
    const userIdStr = userId.toString();

    if (tenantIdStr !== userIdStr && userRole !== "tenant") {
      throw new Error("Only the tenant can create service bookings");
    }

    const booking = await ServiceBooking.create({
      rentalId: rental._id,
      agreementId: rental.agreementId,
      propertyId: rental.propertyId,
      landlordId: rental.landlordId,
      tenantId: rental.tenantId,
      serviceType: data.serviceType,
      title: data.title,
      description: data.description,
      scheduledDate: data.scheduledDate,
      cost: data.cost,
      paidBy: data.paidBy,
      serviceProvider: data.serviceProvider,
      notes: data.notes,
      status: "scheduled"
    });

    // Update rental stats
    rental.stats.serviceBookings += 1;
    await rental.save();

    console.log(`🧹 Service booking created for rental: ${rentalId}`);

    return booking;
  }
}

export const rentalService = new RentalService();

