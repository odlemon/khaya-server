// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkDistributionStatus() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Import models
    const { EscrowTransaction, EscrowAccount, Payout } = await import('./src/models/Escrow');
    const { LandlordBalance } = await import('./src/models/LandlordBalance');
    const { User } = await import('./src/models/User');

    console.log('═'.repeat(80));
    console.log('📊 DISTRIBUTION STATUS CHECK');
    console.log('═'.repeat(80));
    console.log(`\n⏰ Check Time: ${new Date().toLocaleString()}\n`);

    // ============================================
    // 1. ESCROW ACCOUNT STATUS
    // ============================================
    console.log('📦 ESCROW ACCOUNT:');
    console.log('-'.repeat(80));
    const escrowAccount = await EscrowAccount.findOne({ accountType: 'main' });
    if (escrowAccount) {
      console.log(`  Total Held: ${escrowAccount.totalHeld.toLocaleString()}`);
      console.log(`  Total Distributed: ${escrowAccount.totalDistributed.toLocaleString()}`);
      console.log(`  Total Landlord Payouts: ${escrowAccount.totalLandlordPayouts.toLocaleString()}`);
      console.log(`  Total Khayalami Payouts: ${escrowAccount.totalKhayalamiPayouts.toLocaleString()}`);
      console.log(`  Total Transactions: ${escrowAccount.totalTransactions}`);
      console.log(`  Pending Transactions: ${escrowAccount.pendingTransactions}`);
      console.log(`  Distributed Transactions: ${escrowAccount.distributedTransactions}`);
      if (escrowAccount.lastDistributionDate) {
        console.log(`  Last Distribution: ${new Date(escrowAccount.lastDistributionDate).toLocaleString()}`);
      }
    } else {
      console.log('  ⚠️  Escrow account not found');
    }
    console.log('');

    // ============================================
    // 2. PENDING TRANSACTIONS (Ready for Distribution)
    // ============================================
    console.log('⏳ PENDING TRANSACTIONS (Waiting for Distribution):');
    console.log('-'.repeat(80));
    const pendingTransactions = await EscrowTransaction.find({
      status: 'held',
      landlordPayoutStatus: 'pending'
    }).sort({ createdAt: 1 });

    console.log(`  Count: ${pendingTransactions.length}`);

    if (pendingTransactions.length > 0) {
      const totalAmount = pendingTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      const totalLandlordAmount = pendingTransactions.reduce((sum, t) => sum + (t.landlordAmount || 0), 0);
      const totalKhayalamiAmount = pendingTransactions.reduce((sum, t) => sum + (t.khayalamiAmount || 0), 0);

      console.log(`  Total Amount: ${totalAmount.toLocaleString()}`);
      console.log(`  Landlord Share: ${totalLandlordAmount.toLocaleString()}`);
      console.log(`  Khayalami Commission: ${totalKhayalamiAmount.toLocaleString()}`);

      // Group by payment type
      const rentPayments = pendingTransactions.filter(t => t.paymentType === 'rent');
      const servicePayments = pendingTransactions.filter(t => t.paymentType === 'service');
      
      console.log(`\n  Breakdown:`);
      console.log(`    Rent payments: ${rentPayments.length}`);
      console.log(`    Service payments (fees/subscriptions): ${servicePayments.length}`);

      // Group by landlord
      const landlordGroups = new Map<string, any[]>();
      for (const tx of pendingTransactions) {
        const landlordId = tx.landlordId?.toString() || 'unknown';
        if (!landlordGroups.has(landlordId)) {
          landlordGroups.set(landlordId, []);
        }
        landlordGroups.get(landlordId)!.push(tx);
      }

      console.log(`\n  Landlords to receive payouts: ${landlordGroups.size}`);
      for (const [landlordId, txs] of landlordGroups.entries()) {
        const landlordTotal = txs.reduce((sum, t) => sum + (t.landlordAmount || 0), 0);
        const landlord = await User.findById(landlordId);
        const name = landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Unknown';
        console.log(`    - ${name}: ${landlordTotal.toLocaleString()} (${txs.length} transactions)`);
      }

      // Calculate Khayalami total
      const khayalamiTotal = pendingTransactions.reduce((sum, t) => sum + (t.khayalamiAmount || 0), 0);
      console.log(`\n  Khayalami total to receive: ${khayalamiTotal.toLocaleString()}`);
    } else {
      console.log('  ✅ No pending transactions');
    }
    console.log('');

    // ============================================
    // 3. DISTRIBUTED TRANSACTIONS
    // ============================================
    console.log('✅ DISTRIBUTED TRANSACTIONS:');
    console.log('-'.repeat(80));
    const distributedTransactions = await EscrowTransaction.find({
      status: 'distributed'
    }).sort({ distributedAt: -1 });

    console.log(`  Count: ${distributedTransactions.length}`);

    if (distributedTransactions.length > 0) {
      const totalDistributed = distributedTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      const totalLandlordDistributed = distributedTransactions.reduce((sum, t) => sum + (t.landlordAmount || 0), 0);
      const totalKhayalamiDistributed = distributedTransactions.reduce((sum, t) => sum + (t.khayalamiAmount || 0), 0);

      console.log(`  Total Distributed: ${totalDistributed.toLocaleString()}`);
      console.log(`  Landlord Share Distributed: ${totalLandlordDistributed.toLocaleString()}`);
      console.log(`  Khayalami Commission Distributed: ${totalKhayalamiDistributed.toLocaleString()}`);

      // Recent distributions (last 5 minutes)
      const recentDistributions = distributedTransactions.filter(t => {
        if (!t.distributedAt) return false;
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return new Date(t.distributedAt) > fiveMinutesAgo;
      });

      if (recentDistributions.length > 0) {
        console.log(`\n  ⚡ Recent distributions (last 5 min): ${recentDistributions.length}`);
      }
    }
    console.log('');

    // ============================================
    // 4. PAYOUTS
    // ============================================
    console.log('💸 PAYOUTS:');
    console.log('-'.repeat(80));
    const allPayouts = await Payout.find({}).sort({ createdAt: -1 });
    console.log(`  Total Payouts: ${allPayouts.length}`);

    if (allPayouts.length > 0) {
      const landlordPayouts = allPayouts.filter(p => p.payoutType === 'landlord' || p.recipientType === 'landlord');
      const khayalamiPayouts = allPayouts.filter(p => p.payoutType === 'khayalami' || p.recipientType === 'khayalami');

      console.log(`  Landlord Payouts: ${landlordPayouts.length}`);
      console.log(`  Khayalami Payouts: ${khayalamiPayouts.length}`);

      const landlordTotal = landlordPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
      const khayalamiTotal = khayalamiPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

      console.log(`\n  Total Landlord Payout Amount: ${landlordTotal.toLocaleString()}`);
      console.log(`  Total Khayalami Payout Amount: ${khayalamiTotal.toLocaleString()}`);

      // Recent payouts (last 5 minutes)
      const recentPayouts = allPayouts.filter(p => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return new Date(p.createdAt) > fiveMinutesAgo;
      });

      if (recentPayouts.length > 0) {
        console.log(`\n  ⚡ Recent payouts (last 5 min): ${recentPayouts.length}`);
        for (const payout of recentPayouts) {
          console.log(`    - ${payout.payoutType}: ${payout.amount.toLocaleString()} (Status: ${payout.status})`);
        }
      }

      // Group by status
      const byStatus: Record<string, any[]> = {};
      for (const payout of allPayouts) {
        const status = payout.status || 'unknown';
        if (!byStatus[status]) byStatus[status] = [];
        byStatus[status].push(payout);
      }

      console.log(`\n  By Status:`);
      for (const [status, payouts] of Object.entries(byStatus)) {
        const total = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);
        console.log(`    ${status}: ${payouts.length} payouts, Total: ${total.toLocaleString()}`);
      }
    }
    console.log('');

    // ============================================
    // 5. LANDLORD BALANCES
    // ============================================
    console.log('💰 LANDLORD BALANCES:');
    console.log('-'.repeat(80));
    const allBalances = await LandlordBalance.find({}).sort({ totalEarnings: -1 });
    console.log(`  Total Landlords: ${allBalances.length}`);

    if (allBalances.length > 0) {
      const totalAvailable = allBalances.reduce((sum, b) => sum + (b.availableBalance || 0), 0);
      const totalPending = allBalances.reduce((sum, b) => sum + (b.pendingBalance || 0), 0);
      const totalEarnings = allBalances.reduce((sum, b) => sum + (b.totalEarnings || 0), 0);
      const totalWithdrawn = allBalances.reduce((sum, b) => sum + (b.totalWithdrawn || 0), 0);

      console.log(`  Total Available Balance: ${totalAvailable.toLocaleString()}`);
      console.log(`  Total Pending Balance: ${totalPending.toLocaleString()}`);
      console.log(`  Total Earnings (all time): ${totalEarnings.toLocaleString()}`);
      console.log(`  Total Withdrawn (all time): ${totalWithdrawn.toLocaleString()}`);

      // Show top 5 landlords
      console.log(`\n  Top 5 Landlords by Earnings:`);
      for (const balance of allBalances.slice(0, 5)) {
        const landlord = await User.findById(balance.landlordId);
        const name = landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Unknown';
        console.log(`    - ${name}: Available=${(balance.availableBalance || 0).toLocaleString()}, Pending=${(balance.pendingBalance || 0).toLocaleString()}, Total Earnings=${(balance.totalEarnings || 0).toLocaleString()}`);
      }
    }
    console.log('');

    // ============================================
    // 6. TRANSACTION STATUS SUMMARY
    // ============================================
    console.log('📊 TRANSACTION STATUS SUMMARY:');
    console.log('-'.repeat(80));
    const allEscrowTransactions = await EscrowTransaction.find({});
    
    const byStatus: Record<string, any[]> = {};
    for (const tx of allEscrowTransactions) {
      const status = tx.status || 'unknown';
      if (!byStatus[status]) byStatus[status] = [];
      byStatus[status].push(tx);
    }

    for (const [status, txs] of Object.entries(byStatus)) {
      const total = txs.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      console.log(`  ${status}: ${txs.length} transactions, Total: ${total.toLocaleString()}`);
    }
    console.log('');

    // ============================================
    // 7. SUMMARY
    // ============================================
    console.log('═'.repeat(80));
    console.log('📋 SUMMARY');
    console.log('═'.repeat(80));
    
    const pendingTotal = pendingTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const pendingLandlord = pendingTransactions.reduce((sum, t) => sum + (t.landlordAmount || 0), 0);
    const pendingKhayalami = pendingTransactions.reduce((sum, t) => sum + (t.khayalamiAmount || 0), 0);

    console.log(`\n⏳ Waiting for Distribution:`);
    console.log(`   Transactions: ${pendingTransactions.length}`);
    console.log(`   Total Amount: ${pendingTotal.toLocaleString()}`);
    console.log(`   → Landlords: ${pendingLandlord.toLocaleString()}`);
    console.log(`   → Khayalami: ${pendingKhayalami.toLocaleString()}`);

    if (escrowAccount) {
      console.log(`\n💰 Escrow Account:`);
      console.log(`   Total Held: ${escrowAccount.totalHeld.toLocaleString()}`);
      console.log(`   Total Distributed: ${escrowAccount.totalDistributed.toLocaleString()}`);
    }

    console.log(`\n✅ Already Distributed:`);
    console.log(`   Transactions: ${distributedTransactions.length}`);
    
    const distributedTotal = distributedTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    console.log(`   Total Distributed: ${distributedTotal.toLocaleString()}`);

    console.log(`\n💸 Payouts Created:`);
    console.log(`   Total Payouts: ${allPayouts.length}`);
    const totalPayoutAmount = allPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
    console.log(`   Total Payout Amount: ${totalPayoutAmount.toLocaleString()}`);

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Check complete!');
    console.log('═'.repeat(80));

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkDistributionStatus()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

