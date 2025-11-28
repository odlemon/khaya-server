// @ts-nocheck
// Import all models first to register them
import '../models/User';
import '../models/Property';
import '../models/Rental';
import '../models/Payment';
import '../models/LandlordPreferences';
import '../models/RevenueSource';
import '../models/Subscription';
import '../models/Escrow';
import '../models/LandlordBalance';

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EscrowService } from '../services/EscrowService';
import { User } from '../models/User';
import { EscrowTransaction } from '../models/Escrow';
import { EscrowAccount } from '../models/Escrow';
import { LandlordBalance } from '../models/LandlordBalance';
import { Payout } from '../models/Escrow';

dotenv.config();

const escrowService = new EscrowService();

async function runDistribution() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get admin user
    const admin = await User.findOne({ role: 'admin', email: 'admin@khaya.com' });
    if (!admin) {
      throw new Error('Admin user not found');
    }
    console.log(`✅ Admin: ${admin.email} (${admin._id})\n`);

    // Get current state
    const escrowAccountBefore = await EscrowAccount.findOne({ accountType: 'main' });
    const pendingTransactions = await EscrowTransaction.find({
      status: 'held',
      landlordPayoutStatus: 'pending'
    });

    console.log(`📊 BEFORE DISTRIBUTION:`);
    console.log(`  Escrow Held: ${escrowAccountBefore?.totalHeld || 0}`);
    console.log(`  Pending Transactions: ${pendingTransactions.length}`);
    
    if (pendingTransactions.length === 0) {
      console.log('⚠️  No transactions to distribute');
      return;
    }

    const totalAmount = pendingTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalLandlordAmount = pendingTransactions.reduce((sum, t) => sum + t.landlordAmount, 0);
    const totalKhayalamiAmount = pendingTransactions.reduce((sum, t) => sum + t.khayalamiAmount, 0);

    console.log(`  Total to Distribute: ${totalAmount}`);
    console.log(`  Landlords: ${totalLandlordAmount}`);
    console.log(`  Khayalami: ${totalKhayalamiAmount}\n`);

    // Get landlord balances before
    const landlordIds = [...new Set(pendingTransactions.map(t => t.landlordId.toString()))];
    const balancesBefore = new Map();
    for (const landlordId of landlordIds) {
      const balance = await LandlordBalance.findOne({ landlordId });
      if (balance) {
        balancesBefore.set(landlordId, balance.availableBalance);
      }
    }

    // Run distribution
    console.log(`🔄 Running distribution...\n`);
    const result = await escrowService.distributeEscrow(
      'manual',
      admin._id.toString(),
      {}
    );

    console.log(`✅ Distribution completed!`);
    console.log(`  Total Distributed: ${result.totalDistributed}`);
    console.log(`  Landlord Payouts: ${result.landlordPayouts}`);
    console.log(`  Khayalami Payouts: ${result.khayalamiPayouts}\n`);

    // Verify results
    console.log(`📊 AFTER DISTRIBUTION:\n`);

    const escrowAccountAfter = await EscrowAccount.findOne({ accountType: 'main' });
    console.log(`Escrow Account:`);
    console.log(`  Total Held: ${escrowAccountAfter?.totalHeld || 0} (was ${escrowAccountBefore?.totalHeld || 0})`);
    console.log(`  Total Distributed: ${escrowAccountAfter?.totalDistributed || 0} (was ${escrowAccountBefore?.totalDistributed || 0})\n`);

    // Check payouts
    const payouts = await Payout.find({
      _id: { $in: result.payoutIds.map((id: string) => new mongoose.Types.ObjectId(id)) }
    });

    const landlordPayouts = payouts.filter(p => p.payoutType === 'landlord');
    const khayalamiPayouts = payouts.filter(p => p.payoutType === 'khayalami');

    console.log(`Payouts Created:`);
    landlordPayouts.forEach(p => {
      console.log(`  - Landlord ${p.recipientId}: ${p.amount} (${p.status})`);
    });
    khayalamiPayouts.forEach(p => {
      console.log(`  - Khayalami: ${p.amount} (${p.status})`);
    });
    console.log('');

    // Check landlord balances
    console.log(`Landlord Balances Updated:`);
    for (const landlordId of landlordIds) {
      const balance = await LandlordBalance.findOne({ landlordId });
      const before = balancesBefore.get(landlordId) || 0;
      const payout = landlordPayouts.find(p => p.recipientId?.toString() === landlordId);
      
      if (balance && payout) {
        const increase = balance.availableBalance - before;
        console.log(`  - ${landlordId}:`);
        console.log(`    Before: ${before}`);
        console.log(`    After: ${balance.availableBalance}`);
        console.log(`    Increase: ${increase}`);
        console.log(`    Expected: ${payout.amount}`);
        
        if (Math.abs(increase - payout.amount) < 0.01) {
          console.log(`    ✅ Correct!`);
        } else {
          console.log(`    ⚠️  Mismatch!`);
        }
      }
    }

    console.log(`\n✅ Distribution completed successfully!`);

  } catch (error: any) {
    console.error('\n❌ Distribution failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

runDistribution()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });






