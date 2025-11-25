// Find where the 205 difference is coming from
const mongoose = require('mongoose');
require('dotenv').config();

async function findMissingAmounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // Get all distributed transactions
    const distributed = await db.collection('escrowtransactions').find({
      status: 'distributed'
    }).toArray();
    
    // Get all payouts
    const payouts = await db.collection('payouts').find({}).toArray();
    
    console.log('═'.repeat(80));
    console.log('🔍 FINDING MISSING AMOUNTS');
    console.log('═'.repeat(80));
    console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);
    
    // Group transactions by landlord
    const byLandlord = {};
    distributed.forEach(t => {
      const landlordId = t.landlordId?.toString();
      if (!byLandlord[landlordId]) {
        byLandlord[landlordId] = [];
      }
      byLandlord[landlordId].push(t);
    });
    
    // Group payouts by landlord
    const payoutsByLandlord = {};
    payouts.forEach(p => {
      if (p.recipientType === 'landlord' || p.payoutType === 'landlord' || p.payoutType === 'bulk_landlord') {
        const landlordId = p.recipientId?.toString();
        if (!payoutsByLandlord[landlordId]) {
          payoutsByLandlord[landlordId] = [];
        }
        payoutsByLandlord[landlordId].push(p);
      }
    });
    
    console.log('📊 TRANSACTION TOTALS BY LANDLORD:');
    console.log('-'.repeat(80));
    
    let totalExpectedLandlord = 0;
    let totalActualPayout = 0;
    
    for (const [landlordId, transactions] of Object.entries(byLandlord)) {
      const landlordTotal = transactions.reduce((sum, t) => sum + (t.landlordAmount || 0), 0);
      totalExpectedLandlord += landlordTotal;
      
      const landlordPayouts = payoutsByLandlord[landlordId] || [];
      const payoutTotal = landlordPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
      totalActualPayout += payoutTotal;
      
      if (Math.abs(landlordTotal - payoutTotal) > 0.01) {
        console.log(`\n  ⚠️  Landlord ${landlordId.substring(0, 8)}... (MISMATCH):`);
        console.log(`    Expected from Transactions: ${landlordTotal.toLocaleString()}`);
        console.log(`    Actual from Payouts: ${payoutTotal.toLocaleString()}`);
        console.log(`    Difference: ${(landlordTotal - payoutTotal).toLocaleString()}`);
        
        console.log(`    Transactions (${transactions.length}):`);
        transactions.forEach(t => {
          console.log(`      ${t._id.toString().substring(0, 8)}... - Landlord: ${t.landlordAmount}, Total: ${t.totalAmount}`);
        });
        
        console.log(`    Payouts (${landlordPayouts.length}):`);
        landlordPayouts.forEach(p => {
          console.log(`      ${p._id.toString().substring(0, 8)}... - Amount: ${p.amount}`);
        });
      } else {
        console.log(`  ✅ Landlord ${landlordId.substring(0, 8)}...: ${landlordTotal.toLocaleString()}`);
      }
    }
    
    console.log('');
    console.log('═'.repeat(80));
    console.log('📋 TOTALS');
    console.log('═'.repeat(80));
    console.log(`Expected from Transactions: ${totalExpectedLandlord.toLocaleString()}`);
    console.log(`Actual from Payouts: ${totalActualPayout.toLocaleString()}`);
    console.log(`Difference: ${(totalExpectedLandlord - totalActualPayout).toLocaleString()}`);
    console.log('═'.repeat(80));
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

findMissingAmounts()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

