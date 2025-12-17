// @ts-nocheck
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const logFile = 'brooke-comprehensive-fix.txt';

function log(msg) {
  const line = `${new Date().toISOString()} - ${msg}\n`;
  fs.appendFileSync(logFile, line, 'utf8');
  console.log(msg);
}

(async () => {
  // Clear log file
  if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
  
  try {
    log('═'.repeat(60));
    log('COMPREHENSIVE BROOKE ACCOUNT FIX');
    log('═'.repeat(60));
    
    if (!process.env.MONGODB_URI) {
      log('ERROR: MONGODB_URI not set');
      process.exit(1);
    }
    
    log(`MONGODB_URI: ${process.env.MONGODB_URI.substring(0, 20)}...`);
    log('Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    log('✅ Connected successfully\n');
    
    const db = mongoose.connection.db;
    const searchEmail = 'brookechimoto@gmail.com';
    
    // Search for user (case-insensitive)
    log(`Searching for: ${searchEmail}`);
    const users = await db.collection('users').find({
      email: { $regex: new RegExp(`^${searchEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }).toArray();
    
    log(`Found ${users.length} user(s) matching email\n`);
    
    if (users.length === 0) {
      log('❌ No users found!');
      log('Searching all users with "brooke" in email...');
      const allBrooke = await db.collection('users').find({
        email: { $regex: /brooke/i }
      }).toArray();
      log(`Found ${allBrooke.length} user(s) with "brooke" in email`);
      for (const u of allBrooke) {
        log(`  - ${u.email} (isVerified: ${u.isVerified}, isActive: ${u.isActive})`);
      }
      await mongoose.disconnect();
      process.exit(1);
    }
    
    // Process each user found
    for (const user of users) {
      log(`\n📋 User: ${user.firstName} ${user.lastName}`);
      log(`   Email: ${user.email}`);
      log(`   _id: ${user._id}`);
      log(`   BEFORE - isVerified: ${user.isVerified}, isActive: ${user.isActive}`);
      
      // Update
      const result = await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { isVerified: true, isActive: true } }
      );
      
      log(`   UPDATE - Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
      
      // Verify
      const updated = await db.collection('users').findOne({ _id: user._id });
      log(`   AFTER - isVerified: ${updated.isVerified}, isActive: ${updated.isActive}`);
      
      if (updated.isVerified && updated.isActive) {
        log(`   ✅ This user can now login!`);
      } else {
        log(`   ❌ Update may have failed`);
      }
    }
    
    log('\n' + '═'.repeat(60));
    log('✅ Fix complete!');
    log(`📄 Full log saved to: ${logFile}`);
    log('═'.repeat(60));
    
    await mongoose.disconnect();
    
  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`);
    log(`Stack: ${error.stack}`);
    await mongoose.disconnect();
    process.exit(1);
  }
})();
