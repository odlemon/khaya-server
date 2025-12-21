// @ts-nocheck
/**
 * Script to clear all payments/invoices and create a fresh payment schedule
 * Sets first payment due NOW for testing (10 minute period)
 */

import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice';
import { Payment } from '../models/Payment';
import { RentalReminder } from '../models/RentalReminder';
import { Rental } from '../models/Rental';
import { addMonths, addDays } from '../config/testMode';
import dotenv from 'dotenv';

dotenv.config();

async function resetAndCreate() {
  console.log('🚀 Starting reset and payment schedule creation...\n');
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Clear existing data
    console.log('🗑️  Step 1: Clearing existing data...\n');
    
    const existingPaymentCount = await Payment.countDocuments({ paymentType: 'rent' });
    const invoiceCount = await Invoice.countDocuments({});
    const reminderCount = await RentalReminder.countDocuments({});

    console.log(`📊 Current counts:`);
    console.log(`   - Rent Payments: ${existingPaymentCount}`);
    console.log(`   - Invoices: ${invoiceCount}`);
    console.log(`   - Rental Reminders: ${reminderCount}\n`);

    // Delete all rent payments
    console.log('🗑️  Deleting all rent payments...');
    const paymentResult = await Payment.deleteMany({ paymentType: 'rent' });
    console.log(`✅ Deleted ${paymentResult.deletedCount} rent payments\n`);

    // Delete all invoices
    console.log('🗑️  Deleting all invoices...');
    const invoiceResult = await Invoice.deleteMany({});
    console.log(`✅ Deleted ${invoiceResult.deletedCount} invoices\n`);

    // Delete all rental reminders
    console.log('🗑️  Deleting all rental reminders...');
    const reminderResult = await RentalReminder.deleteMany({});
    console.log(`✅ Deleted ${reminderResult.deletedCount} rental reminders\n`);

    // Step 2: Find active rental
    console.log('📋 Step 2: Finding active rental...\n');
    const rental = await Rental.findOne({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(1);

    if (!rental) {
      console.log('❌ No active rental found. Please create a rental first.\n');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`✅ Found rental: ${rental._id}`);
    console.log(`   Current startDate: ${rental.startDate}`);
    console.log(`   Current endDate: ${rental.endDate}`);
    console.log(`   Monthly Rent: K${rental.monthlyRent}\n`);

    // Step 3: Update rental dates to NOW
    console.log('🔄 Step 3: Updating rental dates to current time...\n');
    const now = new Date();
    const newStartDate = new Date(now); // Start now
    const newEndDate = addMonths(now, 12); // 12 months = 120 minutes in test mode

    rental.startDate = newStartDate;
    rental.endDate = newEndDate;
    rental.nextPaymentDue = newStartDate;
    await rental.save();

    console.log(`✅ Rental updated:`);
    console.log(`   New startDate: ${newStartDate.toISOString()}`);
    console.log(`   New endDate: ${newEndDate.toISOString()}\n`);

    // Step 4: Create ONE payment (due in 4 minutes = 7 days in test mode)
    // This way the 7-day reminder will trigger NOW
    console.log('📅 Step 4: Creating single payment...\n');
    
    // Payment due in 7 days = 4 minutes in test mode
    const paymentDueDate = addDays(now, 7); // 7 days = 4 minutes in test mode
    
    const payment = await Payment.create({
      rentalId: rental._id,
      agreementId: rental.agreementId,
      propertyId: rental.propertyId,
      landlordId: rental.landlordId,
      tenantId: rental.tenantId,
      paymentType: 'rent',
      amount: rental.monthlyRent,
      dueDate: paymentDueDate, // Due in 4 minutes (7 days in test mode)
      status: 'pending',
      paymentMethod: 'in_app'
    });

    const minutesUntilDue = (paymentDueDate.getTime() - now.getTime()) / (1000 * 60);
    console.log(`   ✅ Payment created: ${payment._id}`);
    console.log(`   Due date: ${paymentDueDate.toISOString()} (in ${minutesUntilDue.toFixed(2)} minutes)\n`);

    // Update rental stats
    rental.stats.totalPaymentsDue = 1;
    rental.nextPaymentDue = paymentDueDate;
    await rental.save();

    console.log(`\n✅ Single payment created:`);
    console.log(`   - Payment ID: ${payment._id}`);
    console.log(`   - Due date: ${paymentDueDate.toISOString()} (in ${minutesUntilDue.toFixed(2)} minutes)`);
    console.log(`   - Amount: K${rental.monthlyRent}\n`);
    console.log(`\n🎯 Test timeline:`);
    console.log(`   - Payment due: In ${minutesUntilDue.toFixed(2)} minutes (7 days in test mode)`);
    console.log(`   - 7-day reminder (4 min before): Should trigger NOW ✅`);
    console.log(`   - 3-day reminder (1.7 min before): In ~2.3 minutes`);
    console.log(`   - 1-day reminder (0.57 min before): In ~3.4 minutes`);
    console.log(`\n✅ All done! The cron job will trigger the 7-day reminder immediately.\n`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

resetAndCreate();


