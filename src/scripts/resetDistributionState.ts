// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { EscrowTransaction, EscrowAccount } from '../models/Escrow';
import { LandlordBalance } from '../models/LandlordBalance';
import { Payout } from '../models/Escrow';
import { RevenueSource } from '../models/RevenueSource';
import { Types } from 'mongoose';

dotenv.config();

const STATE_FILE = path.join(__dirname, '../../distribution-state-backup.json');

async function resetDistributionState() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if state file exists
    if (!fs.existsSync(STATE_FILE)) {
      throw new Error(`State file not found: ${STATE_FILE}. Please run saveDistributionState.ts first.`);
    }

    // Load saved state
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    console.log(`📂 Loading state from: ${new Date(state.timestamp).toISOString()}\n`);

    // Step 1: Delete all payouts created after the saved state
    console.log('1️⃣ Deleting payouts created after saved state...');
    const savedPayoutIds = new Set(state.payouts.map((p: any) => p._id));
    const allPayouts = await Payout.find({});
    const payoutsToDelete = allPayouts.filter(p => !savedPayoutIds.has(p._id.toString()));
    
    for (const payout of payoutsToDelete) {
      console.log(`   Deleting payout: ${payout._id} (${payout.amount})`);
      await Payout.findByIdAndDelete(payout._id);
    }
    console.log(`   ✅ Deleted ${payoutsToDelete.length} payouts\n`);

    // Step 2: Reset escrow transactions
    console.log('2️⃣ Resetting escrow transactions...');
    const savedTransactionIds = new Set(state.escrowTransactions.map((t: any) => t._id));
    const allTransactions = await EscrowTransaction.find({});
    
    let resetCount = 0;
    for (const transaction of allTransactions) {
      const saved = state.escrowTransactions.find((t: any) => t._id === transaction._id.toString());
      
      if (saved) {
        // Reset to saved state
        transaction.status = saved.status;
        transaction.landlordPayoutId = saved.landlordPayoutId ? new Types.ObjectId(saved.landlordPayoutId) : undefined;
        transaction.landlordPayoutStatus = saved.landlordPayoutStatus;
        transaction.khayalamiPayoutId = saved.khayalamiPayoutId ? new Types.ObjectId(saved.khayalamiPayoutId) : undefined;
        transaction.khayalamiPayoutStatus = saved.khayalamiPayoutStatus;
        transaction.distributedAt = saved.distributedAt ? new Date(saved.distributedAt) : undefined;
        await transaction.save();
        resetCount++;
      } else {
        // Delete transactions created after saved state
        console.log(`   Deleting new transaction: ${transaction._id}`);
        await EscrowTransaction.findByIdAndDelete(transaction._id);
      }
    }
    console.log(`   ✅ Reset ${resetCount} transactions\n`);

    // Step 3: Reset escrow account
    console.log('3️⃣ Resetting escrow account...');
    if (state.escrowAccount) {
      const account = await EscrowAccount.findOne({ accountType: 'main' });
      if (account) {
        account.totalHeld = state.escrowAccount.totalHeld;
        account.totalDistributed = state.escrowAccount.totalDistributed;
        account.totalLandlordPayouts = state.escrowAccount.totalLandlordPayouts;
        account.totalKhayalamiPayouts = state.escrowAccount.totalKhayalamiPayouts;
        account.totalTransactions = state.escrowAccount.totalTransactions;
        account.pendingTransactions = state.escrowAccount.pendingTransactions;
        account.distributedTransactions = state.escrowAccount.distributedTransactions;
        account.lastDistributionDate = state.escrowAccount.lastDistributionDate ? new Date(state.escrowAccount.lastDistributionDate) : undefined;
        account.lastDistributionAmount = state.escrowAccount.lastDistributionAmount;
        account.lastDistributionMethod = state.escrowAccount.lastDistributionMethod;
        await account.save();
        console.log(`   ✅ Escrow account reset\n`);
      }
    }

    // Step 4: Reset landlord balances
    console.log('4️⃣ Resetting landlord balances...');
    const savedBalanceIds = new Set(state.landlordBalances.map((b: any) => b._id));
    const allBalances = await LandlordBalance.find({});
    
    let balanceResetCount = 0;
    for (const balance of allBalances) {
      const saved = state.landlordBalances.find((b: any) => b._id === balance._id.toString());
      
      if (saved) {
        balance.availableBalance = saved.availableBalance;
        balance.pendingBalance = saved.pendingBalance;
        balance.totalEarnings = saved.totalEarnings;
        balance.totalWithdrawn = saved.totalWithdrawn;
        // Only restore transactions if they have balanceAfter
        if (saved.transactions && saved.transactions.length > 0) {
          const validTransactions = saved.transactions
            .filter((t: any) => t.balanceAfter !== undefined)
            .map((t: any) => ({
              type: t.type,
              amount: t.amount,
              description: t.description,
              date: new Date(t.date),
              balanceAfter: t.balanceAfter,
              referenceId: t.referenceId ? new Types.ObjectId(t.referenceId) : undefined
            }));
          balance.transactions = validTransactions;
        }
        await balance.save();
        balanceResetCount++;
      } else {
        // Delete balances created after saved state
        console.log(`   Deleting new balance: ${balance._id}`);
        await LandlordBalance.findByIdAndDelete(balance._id);
      }
    }
    console.log(`   ✅ Reset ${balanceResetCount} landlord balances\n`);

    // Step 5: Reset revenue sources
    console.log('5️⃣ Resetting revenue sources...');
    const savedRevenueIds = new Set(state.revenueSources.map((r: any) => r._id));
    const allRevenues = await RevenueSource.find({});
    
    let revenueResetCount = 0;
    for (const revenue of allRevenues) {
      const saved = state.revenueSources.find((r: any) => r._id === revenue._id.toString());
      
      if (saved) {
        revenue.status = saved.status;
        revenue.distributedAt = saved.distributedAt ? new Date(saved.distributedAt) : undefined;
        revenue.payoutId = saved.payoutId ? new Types.ObjectId(saved.payoutId) : undefined;
        await revenue.save();
        revenueResetCount++;
      } else {
        // Delete revenue sources created after saved state
        console.log(`   Deleting new revenue source: ${revenue._id}`);
        await RevenueSource.findByIdAndDelete(revenue._id);
      }
    }
    console.log(`   ✅ Reset ${revenueResetCount} revenue sources\n`);

    console.log('✅ Distribution state reset completed!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Deleted ${payoutsToDelete.length} payouts`);
    console.log(`   - Reset ${resetCount} escrow transactions`);
    console.log(`   - Reset ${balanceResetCount} landlord balances`);
    console.log(`   - Reset ${revenueResetCount} revenue sources`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the script
resetDistributionState()
  .then(() => {
    console.log('\n✅ Reset completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Reset failed:', error);
    process.exit(1);
  });

