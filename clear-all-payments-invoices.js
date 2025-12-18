// @ts-nocheck
require('dotenv').config();
const mongoose = require('mongoose');

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    esModuleInterop: true
  }
});

const { Invoice } = require('./src/models/Invoice');
const { Payment } = require('./src/models/Payment');
const { RentalReminder } = require('./src/models/RentalReminder');

async function clearAll() {
  console.log('🚀 Starting cleanup...\n');
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Count before deletion
    const paymentCount = await Payment.countDocuments({ paymentType: 'rent' });
    const invoiceCount = await Invoice.countDocuments({});
    const reminderCount = await RentalReminder.countDocuments({});

    console.log(`📊 Current counts:`);
    console.log(`   - Rent Payments: ${paymentCount}`);
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

    console.log('✅ All payments, invoices, and reminders cleared!\n');
    console.log('🎯 You can now create a new rental and payment schedule for testing.\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

clearAll();
