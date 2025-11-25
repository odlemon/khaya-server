// Script to remove transactions that don't have valid landlord users
const mongoose = require('mongoose');
require('dotenv').config();

async function removeOrphanedTransactions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    console.log('═'.repeat(80));
    console.log('🗑️  REMOVING ORPHANED TRANSACTIONS');
    console.log('═'.repeat(80));
    console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);
    
    // Get all escrow transactions
    const allTransactions = await db.collection('escrowtransactions').find({}).toArray();
    console.log(`📊 Total transactions: ${allTransactions.length}\n`);
    
    // Get all user IDs
    const allUsers = await db.collection('users').find({}).toArray();
    const userIds = new Set(allUsers.map(u => u._id.toString()));
    console.log(`👥 Total users in database: ${allUsers.length}\n`);
    
    // Find transactions with invalid landlordId
    const orphanedTransactions = [];
    
    for (const transaction of allTransactions) {
      let landlordId = null;
      
      // Extract landlordId properly
      if (transaction.landlordId) {
        if (transaction.landlordId._id) {
          landlordId = transaction.landlordId._id.toString();
        } else if (typeof transaction.landlordId === 'object') {
          landlordId = transaction.landlordId.toString();
        } else {
          landlordId = transaction.landlordId.toString();
        }
      }
      
      // Check if landlordId is valid and exists in users
      if (!landlordId || 
          landlordId === 'undefined' || 
          landlordId === 'null' ||
          !userIds.has(landlordId)) {
        orphanedTransactions.push({
          transactionId: transaction._id,
          landlordId: landlordId || 'missing',
          totalAmount: transaction.totalAmount,
          status: transaction.status,
          createdAt: transaction.createdAt
        });
      }
    }
    
    console.log('🔍 FOUND ORPHANED TRANSACTIONS:');
    console.log('-'.repeat(80));
    console.log(`Total orphaned transactions: ${orphanedTransactions.length}\n`);
    
    if (orphanedTransactions.length > 0) {
      // Show details
      let totalAmount = 0;
      for (const orphaned of orphanedTransactions) {
        totalAmount += orphaned.totalAmount || 0;
        console.log(`  Transaction ${orphaned.transactionId.toString().substring(0, 8)}...`);
        console.log(`    LandlordId: ${orphaned.landlordId}`);
        console.log(`    Amount: ${orphaned.totalAmount}`);
        console.log(`    Status: ${orphaned.status}`);
        console.log(`    Created: ${new Date(orphaned.createdAt).toLocaleString()}`);
        console.log('');
      }
      
      console.log(`Total amount in orphaned transactions: ${totalAmount.toLocaleString()}\n`);
      
      // Confirm deletion
      console.log('═'.repeat(80));
      console.log('⚠️  ABOUT TO DELETE:');
      console.log('-'.repeat(80));
      console.log(`  - ${orphanedTransactions.length} orphaned transaction(s)`);
      console.log(`  - Total amount: ${totalAmount.toLocaleString()}`);
      console.log('');
      console.log('Proceeding with deletion...\n');
      
      // Delete orphaned transactions
      const transactionIds = orphanedTransactions.map(o => o.transactionId);
      const deleteResult = await db.collection('escrowtransactions').deleteMany({
        _id: { $in: transactionIds }
      });
      
      console.log('✅ DELETION COMPLETED:');
      console.log('-'.repeat(80));
      console.log(`  Deleted ${deleteResult.deletedCount} transaction(s)\n`);
      
      // Update escrow account
      console.log('📦 Updating escrow account...');
      const escrowAccount = await db.collection('escrowaccounts').findOne({ accountType: 'main' });
      
      if (escrowAccount) {
        const newTotalHeld = Math.max(0, (escrowAccount.totalHeld || 0) - totalAmount);
        await db.collection('escrowaccounts').updateOne(
          { accountType: 'main' },
          {
            $set: { totalHeld: newTotalHeld },
            $inc: { 
              totalTransactions: -orphanedTransactions.length,
              pendingTransactions: -orphanedTransactions.filter(t => t.status === 'pending' || t.status === 'held').length
            }
          }
        );
        
        console.log(`  Updated escrow account:`);
        console.log(`    Total Held: ${escrowAccount.totalHeld} → ${newTotalHeld}`);
        console.log(`    Total Transactions: ${escrowAccount.totalTransactions} → ${(escrowAccount.totalTransactions || 0) - orphanedTransactions.length}`);
      }
    } else {
      console.log('✅ No orphaned transactions found! All transactions have valid landlords.\n');
    }
    
    // Verify remaining transactions
    console.log('🔍 VERIFICATION:');
    console.log('-'.repeat(80));
    const remainingTransactions = await db.collection('escrowtransactions').find({}).toArray();
    console.log(`  Remaining transactions: ${remainingTransactions.length}`);
    
    // Check for any remaining orphans
    let remainingOrphans = 0;
    for (const transaction of remainingTransactions) {
      let landlordId = null;
      if (transaction.landlordId) {
        if (transaction.landlordId._id) {
          landlordId = transaction.landlordId._id.toString();
        } else if (typeof transaction.landlordId === 'object') {
          landlordId = transaction.landlordId.toString();
        } else {
          landlordId = transaction.landlordId.toString();
        }
      }
      
      if (!landlordId || 
          landlordId === 'undefined' || 
          landlordId === 'null' ||
          !userIds.has(landlordId)) {
        remainingOrphans++;
      }
    }
    
    if (remainingOrphans === 0) {
      console.log(`  ✅ No orphaned transactions remaining!`);
    } else {
      console.log(`  ⚠️  Warning: ${remainingOrphans} orphaned transactions still found`);
    }
    
    console.log('');
    console.log('═'.repeat(80));
    console.log('✅ PROCESS COMPLETED!');
    console.log('═'.repeat(80));
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

removeOrphanedTransactions()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

