// @ts-nocheck
/**
 * Script to update rental and payment schedule to current time for testing
 * This sets the first payment due in 10 minutes (1 month in test mode)
 */

import mongoose from 'mongoose';
import { Rental } from '../models/Rental';
import { Payment } from '../models/Payment';
import { addMonths } from '../config/testMode';
import dotenv from 'dotenv';

dotenv.config();

async function updateRentalForTesting() {
  console.log('🚀 Script started...');
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Find the most recent active rental
    const rental = await Rental.findOne({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(1);

    if (!rental) {
      console.log('❌ No active rental found');
      process.exit(1);
    }

    console.log(`📋 Found rental: ${rental._id}`);
    console.log(`   Current startDate: ${rental.startDate}`);
    console.log(`   Current endDate: ${rental.endDate}`);

    // Set new dates based on current time
    const now = new Date();
    const newStartDate = new Date(now); // Start now
    const newEndDate = addMonths(now, 12); // 12 months = 120 minutes in test mode

    console.log(`\n🔄 Updating rental dates:`);
    console.log(`   New startDate: ${newStartDate.toISOString()}`);
    console.log(`   New endDate: ${newEndDate.toISOString()}`);

    // Update rental
    rental.startDate = newStartDate;
    rental.endDate = newEndDate;
    rental.nextPaymentDue = newStartDate;
    await rental.save();

    console.log(`✅ Rental updated`);

    // Delete existing payments for this rental
    const deletedCount = await Payment.deleteMany({ rentalId: rental._id });
    console.log(`🗑️  Deleted ${deletedCount.deletedCount} existing payments`);

    // Create new payment schedule starting from now
    let currentDate = new Date(now);
    let paymentCount = 0;

    console.log(`\n📅 Creating new payment schedule:`);

    while (currentDate <= newEndDate) {
      const payment = await Payment.create({
        rentalId: rental._id,
        agreementId: rental.agreementId,
        propertyId: rental.propertyId,
        landlordId: rental.landlordId,
        tenantId: rental.tenantId,
        paymentType: 'rent',
        amount: rental.monthlyRent,
        dueDate: new Date(currentDate),
        status: 'pending',
        paymentMethod: 'in_app' // Required field - default to in_app for scheduled payments
      });

      paymentCount++;
      const minutesUntilDue = (currentDate.getTime() - now.getTime()) / (1000 * 60);
      console.log(`   ✅ Payment ${paymentCount}: Due in ${minutesUntilDue.toFixed(2)} minutes (${currentDate.toISOString()})`);

      // Move to next month (10 minutes in test mode)
      currentDate = addMonths(currentDate, 1);
    }

    // Update rental stats
    rental.stats.totalPaymentsDue = paymentCount;
    await rental.save();

    console.log(`\n✅ Payment schedule created:`);
    console.log(`   - Total payments: ${paymentCount}`);
    console.log(`   - First payment due: ${newStartDate.toISOString()} (NOW)`);
    console.log(`   - Second payment due: ${addMonths(newStartDate, 1).toISOString()} (10 minutes)`);
    console.log(`\n🎯 Test timeline:`);
    console.log(`   - First payment due: NOW`);
    console.log(`   - 7-day reminder (4 min before): In ~6 minutes`);
    console.log(`   - 3-day reminder (1.7 min before): In ~8.3 minutes`);
    console.log(`   - 1-day reminder (0.57 min before): In ~9.4 minutes`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateRentalForTesting();
