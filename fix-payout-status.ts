// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EscrowTransaction } from './src/models/Escrow';

dotenv.config();

async function fixPayoutStatus() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get all held transactions
    const allHeld = await EscrowTransaction.find({ status: 'held' });
    console.log(`📊 Total held transactions: ${allHeld.length}\n`);

    // Update all held transactions to have landlordPayoutStatus: 'pending' if not set
    let updatedCount = 0;
    for (const tx of allHeld) {
      if (!tx.landlordPayoutStatus) {
        tx.landlordPayoutStatus = 'pending';
        await tx.save();
        updatedCount++;
        console.log(`✅ Updated payment ${tx.paymentId} - set landlordPayoutStatus to 'pending'`);
      }
    }

    console.log(`\n📊 Updated ${updatedCount} transactions\n`);

    // Now check again
    const pending = await EscrowTransaction.find({
      status: 'held',
      landlordPayoutStatus: 'pending'
    });

    const totalAmount = pending.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const totalLandlordAmount = pending.reduce((sum, t) => sum + (t.landlordAmount || 0), 0);
    const totalKhayalamiAmount = pending.reduce((sum, t) => sum + (t.khayalamiAmount || 0), 0);

    console.log(`\n📊 TRANSACTIONS WAITING FOR DISTRIBUTION: ${pending.length}\n`);
    console.log(`💰 TOTAL AMOUNTS:`);
    console.log(`   Total Amount: ${totalAmount.toLocaleString()}`);
    console.log(`   Landlord Share: ${totalLandlordAmount.toLocaleString()}`);
    console.log(`   Khayalami Commission: ${totalKhayalamiAmount.toLocaleString()}\n`);

    // Breakdown
    const rentPayments = pending.filter(t => t.paymentType === 'rent');
    const servicePayments = pending.filter(t => t.paymentType === 'service');
    
    console.log(`📋 BREAKDOWN:`);
    console.log(`   Rent payments: ${rentPayments.length} (${rentPayments.reduce((sum, t) => sum + (t.totalAmount || 0), 0).toLocaleString()})`);
    console.log(`   Service payments (fees/subscriptions/boosts): ${servicePayments.length} (${servicePayments.reduce((sum, t) => sum + (t.totalAmount || 0), 0).toLocaleString()})`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixPayoutStatus()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

