// Script to reset document verification for a specific tenant
const mongoose = require('mongoose');
require('dotenv').config();

async function resetTenantVerification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    const email = 'nkarata@clearcoverhealth.com';
    
    console.log('═'.repeat(80));
    console.log('🔄 RESETTING TENANT DOCUMENT VERIFICATION');
    console.log('═'.repeat(80));
    console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);
    
    // Find user by email
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log(`❌ User not found with email: ${email}`);
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log(`📋 User found:`);
    console.log(`  Name: ${user.firstName} ${user.lastName}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Current Document Status: ${user.documentVerification?.status || 'unverified'}`);
    console.log(`  Current isVerified: ${user.isVerified || false}\n`);
    
    // Reset document verification to unverified (keep email verification)
    const result = await db.collection('users').updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          'documentVerification.status': 'unverified'
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Document verification reset successfully!\n');
    } else {
      console.log('⚠️  Document verification already unverified\n');
    }
    
    // Verify the update
    const updatedUser = await db.collection('users').findOne({ email: email.toLowerCase() });
    
    console.log('📋 Updated User Status:');
    console.log(`  Email Verification (isVerified): ${updatedUser.isVerified || false}`);
    console.log(`  Document Status: ${updatedUser.documentVerification?.status || 'unverified'}`);
    console.log(`  isDocumentVerified: ${updatedUser.documentVerification?.status === 'verified'}`);
    console.log('');
    console.log('✅ Now when this user logs in:');
    console.log(`  isVerified: ${updatedUser.isVerified || false}`);
    console.log(`  isDocumentVerified: false`);
    console.log(`  documentVerificationStatus: "unverified"`);
    console.log('');
    console.log('═'.repeat(80));
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

resetTenantVerification()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));



