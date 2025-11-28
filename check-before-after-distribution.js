// Simple JavaScript script to check distribution status
const mongoose = require('mongoose');
require('dotenv').config();

async function checkDistributionStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // Get pending transactions
    const pendingTransactions = await db.collection('escrowtransactions').find({
      status: 'held',
      landlordPayoutStatus: 'pending'
    }).toArray();
    
    // Get escrow account
    const escrowAccount = await db.collection('escrowaccounts').findOne({ accountType: 'main' });
    
    // Get existing payouts
    const payouts = await db.collection('payouts').find({}).toArray();
    
    // Get distributed transactions
    const distributed = await db.collection('escrowtransactions').find({
      status: 'distributed'
    }).toArray();
    
    console.log('═'.repeat(80));
    console.log('📊 DISTRIBUTION STATUS CHECK');
    console.log('═'.repeat(80));
    console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);
    
    console.log('📦 ESCROW ACCOUNT:');
    console.log('-'.repeat(80));
    if (escrowAccount) {
      console.log(`  Total Held: ${escrowAccount.totalHeld?.toLocaleString() || 0}`);
      console.log(`  Total Distributed: ${escrowAccount.totalDistributed?.toLocaleString() || 0}`);
      console.log(`  Total Landlord Payouts: ${escrowAccount.totalLandlordPayouts?.toLocaleString() || 0}`);
      console.log(`  Total Khayalami Payouts: ${escrowAccount.totalKhayalamiPayouts?.toLocaleString() || 0}`);
      console.log(`  Distributed Transactions: ${escrowAccount.distributedTransactions || 0}`);
    }
    console.log('');
    
    console.log('⏳ PENDING TRANSACTIONS (Waiting for Distribution):');
    console.log('-'.repeat(80));
    console.log(`  Count: ${pendingTransactions.length}`);
    
    if (pendingTransactions.length > 0) {
      const totalAmount = pendingTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      const totalLandlord = pendingTransactions.reduce((sum, t) => sum + (t.landlordAmount || 0), 0);
      const totalKhayalami = pendingTransactions.reduce((sum, t) => sum + (t.khayalamiAmount || 0), 0);
      
      console.log(`  Total Amount: ${totalAmount.toLocaleString()}`);
      console.log(`  → Landlord Share: ${totalLandlord.toLocaleString()}`);
      console.log(`  → Khayalami Commission: ${totalKhayalami.toLocaleString()}`);
      
      // Group by landlord
      const landlordGroups = {};
      for (const tx of pendingTransactions) {
        const landlordId = tx.landlordId?.toString() || 'unknown';
        if (!landlordGroups[landlordId]) {
          landlordGroups[landlordId] = [];
        }
        landlordGroups[landlordId].push(tx);
      }
      
      console.log(`\n  Landlords to receive payouts: ${Object.keys(landlordGroups).length}`);
    }
    console.log('');
    
    console.log('✅ DISTRIBUTED TRANSACTIONS:');
    console.log('-'.repeat(80));
    console.log(`  Count: ${distributed.length}`);
    if (distributed.length > 0) {
      const totalDistributed = distributed.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      console.log(`  Total Distributed: ${totalDistributed.toLocaleString()}`);
      
      // Recent (last 5 minutes)
      const recent = distributed.filter(t => {
        if (!t.distributedAt) return false;
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        return new Date(t.distributedAt) > fiveMinAgo;
      });
      if (recent.length > 0) {
        console.log(`  ⚡ Recent distributions (last 5 min): ${recent.length}`);
      }
    }
    console.log('');
    
    console.log('💸 PAYOUTS:');
    console.log('-'.repeat(80));
    console.log(`  Total Payouts: ${payouts.length}`);
    if (payouts.length > 0) {
      const landlordPayouts = payouts.filter(p => p.payoutType === 'landlord' || p.recipientType === 'landlord');
      const khayalamiPayouts = payouts.filter(p => p.payoutType === 'khayalami' || p.recipientType === 'khayalami');
      
      console.log(`  Landlord Payouts: ${landlordPayouts.length}`);
      console.log(`  Khayalami Payouts: ${khayalamiPayouts.length}`);
      
      const landlordTotal = landlordPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
      const khayalamiTotal = khayalamiPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      console.log(`  Total Landlord Amount: ${landlordTotal.toLocaleString()}`);
      console.log(`  Total Khayalami Amount: ${khayalamiTotal.toLocaleString()}`);
      
      // Recent payouts
      const recent = payouts.filter(p => {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        return new Date(p.createdAt) > fiveMinAgo;
      });
      if (recent.length > 0) {
        console.log(`\n  ⚡ Recent payouts (last 5 min): ${recent.length}`);
      }
    }
    console.log('');
    
    console.log('═'.repeat(80));
    console.log('📋 SUMMARY');
    console.log('═'.repeat(80));
    const pendingTotal = pendingTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    console.log(`\n⏳ Waiting: ${pendingTransactions.length} transactions, Total: ${pendingTotal.toLocaleString()}`);
    console.log(`✅ Distributed: ${distributed.length} transactions`);
    console.log(`💸 Payouts Created: ${payouts.length} payouts`);
    
    console.log('\n' + '═'.repeat(80));
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkDistributionStatus()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

