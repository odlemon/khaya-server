// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EscrowTransaction } from './src/models/Escrow';

dotenv.config();

async function checkPendingSimple() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Direct query without populate
    const transactions = await EscrowTransaction.find({
      status: 'held',
      landlordPayoutStatus: 'pending'
    }).sort({ createdAt: 1 });

    console.log(`📊 TRANSACTIONS WAITING FOR DISTRIBUTION: ${transactions.length}\n`);

    if (transactions.length > 0) {
      const totalAmount = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      const totalLandlordAmount = transactions.reduce((sum, t) => sum + (t.landlordAmount || 0), 0);
      const totalKhayalamiAmount = transactions.reduce((sum, t) => sum + (t.khayalamiAmount || 0), 0);

      console.log(`💰 TOTAL AMOUNTS:`);
      console.log(`   Total Amount: ${totalAmount.toLocaleString()}`);
      console.log(`   Landlord Share: ${totalLandlordAmount.toLocaleString()}`);
      console.log(`   Khayalami Commission: ${totalKhayalamiAmount.toLocaleString()}\n`);

      // Breakdown by payment type
      const byType: Record<string, any[]> = {};
      for (const tx of transactions) {
        const type = tx.paymentType || 'unknown';
        if (!byType[type]) byType[type] = [];
        byType[type].push(tx);
      }

      console.log(`📋 BREAKDOWN BY PAYMENT TYPE:\n`);
      for (const [type, txs] of Object.entries(byType)) {
        const typeTotal = txs.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
        console.log(`   ${type}: ${txs.length} transactions, Total: ${typeTotal.toLocaleString()}`);
      }

      // Breakdown by rental status
      const withRental = transactions.filter(t => t.rentalId);
      const withoutRental = transactions.filter(t => !t.rentalId);
      
      console.log(`\n📋 BREAKDOWN BY RENTAL:`);
      console.log(`   With Rental ID: ${withRental.length}`);
      console.log(`   Without Rental ID: ${withoutRental.length}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkPendingSimple()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

