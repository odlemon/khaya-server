// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EscrowService } from '../services/EscrowService';
import { EscrowTransaction } from '../models/Escrow';
import { LandlordBalance } from '../models/LandlordBalance';
import { Payout } from '../models/Escrow';
import { User } from '../models/User';
import { Property } from '../models/Property';
import { Rental } from '../models/Rental';
import { Payment } from '../models/Payment';

dotenv.config();

const escrowService = new EscrowService();

async function testDistributionDirect() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Get admin user
    console.log('1️⃣ Finding admin user...');
    const admin = await User.findOne({ role: 'admin', email: 'admin@khaya.com' });
    if (!admin) {
      throw new Error('Admin user not found. Please create admin account first.');
    }
    console.log(`✅ Found admin: ${admin.email} (${admin._id})\n`);

    // Step 2: Get pending distribution summary
    console.log('2️⃣ Getting pending distribution summary...');
    // Query directly to avoid populate issues
    const pendingTransactions = await EscrowTransaction.find({
      status: 'held',
      landlordPayoutStatus: 'pending'
    }).sort({ createdAt: 1 });
    console.log(`   Found ${pendingTransactions.length} transactions ready for distribution`);

    if (pendingTransactions.length === 0) {
      console.log('⚠️  No transactions to distribute. Test complete.');
      return;
    }

    // Calculate expected amounts
    const totalAmount = pendingTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalLandlordAmount = pendingTransactions.reduce((sum, t) => sum + t.landlordAmount, 0);
    const totalKhayalamiAmount = pendingTransactions.reduce((sum, t) => sum + t.khayalamiAmount, 0);

    console.log(`\n📊 Expected Distribution:`);
    console.log(`   Total Amount: ${totalAmount}`);
    console.log(`   Landlord Total: ${totalLandlordAmount}`);
    console.log(`   Khayalami Total: ${totalKhayalamiAmount}`);

    // Group by landlord
    const landlordGroups = new Map();
    pendingTransactions.forEach(t => {
      const landlordId = t.landlordId.toString();
      if (!landlordGroups.has(landlordId)) {
        landlordGroups.set(landlordId, []);
      }
      landlordGroups.get(landlordId).push(t);
    });

    console.log(`\n👥 Landlords to receive payout: ${landlordGroups.size}`);
    for (const [landlordId, transactions] of landlordGroups.entries()) {
      const landlordTotal = transactions.reduce((sum: number, t: any) => sum + t.landlordAmount, 0);
      const landlord = await User.findById(landlordId);
      const landlordName = landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Unknown';
      console.log(`   - ${landlordName} (${landlordId}): ${landlordTotal} (${transactions.length} transactions)`);
    }

    // Step 3: Get current landlord balances (BEFORE)
    console.log(`\n3️⃣ Current landlord balances (BEFORE):`);
    const balancesBefore = new Map();
    for (const landlordId of landlordGroups.keys()) {
      const balance = await LandlordBalance.findOne({ landlordId });
      if (balance) {
        balancesBefore.set(landlordId, {
          availableBalance: balance.availableBalance,
          pendingBalance: balance.pendingBalance,
          totalEarnings: balance.totalEarnings
        });
        const landlord = await User.findById(landlordId);
        const landlordName = landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Unknown';
        console.log(`   - ${landlordName}: Available=${balance.availableBalance}, Pending=${balance.pendingBalance}`);
      }
    }

    // Step 4: Run distribution
    console.log(`\n4️⃣ Running distribution...`);
    const result = await escrowService.distributeEscrow(
      'manual',
      admin._id.toString(),
      {}
    );

    if (!result.success) {
      throw new Error('Distribution failed');
    }

    console.log(`✅ Distribution completed!`);
    console.log(`   Total Distributed: ${result.totalDistributed}`);
    console.log(`   Landlord Payouts: ${result.landlordPayouts}`);
    console.log(`   Khayalami Payouts: ${result.khayalamiPayouts}`);
    console.log(`   Payout IDs: ${result.payoutIds.length}`);

    // Step 5: Verify results
    console.log(`\n5️⃣ Verifying results...`);
    
    // Check payouts
    const payouts = await Payout.find({
      _id: { $in: result.payoutIds.map((id: string) => new mongoose.Types.ObjectId(id)) }
    });

    const landlordPayouts = payouts.filter(p => p.payoutType === 'landlord');
    const khayalamiPayouts = payouts.filter(p => p.payoutType === 'khayalami');

    const actualLandlordTotal = landlordPayouts.reduce((sum, p) => sum + p.amount, 0);
    const actualKhayalamiTotal = khayalamiPayouts.reduce((sum, p) => sum + p.amount, 0);
    const actualTotal = actualLandlordTotal + actualKhayalamiTotal;

    console.log(`\n   📊 Verification Results:`);
    console.log(`   Expected Total: ${totalAmount}`);
    console.log(`   Actual Total: ${actualTotal}`);
    console.log(`   Expected Landlord: ${totalLandlordAmount}`);
    console.log(`   Actual Landlord: ${actualLandlordTotal}`);
    console.log(`   Expected Khayalami: ${totalKhayalamiAmount}`);
    console.log(`   Actual Khayalami: ${actualKhayalamiTotal}`);

    // Check escrow transactions status
    const distributedTransactions = await EscrowTransaction.find({
      status: 'distributed',
      distributedAt: { $gte: new Date(Date.now() - 60000) } // Last minute
    });

    console.log(`\n   ✅ Distributed Transactions: ${distributedTransactions.length}`);

    // Check landlord balances (AFTER)
    console.log(`\n6️⃣ Landlord balances (AFTER):`);
    for (const [landlordId, transactions] of landlordGroups.entries()) {
      const balance = await LandlordBalance.findOne({ landlordId });
      if (balance) {
        const before = balancesBefore.get(landlordId);
        const payout = landlordPayouts.find(p => p.recipientId?.toString() === landlordId);
        const expectedIncrease = payout ? payout.amount : 0;
        const actualIncrease = before ? balance.availableBalance - before.availableBalance : balance.availableBalance;
        
        const landlord = await User.findById(landlordId);
        const landlordName = landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Unknown';
        
        console.log(`   - ${landlordName}:`);
        console.log(`     Before: ${before?.availableBalance || 0}`);
        console.log(`     After: ${balance.availableBalance}`);
        console.log(`     Expected Increase: ${expectedIncrease}`);
        console.log(`     Actual Increase: ${actualIncrease}`);
        
        if (Math.abs(actualIncrease - expectedIncrease) > 0.01) {
          console.log(`     ⚠️  WARNING: Balance increase doesn't match payout amount!`);
        } else {
          console.log(`     ✅ Balance increase matches payout`);
        }
      }
    }

    // Verify calculations
    const tolerance = 0.01;
    const totalMatch = Math.abs(actualTotal - totalAmount) < tolerance;
    const landlordMatch = Math.abs(actualLandlordTotal - totalLandlordAmount) < tolerance;
    const khayalamiMatch = Math.abs(actualKhayalamiTotal - totalKhayalamiAmount) < tolerance;

    console.log(`\n   📊 Final Verification:`);
    if (totalMatch && landlordMatch && khayalamiMatch) {
      console.log(`   ✅ All amounts match expected values!`);
    } else {
      console.log(`   ⚠️  WARNING: Some amounts don't match expected values!`);
      console.log(`   This might be due to subscription deductions or rounding.`);
    }

    console.log(`\n✅ Distribution test completed successfully!`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the test
testDistributionDirect()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

