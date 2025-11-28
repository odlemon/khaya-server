// Script to verify distribution results
const mongoose = require('mongoose');
require('dotenv').config();

async function verifyDistribution() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    console.log('═'.repeat(80));
    console.log('📊 DISTRIBUTION VERIFICATION');
    console.log('═'.repeat(80));
    console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);
    
    // Get escrow account
    const escrowAccount = await db.collection('escrowaccounts').findOne({ accountType: 'main' });
    
    // Get distributed transactions (recent - last 5 minutes)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentlyDistributed = await db.collection('escrowtransactions').find({
      status: 'distributed',
      distributedAt: { $gte: fiveMinAgo }
    }).toArray();
    
    // Get all payouts (recent - last 5 minutes)
    const recentPayouts = await db.collection('payouts').find({
      createdAt: { $gte: fiveMinAgo }
    }).toArray();
    
    // Get all held transactions (should be 0 if distribution worked)
    const heldTransactions = await db.collection('escrowtransactions').find({
      status: 'held',
      landlordPayoutStatus: 'pending'
    }).toArray();
    
    // Get all distributed transactions (all time)
    const allDistributed = await db.collection('escrowtransactions').find({
      status: 'distributed'
    }).toArray();
    
    // Get all payouts (all time)
    const allPayouts = await db.collection('payouts').find({}).toArray();
    
    console.log('📦 ESCROW ACCOUNT STATUS:');
    console.log('-'.repeat(80));
    if (escrowAccount) {
      console.log(`  Total Held: ${escrowAccount.totalHeld?.toLocaleString() || 0}`);
      console.log(`  Total Distributed: ${escrowAccount.totalDistributed?.toLocaleString() || 0}`);
      console.log(`  Total Landlord Payouts: ${escrowAccount.totalLandlordPayouts?.toLocaleString() || 0}`);
      console.log(`  Total Khayalami Payouts: ${escrowAccount.totalKhayalamiPayouts?.toLocaleString() || 0}`);
      console.log(`  Distributed Transactions: ${escrowAccount.distributedTransactions || 0}`);
    }
    console.log('');
    
    console.log('✅ RECENT DISTRIBUTION (Last 5 minutes):');
    console.log('-'.repeat(80));
    console.log(`  Recently Distributed Transactions: ${recentlyDistributed.length}`);
    if (recentlyDistributed.length > 0) {
      const totalDistributed = recentlyDistributed.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      const totalLandlord = recentlyDistributed.reduce((sum, t) => sum + (t.landlordAmount || 0), 0);
      const totalKhayalami = recentlyDistributed.reduce((sum, t) => sum + (t.khayalamiAmount || 0), 0);
      
      console.log(`  Total Amount Distributed: ${totalDistributed.toLocaleString()}`);
      console.log(`  → Landlord Share: ${totalLandlord.toLocaleString()}`);
      console.log(`  → Khayalami Commission: ${totalKhayalami.toLocaleString()}`);
    }
    console.log('');
    
    console.log('💸 RECENT PAYOUTS CREATED (Last 5 minutes):');
    console.log('-'.repeat(80));
    console.log(`  Total Payouts Created: ${recentPayouts.length}`);
    
    if (recentPayouts.length > 0) {
      const landlordPayouts = recentPayouts.filter(p => p.recipientType === 'landlord' || p.payoutType === 'landlord' || p.payoutType === 'bulk_landlord');
      const khayalamiPayouts = recentPayouts.filter(p => p.recipientType === 'khayalami' || p.payoutType === 'khayalami' || p.payoutType === 'bulk_khayalami');
      
      console.log(`  → Landlord Payouts: ${landlordPayouts.length}`);
      console.log(`  → Khayalami Payouts: ${khayalamiPayouts.length}`);
      
      const landlordTotal = landlordPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
      const khayalamiTotal = khayalamiPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      console.log(`  Total Landlord Amount: ${landlordTotal.toLocaleString()}`);
      console.log(`  Total Khayalami Amount: ${khayalamiTotal.toLocaleString()}`);
      
      // Group by landlord
      const landlordGroups = {};
      landlordPayouts.forEach(p => {
        const landlordId = p.recipientId?.toString() || 'unknown';
        if (!landlordGroups[landlordId]) {
          landlordGroups[landlordId] = [];
        }
        landlordGroups[landlordId].push(p);
      });
      
      console.log(`\n  Landlords Receiving Payouts: ${Object.keys(landlordGroups).length}`);
      for (const [landlordId, payouts] of Object.entries(landlordGroups)) {
        const total = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);
        console.log(`    → Landlord ${landlordId.substring(0, 8)}...: ${total.toLocaleString()} (${payouts.length} payout${payouts.length > 1 ? 's' : ''})`);
      }
    }
    console.log('');
    
    console.log('⏳ REMAINING HELD TRANSACTIONS:');
    console.log('-'.repeat(80));
    console.log(`  Still Waiting for Distribution: ${heldTransactions.length}`);
    if (heldTransactions.length > 0) {
      const totalHeld = heldTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      console.log(`  Total Amount Still Held: ${totalHeld.toLocaleString()}`);
    } else {
      console.log(`  ✅ All transactions have been distributed!`);
    }
    console.log('');
    
    console.log('📈 ALL-TIME TOTALS:');
    console.log('-'.repeat(80));
    console.log(`  Total Distributed Transactions: ${allDistributed.length}`);
    if (allDistributed.length > 0) {
      const totalDistributed = allDistributed.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      console.log(`  Total Amount Distributed (All Time): ${totalDistributed.toLocaleString()}`);
    }
    
    console.log(`  Total Payouts Created: ${allPayouts.length}`);
    if (allPayouts.length > 0) {
      const allLandlordPayouts = allPayouts.filter(p => p.recipientType === 'landlord' || p.payoutType === 'landlord' || p.payoutType === 'bulk_landlord');
      const allKhayalamiPayouts = allPayouts.filter(p => p.recipientType === 'khayalami' || p.payoutType === 'khayalami' || p.payoutType === 'bulk_khayalami');
      
      const allLandlordTotal = allLandlordPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
      const allKhayalamiTotal = allKhayalamiPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      console.log(`  → Total Landlord Payouts: ${allLandlordPayouts.length} (${allLandlordTotal.toLocaleString()})`);
      console.log(`  → Total Khayalami Payouts: ${allKhayalamiPayouts.length} (${allKhayalamiTotal.toLocaleString()})`);
    }
    console.log('');
    
    // Verification checks
    console.log('✅ VERIFICATION CHECKS:');
    console.log('-'.repeat(80));
    
    let allChecksPassed = true;
    
    // Check 1: No held transactions should remain
    if (heldTransactions.length === 0) {
      console.log('  ✅ No held transactions remaining');
    } else {
      console.log(`  ⚠️  Warning: ${heldTransactions.length} transactions still held`);
      allChecksPassed = false;
    }
    
    // Check 2: Payouts should match distributed amounts
    if (recentlyDistributed.length > 0 && recentPayouts.length > 0) {
      const distributedLandlordTotal = recentlyDistributed.reduce((sum, t) => sum + (t.landlordAmount || 0), 0);
      const distributedKhayalamiTotal = recentlyDistributed.reduce((sum, t) => sum + (t.khayalamiAmount || 0), 0);
      
      const payoutLandlordTotal = recentPayouts
        .filter(p => p.recipientType === 'landlord' || p.payoutType === 'landlord' || p.payoutType === 'bulk_landlord')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const payoutKhayalamiTotal = recentPayouts
        .filter(p => p.recipientType === 'khayalami' || p.payoutType === 'khayalami' || p.payoutType === 'bulk_khayalami')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const landlordDiff = Math.abs(distributedLandlordTotal - payoutLandlordTotal);
      const khayalamiDiff = Math.abs(distributedKhayalamiTotal - payoutKhayalamiTotal);
      
      if (landlordDiff < 0.01) {
        console.log(`  ✅ Landlord payouts match: ${distributedLandlordTotal.toLocaleString()}`);
      } else {
        console.log(`  ❌ Landlord payouts mismatch! Distributed: ${distributedLandlordTotal.toLocaleString()}, Payouts: ${payoutLandlordTotal.toLocaleString()}`);
        allChecksPassed = false;
      }
      
      if (khayalamiDiff < 0.01) {
        console.log(`  ✅ Khayalami payouts match: ${distributedKhayalamiTotal.toLocaleString()}`);
      } else {
        console.log(`  ❌ Khayalami payouts mismatch! Distributed: ${distributedKhayalamiTotal.toLocaleString()}, Payouts: ${payoutKhayalamiTotal.toLocaleString()}`);
        allChecksPassed = false;
      }
      
      // Check total
      const totalDistributed = recentlyDistributed.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      const totalPayouts = recentPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalDiff = Math.abs(totalDistributed - totalPayouts);
      
      if (totalDiff < 0.01) {
        console.log(`  ✅ Total amounts match: ${totalDistributed.toLocaleString()}`);
      } else {
        console.log(`  ❌ Total amounts mismatch! Distributed: ${totalDistributed.toLocaleString()}, Payouts: ${totalPayouts.toLocaleString()}`);
        allChecksPassed = false;
      }
    } else if (recentlyDistributed.length === 0) {
      console.log('  ℹ️  No recent distribution found (check if distribution was run more than 5 minutes ago)');
    }
    
    // Check 3: Escrow account should be updated
    if (escrowAccount) {
      if (escrowAccount.totalDistributed > 0) {
        console.log(`  ✅ Escrow account updated: ${escrowAccount.totalDistributed.toLocaleString()} distributed`);
      } else {
        console.log('  ⚠️  Escrow account totalDistributed is 0');
      }
    }
    
    console.log('');
    console.log('═'.repeat(80));
    if (allChecksPassed) {
      console.log('✅ ALL CHECKS PASSED - Distribution completed successfully!');
    } else {
      console.log('⚠️  SOME CHECKS FAILED - Please review the results above');
    }
    console.log('═'.repeat(80));
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verifyDistribution()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

