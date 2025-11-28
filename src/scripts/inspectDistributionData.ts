// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EscrowTransaction, EscrowAccount } from '../models/Escrow';
import { LandlordBalance } from '../models/LandlordBalance';
import { Payout } from '../models/Escrow';
import { User } from '../models/User';

dotenv.config();

async function inspectDistributionData() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Escrow Account
    const escrowAccount = await EscrowAccount.findOne({ accountType: 'main' });
    console.log('📊 ESCROW ACCOUNT:');
    console.log(`  Total Held: ${escrowAccount?.totalHeld || 0}`);
    console.log(`  Total Distributed: ${escrowAccount?.totalDistributed || 0}`);
    console.log(`  Total Transactions: ${escrowAccount?.totalTransactions || 0}`);
    console.log(`  Pending Transactions: ${escrowAccount?.pendingTransactions || 0}`);
    console.log(`  Distributed Transactions: ${escrowAccount?.distributedTransactions || 0}`);
    console.log(`  Total Landlord Payouts: ${escrowAccount?.totalLandlordPayouts || 0}`);
    console.log(`  Total Khayalami Payouts: ${escrowAccount?.totalKhayalamiPayouts || 0}\n`);

    // Pending Transactions
    const pendingTransactions = await EscrowTransaction.find({
      status: 'held',
      landlordPayoutStatus: 'pending'
    }).sort({ createdAt: 1 });

    console.log(`📋 PENDING TRANSACTIONS (Ready for Distribution): ${pendingTransactions.length}\n`);

    if (pendingTransactions.length > 0) {
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

      console.log(`👥 LANDLORDS TO RECEIVE PAYOUT: ${landlordGroups.size}\n`);

      for (const [landlordId, transactions] of landlordGroups.entries()) {
        const landlord = await User.findById(landlordId);
        const landlordName = landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Unknown';
        const landlordTotal = transactions.reduce((sum: number, t: any) => sum + t.landlordAmount, 0);
        const landlordKhayalami = transactions.reduce((sum: number, t: any) => sum + t.khayalamiAmount, 0);
        const landlordGrandTotal = transactions.reduce((sum: number, t: any) => sum + t.totalAmount, 0);

        const balance = await LandlordBalance.findOne({ landlordId });
        
        console.log(`  ${landlordName} (${landlordId}):`);
        console.log(`    Email: ${landlord?.email || 'N/A'}`);
        console.log(`    Current Balance: ${balance?.availableBalance || 0}`);
        console.log(`    Pending Balance: ${balance?.pendingBalance || 0}`);
        console.log(`    Total Earnings: ${balance?.totalEarnings || 0}`);
        console.log(`    Expected Payout: ${landlordTotal}`);
        console.log(`    Khayalami Commission: ${landlordKhayalami}`);
        console.log(`    Total Payment: ${landlordGrandTotal}`);
        console.log(`    Transactions: ${transactions.length}`);
        
        transactions.forEach((t: any, idx: number) => {
          console.log(`      ${idx + 1}. Payment ${t.paymentId}: ${t.totalAmount} (Landlord: ${t.landlordAmount}, Khayalami: ${t.khayalamiAmount})`);
        });
        console.log('');
      }
    }

    // Existing Payouts
    const payouts = await Payout.find({}).sort({ createdAt: -1 });
    console.log(`💸 EXISTING PAYOUTS: ${payouts.length}\n`);
    
    if (payouts.length > 0) {
      const landlordPayouts = payouts.filter(p => p.payoutType === 'landlord');
      const khayalamiPayouts = payouts.filter(p => p.payoutType === 'khayalami');
      
      console.log(`  Landlord Payouts: ${landlordPayouts.length}`);
      landlordPayouts.forEach(p => {
        console.log(`    - ${p.recipientId}: ${p.amount} (${p.status}) - ${p.createdAt}`);
      });
      
      console.log(`  Khayalami Payouts: ${khayalamiPayouts.length}`);
      khayalamiPayouts.forEach(p => {
        console.log(`    - Khayalami: ${p.amount} (${p.status}) - ${p.createdAt}`);
      });
    }

    // All Landlord Balances
    const allBalances = await LandlordBalance.find({});
    console.log(`\n💰 ALL LANDLORD BALANCES: ${allBalances.length}\n`);
    
    for (const balance of allBalances) {
      const landlord = await User.findById(balance.landlordId);
      const landlordName = landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Unknown';
      console.log(`  ${landlordName} (${balance.landlordId}):`);
      console.log(`    Available: ${balance.availableBalance}`);
      console.log(`    Pending: ${balance.pendingBalance}`);
      console.log(`    Total Earnings: ${balance.totalEarnings}`);
      console.log(`    Total Withdrawn: ${balance.totalWithdrawn}`);
      console.log(`    Transactions: ${balance.transactions.length}`);
    }

    console.log(`\n✅ Data inspection complete!`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

inspectDistributionData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));






