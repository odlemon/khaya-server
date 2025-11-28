// Script to reset document verification for a specific landlord
const mongoose = require('mongoose');
require('dotenv').config();

async function resetVerification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    const email = 'veximagames@gmail.com';
    
    console.log('═'.repeat(80));
    console.log('🔄 RESETTING DOCUMENT VERIFICATION');
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
    
    // Reset document verification to unverified (keep email verification as true)
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
      
      // Verify the update
      const updatedUser = await db.collection('users').findOne({ email: email.toLowerCase() });
      
      console.log('📋 Updated User Status:');
      console.log(`  Document Status: ${updatedUser.documentVerification?.status || 'unverified'}`);
      console.log(`  isVerified: ${updatedUser.isVerified || false}`);
      console.log('');
      console.log('✅ Now when this user logs in:');
      console.log(`  isDocumentVerified: false`);
      console.log(`  documentVerificationStatus: "unverified"`);
    } else {
      console.log('⚠️  No changes made (user might already have this status)');
    }
    
    console.log('═'.repeat(80));
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

resetVerification()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

