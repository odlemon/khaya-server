// Fix email verification back to true
const mongoose = require('mongoose');
require('dotenv').config();

async function fixEmailVerification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    const email = 'veximagames@gmail.com';
    
    // Set email verification back to true
    await db.collection('users').updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          isVerified: true,
          isActive: true
        }
      }
    );
    
    // Verify
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    
    console.log('✅ Email verification restored:');
    console.log(`  isVerified: ${user.isVerified}`);
    console.log(`  isActive: ${user.isActive}`);
    console.log(`  documentVerification.status: ${user.documentVerification?.status || 'unverified'}`);
    console.log(`  isDocumentVerified: ${user.documentVerification?.status === 'verified'}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixEmailVerification()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));



