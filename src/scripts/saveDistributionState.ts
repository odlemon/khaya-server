// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { EscrowTransaction, EscrowAccount } from '../models/Escrow';
import { LandlordBalance } from '../models/LandlordBalance';
import { Payout } from '../models/Escrow';
import { RevenueSource } from '../models/RevenueSource';
import { User } from '../models/User';

dotenv.config();

const STATE_FILE = path.join(__dirname, '../../distribution-state-backup.json');

async function saveDistributionState() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const state: any = {
      timestamp: new Date().toISOString(),
      escrowAccount: null,
      escrowTransactions: [],
      landlordBalances: [],
      payouts: [],
      revenueSources: []
    };

    // Save Escrow Account
    const escrowAccount = await EscrowAccount.findOne({ accountType: 'main' });
    if (escrowAccount) {
      state.escrowAccount = {
        _id: escrowAccount._id.toString(),
        totalHeld: escrowAccount.totalHeld,
        totalDistributed: escrowAccount.totalDistributed,
        totalLandlordPayouts: escrowAccount.totalLandlordPayouts,
        totalKhayalamiPayouts: escrowAccount.totalKhayalamiPayouts,
        totalTransactions: escrowAccount.totalTransactions,
        pendingTransactions: escrowAccount.pendingTransactions,
        distributedTransactions: escrowAccount.distributedTransactions,
        lastDistributionDate: escrowAccount.lastDistributionDate,
        lastDistributionAmount: escrowAccount.lastDistributionAmount,
        lastDistributionMethod: escrowAccount.lastDistributionMethod
      };
      console.log(`📊 Escrow Account: Held=${escrowAccount.totalHeld}, Distributed=${escrowAccount.totalDistributed}`);
    }

    // Save all escrow transactions
    const escrowTransactions = await EscrowTransaction.find({})
      .sort({ createdAt: -1 });
    
    state.escrowTransactions = escrowTransactions.map(t => ({
      _id: t._id.toString(),
      paymentId: t.paymentId?.toString(),
      landlordId: t.landlordId?.toString(),
      tenantId: t.tenantId?.toString(),
      totalAmount: t.totalAmount,
      landlordAmount: t.landlordAmount,
      khayalamiAmount: t.khayalamiAmount,
      status: t.status,
      deductions: t.deductions,
      landlordPayoutId: t.landlordPayoutId?.toString(),
      landlordPayoutStatus: t.landlordPayoutStatus,
      khayalamiPayoutId: t.khayalamiPayoutId?.toString(),
      khayalamiPayoutStatus: t.khayalamiPayoutStatus,
      distributedAt: t.distributedAt,
      createdAt: t.createdAt
    }));
    console.log(`📋 Escrow Transactions: ${escrowTransactions.length} total`);

    // Save all landlord balances
    const landlordBalances = await LandlordBalance.find({})
      .sort({ createdAt: -1 });
    
    state.landlordBalances = landlordBalances.map(b => ({
      _id: b._id.toString(),
      landlordId: b.landlordId?.toString(),
      availableBalance: b.availableBalance,
      pendingBalance: b.pendingBalance,
      totalEarnings: b.totalEarnings,
      totalWithdrawn: b.totalWithdrawn,
      transactions: b.transactions.map((t: any) => ({
        type: t.type,
        amount: t.amount,
        description: t.description,
        date: t.date,
        referenceId: t.referenceId?.toString()
      }))
    }));
    console.log(`💰 Landlord Balances: ${landlordBalances.length} accounts`);

    // Save all payouts
    const payouts = await Payout.find({})
      .sort({ createdAt: -1 });
    
    state.payouts = payouts.map(p => ({
      _id: p._id.toString(),
      payoutType: p.payoutType,
      recipientId: p.recipientId?.toString(),
      recipientType: p.recipientType,
      amount: p.amount,
      status: p.status,
      escrowTransactionIds: p.escrowTransactionIds.map((id: any) => id.toString()),
      createdAt: p.createdAt
    }));
    console.log(`💸 Payouts: ${payouts.length} total`);

    // Save revenue sources
    const revenueSources = await RevenueSource.find({})
      .sort({ createdAt: -1 });
    
    state.revenueSources = revenueSources.map(r => ({
      _id: r._id.toString(),
      sourceType: r.sourceType,
      amount: r.amount,
      payerId: r.payerId?.toString(),
      recipientId: r.recipientId,
      status: r.status,
      paymentId: r.paymentId?.toString(),
      agreementId: r.agreementId?.toString(),
      distributedAt: r.distributedAt,
      payoutId: r.payoutId?.toString(),
      createdAt: r.createdAt
    }));
    console.log(`💵 Revenue Sources: ${revenueSources.length} total`);

    // Calculate summary
    const heldTransactions = escrowTransactions.filter(t => t.status === 'held');
    const totalHeld = heldTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalLandlordHeld = heldTransactions.reduce((sum, t) => sum + t.landlordAmount, 0);
    const totalKhayalamiHeld = heldTransactions.reduce((sum, t) => sum + t.khayalamiAmount, 0);

    state.summary = {
      totalHeld: totalHeld,
      totalLandlordHeld: totalLandlordHeld,
      totalKhayalamiHeld: totalKhayalamiHeld,
      heldTransactionsCount: heldTransactions.length,
      totalTransactionsCount: escrowTransactions.length
    };

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Held in Escrow: ${totalHeld}`);
    console.log(`   Landlord Amount: ${totalLandlordHeld}`);
    console.log(`   Khayalami Amount: ${totalKhayalamiHeld}`);
    console.log(`   Held Transactions: ${heldTransactions.length}`);

    // Save to file
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.log(`\n✅ State saved to: ${STATE_FILE}`);

    return state;

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
saveDistributionState()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

