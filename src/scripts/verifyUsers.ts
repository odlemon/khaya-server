// @ts-nocheck
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User';

dotenv.config();

const emails = ['veximagames@gmail.com', 'nkarata@clearcoverhealth.com'];

async function verifyDemoUsers() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  for (const email of emails) {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`⚠️  User not found: ${email}`);
      continue;
    }

    user.isVerified = true;
    user.isActive = true;
    if (!user.documentVerification) {
      user.documentVerification = {
        status: 'verified',
        documents: {},
        adminFeedback: 'Manually re-verified for demo',
        verifiedAt: new Date()
      } as any;
    } else {
      user.documentVerification.status = 'verified';
      user.documentVerification.documents = user.documentVerification.documents || {};
      user.documentVerification.adminFeedback = 'Manually re-verified for demo';
      user.documentVerification.verifiedAt = new Date();
      user.documentVerification.rejectedAt = undefined;
      user.documentVerification.rejectedBy = undefined;
    }

    await user.save();
    console.log(`✅ Re-verified ${email}`);
  }

  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
}

verifyDemoUsers()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

