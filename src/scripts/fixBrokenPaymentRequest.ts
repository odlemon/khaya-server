// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { PaymentRequest } from '../models/PaymentRequest';
import { Agreement } from '../models/Agreement';

dotenv.config();

const PAYMENT_REQUEST_ID = '692454acfd9c5b98e4665819';
const AGREEMENT_ID = '69240448387aea43d1f8a96f'; // From your agreement

async function fixBrokenPaymentRequest() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find the payment request
    const paymentRequest = await PaymentRequest.findById(PAYMENT_REQUEST_ID);
    if (!paymentRequest) {
      console.log('❌ Payment request not found');
      return;
    }

    console.log(`\n📋 Payment Request: ${paymentRequest._id}`);
    console.log(`Current agreementId: ${paymentRequest.agreementId || 'MISSING'}`);
    console.log(`Current propertyId: ${paymentRequest.propertyId || 'MISSING'}`);
    console.log(`Current tenantId: ${paymentRequest.tenantId}`);
    console.log(`Current landlordId: ${paymentRequest.landlordId}`);

    // Get the agreement
    const agreement = await Agreement.findById(AGREEMENT_ID);
    if (!agreement) {
      console.log('❌ Agreement not found');
      return;
    }

    console.log(`\n📄 Agreement: ${agreement._id}`);
    console.log(`Agreement tenantId: ${agreement.tenantId}`);
    console.log(`Agreement landlordId: ${agreement.landlordId}`);
    console.log(`Agreement propertyId: ${agreement.propertyId}`);

    // Fix the payment request
    paymentRequest.agreementId = agreement._id;
    paymentRequest.propertyId = agreement.propertyId;
    paymentRequest.tenantId = agreement.tenantId;
    paymentRequest.landlordId = agreement.landlordId;
    
    await paymentRequest.save();
    console.log('\n✅ Fixed payment request with correct agreement, property, tenant, and landlord IDs');

    // Update agreement paymentStatus if tenant has signed
    if (agreement.tenantSignature?.signedAt) {
      if (paymentRequest.status === 'pending_admin_approval') {
        agreement.tenantSignature.paymentStatus = 'pending_payment';
        await agreement.save();
        console.log('✅ Updated agreement paymentStatus to "pending_payment"');
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the script
fixBrokenPaymentRequest()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });






