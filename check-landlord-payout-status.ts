// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EscrowTransaction } from './src/models/Escrow';

dotenv.config();

async function checkLandlordPayoutStatus() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get all held transactions
    const allHeld = await EscrowTransaction.find({
      status: 'held'
    });

    console.log(`📊 Total held transactions: ${allHeld.length}\n`);

    const byPayoutStatus: Record<string, any[]> = {};
    for (const tx of allHeld) {
      const status = tx.landlordPayoutStatus || 'undefined';
      if (!byPayoutStatus[status]) byPayoutStatus[status] = [];
      byPayoutStatus[status].push(tx);
    }

    console.log(`📊 BREAKDOWN BY LANDLORD PAYOUT STATUS:\n`);
    for (const [status, txs] of Object.entries(byPayoutStatus)) {
      const total = txs.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      console.log(`   ${status}: ${txs.length} transactions, Total: ${total.toLocaleString()}`);
    }

    // Transactions with undefined/null landlordPayoutStatus need to be set
    const undefinedStatus = allHeld.filter(t => !t.landlordPayoutStatus);
    if (undefinedStatus.length > 0) {
      console.log(`\n⚠️  TRANSACTIONS WITH UNDEFINED LANDLORD PAYOUT STATUS: ${undefinedStatus.length}`);
      console.log(`   These need to be set to 'pending' to be included in distribution\n`);
      
      for (const tx of undefinedStatus) {
        console.log(`   Payment ID: ${tx.paymentId}`);
        console.log(`   Amount: ${tx.totalAmount}`);
        console.log(`   Type: ${tx.paymentType}`);
        console.log(`   ---`);
      }

      // Update them to 'pending'
      console.log(`\n🔧 Updating ${undefinedStatus.length} transactions to have landlordPayoutStatus: 'pending'...`);
      for (const tx of undefinedStatus) {
        tx.landlordPayoutStatus = 'pending';
        await tx.save();
      }
      console.log(`✅ Updated all transactions\n`);
    }

    // Now check again
    const pending = await EscrowTransaction.find({
      status: 'held',
      landlordPayoutStatus: 'pending'
    });

    const totalAmount = pending.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const totalLandlordAmount = pending.reduce((sum, t) => sum + (t.landlordAmount || 0), 0);
    const totalKhayalamiAmount = pending.reduce((sum, t) => sum + (t.khayalamiAmount || 0), 0);

    console.log(`\n📊 AFTER UPDATE:`);
    console.log(`   Transactions waiting for distribution: ${pending.length}`);
    console.log(`   Total Amount: ${totalAmount.toLocaleString()}`);
    console.log(`   Landlord Share: ${totalLandlordAmount.toLocaleString()}`);
    console.log(`   Khayalami Commission: ${totalKhayalamiAmount.toLocaleString()}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkLandlordPayoutStatus()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

