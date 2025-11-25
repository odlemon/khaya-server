// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Agreement } from '../models/Agreement';

dotenv.config();

const AGREEMENT_ID = '69240448387aea43d1f8a96f';

async function fixAgreementPaymentStatus() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find the agreement
    const agreement = await Agreement.findById(AGREEMENT_ID);
    
    if (!agreement) {
      console.log('❌ Agreement not found');
      return;
    }

    console.log(`\n📋 Agreement found: ${agreement.title}`);
    console.log(`Current paymentStatus: ${agreement.tenantSignature?.paymentStatus || 'undefined'}`);
    console.log(`Tenant signed: ${agreement.tenantSignature?.signedAt ? 'Yes' : 'No'}`);

    // Check if there's actually a payment request
    const { PaymentRequest } = await import('../models/PaymentRequest');
    const pendingPaymentRequest = await PaymentRequest.findOne({
      agreementId: agreement._id,
      requestType: 'agreement_fee',
      status: 'pending_admin_approval'
    });

    if (pendingPaymentRequest) {
      console.log('\n⚠️  Payment request exists - keeping status as "pending_payment"');
      console.log('Payment request ID:', pendingPaymentRequest._id);
    } else {
      // No payment request exists, so it should be "no_payment"
      if (agreement.tenantSignature) {
        agreement.tenantSignature.paymentStatus = 'no_payment';
        await agreement.save();
        console.log('\n✅ Updated paymentStatus to "no_payment"');
      } else {
        console.log('\n⚠️  No tenantSignature found - tenant hasn\'t signed yet');
      }
    }

    // Verify the update
    const updatedAgreement = await Agreement.findById(AGREEMENT_ID);
    console.log(`\n📊 Updated paymentStatus: ${updatedAgreement?.tenantSignature?.paymentStatus || 'undefined'}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the script
fixAgreementPaymentStatus()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });



