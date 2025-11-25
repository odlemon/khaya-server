// Detailed amount verification
const mongoose = require('mongoose');
require('dotenv').config();

async function verifyAmounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    console.log('═'.repeat(80));
    console.log('💰 DETAILED AMOUNT VERIFICATION');
    console.log('═'.repeat(80));
    console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);
    
    // Get all distributed transactions
    const distributedTransactions = await db.collection('escrowtransactions').find({
      status: 'distributed'
    }).toArray();
    
    // Get all payouts
    const allPayouts = await db.collection('payouts').find({}).toArray();
    
    // Calculate totals from transactions
    const transactionTotals = distributedTransactions.reduce((acc, t) => {
      acc.totalAmount += t.totalAmount || 0;
      acc.landlordAmount += t.landlordAmount || 0;
      acc.khayalamiAmount += t.khayalamiAmount || 0;
      acc.deductions += (t.deductions?.totalDeductions || 0);
      return acc;
    }, { totalAmount: 0, landlordAmount: 0, khayalamiAmount: 0, deductions: 0 });
    
    // Calculate totals from payouts
    const payoutTotals = allPayouts.reduce((acc, p) => {
      const isLandlord = p.recipientType === 'landlord' || p.payoutType === 'landlord' || p.payoutType === 'bulk_landlord';
      const isKhayalami = p.recipientType === 'khayalami' || p.payoutType === 'khayalami' || p.payoutType === 'bulk_khayalami';
      
      if (isLandlord) {
        acc.landlord += p.amount || 0;
      } else if (isKhayalami) {
        acc.khayalami += p.amount || 0;
      }
      acc.total += p.amount || 0;
      return acc;
    }, { landlord: 0, khayalami: 0, total: 0 });
    
    console.log('📊 FROM DISTRIBUTED TRANSACTIONS:');
    console.log('-'.repeat(80));
    console.log(`  Total Transactions: ${distributedTransactions.length}`);
    console.log(`  Total Amount (from tenants): ${transactionTotals.totalAmount.toLocaleString()}`);
    console.log(`  → Landlord Amount: ${transactionTotals.landlordAmount.toLocaleString()}`);
    console.log(`  → Khayalami Amount: ${transactionTotals.khayalamiAmount.toLocaleString()}`);
    console.log(`  → Total Deductions: ${transactionTotals.deductions.toLocaleString()}`);
    console.log(`  → Distributed Total: ${(transactionTotals.landlordAmount + transactionTotals.khayalamiAmount).toLocaleString()}`);
    console.log('');
    
    console.log('💸 FROM PAYOUTS:');
    console.log('-'.repeat(80));
    console.log(`  Total Payouts: ${allPayouts.length}`);
    const landlordPayouts = allPayouts.filter(p => p.recipientType === 'landlord' || p.payoutType === 'landlord' || p.payoutType === 'bulk_landlord');
    const khayalamiPayouts = allPayouts.filter(p => p.recipientType === 'khayalami' || p.payoutType === 'khayalami' || p.payoutType === 'bulk_khayalami');
    console.log(`  → Landlord Payouts: ${landlordPayouts.length}`);
    console.log(`  → Khayalami Payouts: ${khayalamiPayouts.length}`);
    console.log(`  → Total Landlord Amount: ${payoutTotals.landlord.toLocaleString()}`);
    console.log(`  → Total Khayalami Amount: ${payoutTotals.khayalami.toLocaleString()}`);
    console.log(`  → Total Payout Amount: ${payoutTotals.total.toLocaleString()}`);
    console.log('');
    
    // Get escrow account
    const escrowAccount = await db.collection('escrowaccounts').findOne({ accountType: 'main' });
    
    console.log('📦 ESCROW ACCOUNT:');
    console.log('-'.repeat(80));
    if (escrowAccount) {
      console.log(`  Total Distributed: ${escrowAccount.totalDistributed?.toLocaleString() || 0}`);
      console.log(`  Total Landlord Payouts: ${escrowAccount.totalLandlordPayouts?.toLocaleString() || 0}`);
      console.log(`  Total Khayalami Payouts: ${escrowAccount.totalKhayalamiPayouts?.toLocaleString() || 0}`);
    }
    console.log('');
    
    console.log('✅ VERIFICATION:');
    console.log('-'.repeat(80));
    
    // Check 1: Transaction landlord amounts vs payout amounts
    const landlordDiff = Math.abs(transactionTotals.landlordAmount - payoutTotals.landlord);
    if (landlordDiff < 0.01) {
      console.log(`  ✅ Landlord amounts match: ${transactionTotals.landlordAmount.toLocaleString()} = ${payoutTotals.landlord.toLocaleString()}`);
    } else {
      console.log(`  ❌ Landlord amounts mismatch!`);
      console.log(`     Transactions: ${transactionTotals.landlordAmount.toLocaleString()}`);
      console.log(`     Payouts: ${payoutTotals.landlord.toLocaleString()}`);
      console.log(`     Difference: ${landlordDiff.toLocaleString()}`);
    }
    
    // Check 2: Transaction khayalami amounts vs payout amounts
    const khayalamiDiff = Math.abs(transactionTotals.khayalamiAmount - payoutTotals.khayalami);
    if (khayalamiDiff < 0.01) {
      console.log(`  ✅ Khayalami amounts match: ${transactionTotals.khayalamiAmount.toLocaleString()} = ${payoutTotals.khayalami.toLocaleString()}`);
    } else {
      console.log(`  ❌ Khayalami amounts mismatch!`);
      console.log(`     Transactions: ${transactionTotals.khayalamiAmount.toLocaleString()}`);
      console.log(`     Payouts: ${payoutTotals.khayalami.toLocaleString()}`);
      console.log(`     Difference: ${khayalamiDiff.toLocaleString()}`);
    }
    
    // Check 3: Total distributed vs sum of payouts
    const totalDistributed = transactionTotals.landlordAmount + transactionTotals.khayalamiAmount;
    const totalPayouts = payoutTotals.landlord + payoutTotals.khayalami;
    const totalDiff = Math.abs(totalDistributed - totalPayouts);
    
    if (totalDiff < 0.01) {
      console.log(`  ✅ Total distributed amounts match: ${totalDistributed.toLocaleString()} = ${totalPayouts.toLocaleString()}`);
    } else {
      console.log(`  ❌ Total amounts mismatch!`);
      console.log(`     Transactions Total: ${totalDistributed.toLocaleString()}`);
      console.log(`     Payouts Total: ${totalPayouts.toLocaleString()}`);
      console.log(`     Difference: ${totalDiff.toLocaleString()}`);
    }
    
    // Check 4: Escrow account totals
    if (escrowAccount) {
      const accountTotal = (escrowAccount.totalLandlordPayouts || 0) + (escrowAccount.totalKhayalamiPayouts || 0);
      const accountDiff = Math.abs(totalDistributed - accountTotal);
      
      if (accountDiff < 0.01) {
        console.log(`  ✅ Escrow account totals match: ${accountTotal.toLocaleString()} = ${totalDistributed.toLocaleString()}`);
      } else {
        console.log(`  ⚠️  Escrow account total differs:`);
        console.log(`     Account Total: ${accountTotal.toLocaleString()}`);
        console.log(`     Distributed Total: ${totalDistributed.toLocaleString()}`);
        console.log(`     Difference: ${accountDiff.toLocaleString()}`);
      }
    }
    
    // Check 5: Math check (totalAmount should equal landlord + khayalami + deductions)
    const calculatedTotal = transactionTotals.landlordAmount + transactionTotals.khayalamiAmount + transactionTotals.deductions;
    const totalDiff2 = Math.abs(transactionTotals.totalAmount - calculatedTotal);
    
    if (totalDiff2 < 0.01) {
      console.log(`  ✅ Amount breakdown is correct:`);
      console.log(`     Total Amount = Landlord + Khayalami + Deductions`);
      console.log(`     ${transactionTotals.totalAmount.toLocaleString()} = ${transactionTotals.landlordAmount.toLocaleString()} + ${transactionTotals.khayalamiAmount.toLocaleString()} + ${transactionTotals.deductions.toLocaleString()}`);
    } else {
      console.log(`  ⚠️  Amount breakdown difference:`);
      console.log(`     Total Amount: ${transactionTotals.totalAmount.toLocaleString()}`);
      console.log(`     Calculated: ${calculatedTotal.toLocaleString()}`);
      console.log(`     Difference: ${totalDiff2.toLocaleString()}`);
    }
    
    console.log('');
    console.log('═'.repeat(80));
    console.log('📋 SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total from Tenants: ${transactionTotals.totalAmount.toLocaleString()}`);
    console.log(`Distributed to Landlords: ${transactionTotals.landlordAmount.toLocaleString()}`);
    console.log(`Distributed to Khayalami: ${transactionTotals.khayalamiAmount.toLocaleString()}`);
    console.log(`Deductions: ${transactionTotals.deductions.toLocaleString()}`);
    console.log(`Total Distributed: ${totalDistributed.toLocaleString()}`);
    console.log('═'.repeat(80));
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verifyAmounts()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

