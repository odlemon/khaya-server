// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { PaymentRequest } from '../models/PaymentRequest';
import { Agreement } from '../models/Agreement';
import { Payment } from '../models/Payment';
import { RevenueSource } from '../models/RevenueSource';

dotenv.config();

const AGREEMENT_ID = '69240448387aea43d1f8a96f';

async function resetAgreementPayment() {
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
    console.log(`Current paymentStatus: ${agreement.tenantSignature?.paymentStatus || 'undefined'}`);

    // Find and delete payment requests for this agreement
    const paymentRequests = await PaymentRequest.find({
      agreementId: agreement._id,
      requestType: 'agreement_fee'
    });

    console.log(`\n📋 Found ${paymentRequests.length} payment request(s) for this agreement`);

    for (const request of paymentRequests) {
      console.log(`   Deleting payment request: ${request._id}`);
      await PaymentRequest.findByIdAndDelete(request._id);
    }

    // Find and delete payment records for this agreement
    const payments = await Payment.find({
      agreementId: agreement._id,
      paymentType: 'service'
    });

    console.log(`\n💰 Found ${payments.length} payment record(s) for this agreement`);

    for (const payment of payments) {
      console.log(`   Deleting payment: ${payment._id}`);
      await Payment.findByIdAndDelete(payment._id);
    }

    // Find and delete revenue sources for this agreement
    const revenueSources = await RevenueSource.find({
      agreementId: agreement._id,
      sourceType: 'agreement_fee'
    });

    console.log(`\n💵 Found ${revenueSources.length} revenue source(s) for this agreement`);

    for (const revenue of revenueSources) {
      console.log(`   Deleting revenue source: ${revenue._id}`);
      await RevenueSource.findByIdAndDelete(revenue._id);
    }

    // Reset agreement payment status
    if (agreement.tenantSignature) {
      agreement.tenantSignature.paymentStatus = 'no_payment';
      await agreement.save();
      console.log('\n✅ Reset agreement paymentStatus to "no_payment"');
    } else {
      console.log('\n⚠️  Tenant has not signed yet, no paymentStatus to reset');
    }

    // Verify
    const updated = await Agreement.findById(AGREEMENT_ID);
    console.log(`\n📊 Final paymentStatus: ${updated?.tenantSignature?.paymentStatus || 'undefined'}`);
    console.log(`✅ Agreement is ready for testing`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the script
resetAgreementPayment()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });






