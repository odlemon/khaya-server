// @ts-nocheck
/**
 * Final fix using the exact same User import as AuthController
 */

require('ts-node/register');
require('dotenv').config();

const mongoose = require('mongoose');
const { User } = require('./src/models/User.ts');

async function fixBrooke() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!\n');
    
    const email = 'brookechimoto@gmail.com';
    
    // Find user (same as login endpoint)
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('❌ User not found!');
      await mongoose.disconnect();
      return;
    }
    
    console.log('BEFORE:');
    console.log(`  isVerified: ${user.isVerified}`);
    console.log(`  isActive: ${user.isActive}\n`);
    
    // Update (same model as login uses)
    user.isVerified = true;
    user.isActive = true;
    await user.save();
    
    console.log('AFTER:');
    console.log(`  isVerified: ${user.isVerified}`);
    console.log(`  isActive: ${user.isActive}\n`);
    
    if (user.isVerified && user.isActive) {
      console.log('✅ SUCCESS! Brooke can now login.');
    } else {
      console.log('❌ FAILED!');
    }
    
    await mongoose.disconnect();
    console.log('\nDone!');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixBrooke();
