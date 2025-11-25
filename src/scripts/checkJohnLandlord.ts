// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { LandlordBalance } from '../models/LandlordBalance';
import { User } from '../models/User';
import { Payout } from '../models/Escrow';

dotenv.config();

async function checkJohnLandlord() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    
    const johnId = '6899dd5f771b3614fdd8c394';
    const john = await User.findById(johnId);
    const balance = await LandlordBalance.findOne({ landlordId: johnId });
    const payouts = await Payout.find({ recipientId: johnId });
    
    console.log('John Landlord Details:');
    console.log(`  Name: ${john?.firstName} ${john?.lastName}`);
    console.log(`  Email: ${john?.email}`);
    console.log(`  ID: ${johnId}\n`);
    
    console.log('Balance:');
    if (balance) {
      console.log(`  Available: ${balance.availableBalance}`);
      console.log(`  Pending: ${balance.pendingBalance}`);
      console.log(`  Total Earnings: ${balance.totalEarnings}`);
      console.log(`  Transactions: ${balance.transactions.length}`);
    } else {
      console.log('  ⚠️  No LandlordBalance record found!');
    }
    
    console.log('\nPayouts:');
    payouts.forEach(p => {
      console.log(`  - ${p.amount} (${p.status}) - ${p.createdAt}`);
    });
    
    await mongoose.disconnect();
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkJohnLandlord();



