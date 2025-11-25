// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EscrowTransaction } from './src/models/Escrow';

dotenv.config();

async function checkBeforeDistribution() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    console.log('═'.repeat(80));
    console.log('📊 BEFORE DISTRIBUTION - CURRENT STATUS');
    console.log('═'.repeat(80));
    console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);

    // Get pending transactions
    const pendingTransactions = await EscrowTransaction.find({
      status: 'held',
      landlordPayoutStatus: 'pending'
    }).sort({ createdAt: 1 });

    console.log(`⏳ PENDING TRANSACTIONS: ${pendingTransactions.length}\n`);

    if (pendingTransactions.length > 0) {
      const totalAmount = pendingTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      const totalLandlordAmount = pendingTransactions.reduce((sum, t) => sum + (t.landlordAmount || 0), 0);
      const totalKhayalamiAmount = pendingTransactions.reduce((sum, t) => sum + (t.khayalamiAmount || 0), 0);

      console.log(`💰 TOTAL AMOUNTS TO DISTRIBUTE:`);
      console.log(`   Total Amount: ${totalAmount.toLocaleString()}`);
      console.log(`   → Landlord Share: ${totalLandlordAmount.toLocaleString()}`);
      console.log(`   → Khayalami Commission: ${totalKhayalamiAmount.toLocaleString()}\n`);

      // Breakdown by payment type
      const rentPayments = pendingTransactions.filter(t => t.paymentType === 'rent');
      const servicePayments = pendingTransactions.filter(t => t.paymentType === 'service');
      
      console.log(`📋 BREAKDOWN BY TYPE:`);
      console.log(`   Rent payments: ${rentPayments.length}`);
      console.log(`   Service payments (fees/subscriptions/boosts): ${servicePayments.length}\n`);

      // Group by landlord
      const landlordGroups = new Map<string, any[]>();
      for (const tx of pendingTransactions) {
        const landlordId = tx.landlordId?.toString() || 'unknown';
        if (!landlordGroups.has(landlordId)) {
          landlordGroups.set(landlordId, []);
        }
        landlordGroups.get(landlordId)!.push(tx);
      }

      console.log(`👥 LANDLORDS TO RECEIVE PAYOUTS: ${landlordGroups.size}`);
      for (const [landlordId, txs] of landlordGroups.entries()) {
        const landlordTotal = txs.reduce((sum, t) => sum + (t.landlordAmount || 0), 0);
        const { User } = await import('./src/models/User');
        const landlord = await User.findById(landlordId);
        const name = landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Unknown';
        console.log(`   - ${name}: ${landlordTotal.toLocaleString()} (${txs.length} transactions)`);
      }

      // Calculate Khayalami total
      console.log(`\n💰 KHAYALAMI TOTAL: ${totalKhayalamiAmount.toLocaleString()}`);
    }

    // Check escrow account
    const { EscrowAccount } = await import('./src/models/Escrow');
    const escrowAccount = await EscrowAccount.findOne({ accountType: 'main' });
    if (escrowAccount) {
      console.log(`\n\n📦 ESCROW ACCOUNT:`);
      console.log(`   Total Held: ${escrowAccount.totalHeld.toLocaleString()}`);
      console.log(`   Total Distributed: ${escrowAccount.totalDistributed.toLocaleString()}`);
    }

    // Check current payouts count
    const { Payout } = await import('./src/models/Escrow');
    const existingPayouts = await Payout.countDocuments({});
    console.log(`\n💸 EXISTING PAYOUTS: ${existingPayouts}`);

    console.log('\n' + '═'.repeat(80));
    console.log('✅ BEFORE CHECK COMPLETE - Ready for distribution!');
    console.log('═'.repeat(80));

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkBeforeDistribution()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

