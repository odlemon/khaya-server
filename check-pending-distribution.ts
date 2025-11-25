// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EscrowTransaction } from './src/models/Escrow';

dotenv.config();

async function checkPendingDistribution() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Count transactions waiting for distribution
    const pendingCount = await EscrowTransaction.countDocuments({
      status: 'held',
      landlordPayoutStatus: 'pending'
    });

    // Get total amounts if any exist
    if (pendingCount > 0) {
      const pendingTransactions = await EscrowTransaction.find({
        status: 'held',
        landlordPayoutStatus: 'pending'
      });

      const totalAmount = pendingTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
      const totalLandlordAmount = pendingTransactions.reduce((sum, t) => sum + t.landlordAmount, 0);
      const totalKhayalamiAmount = pendingTransactions.reduce((sum, t) => sum + t.khayalamiAmount, 0);

      console.log(`📊 TRANSACTIONS WAITING FOR DISTRIBUTION: ${pendingCount}\n`);
      console.log(`💰 TOTAL AMOUNTS:`);
      console.log(`   Total Amount: ${totalAmount.toLocaleString()}`);
      console.log(`   Landlord Share: ${totalLandlordAmount.toLocaleString()}`);
      console.log(`   Khayalami Commission: ${totalKhayalamiAmount.toLocaleString()}\n`);
    } else {
      console.log(`📊 TRANSACTIONS WAITING FOR DISTRIBUTION: ${pendingCount}\n`);
      console.log('ℹ️  No transactions are currently waiting for distribution.\n');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkPendingDistribution()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

