// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { PaymentRequest } from '../models/PaymentRequest';
import { Agreement } from '../models/Agreement';
import { User } from '../models/User';

dotenv.config();

async function fixPaymentRequestsAndAgreements() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all agreement_fee payment requests
    const paymentRequests = await PaymentRequest.find({
      requestType: 'agreement_fee'
    });

    console.log(`\n📋 Found ${paymentRequests.length} agreement_fee payment request(s)`);

    let fixed = 0;
    let updatedAgreements = 0;

    for (const request of paymentRequests) {
      if (!request.agreementId) {
        console.log(`\n⚠️  Payment request ${request._id} has no agreementId`);
        console.log(`   Attempting to find agreement by tenantId and propertyId...`);
        
        // Try to find agreement by tenantId and propertyId
        if (request.propertyId) {
          const possibleAgreement = await Agreement.findOne({
            tenantId: request.tenantId,
            propertyId: request.propertyId,
            status: { $in: ['draft', 'pending', 'signed'] }
          }).sort({ createdAt: -1 });
          
          if (possibleAgreement) {
            console.log(`   ✅ Found agreement: ${possibleAgreement._id}`);
            request.agreementId = possibleAgreement._id;
            await request.save();
            console.log(`   ✅ Updated payment request with agreementId`);
          } else {
            console.log(`   ❌ Could not find matching agreement`);
            continue;
          }
        } else {
          console.log(`   ❌ No propertyId to search with`);
          continue;
        }
      }

      const agreement = await Agreement.findById(request.agreementId);
      
      if (!agreement) {
        console.log(`\n⚠️  Agreement ${request.agreementId} not found for payment request ${request._id}`);
        continue;
      }

      // Get user details for display
      const currentTenant = await User.findById(request.tenantId);
      const currentLandlord = await User.findById(request.landlordId);
      const correctTenant = await User.findById(agreement.tenantId);
      const correctLandlord = await User.findById(agreement.landlordId);

      console.log(`\n📄 Payment Request: ${request._id}`);
      console.log(`   Agreement: ${agreement._id}`);
      console.log(`   Current tenant: ${currentTenant?.firstName} ${currentTenant?.lastName} (${request.tenantId})`);
      console.log(`   Current landlord: ${currentLandlord?.firstName} ${currentLandlord?.lastName} (${request.landlordId})`);
      console.log(`   Correct tenant: ${correctTenant?.firstName} ${correctTenant?.lastName} (${agreement.tenantId})`);
      console.log(`   Correct landlord: ${correctLandlord?.firstName} ${correctLandlord?.lastName} (${agreement.landlordId})`);

      // Fix landlordId if it's wrong
      const correctLandlordId = agreement.landlordId.toString();
      const correctTenantId = agreement.tenantId.toString();
      const currentLandlordId = request.landlordId.toString();
      const currentTenantId = request.tenantId.toString();

      let needsUpdate = false;

      // Check if landlordId is wrong (should be from agreement, not tenant)
      if (currentLandlordId !== correctLandlordId.toString()) {
        console.log(`   ❌ Wrong landlordId! Should be ${correctLandlordId}, but is ${currentLandlordId}`);
        request.landlordId = correctLandlordId;
        needsUpdate = true;
      }

      // Check if tenantId is wrong (should be from agreement)
      if (currentTenantId !== correctTenantId.toString()) {
        console.log(`   ❌ Wrong tenantId! Should be ${correctTenantId}, but is ${currentTenantId}`);
        request.tenantId = correctTenantId;
        needsUpdate = true;
      }

      // Update propertyId if missing
      if (!request.propertyId || request.propertyId.toString() !== agreement.propertyId.toString()) {
        console.log(`   ⚠️  Updating propertyId`);
        request.propertyId = agreement.propertyId;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await request.save();
        console.log(`   ✅ Fixed payment request`);
        fixed++;
      }

      // Update agreement paymentStatus if tenant has signed
      if (agreement.tenantSignature?.signedAt) {
        const currentStatus = agreement.tenantSignature.paymentStatus;
        
        // Check if payment request is pending
        if (request.status === 'pending_admin_approval') {
          if (currentStatus !== 'pending_payment') {
            console.log(`   ⚠️  Agreement paymentStatus is "${currentStatus}", should be "pending_payment"`);
            agreement.tenantSignature.paymentStatus = 'pending_payment';
            await agreement.save();
            console.log(`   ✅ Updated agreement paymentStatus to "pending_payment"`);
            updatedAgreements++;
          }
        } else if (request.status === 'processed' || request.status === 'approved') {
          if (currentStatus !== 'verified') {
            console.log(`   ⚠️  Agreement paymentStatus is "${currentStatus}", should be "verified"`);
            agreement.tenantSignature.paymentStatus = 'verified';
            await agreement.save();
            console.log(`   ✅ Updated agreement paymentStatus to "verified"`);
            updatedAgreements++;
          }
        }
      }
    }

    console.log(`\n✅ Fixed ${fixed} payment request(s)`);
    console.log(`✅ Updated ${updatedAgreements} agreement(s)`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the script
fixPaymentRequestsAndAgreements()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

