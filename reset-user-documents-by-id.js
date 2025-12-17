// @ts-nocheck
/**
 * Script to COMPLETELY DELETE all document verification data by user ID
 * 
 * This will:
 * 1. Keep isVerified and isActive as they are (email/account verification)
 * 2. Set documentVerification.status to "unverified"
 * 3. COMPLETELY DELETE all documents and nested fields
 * 4. Clear ALL verification metadata
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function resetUserDocumentsById() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    const userId = '6925b95302dfd334e855f29f';
    
    console.log('═'.repeat(80));
    console.log('🗑️  COMPLETELY DELETING ALL DOCUMENT VERIFICATION DATA');
    console.log('═'.repeat(80));
    console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);
    console.log(`🔍 User ID: ${userId}\n`);
    
    // Find user by ID
    const user = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(userId) });
    
    if (!user) {
      console.log(`❌ User not found with ID: ${userId}`);
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log(`📋 User found:`);
    console.log(`  Name: ${user.firstName} ${user.lastName}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}\n`);
    
    // COMPLETELY DELETE everything - use $unset to remove entire documents object
    const result = await db.collection('users').updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          'documentVerification.status': 'unverified'
        },
        $unset: {
          'documentVerification.verifiedAt': '',
          'documentVerification.rejectedAt': '',
          'documentVerification.rejectionReason': '',
          'documentVerification.adminFeedback': '',
          'documentVerification.verifiedBy': '',
          'documentVerification.rejectedBy': '',
          'documentVerification.documents': ''
        }
      }
    );
    
    // Second update: set documents to empty object to ensure clean state
    await db.collection('users').updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          'documentVerification.documents': {}
        }
      }
    );
    
    console.log(`✅ Update result: ${result.modifiedCount} document(s) modified\n`);
    
    // Verify the changes
    const updatedUser = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(userId) });
    
    console.log('═'.repeat(80));
    console.log('📋 VERIFICATION STATUS AFTER COMPLETE RESET:');
    console.log('═'.repeat(80));
    console.log(`  User ID: ${updatedUser._id}`);
    console.log(`  Name: ${updatedUser.firstName} ${updatedUser.lastName}`);
    console.log(`  Email: ${updatedUser.email}`);
    console.log(`  Role: ${updatedUser.role}`);
    console.log(`  isVerified: ${updatedUser.isVerified} (unchanged - email verification)`);
    console.log(`  isActive: ${updatedUser.isActive} (unchanged - account status)`);
    console.log(`  Document Status: ${updatedUser.documentVerification?.status || 'unverified'}`);
    console.log('');
    
    // Check if documents object exists and is empty
    const docs = updatedUser.documentVerification?.documents || {};
    const hasAnyDocs = 
      (docs.idDocument && Object.keys(docs.idDocument).length > 0) ||
      (docs.payslips && Object.keys(docs.payslips).length > 0) ||
      (docs.utilityBills && Object.keys(docs.utilityBills).length > 0) ||
      (docs.bankStatements && Object.keys(docs.bankStatements).length > 0) ||
      (docs.employmentLetter && Object.keys(docs.employmentLetter).length > 0) ||
      (docs.propertyProof && Object.keys(docs.propertyProof).length > 0) ||
      (docs.propertyDocuments && Object.keys(docs.propertyDocuments).length > 0);
    
    console.log('📄 Document Verification Data:');
    console.log(`  Documents Object: ${hasAnyDocs ? '❌ STILL HAS DATA' : '✅ COMPLETELY CLEARED'}`);
    console.log(`  Verified At: ${updatedUser.documentVerification?.verifiedAt ? '❌ STILL EXISTS' : '✅ DELETED'}`);
    console.log(`  Rejected At: ${updatedUser.documentVerification?.rejectedAt ? '❌ STILL EXISTS' : '✅ DELETED'}`);
    console.log(`  Admin Feedback: ${updatedUser.documentVerification?.adminFeedback ? '❌ STILL EXISTS' : '✅ DELETED'}`);
    console.log(`  Rejection Reason: ${updatedUser.documentVerification?.rejectionReason ? '❌ STILL EXISTS' : '✅ DELETED'}`);
    console.log('');
    
    if (!hasAnyDocs && !updatedUser.documentVerification?.verifiedAt && !updatedUser.documentVerification?.rejectedAt) {
      console.log('✅ SUCCESS: ALL document verification data has been COMPLETELY DELETED!');
    } else {
      console.log('⚠️  WARNING: Some document verification data may still exist!');
    }
    
    console.log('═'.repeat(80));
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
resetUserDocumentsById();
