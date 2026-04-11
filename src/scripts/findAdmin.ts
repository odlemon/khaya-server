// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';

dotenv.config();

async function findAdmin() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const admins = await User.find({
      role: { $in: ["admin", "insurance_admin", "bank_admin"] },
    });
    
    if (admins.length === 0) {
      console.log('❌ No staff portal users found (admin / insurance_admin / bank_admin)');
    } else {
      console.log(`✅ Found ${admins.length} admin user(s):\n`);
      admins.forEach(admin => {
        console.log(`Email: ${admin.email}`);
        console.log(`Name: ${admin.firstName} ${admin.lastName}`);
        console.log(`ID: ${admin._id}`);
        console.log(`Role: ${admin.role}`);
        console.log('---\n');
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

findAdmin()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));






