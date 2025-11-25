// Check the zero-amount payout issue
const mongoose = require('mongoose');
require('dotenv').config();

async function checkZeroPayout() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // Find payouts with 0 amount
    const zeroPayouts = await db.collection('payouts').find({ amount: 0 }).toArray();
    
    console.log('═'.repeat(80));
    console.log('🔍 ZERO-AMOUNT PAYOUT INVESTIGATION');
    console.log('═'.repeat(80));
    console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);
    
    console.log(`Found ${zeroPayouts.length} payout(s) with 0 amount:\n`);
    
    for (const payout of zeroPayouts) {
      console.log(`Payout ID: ${payout._id}`);
      console.log(`  Type: ${payout.payoutType || payout.recipientType}`);
      console.log(`  Amount: ${payout.amount}`);
      console.log(`  Status: ${payout.status}`);
      console.log(`  Recipient ID: ${payout.recipientId}`);
      console.log(`  Escrow Transaction IDs: ${payout.escrowTransactionIds?.length || 0}`);
      console.log('');
      
      // Get the linked transactions
      if (payout.escrowTransactionIds && payout.escrowTransactionIds.length > 0) {
        console.log('  Linked Transactions:');
        let totalLandlord = 0;
        let totalKhayalami = 0;
        let totalAmount = 0;
        
        for (const txId of payout.escrowTransactionIds) {
          const transaction = await db.collection('escrowtransactions').findOne({ _id: txId });
          if (transaction) {
            totalLandlord += transaction.landlordAmount || 0;
            totalKhayalami += transaction.khayalamiAmount || 0;
            totalAmount += transaction.totalAmount || 0;
            
            console.log(`    Transaction ${txId.toString().substring(0, 8)}...`);
            console.log(`      Total: ${transaction.totalAmount}`);
            console.log(`      Landlord: ${transaction.landlordAmount}`);
            console.log(`      Khayalami: ${transaction.khayalamiAmount}`);
            console.log(`      Status: ${transaction.status}`);
            console.log(`      Landlord Payout Status: ${transaction.landlordPayoutStatus || 'undefined'}`);
          }
        }
        
        console.log('');
        console.log(`  Expected Amounts from Transactions:`);
        console.log(`    Total: ${totalAmount.toLocaleString()}`);
        console.log(`    Landlord: ${totalLandlord.toLocaleString()}`);
        console.log(`    Khayalami: ${totalKhayalami.toLocaleString()}`);
        console.log(`    Payout Amount: ${payout.amount}`);
        console.log(`    ⚠️  Missing: ${totalLandlord.toLocaleString()}`);
        console.log('');
      }
    }
    
    console.log('═'.repeat(80));
    console.log('📋 SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Found ${zeroPayouts.length} payout(s) with 0 amount that should have amounts from linked transactions.`);
    console.log('═'.repeat(80));
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkZeroPayout()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

