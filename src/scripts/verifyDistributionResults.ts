// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EscrowTransaction, EscrowAccount } from '../models/Escrow';
import { LandlordBalance } from '../models/LandlordBalance';
import { Payout } from '../models/Escrow';
import { User } from '../models/User';

dotenv.config();

async function verifyDistributionResults() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('🔍 Verifying Distribution Results...\n');

    // Get escrow account
    const escrowAccount = await EscrowAccount.findOne({ accountType: 'main' });
    
    // Get distributed transactions
    const distributedTransactions = await EscrowTransaction.find({
      status: 'distributed'
    }).sort({ createdAt: 1 });

    // Get recent payouts (last 5 minutes)
    const recentPayouts = await Payout.find({
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    }).sort({ createdAt: -1 });

    // Get pending transactions (should be fewer now)
    const pendingTransactions = await EscrowTransaction.find({
      status: 'held',
      landlordPayoutStatus: 'pending'
    });

    console.log('📊 DISTRIBUTION STATUS:\n');

    // Check if distribution happened
    if (distributedTransactions.length === 0 && recentPayouts.length === 0) {
      console.log('❌ NO DISTRIBUTION DETECTED');
      console.log('   - No distributed transactions found');
      console.log('   - No recent payouts found');
      console.log('   - Distribution may not have been run yet\n');
      await mongoose.disconnect();
      return;
    }

    console.log('✅ DISTRIBUTION DETECTED!\n');

    // Verify escrow account
    console.log('📊 Escrow Account:');
    console.log(`   Total Held: ${escrowAccount?.totalHeld || 0}`);
    console.log(`   Total Distributed: ${escrowAccount?.totalDistributed || 0}`);
    console.log(`   Distributed Transactions: ${escrowAccount?.distributedTransactions || 0}`);
    
    const expectedHeld = 2280 - (escrowAccount?.totalDistributed || 0);
    if (Math.abs((escrowAccount?.totalHeld || 0) - expectedHeld) < 1) {
      console.log(`   ✅ Total Held is correct (expected ~${expectedHeld})`);
    } else {
      console.log(`   ⚠️  Total Held may be incorrect (expected ~${expectedHeld})`);
    }
    console.log('');

    // Verify distributed transactions
    console.log(`📋 Distributed Transactions: ${distributedTransactions.length}`);
    if (distributedTransactions.length === 5) {
      console.log('   ✅ Correct number of transactions distributed');
    } else {
      console.log(`   ⚠️  Expected 5 transactions, found ${distributedTransactions.length}`);
    }
    console.log('');

    // Verify payouts
    const landlordPayouts = recentPayouts.filter(p => p.payoutType === 'landlord');
    const khayalamiPayouts = recentPayouts.filter(p => p.payoutType === 'khayalami');

    console.log(`💸 Payouts Created: ${recentPayouts.length}`);
    console.log(`   Landlord Payouts: ${landlordPayouts.length}`);
    console.log(`   Khayalami Payouts: ${khayalamiPayouts.length}`);

    if (landlordPayouts.length === 2 && khayalamiPayouts.length === 1) {
      console.log('   ✅ Correct number of payouts');
    } else {
      console.log('   ⚠️  Unexpected number of payouts');
    }
    console.log('');

    // Verify amounts
    const totalDistributed = distributedTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalLandlordAmount = distributedTransactions.reduce((sum, t) => sum + t.landlordAmount, 0);
    const totalKhayalamiAmount = distributedTransactions.reduce((sum, t) => sum + t.khayalamiAmount, 0);

    const actualLandlordPayouts = landlordPayouts.reduce((sum, p) => sum + p.amount, 0);
    const actualKhayalamiPayout = khayalamiPayouts.reduce((sum, p) => sum + p.amount, 0);

    console.log('💰 Amount Verification:');
    console.log(`   Total Distributed: ${totalDistributed}`);
    console.log(`   Landlord Payouts: ${actualLandlordPayouts} (expected: ${totalLandlordAmount})`);
    console.log(`   Khayalami Payout: ${actualKhayalamiPayout} (expected: ${totalKhayalamiAmount})`);

    const landlordMatch = Math.abs(actualLandlordPayouts - totalLandlordAmount) < 0.01;
    const khayalamiMatch = Math.abs(actualKhayalamiPayout - totalKhayalamiAmount) < 0.01;
    const totalMatch = Math.abs((actualLandlordPayouts + actualKhayalamiPayout) - totalDistributed) < 0.01;

    if (landlordMatch && khayalamiMatch && totalMatch) {
      console.log('   ✅ All amounts match correctly');
    } else {
      console.log('   ⚠️  Some amounts don\'t match');
    }
    console.log('');

    // Verify landlord balances
    console.log('👥 Landlord Balances:');
    const landlordIds = [...new Set(distributedTransactions.map(t => t.landlordId.toString()))];
    let allBalancesCorrect = true;

    for (const landlordId of landlordIds) {
      const landlord = await User.findById(landlordId);
      const landlordName = landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Unknown';
      const balance = await LandlordBalance.findOne({ landlordId });
      const payout = landlordPayouts.find(p => p.recipientId?.toString() === landlordId);
      const landlordTransactions = distributedTransactions.filter(t => t.landlordId.toString() === landlordId);
      const expectedAmount = landlordTransactions.reduce((sum, t) => sum + t.landlordAmount, 0);

      if (balance && payout) {
        const hasDistributionTransaction = balance.transactions.some((t: any) => 
          t.description?.includes('Escrow distribution')
        );

        console.log(`   ${landlordName}:`);
        console.log(`     Balance: ${balance.availableBalance}`);
        console.log(`     Expected Increase: ${expectedAmount}`);
        console.log(`     Payout Created: ${payout.amount}`);
        console.log(`     Has Distribution Transaction: ${hasDistributionTransaction ? '✅' : '❌'}`);

        if (hasDistributionTransaction && Math.abs(payout.amount - expectedAmount) < 0.01) {
          console.log(`     ✅ Correct`);
        } else {
          console.log(`     ⚠️  Issue detected`);
          allBalancesCorrect = false;
        }
      } else if (!balance) {
        console.log(`   ${landlordName}:`);
        console.log(`     ⚠️  No balance record found (should have been created)`);
        allBalancesCorrect = false;
      } else if (!payout) {
        console.log(`   ${landlordName}:`);
        console.log(`     ⚠️  No payout found`);
        allBalancesCorrect = false;
      }
    }
    console.log('');

    // Final verdict
    console.log('═══════════════════════════════════════════════');
    if (distributedTransactions.length === 5 &&
        landlordPayouts.length === 2 &&
        khayalamiPayouts.length === 1 &&
        landlordMatch && khayalamiMatch && totalMatch &&
        allBalancesCorrect &&
        Math.abs((escrowAccount?.totalHeld || 0) - expectedHeld) < 1) {
      console.log('✅ DISTRIBUTION WORKED CORRECTLY!');
      console.log('   All checks passed:');
      console.log('   ✅ Transactions distributed');
      console.log('   ✅ Payouts created correctly');
      console.log('   ✅ Amounts match expected values');
      console.log('   ✅ Landlord balances updated');
      console.log('   ✅ Escrow account updated');
    } else {
      console.log('⚠️  DISTRIBUTION HAS ISSUES');
      console.log('   Please review the details above');
    }
    console.log('═══════════════════════════════════════════════\n');

    await mongoose.disconnect();
  } catch (error: any) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verifyDistributionResults();



