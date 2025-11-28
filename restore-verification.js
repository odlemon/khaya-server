// Script to restore document verification for both users
const mongoose = require('mongoose');
require('dotenv').config();

async function restoreVerification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    const emails = [
      'veximagames@gmail.com',      // Landlord
      'nkarata@clearcoverhealth.com' // Tenant
    ];
    
    console.log('═'.repeat(80));
    console.log('🔄 RESTORING DOCUMENT VERIFICATION');
    console.log('═'.repeat(80));
    console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);
    
    for (const email of emails) {
      // Find user by email
      const user = await db.collection('users').findOne({ email: email.toLowerCase() });
      
      if (!user) {
        console.log(`❌ User not found with email: ${email}`);
        continue;
      }
      
      console.log(`📋 Processing: ${user.firstName} ${user.lastName} (${user.role})`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Current Document Status: ${user.documentVerification?.status || 'unverified'}`);
      
      // Restore document verification to verified
      const result = await db.collection('users').updateOne(
        { email: email.toLowerCase() },
        {
          $set: {
            'documentVerification.status': 'verified'
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`  ✅ Document verification restored to "verified"\n`);
      } else {
        console.log(`  ⚠️  Already verified or no changes made\n`);
      }
    }
    
    // Verify both updates
    console.log('📋 Verification Summary:');
    console.log('-'.repeat(80));
    
    for (const email of emails) {
      const user = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (user) {
        const isDocumentVerified = user.documentVerification?.status === 'verified';
        console.log(`${user.firstName} ${user.lastName} (${user.role}):`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Document Status: ${user.documentVerification?.status || 'unverified'}`);
        console.log(`  isDocumentVerified: ${isDocumentVerified}`);
        console.log('');
      }
    }
    
    console.log('═'.repeat(80));
    console.log('✅ All users restored to verified status!');
    console.log('═'.repeat(80));
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

restoreVerification()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));



