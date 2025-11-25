// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Agreement } from '../models/Agreement';
import { User } from '../models/User';
import { Property } from '../models/Property';

dotenv.config();

const EMAILS = [
  'veximagames@gmail.com',
  'nkarata@clearcoverhealth.com'
];

async function deleteAgreementsByEmail() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find users by email
    const users = await User.find({
      email: { $in: EMAILS }
    });

    if (users.length === 0) {
      console.log('❌ No users found with those emails');
      return;
    }

    console.log(`\n📧 Found ${users.length} user(s):`);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}): ${user._id}`);
    });

    const userIds = users.map(u => u._id);

    // Find all agreements where these users are landlord or tenant
    const agreements = await Agreement.find({
      $or: [
        { landlordId: { $in: userIds } },
        { tenantId: { $in: userIds } }
      ]
    });

    if (agreements.length === 0) {
      console.log('\n❌ No agreements found for these users');
      return;
    }

    console.log(`\n📋 Found ${agreements.length} agreement(s):`);
    for (const agreement of agreements) {
      // Get landlord and tenant details
      const landlord = await User.findById(agreement.landlordId);
      const tenant = await User.findById(agreement.tenantId);
      const property = await Property.findById(agreement.propertyId);
      
      console.log(`\n  Agreement ID: ${agreement._id}`);
      console.log(`  Status: ${agreement.status}`);
      console.log(`  Title: ${agreement.title || 'N/A'}`);
      console.log(`  Landlord: ${landlord?.email || 'N/A'} (${landlord?.firstName || ''} ${landlord?.lastName || ''})`);
      console.log(`  Tenant: ${tenant?.email || 'N/A'} (${tenant?.firstName || ''} ${tenant?.lastName || ''})`);
      console.log(`  Property: ${property?.title || 'N/A'}`);
      console.log(`  Created: ${agreement.createdAt}`);
    }

    // Delete agreements
    console.log(`\n🗑️  Deleting ${agreements.length} agreement(s)...`);
    
    const deleteResults = await Promise.allSettled(
      agreements.map(async (agreement: any) => {
        await Agreement.findByIdAndDelete(agreement._id);
        console.log(`  ✅ Deleted agreement: ${agreement._id}`);
        return agreement._id;
      })
    );

    const deleted = deleteResults.filter(r => r.status === 'fulfilled').length;
    const failed = deleteResults.filter(r => r.status === 'rejected').length;

    console.log(`\n✅ Successfully deleted ${deleted} agreement(s)`);
    if (failed > 0) {
      console.log(`❌ Failed to delete ${failed} agreement(s)`);
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
deleteAgreementsByEmail()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

