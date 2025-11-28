// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EscrowTransaction } from './src/models/Escrow';

dotenv.config();

async function checkAllEscrowStatus() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get all escrow transactions
    const allEscrow = await EscrowTransaction.find({}).sort({ createdAt: 1 });
    console.log(`📊 Total escrow transactions: ${allEscrow.length}\n`);

    // Group by status
    const byStatus = {
      pending: [],
      held: [],
      distributed: [],
      cancelled: []
    };

    for (const escrow of allEscrow) {
      byStatus[escrow.status as keyof typeof byStatus].push(escrow);
    }

    console.log(`\n📊 BY STATUS:`);
    console.log(`  Pending: ${byStatus.pending.length}`);
    console.log(`  Held: ${byStatus.held.length}`);
    console.log(`  Distributed: ${byStatus.distributed.length}`);
    console.log(`  Cancelled: ${byStatus.cancelled.length}`);

    // Check held transactions ready for distribution
    const heldPendingPayout = allEscrow.filter(
      e => e.status === 'held' && e.landlordPayoutStatus === 'pending'
    );
    
    console.log(`\n💰 HELD WITH PENDING PAYOUT: ${heldPendingPayout.length}`);
    
    if (heldPendingPayout.length > 0) {
      console.log(`\n📋 DETAILS:\n`);
      for (const escrow of heldPendingPayout) {
        console.log(`  Payment ID: ${escrow.paymentId}`);
        console.log(`  Total: ${escrow.totalAmount}`);
        console.log(`  Landlord: ${escrow.landlordAmount}`);
        console.log(`  Khayalami: ${escrow.khayalamiAmount}`);
        console.log(`  Payment Type: ${escrow.paymentType}`);
        console.log(`  Status: ${escrow.status}`);
        console.log(`  Landlord Payout Status: ${escrow.landlordPayoutStatus}`);
        console.log(`  Created: ${escrow.createdAt}`);
        console.log(`  ---`);
      }
    }

    // Show held transactions with other payout statuses
    const heldOther = allEscrow.filter(
      e => e.status === 'held' && e.landlordPayoutStatus !== 'pending'
    );
    
    if (heldOther.length > 0) {
      console.log(`\n⚠️  HELD WITH OTHER PAYOUT STATUS: ${heldOther.length}`);
      for (const escrow of heldOther) {
        console.log(`  Payment ID: ${escrow.paymentId} - Payout Status: ${escrow.landlordPayoutStatus || 'undefined'}`);
      }
    }

    // Show all escrow transactions details
    console.log(`\n\n📋 ALL ESCROW TRANSACTIONS:\n`);
    for (const escrow of allEscrow) {
      console.log(`  Payment ID: ${escrow.paymentId}`);
      console.log(`  Total: ${escrow.totalAmount}`);
      console.log(`  Landlord: ${escrow.landlordAmount}`);
      console.log(`  Khayalami: ${escrow.khayalamiAmount}`);
      console.log(`  Payment Type: ${escrow.paymentType}`);
      console.log(`  Status: ${escrow.status}`);
      console.log(`  Landlord Payout Status: ${escrow.landlordPayoutStatus || 'undefined'}`);
      console.log(`  Rental ID: ${escrow.rentalId || 'None'}`);
      console.log(`  Agreement ID: ${escrow.agreementId || 'None'}`);
      console.log(`  Created: ${escrow.createdAt}`);
      console.log(`  ---`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkAllEscrowStatus()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

