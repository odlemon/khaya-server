// QUICK FIX FOR BROOKE LOGIN
// Run: node QUICK_FIX_BROOKE.js

const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const db = mongoose.connection.db;
    const email = 'brookechimoto@gmail.com';
    
    // Show before
    const before = await db.collection('users').findOne({ email: email.toLowerCase() });
    console.log('\n=== BEFORE ===');
    console.log('isVerified:', before?.isVerified);
    console.log('isActive:', before?.isActive);
    
    // Update
    const result = await db.collection('users').updateOne(
      { email: email.toLowerCase() },
      { $set: { isVerified: true, isActive: true } }
    );
    console.log('\n=== UPDATE RESULT ===');
    console.log('Modified:', result.modifiedCount);
    
    // Show after
    const after = await db.collection('users').findOne({ email: email.toLowerCase() });
    console.log('\n=== AFTER ===');
    console.log('isVerified:', after?.isVerified);
    console.log('isActive:', after?.isActive);
    
    if (after?.isVerified && after?.isActive) {
      console.log('\n✅ SUCCESS! Brooke can login now.');
    } else {
      console.log('\n❌ FAILED - values not updated');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('ERROR:', err.message);
    process.exit(1);
  });




