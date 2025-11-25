// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EscrowTransaction } from './src/models/Escrow';

dotenv.config();

async function debugQuery() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get all held transactions
    const allHeld = await EscrowTransaction.find({ status: 'held' });
    console.log(`📊 Total held: ${allHeld.length}\n`);

    // Check each one individually
    console.log(`Checking each transaction:\n`);
    let pendingCount = 0;
    
    for (const tx of allHeld) {
      const payoutStatus = tx.landlordPayoutStatus;
      const isPending = payoutStatus === 'pending' || payoutStatus === undefined || payoutStatus === null;
      
      console.log(`  Payment: ${tx.paymentId}`);
      console.log(`    Status: ${tx.status}`);
      console.log(`    landlordPayoutStatus: ${payoutStatus} (type: ${typeof payoutStatus})`);
      console.log(`    Matches query: ${isPending}`);
      console.log(`    Amount: ${tx.totalAmount}`);
      
      if (isPending) {
        pendingCount++;
      }
      console.log(`    ---`);
    }

    // Try the actual query
    const queryResult = await EscrowTransaction.find({
      status: 'held',
      landlordPayoutStatus: 'pending'
    });
    
    console.log(`\n📊 Query result count: ${queryResult.length}`);
    console.log(`📊 Manual count: ${pendingCount}`);

    // Try query with $or to include undefined
    const queryWithOr = await EscrowTransaction.find({
      status: 'held',
      $or: [
        { landlordPayoutStatus: 'pending' },
        { landlordPayoutStatus: { $exists: false } },
        { landlordPayoutStatus: null }
      ]
    });
    
    console.log(`📊 Query with $or (including undefined/null): ${queryWithOr.length}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

debugQuery()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

