#!/usr/bin/env node

/**
 * Database Cleanup Script
 * Deletes all data except for admin@khaya.com account
 * 
 * Usage: node cleanup-database.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import all models
const User = require('./src/models/User').default || require('./src/models/User');
const Property = require('./src/models/Property').default || require('./src/models/Property');
const Connection = require('./src/models/Connection').default || require('./src/models/Connection');
const Agreement = require('./src/models/Agreement').default || require('./src/models/Agreement');
const Chat = require('./src/models/Chat').default || require('./src/models/Chat');
const Message = require('./src/models/Chat').Message || require('./src/models/Chat').Message;
const Bill = require('./src/models/Bill').default || require('./src/models/Bill');
const Rental = require('./src/models/Rental').default || require('./src/models/Rental');
const Payment = require('./src/models/Payment').default || require('./src/models/Payment');
const Commission = require('./src/models/Commission').default || require('./src/models/Commission');
const LandlordBalance = require('./src/models/LandlordBalance').default || require('./src/models/LandlordBalance');
const Withdrawal = require('./src/models/Withdrawal').default || require('./src/models/Withdrawal');
const ServiceProvider = require('./src/models/ServiceProvider').default || require('./src/models/ServiceProvider');
const ServiceBooking = require('./src/models/ServiceBooking').default || require('./src/models/ServiceBooking');
const ServiceReminder = require('./src/models/ServiceReminder').default || require('./src/models/ServiceReminder');
const MaintenanceRequest = require('./src/models/MaintenanceRequest').default || require('./src/models/MaintenanceRequest');
const Favorite = require('./src/models/Favorite').default || require('./src/models/Favorite');
const Onboarding = require('./src/models/Onboarding').default || require('./src/models/Onboarding');
const EmailVerification = require('./src/models/EmailVerification').default || require('./src/models/EmailVerification');
const TwoFactorAuth = require('./src/models/TwoFactorAuth').default || require('./src/models/TwoFactorAuth');
const Signature = require('./src/models/Signature').default || require('./src/models/Signature');
const AgreementTemplate = require('./src/models/AgreementTemplate').default || require('./src/models/AgreementTemplate');
const ConditionLog = require('./src/models/ConditionLog').default || require('./src/models/ConditionLog');

const ADMIN_EMAIL = 'admin@khaya.com';

async function connectToDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

async function findAdminUser() {
  try {
    const admin = await User.findOne({ email: ADMIN_EMAIL });
    
    if (!admin) {
      console.log('⚠️  Admin user not found with email:', ADMIN_EMAIL);
      console.log('   Creating admin user...');
      
      // Create admin user if it doesn't exist
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('Admin@123456', 10);
      
      const newAdmin = await User.create({
        email: ADMIN_EMAIL,
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Admin',
        role: 'admin',
        isVerified: true,
        isActive: true
      });
      
      console.log('✅ Admin user created');
      return newAdmin._id;
    }
    
    console.log('✅ Admin user found:', admin.email);
    return admin._id;
  } catch (error) {
    console.error('❌ Error finding admin user:', error.message);
    throw error;
  }
}

async function deleteAllDataExceptAdmin(adminId) {
  const collections = [
    { name: 'Properties', model: Property },
    { name: 'Connections', model: Connection },
    { name: 'Agreements', model: Agreement },
    { name: 'Chats', model: Chat },
    { name: 'Messages', model: Message },
    { name: 'Bills', model: Bill },
    { name: 'Rentals', model: Rental },
    { name: 'Payments', model: Payment },
    { name: 'Commissions', model: Commission },
    { name: 'LandlordBalances', model: LandlordBalance },
    { name: 'Withdrawals', model: Withdrawal },
    { name: 'ServiceProviders', model: ServiceProvider },
    { name: 'ServiceBookings', model: ServiceBooking },
    { name: 'ServiceReminders', model: ServiceReminder },
    { name: 'MaintenanceRequests', model: MaintenanceRequest },
    { name: 'Favorites', model: Favorite },
    { name: 'Onboardings', model: Onboarding },
    { name: 'EmailVerifications', model: EmailVerification },
    { name: 'TwoFactorAuths', model: TwoFactorAuth },
    { name: 'Signatures', model: Signature },
    { name: 'AgreementTemplates', model: AgreementTemplate },
    { name: 'ConditionLogs', model: ConditionLog }
  ];

  console.log('\n🗑️  Starting data cleanup...\n');

  for (const collection of collections) {
    try {
      const count = await collection.model.countDocuments();
      if (count > 0) {
        await collection.model.deleteMany({});
        console.log(`✅ Deleted ${count} ${collection.name}`);
      } else {
        console.log(`ℹ️  ${collection.name} already empty`);
      }
    } catch (error) {
      console.error(`❌ Error deleting ${collection.name}:`, error.message);
    }
  }

  // Delete all users except admin
  try {
    const userCount = await User.countDocuments({ _id: { $ne: adminId } });
    if (userCount > 0) {
      await User.deleteMany({ _id: { $ne: adminId } });
      console.log(`✅ Deleted ${userCount} users (kept admin)`);
    } else {
      console.log('ℹ️  No users to delete (admin only)');
    }
  } catch (error) {
    console.error('❌ Error deleting users:', error.message);
  }
}

async function verifyCleanup(adminId) {
  console.log('\n🔍 Verifying cleanup...\n');
  
  const collections = [
    { name: 'Users', model: User },
    { name: 'Properties', model: Property },
    { name: 'Connections', model: Connection },
    { name: 'Agreements', model: Agreement },
    { name: 'Chats', model: Chat },
    { name: 'Messages', model: Message },
    { name: 'Bills', model: Bill },
    { name: 'Rentals', model: Rental },
    { name: 'Payments', model: Payment },
    { name: 'Commissions', model: Commission },
    { name: 'LandlordBalances', model: LandlordBalance },
    { name: 'Withdrawals', model: Withdrawal },
    { name: 'ServiceProviders', model: ServiceProvider },
    { name: 'ServiceBookings', model: ServiceBooking },
    { name: 'ServiceReminders', model: ServiceReminder },
    { name: 'MaintenanceRequests', model: MaintenanceRequest },
    { name: 'Favorites', model: Favorite },
    { name: 'Onboardings', model: Onboarding },
    { name: 'EmailVerifications', model: EmailVerification },
    { name: 'TwoFactorAuths', model: TwoFactorAuth },
    { name: 'Signatures', model: Signature },
    { name: 'AgreementTemplates', model: AgreementTemplate },
    { name: 'ConditionLogs', model: ConditionLog }
  ];

  for (const collection of collections) {
    try {
      const count = await collection.model.countDocuments();
      if (collection.name === 'Users') {
        const adminCount = await User.countDocuments({ _id: adminId });
        const otherUsersCount = await User.countDocuments({ _id: { $ne: adminId } });
        console.log(`📊 ${collection.name}: ${count} total (${adminCount} admin, ${otherUsersCount} others)`);
      } else {
        console.log(`📊 ${collection.name}: ${count} documents`);
      }
    } catch (error) {
      console.error(`❌ Error counting ${collection.name}:`, error.message);
    }
  }
}

async function main() {
  try {
    console.log('🚀 Starting database cleanup...\n');
    
    await connectToDatabase();
    const adminId = await findAdminUser();
    await deleteAllDataExceptAdmin(adminId);
    await verifyCleanup(adminId);
    
    console.log('\n✅ Database cleanup completed successfully!');
    console.log(`🔐 Admin account preserved: ${ADMIN_EMAIL}`);
    console.log('💡 You can now start fresh with only the admin account');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n📤 Disconnected from database');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };




