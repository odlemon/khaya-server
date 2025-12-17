// @ts-nocheck
/**
 * Direct script to fix Brooke's login by setting isVerified and isActive to true
 * Writes all output to a log file for inspection
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create log file
const logFile = path.join(process.cwd(), 'brooke-fix-log.txt');
const log = (msg) => {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] ${msg}\n`;
  fs.appendFileSync(logFile, logMsg, 'utf8');
  console.log(msg);
};

async function fixBrookeLogin() {
  try {
    log('═'.repeat(80));
    log('🔧 FIXING BROOKE LOGIN ISSUE');
    log('═'.repeat(80));
    log(`⏰ Time: ${new Date().toLocaleString()}\n`);
    
    if (!process.env.MONGODB_URI) {
      log('❌ ERROR: MONGODB_URI not found in environment');
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    const email = 'brookechimoto@gmail.com';
    
    // Find user
    log(`🔍 Searching for user: ${email}`);
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    
    if (!user) {
      log(`❌ User not found with email: ${email}`);
      await mongoose.disconnect();
      process.exit(1);
    }
    
    log(`✅ User found: ${user.firstName} ${user.lastName}`);
    log(`   _id: ${user._id}`);
    log(`   Current isVerified: ${user.isVerified}`);
    log(`   Current isActive: ${user.isActive}\n`);
    
    // Update both fields
    log('🔄 Updating isVerified and isActive to true...');
    const result = await db.collection('users').updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          'isVerified': true,
          'isActive': true
        }
      }
    );
    
    log(`   Modified count: ${result.modifiedCount}`);
    log(`   Matched count: ${result.matchedCount}\n`);
    
    if (result.modifiedCount === 0 && result.matchedCount === 1) {
      log('⚠️  User was found but no changes were made (values may already be correct)');
    }
    
    // Verify the update
    log('🔍 Verifying update...');
    const updatedUser = await db.collection('users').findOne({ email: email.toLowerCase() });
    
    log(`   Updated isVerified: ${updatedUser.isVerified}`);
    log(`   Updated isActive: ${updatedUser.isActive}\n`);
    
    // Final check
    log('═'.repeat(80));
    log('✅ FINAL STATUS:');
    if (updatedUser.isActive && updatedUser.isVerified) {
      log('✅ LOGIN SHOULD WORK: Both isActive and isVerified are TRUE');
    } else {
      log('❌ LOGIN WILL FAIL:');
      if (!updatedUser.isActive) log('   - isActive is FALSE');
      if (!updatedUser.isVerified) log('   - isVerified is FALSE');
    }
    log('═'.repeat(80));
    
    // Write JSON snapshot
    const jsonFile = path.join(process.cwd(), 'brooke-fixed-status.json');
    const snapshot = {
      _id: updatedUser._id?.toString(),
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role,
      isVerified: updatedUser.isVerified,
      isActive: updatedUser.isActive,
      documentVerification: {
        status: updatedUser.documentVerification?.status || 'unverified'
      },
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(jsonFile, JSON.stringify(snapshot, null, 2), 'utf8');
    log(`\n📄 Status snapshot saved to: ${jsonFile}`);
    log(`📄 Full log saved to: ${logFile}\n`);
    
    await mongoose.disconnect();
    log('✅ Disconnected from MongoDB\n');
    
  } catch (error) {
    log(`❌ Error: ${error.message}`);
    log(`Stack: ${error.stack}`);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Clear log file first
if (fs.existsSync(logFile)) {
  fs.unlinkSync(logFile);
}

fixBrookeLogin();
