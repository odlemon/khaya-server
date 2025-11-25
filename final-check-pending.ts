// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EscrowTransaction } from './src/models/Escrow';

dotenv.config();

async function finalCheck() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Direct query - exact same as service method
    const query: any = {
      status: "held",
      landlordPayoutStatus: "pending"
    };

    const transactions = await EscrowTransaction.find(query).sort({ createdAt: 1 });

    console.log(`📊 TRANSACTIONS WAITING FOR DISTRIBUTION: ${transactions.length}\n`);

    if (transactions.length > 0) {
      const totalAmount = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      const totalLandlordAmount = transactions.reduce((sum, t) => sum + (t.landlordAmount || 0), 0);
      const totalKhayalamiAmount = transactions.reduce((sum, t) => sum + (t.khayalamiAmount || 0), 0);

      console.log(`💰 TOTAL AMOUNTS:`);
      console.log(`   Total Amount: ${totalAmount.toLocaleString()}`);
      console.log(`   Landlord Share: ${totalLandlordAmount.toLocaleString()}`);
      console.log(`   Khayalami Commission: ${totalKhayalamiAmount.toLocaleString()}\n`);

      // Group by payment type
      const rentPayments = transactions.filter(t => t.paymentType === 'rent');
      const servicePayments = transactions.filter(t => t.paymentType === 'service');
      
      console.log(`📋 BREAKDOWN:`);
      console.log(`   Rent payments: ${rentPayments.length}`);
      console.log(`   Service payments (fees/subscriptions): ${servicePayments.length}`);
      
      if (servicePayments.length > 0) {
        const serviceTotal = servicePayments.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
        const serviceKhayalami = servicePayments.reduce((sum, t) => sum + (t.khayalamiAmount || 0), 0);
        console.log(`   Service payments total: ${serviceTotal.toLocaleString()}`);
        console.log(`   Service payments (all to Khayalami): ${serviceKhayalami.toLocaleString()}`);
      }
    } else {
      console.log('ℹ️  No transactions are currently waiting for distribution.\n');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

finalCheck()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

