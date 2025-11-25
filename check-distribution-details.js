// Check distribution details to find the discrepancy
const mongoose = require('mongoose');
require('dotenv').config();

async function checkDetails() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // Get all transactions
    const allTransactions = await db.collection('escrowtransactions').find({}).toArray();
    
    // Get distributed transactions
    const distributed = allTransactions.filter(t => t.status === 'distributed');
    const held = allTransactions.filter(t => t.status === 'held');
    const pending = allTransactions.filter(t => t.status === 'pending');
    
    // Get all payouts
    const payouts = await db.collection('payouts').find({}).toArray();
    
    console.log('═'.repeat(80));
    console.log('🔍 DISTRIBUTION DETAIL ANALYSIS');
    console.log('═'.repeat(80));
    console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);
    
    console.log('📊 TRANSACTION STATUS BREAKDOWN:');
    console.log('-'.repeat(80));
    console.log(`  Total Transactions: ${allTransactions.length}`);
    console.log(`  → Distributed: ${distributed.length}`);
    console.log(`  → Held: ${held.length}`);
    console.log(`  → Pending: ${pending.length}`);
    console.log('');
    
    if (held.length > 0) {
      console.log('⏳ HELD TRANSACTIONS (Not Distributed):');
      console.log('-'.repeat(80));
      let heldTotal = 0;
      let heldLandlord = 0;
      let heldKhayalami = 0;
      
      held.forEach(t => {
        heldTotal += t.totalAmount || 0;
        heldLandlord += t.landlordAmount || 0;
        heldKhayalami += t.khayalamiAmount || 0;
        console.log(`  Transaction ${t._id.toString().substring(0, 8)}...`);
        console.log(`    Total: ${t.totalAmount}, Landlord: ${t.landlordAmount}, Khayalami: ${t.khayalamiAmount}`);
        console.log(`    Landlord Payout Status: ${t.landlordPayoutStatus || 'undefined'}`);
      });
      
      console.log(`\n  Held Totals: ${heldTotal.toLocaleString()}`);
      console.log(`  → Landlord: ${heldLandlord.toLocaleString()}`);
      console.log(`  → Khayalami: ${heldKhayalami.toLocaleString()}`);
      console.log('');
    }
    
    // Calculate distributed totals
    const distTotal = distributed.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const distLandlord = distributed.reduce((sum, t) => sum + (t.landlordAmount || 0), 0);
    const distKhayalami = distributed.reduce((sum, t) => sum + (t.khayalamiAmount || 0), 0);
    
    console.log('✅ DISTRIBUTED TRANSACTIONS:');
    console.log('-'.repeat(80));
    console.log(`  Count: ${distributed.length}`);
    console.log(`  Total Amount: ${distTotal.toLocaleString()}`);
    console.log(`  → Landlord Amount: ${distLandlord.toLocaleString()}`);
    console.log(`  → Khayalami Amount: ${distKhayalami.toLocaleString()}`);
    console.log('');
    
    // Calculate payout totals
    const payoutLandlord = payouts
      .filter(p => p.recipientType === 'landlord' || p.payoutType === 'landlord' || p.payoutType === 'bulk_landlord')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const payoutKhayalami = payouts
      .filter(p => p.recipientType === 'khayalami' || p.payoutType === 'khayalami' || p.payoutType === 'bulk_khayalami')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    console.log('💸 PAYOUTS:');
    console.log('-'.repeat(80));
    console.log(`  Total Payouts: ${payouts.length}`);
    console.log(`  → Total Landlord: ${payoutLandlord.toLocaleString()}`);
    console.log(`  → Total Khayalami: ${payoutKhayalami.toLocaleString()}`);
    console.log('');
    
    payouts.forEach(p => {
      const type = p.recipientType || p.payoutType;
      console.log(`  Payout ${p._id.toString().substring(0, 8)}...`);
      console.log(`    Type: ${type}, Amount: ${p.amount}, Status: ${p.status}`);
      if (p.escrowTransactionIds && p.escrowTransactionIds.length > 0) {
        console.log(`    Escrow Transactions: ${p.escrowTransactionIds.length}`);
      }
    });
    console.log('');
    
    // Check for missing payouts
    console.log('🔍 CHECKING TRANSACTION-PAYOUT LINKS:');
    console.log('-'.repeat(80));
    
    const transactionsWithPayouts = new Set();
    payouts.forEach(p => {
      if (p.escrowTransactionIds) {
        p.escrowTransactionIds.forEach(id => {
          transactionsWithPayouts.add(id.toString());
        });
      }
    });
    
    const transactionsWithoutPayouts = distributed.filter(t => 
      !transactionsWithPayouts.has(t._id.toString())
    );
    
    if (transactionsWithoutPayouts.length > 0) {
      console.log(`  ⚠️  ${transactionsWithoutPayouts.length} distributed transactions without payouts:`);
      transactionsWithoutPayouts.forEach(t => {
        console.log(`    Transaction ${t._id.toString().substring(0, 8)}...`);
        console.log(`      Total: ${t.totalAmount}, Landlord: ${t.landlordAmount}, Khayalami: ${t.khayalamiAmount}`);
        console.log(`      Landlord Payout ID: ${t.landlordPayoutId || 'none'}`);
        console.log(`      Khayalami Payout ID: ${t.khayalamiPayoutId || 'none'}`);
      });
    } else {
      console.log(`  ✅ All distributed transactions have payout links`);
    }
    console.log('');
    
    // Summary
    console.log('═'.repeat(80));
    console.log('📋 SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Expected from Distributed Transactions:`);
    console.log(`  Landlord: ${distLandlord.toLocaleString()}`);
    console.log(`  Khayalami: ${distKhayalami.toLocaleString()}`);
    console.log(`  Total: ${(distLandlord + distKhayalami).toLocaleString()}`);
    console.log('');
    console.log(`Actual from Payouts:`);
    console.log(`  Landlord: ${payoutLandlord.toLocaleString()}`);
    console.log(`  Khayalami: ${payoutKhayalami.toLocaleString()}`);
    console.log(`  Total: ${(payoutLandlord + payoutKhayalami).toLocaleString()}`);
    console.log('');
    const diff = (distLandlord + distKhayalami) - (payoutLandlord + payoutKhayalami);
    console.log(`Difference: ${diff.toLocaleString()}`);
    console.log('═'.repeat(80));
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkDetails()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

