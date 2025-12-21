// @ts-nocheck
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

(async () => {
  const output = [];
  const log = (msg) => {
    output.push(msg);
    console.log(msg);
  };
  
  try {
    log('Starting...');
    await mongoose.connect(process.env.MONGODB_URI);
    log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const email = 'brookechimoto@gmail.com';
    
    // Check before
    const before = await db.collection('users').findOne(
      { email: email.toLowerCase() },
      { projection: { email: 1, isVerified: 1, isActive: 1, firstName: 1, lastName: 1 } }
    );
    
    if (!before) {
      log('ERROR: User not found');
      fs.writeFileSync('brooke-update-result.txt', output.join('\n'));
      await mongoose.disconnect();
      process.exit(1);
    }
    
    log(`\nBEFORE UPDATE:`);
    log(`Email: ${before.email}`);
    log(`Name: ${before.firstName} ${before.lastName}`);
    log(`isVerified: ${before.isVerified}`);
    log(`isActive: ${before.isActive}`);
    
    // Update
    const result = await db.collection('users').updateOne(
      { email: email.toLowerCase() },
      { 
        $set: { 
          isVerified: true, 
          isActive: true 
        } 
      }
    );
    
    log(`\nUPDATE RESULT:`);
    log(`Matched: ${result.matchedCount}`);
    log(`Modified: ${result.modifiedCount}`);
    
    // Check after
    const after = await db.collection('users').findOne(
      { email: email.toLowerCase() },
      { projection: { email: 1, isVerified: 1, isActive: 1 } }
    );
    
    log(`\nAFTER UPDATE:`);
    log(`isVerified: ${after.isVerified}`);
    log(`isActive: ${after.isActive}`);
    
    if (after.isVerified && after.isActive) {
      log(`\n✅ SUCCESS! User can now login.`);
    } else {
      log(`\n❌ FAILED! Values not set correctly.`);
    }
    
    await mongoose.disconnect();
    log('\nDone!');
    
    // Write to file
    fs.writeFileSync('brooke-update-result.txt', output.join('\n'), 'utf8');
    
  } catch (err) {
    log(`ERROR: ${err.message}`);
    fs.writeFileSync('brooke-update-result.txt', output.join('\n'), 'utf8');
    await mongoose.disconnect();
    process.exit(1);
  }
})();


