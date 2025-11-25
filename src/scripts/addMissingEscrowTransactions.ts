// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Payment } from '../models/Payment';
import { EscrowTransaction } from '../models/Escrow';
import { RevenueSource } from '../models/RevenueSource';
import { escrowService } from '../services/EscrowService';
import { Types } from 'mongoose';

dotenv.config();

async function addMissingEscrowTransactions() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find all payments without escrow transactions
    const allPayments = await Payment.find({}).sort({ createdAt: 1 });
    console.log(`📊 Total payments found: ${allPayments.length}\n`);

    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const payment of allPayments) {
      try {
        // Check if escrow transaction already exists
        const existingEscrow = await EscrowTransaction.findOne({ paymentId: payment._id });
        
        if (existingEscrow) {
          skippedCount++;
          continue;
        }

        // Check if this is a rent payment (has rentalId) - these should already be in escrow
        // We're looking for non-rent payments: agreement fees, boosts, subscriptions
        if (payment.rentalId) {
          skippedCount++;
          continue; // Skip rent payments - they should already have escrow entries
        }

        // Find associated revenue sources
        const revenueSources = await RevenueSource.find({ paymentId: payment._id.toString() });
        const revenueSourceIds = revenueSources.map(rs => rs._id.toString());

        // Determine payment type and create escrow entry
        // For non-rent payments (agreement fees, boosts, subscriptions), 100% goes to Khayalami
        const deductions = {
          subscriptionFee: 0,
          processingFee: 0,
          insurancePremium: 0
        };

        // Determine if this is a verified payment
        const isVerified = payment.status === 'verified' || payment.verifiedAt !== null;

        console.log(`\n💰 Processing payment: ${payment._id}`);
        console.log(`   Type: ${payment.paymentType || 'N/A'}`);
        console.log(`   Amount: ${payment.totalAmount || payment.amount}`);
        console.log(`   Status: ${payment.status}`);
        console.log(`   Verified: ${isVerified ? 'Yes' : 'No'}`);
        console.log(`   Revenue Sources: ${revenueSourceIds.length}`);

        // Add to escrow
        await escrowService.addToEscrow(payment, {
          deductions,
          revenueSourceIds
        });

        // Update status to "held" if verified, otherwise keep as "pending"
        if (isVerified) {
          await escrowService.updateEscrowStatus(payment._id.toString(), "held");
        }

        addedCount++;
        console.log(`   ✅ Added to escrow`);

      } catch (error: any) {
        errorCount++;
        console.error(`   ❌ Error processing payment ${payment._id}:`, error.message);
      }
    }

    console.log(`\n\n📊 SUMMARY:`);
    console.log(`   ✅ Added: ${addedCount} escrow transactions`);
    console.log(`   ⏭️  Skipped: ${skippedCount} (already have escrow or rent payments)`);
    console.log(`   ❌ Errors: ${errorCount}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

addMissingEscrowTransactions()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

