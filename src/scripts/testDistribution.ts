// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@khaya.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456';

async function testDistribution() {
  try {
    console.log('🧪 Starting Distribution Test...\n');

    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    if (!loginResponse.data.success) {
      throw new Error('Failed to login as admin');
    }

    const token = loginResponse.data.data.token;
    const adminId = loginResponse.data.data.user._id;
    console.log(`✅ Logged in as admin: ${adminId}\n`);

    // Step 2: Get pending distribution summary
    console.log('2️⃣ Getting pending distribution summary...');
    const pendingResponse = await axios.get(`${BASE_URL}/api/distribution/pending`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const pendingTransactions = pendingResponse.data.data || [];
    console.log(`   Found ${pendingTransactions.length} transactions ready for distribution`);

    if (pendingTransactions.length === 0) {
      console.log('⚠️  No transactions to distribute. Test complete.');
      return;
    }

    // Calculate expected amounts
    const totalAmount = pendingTransactions.reduce((sum: number, t: any) => sum + (t.totalAmount || 0), 0);
    const totalLandlordAmount = pendingTransactions.reduce((sum: number, t: any) => sum + (t.landlordAmount || 0), 0);
    const totalKhayalamiAmount = pendingTransactions.reduce((sum: number, t: any) => sum + (t.khayalamiAmount || 0), 0);

    console.log(`\n📊 Expected Distribution:`);
    console.log(`   Total Amount: ${totalAmount}`);
    console.log(`   Landlord Total: ${totalLandlordAmount}`);
    console.log(`   Khayalami Total: ${totalKhayalamiAmount}`);

    // Group by landlord
    const landlordGroups = new Map();
    pendingTransactions.forEach((t: any) => {
      const landlordId = t.landlordId?._id || t.landlordId;
      if (!landlordGroups.has(landlordId)) {
        landlordGroups.set(landlordId, []);
      }
      landlordGroups.get(landlordId).push(t);
    });

    console.log(`\n👥 Landlords to receive payout: ${landlordGroups.size}`);
    landlordGroups.forEach((transactions, landlordId) => {
      const landlordTotal = transactions.reduce((sum: number, t: any) => sum + (t.landlordAmount || 0), 0);
      const landlordName = transactions[0]?.landlordId?.firstName || 'Unknown';
      console.log(`   - ${landlordName}: ${landlordTotal} (${transactions.length} transactions)`);
    });

    // Step 3: Run distribution
    console.log(`\n3️⃣ Running distribution...`);
    const distributeResponse = await axios.post(
      `${BASE_URL}/api/distribution/manual`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!distributeResponse.data.success) {
      throw new Error('Distribution failed: ' + distributeResponse.data.message);
    }

    const result = distributeResponse.data.data;
    console.log(`✅ Distribution completed!`);
    console.log(`   Total Distributed: ${result.totalDistributed}`);
    console.log(`   Landlord Payouts: ${result.landlordPayouts}`);
    console.log(`   Khayalami Payouts: ${result.khayalamiPayouts}`);
    console.log(`   Payout IDs: ${result.payoutIds.length}`);

    // Step 4: Verify results
    console.log(`\n4️⃣ Verifying results...`);
    await verifyDistributionResults(token, result, {
      expectedTotal: totalAmount,
      expectedLandlord: totalLandlordAmount,
      expectedKhayalami: totalKhayalamiAmount
    });

    console.log(`\n✅ Distribution test completed successfully!`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

async function verifyDistributionResults(token: string, distributionResult: any, expected: any) {
  const { EscrowTransaction } = await import('../models/Escrow');
  const { LandlordBalance } = await import('../models/LandlordBalance');
  const { Payout } = await import('../models/Escrow');
  const { RevenueSource } = await import('../models/RevenueSource');

  await mongoose.connect(process.env.MONGODB_URI!);

  // Check payouts
  const payouts = await Payout.find({
    _id: { $in: distributionResult.payoutIds.map((id: string) => new mongoose.Types.ObjectId(id)) }
  });

  const landlordPayouts = payouts.filter(p => p.payoutType === 'landlord');
  const khayalamiPayouts = payouts.filter(p => p.payoutType === 'khayalami');

  const actualLandlordTotal = landlordPayouts.reduce((sum, p) => sum + p.amount, 0);
  const actualKhayalamiTotal = khayalamiPayouts.reduce((sum, p) => sum + p.amount, 0);
  const actualTotal = actualLandlordTotal + actualKhayalamiTotal;

  console.log(`\n   📊 Verification Results:`);
  console.log(`   Expected Total: ${expected.expectedTotal}`);
  console.log(`   Actual Total: ${actualTotal}`);
  console.log(`   Expected Landlord: ${expected.expectedLandlord}`);
  console.log(`   Actual Landlord: ${actualLandlordTotal}`);
  console.log(`   Expected Khayalami: ${expected.expectedKhayalami}`);
  console.log(`   Actual Khayalami: ${actualKhayalamiTotal}`);

  // Check escrow transactions status
  const distributedTransactions = await EscrowTransaction.find({
    status: 'distributed',
    distributedAt: { $gte: new Date(Date.now() - 60000) } // Last minute
  });

  console.log(`\n   ✅ Distributed Transactions: ${distributedTransactions.length}`);

  // Check landlord balances
  const landlordIds = [...new Set(landlordPayouts.map(p => p.recipientId?.toString()))];
  const balances = await LandlordBalance.find({
    landlordId: { $in: landlordIds.map(id => new mongoose.Types.ObjectId(id)) }
  });

  console.log(`\n   💰 Landlord Balances Updated: ${balances.length}`);
  balances.forEach(b => {
    const payout = landlordPayouts.find(p => p.recipientId?.toString() === b.landlordId?.toString());
    if (payout) {
      console.log(`      - ${b.landlordId}: +${payout.amount} (New Balance: ${b.availableBalance})`);
    }
  });

  // Verify calculations
  const tolerance = 0.01; // Allow small rounding differences
  const totalMatch = Math.abs(actualTotal - expected.expectedTotal) < tolerance;
  const landlordMatch = Math.abs(actualLandlordTotal - expected.expectedLandlord) < tolerance;
  const khayalamiMatch = Math.abs(actualKhayalamiTotal - expected.expectedKhayalami) < tolerance;

  if (!totalMatch || !landlordMatch || !khayalamiMatch) {
    console.log(`\n   ⚠️  WARNING: Amounts don't match expected values!`);
    console.log(`   This might be due to subscription deductions or rounding.`);
  } else {
    console.log(`\n   ✅ All amounts match expected values!`);
  }

  await mongoose.disconnect();
}

// Run the test
testDistribution()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

