// Simple script to reset distribution back to before-distribution state
const mongoose = require('mongoose');
require('dotenv').config();

async function resetDistribution() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    console.log('═'.repeat(80));
    console.log('🔄 RESETTING DISTRIBUTION');
    console.log('═'.repeat(80));
    console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);
    
    // Step 1: Reset all distributed transactions back to "held"
    console.log('1️⃣ Resetting distributed transactions back to "held"...');
    const resetResult = await db.collection('escrowtransactions').updateMany(
      { status: 'distributed' },
      { 
        $set: {
          status: 'held',
          landlordPayoutStatus: 'pending',
          khayalamiPayoutStatus: 'pending'
        },
        $unset: {
          landlordPayoutId: '',
          khayalamiPayoutId: '',
          distributedAt: '',
          distributedBy: '',
          distributionMethod: ''
        }
      }
    );
    console.log(`   ✅ Reset ${resetResult.modifiedCount} transactions back to "held" status\n`);
    
    // Step 2: Delete all payouts
    console.log('2️⃣ Deleting all payouts...');
    const payoutCount = await db.collection('payouts').countDocuments({});
    await db.collection('payouts').deleteMany({});
    console.log(`   ✅ Deleted ${payoutCount} payouts\n`);
    
    // Step 3: Get current escrow account and reset values
    console.log('3️⃣ Resetting escrow account values...');
    const escrowAccount = await db.collection('escrowaccounts').findOne({ accountType: 'main' });
    
    if (escrowAccount) {
      // Calculate new totalHeld (add back the distributed amount)
      const currentHeld = escrowAccount.totalHeld || 0;
      const distributed = escrowAccount.totalDistributed || 0;
      const newHeld = currentHeld + distributed;
      
      await db.collection('escrowaccounts').updateOne(
        { accountType: 'main' },
        {
          $set: {
            totalHeld: newHeld,
            totalDistributed: 0,
            totalLandlordPayouts: 0,
            totalKhayalamiPayouts: 0,
            distributedTransactions: 0,
          },
          $unset: {
            lastDistributionDate: '',
            lastDistributionAmount: '',
            lastDistributionMethod: ''
          }
        }
      );
      
      console.log(`   ✅ Reset escrow account:`);
      console.log(`      Total Held: ${currentHeld} → ${newHeld}`);
      console.log(`      Total Distributed: ${distributed} → 0`);
      console.log(`      Total Landlord Payouts: ${escrowAccount.totalLandlordPayouts || 0} → 0`);
      console.log(`      Total Khayalami Payouts: ${escrowAccount.totalKhayalamiPayouts || 0} → 0`);
      console.log(`      Distributed Transactions: ${escrowAccount.distributedTransactions || 0} → 0\n`);
    }
    
    // Step 4: Verify the reset
    console.log('4️⃣ Verifying reset...');
    const heldTransactions = await db.collection('escrowtransactions').countDocuments({
      status: 'held',
      landlordPayoutStatus: 'pending'
    });
    const distributedTransactions = await db.collection('escrowtransactions').countDocuments({
      status: 'distributed'
    });
    const payoutCountAfter = await db.collection('payouts').countDocuments({});
    const escrowAccountAfter = await db.collection('escrowaccounts').findOne({ accountType: 'main' });
    
    console.log(`   ✅ Verification:`);
    console.log(`      Held transactions: ${heldTransactions}`);
    console.log(`      Distributed transactions: ${distributedTransactions}`);
    console.log(`      Payouts: ${payoutCountAfter}`);
    console.log(`      Escrow Total Held: ${escrowAccountAfter?.totalHeld || 0}`);
    console.log(`      Escrow Total Distributed: ${escrowAccountAfter?.totalDistributed || 0}\n`);
    
    console.log('═'.repeat(80));
    console.log('✅ RESET COMPLETED SUCCESSFULLY!');
    console.log('═'.repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   - Reset ${resetResult.modifiedCount} transactions to "held"`);
    console.log(`   - Deleted ${payoutCount} payouts`);
    console.log(`   - Reset escrow account values`);
    console.log(`\n✅ All transactions are now back in "held" status, ready for distribution again.\n`);
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

resetDistribution()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

