// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EscrowTransaction, EscrowAccount } from '../models/Escrow';
import { LandlordBalance } from '../models/LandlordBalance';
import { Payout } from '../models/Escrow';
import { User } from '../models/User';
import { Property } from '../models/Property';
import { Rental } from '../models/Rental';
import { Payment } from '../models/Payment';
import { LandlordPreferences } from '../models/LandlordPreferences';
import { RevenueSource } from '../models/RevenueSource';
import { EscrowService } from '../services/EscrowService';
import { Types } from 'mongoose';

dotenv.config();

const escrowService = new EscrowService();

async function testDistributionFinal() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Get admin user
    const admin = await User.findOne({ role: 'admin', email: 'admin@khaya.com' });
    if (!admin) {
      throw new Error('Admin user not found');
    }
    console.log(`✅ Admin: ${admin.email} (${admin._id})\n`);

    // Step 2: Get current state BEFORE
    console.log('📊 STATE BEFORE DISTRIBUTION:\n');
    
    const escrowAccountBefore = await EscrowAccount.findOne({ accountType: 'main' });
    console.log(`Escrow Account:`);
    console.log(`  Total Held: ${escrowAccountBefore?.totalHeld || 0}`);
    console.log(`  Total Distributed: ${escrowAccountBefore?.totalDistributed || 0}`);
    console.log(`  Distributed Transactions: ${escrowAccountBefore?.distributedTransactions || 0}\n`);

    const pendingTransactions = await EscrowTransaction.find({
      status: 'held',
      landlordPayoutStatus: 'pending'
    }).sort({ createdAt: 1 });

    console.log(`Pending Transactions: ${pendingTransactions.length}`);
    
    if (pendingTransactions.length === 0) {
      console.log('⚠️  No transactions to distribute');
      return;
    }

    // Calculate expected amounts
    const totalAmount = pendingTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalLandlordAmount = pendingTransactions.reduce((sum, t) => sum + t.landlordAmount, 0);
    const totalKhayalamiAmount = pendingTransactions.reduce((sum, t) => sum + t.khayalamiAmount, 0);

    console.log(`  Total Amount: ${totalAmount}`);
    console.log(`  Landlord Total: ${totalLandlordAmount}`);
    console.log(`  Khayalami Total: ${totalKhayalamiAmount}\n`);

    // Group by landlord
    const landlordGroups = new Map();
    pendingTransactions.forEach(t => {
      const landlordId = t.landlordId.toString();
      if (!landlordGroups.has(landlordId)) {
        landlordGroups.set(landlordId, []);
      }
      landlordGroups.get(landlordId).push(t);
    });

    console.log(`Landlords to receive payout: ${landlordGroups.size}`);
    const balancesBefore = new Map();
    for (const [landlordId, transactions] of landlordGroups.entries()) {
      const landlord = await User.findById(landlordId);
      const landlordName = landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Unknown';
      const landlordTotal = transactions.reduce((sum: number, t: any) => sum + t.landlordAmount, 0);
      
      const balance = await LandlordBalance.findOne({ landlordId });
      balancesBefore.set(landlordId, {
        availableBalance: balance?.availableBalance || 0,
        pendingBalance: balance?.pendingBalance || 0,
        totalEarnings: balance?.totalEarnings || 0
      });
      
      console.log(`  - ${landlordName} (${landlordId}):`);
      console.log(`    Expected Payout: ${landlordTotal}`);
      console.log(`    Current Balance: ${balance?.availableBalance || 0}`);
      console.log(`    Transactions: ${transactions.length}`);
    }

    // Step 3: Run distribution
    console.log(`\n🔄 RUNNING DISTRIBUTION...\n`);
    const result = await escrowService.distributeEscrow(
      'manual',
      admin._id.toString(),
      {}
    );

    console.log(`✅ Distribution completed!`);
    console.log(`  Total Distributed: ${result.totalDistributed}`);
    console.log(`  Landlord Payouts: ${result.landlordPayouts}`);
    console.log(`  Khayalami Payouts: ${result.khayalamiPayouts}`);
    console.log(`  Payout IDs: ${result.payoutIds.length}\n`);

    // Step 4: Verify results
    console.log('📊 STATE AFTER DISTRIBUTION:\n');

    const escrowAccountAfter = await EscrowAccount.findOne({ accountType: 'main' });
    console.log(`Escrow Account:`);
    console.log(`  Total Held: ${escrowAccountAfter?.totalHeld || 0} (was ${escrowAccountBefore?.totalHeld || 0})`);
    console.log(`  Total Distributed: ${escrowAccountAfter?.totalDistributed || 0} (was ${escrowAccountBefore?.totalDistributed || 0})`);
    console.log(`  Distributed Transactions: ${escrowAccountAfter?.distributedTransactions || 0} (was ${escrowAccountBefore?.distributedTransactions || 0})\n`);

    // Check payouts
    const payouts = await Payout.find({
      _id: { $in: result.payoutIds.map((id: string) => new Types.ObjectId(id)) }
    });

    const landlordPayouts = payouts.filter(p => p.payoutType === 'landlord');
    const khayalamiPayouts = payouts.filter(p => p.payoutType === 'khayalami');

    const actualLandlordTotal = landlordPayouts.reduce((sum, p) => sum + p.amount, 0);
    const actualKhayalamiTotal = khayalamiPayouts.reduce((sum, p) => sum + p.amount, 0);
    const actualTotal = actualLandlordTotal + actualKhayalamiTotal;

    console.log(`Payouts Created:`);
    console.log(`  Landlord Payouts: ${landlordPayouts.length}`);
    landlordPayouts.forEach(p => {
      const landlord = landlordGroups.get(p.recipientId?.toString());
      const landlordName = landlord ? 'Found' : 'Unknown';
      console.log(`    - ${p.recipientId}: ${p.amount} (${p.status})`);
    });
    console.log(`  Khayalami Payouts: ${khayalamiPayouts.length}`);
    khayalamiPayouts.forEach(p => {
      console.log(`    - Khayalami: ${p.amount} (${p.status})`);
    });
    console.log(`\n  Total Payout Amount: ${actualTotal}`);
    console.log(`  Expected Total: ${totalAmount}\n`);

    // Check landlord balances
    console.log(`Landlord Balances (AFTER):`);
    for (const [landlordId, transactions] of landlordGroups.entries()) {
      const balance = await LandlordBalance.findOne({ landlordId });
      const before = balancesBefore.get(landlordId);
      const payout = landlordPayouts.find(p => p.recipientId?.toString() === landlordId);
      
      const landlord = await User.findById(landlordId);
      const landlordName = landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Unknown';
      
      console.log(`  - ${landlordName} (${landlordId}):`);
      console.log(`    Before: ${before?.availableBalance || 0}`);
      console.log(`    After: ${balance?.availableBalance || 0}`);
      console.log(`    Increase: ${(balance?.availableBalance || 0) - (before?.availableBalance || 0)}`);
      console.log(`    Expected Increase: ${payout?.amount || 0}`);
      
      const increase = (balance?.availableBalance || 0) - (before?.availableBalance || 0);
      const expectedIncrease = payout?.amount || 0;
      
      if (Math.abs(increase - expectedIncrease) < 0.01) {
        console.log(`    ✅ Balance updated correctly`);
      } else {
        console.log(`    ⚠️  WARNING: Balance increase doesn't match payout!`);
      }
    }

    // Verify calculations
    const tolerance = 0.01;
    const totalMatch = Math.abs(actualTotal - totalAmount) < tolerance;
    const landlordMatch = Math.abs(actualLandlordTotal - totalLandlordAmount) < tolerance;
    const khayalamiMatch = Math.abs(actualKhayalamiTotal - totalKhayalamiAmount) < tolerance;

    console.log(`\n✅ VERIFICATION SUMMARY:`);
    if (totalMatch && landlordMatch && khayalamiMatch) {
      console.log(`  ✅ All amounts match expected values!`);
      console.log(`  ✅ Distribution successful!`);
    } else {
      console.log(`  ⚠️  WARNING: Some amounts don't match!`);
      if (!totalMatch) console.log(`    - Total mismatch: ${actualTotal} vs ${totalAmount}`);
      if (!landlordMatch) console.log(`    - Landlord mismatch: ${actualLandlordTotal} vs ${totalLandlordAmount}`);
      if (!khayalamiMatch) console.log(`    - Khayalami mismatch: ${actualKhayalamiTotal} vs ${totalKhayalamiAmount}`);
    }

    // Check distributed transactions
    const distributedTransactions = await EscrowTransaction.find({
      status: 'distributed',
      distributedAt: { $gte: new Date(Date.now() - 60000) }
    });
    console.log(`\n  ✅ Distributed Transactions: ${distributedTransactions.length} (expected ${pendingTransactions.length})`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testDistributionFinal()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

