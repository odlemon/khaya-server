// @ts-nocheck
/**
 * Fix Brooke's login using the actual User model (Mongoose)
 * This ensures we're using the same model as the login endpoint
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Import the User model
const User = require(path.join(__dirname, 'dist', 'models', 'User.js')).User || 
             require(path.join(__dirname, 'src', 'models', 'User.ts'));

async function fixBrooke() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');
    
    const email = 'brookechimoto@gmail.com';
    
    // Find user using Mongoose model (same as login endpoint)
    console.log(`🔍 Finding user: ${email}`);
    let user = await mongoose.model('User').findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('❌ User not found!');
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log('📋 BEFORE UPDATE:');
    console.log(`   isVerified: ${user.isVerified}`);
    console.log(`   isActive: ${user.isActive}\n`);
    
    // Update using Mongoose (same as what the app uses)
    console.log('🔄 Updating isVerified and isActive to true...');
    user.isVerified = true;
    user.isActive = true;
    await user.save();
    
    // Reload to verify
    user = await mongoose.model('User').findOne({ email: email.toLowerCase() });
    
    console.log('📋 AFTER UPDATE:');
    console.log(`   isVerified: ${user.isVerified}`);
    console.log(`   isActive: ${user.isActive}\n`);
    
    if (user.isVerified && user.isActive) {
      console.log('✅ SUCCESS! Brooke should now be able to login.');
    } else {
      console.log('❌ FAILED! Values not updated correctly.');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixBrooke();


