// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Payment } from './src/models/Payment';
import { EscrowTransaction } from './src/models/Escrow';

dotenv.config();

async function checkMissingEscrow() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find all payments
    const allPayments = await Payment.find({}).sort({ createdAt: 1 });
    console.log(`📊 Total payments found: ${allPayments.length}\n`);

    let missingEscrow = [];
    let hasEscrow = [];

    for (const payment of allPayments) {
      const escrowTransaction = await EscrowTransaction.findOne({ paymentId: payment._id });
      
      if (!escrowTransaction) {
        missingEscrow.push(payment);
      } else {
        hasEscrow.push(payment);
      }
    }

    console.log(`\n📋 PAYMENTS WITHOUT ESCROW: ${missingEscrow.length}`);
    console.log(`📋 PAYMENTS WITH ESCROW: ${hasEscrow.length}\n`);

    if (missingEscrow.length > 0) {
      console.log(`\n💰 MISSING ESCROW TRANSACTIONS:\n`);
      for (const payment of missingEscrow) {
        console.log(`  Payment ID: ${payment._id}`);
        console.log(`  Type: ${payment.paymentType || 'N/A'}`);
        console.log(`  Amount: ${payment.totalAmount || payment.amount}`);
        console.log(`  Status: ${payment.status}`);
        console.log(`  Rental ID: ${payment.rentalId || 'None'}`);
        console.log(`  Agreement ID: ${payment.agreementId || 'None'}`);
        console.log(`  Property ID: ${payment.propertyId || 'None'}`);
        console.log(`  Payment Method: ${payment.paymentMethod}`);
        console.log(`  Notes: ${payment.notes || 'N/A'}`);
        console.log(`  Created: ${payment.createdAt}`);
        console.log(`  ---`);
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkMissingEscrow()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

