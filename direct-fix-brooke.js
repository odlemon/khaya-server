// @ts-nocheck
const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    console.log('Connecting...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');
    
    const db = mongoose.connection.db;
    const email = 'brookechimoto@gmail.com';
    
    // Find before
    const before = await db.collection('users').findOne({ email: email.toLowerCase() });
    console.log('\nBEFORE:');
    console.log('isVerified:', before?.isVerified);
    console.log('isActive:', before?.isActive);
    
    // Update
    const result = await db.collection('users').updateOne(
      { email: email.toLowerCase() },
      { $set: { isVerified: true, isActive: true } }
    );
    console.log('\nUpdate result:', result.modifiedCount, 'modified');
    
    // Find after
    const after = await db.collection('users').findOne({ email: email.toLowerCase() });
    console.log('\nAFTER:');
    console.log('isVerified:', after?.isVerified);
    console.log('isActive:', after?.isActive);
    
    await mongoose.disconnect();
    console.log('\nDone!');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();


