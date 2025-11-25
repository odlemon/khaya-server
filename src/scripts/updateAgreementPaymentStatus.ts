// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Agreement } from '../models/Agreement';
import { PaymentRequest } from '../models/PaymentRequest';

dotenv.config();

const AGREEMENT_ID = '69240448387aea43d1f8a96f';

async function updateAgreementPaymentStatus() {
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

    console.log(`\n📄 Agreement: ${agreement._id}`);
    console.log(`Tenant signed: ${agreement.tenantSignature?.signedAt ? 'Yes' : 'No'}`);
    console.log(`Current paymentStatus: ${agreement.tenantSignature?.paymentStatus || 'undefined'}`);

    // Check for payment request
    const paymentRequest = await PaymentRequest.findOne({
      agreementId: agreement._id,
      requestType: 'agreement_fee'
    });

    if (paymentRequest) {
      console.log(`\n📋 Payment Request: ${paymentRequest._id}`);
      console.log(`Status: ${paymentRequest.status}`);
      
      if (paymentRequest.status === 'pending_admin_approval') {
        if (agreement.tenantSignature) {
          agreement.tenantSignature.paymentStatus = 'pending_payment';
          await agreement.save();
          console.log('\n✅ Updated agreement paymentStatus to "pending_payment"');
        } else {
          console.log('\n⚠️  Tenant has not signed yet, cannot set paymentStatus');
        }
      } else if (paymentRequest.status === 'processed' || paymentRequest.status === 'approved') {
        if (agreement.tenantSignature) {
          agreement.tenantSignature.paymentStatus = 'verified';
          await agreement.save();
          console.log('\n✅ Updated agreement paymentStatus to "verified"');
        }
      }
    } else {
      console.log('\n⚠️  No payment request found');
      if (agreement.tenantSignature) {
        agreement.tenantSignature.paymentStatus = 'no_payment';
        await agreement.save();
        console.log('✅ Updated agreement paymentStatus to "no_payment"');
      }
    }

    // Verify
    const updated = await Agreement.findById(AGREEMENT_ID);
    console.log(`\n📊 Final paymentStatus: ${updated?.tenantSignature?.paymentStatus || 'undefined'}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the script
updateAgreementPaymentStatus()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });



