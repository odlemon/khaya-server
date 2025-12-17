// @ts-nocheck
/**
 * Script to delete document verification documents and reset document verification status for farainyariechimoto@gmail.com
 * 
 * This will:
 * 1. Keep isVerified and isActive as they are (email/account verification)
 * 2. Set documentVerification.status to "unverified"
 * 3. Delete all documents
 * 4. Clear verification metadata
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function resetFaraiDocuments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    const email = 'farainyariechimoto@gmail.com';
    
    console.log('═'.repeat(80));
    console.log('🗑️  RESETTING DOCUMENT VERIFICATION FOR FARAI');
    console.log('═'.repeat(80));
    console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);
    
    // Find user by email
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log(`❌ User not found with email: ${email}`);
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log(`📋 User found:`);
    console.log(`  Name: ${user.firstName} ${user.lastName}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Current isVerified: ${user.isVerified || false}`);
    console.log(`  Current isActive: ${user.isActive || false}`);
    console.log(`  Current Document Status: ${user.documentVerification?.status || 'unverified'}\n`);
    
    // Show current documents
    const documents = user.documentVerification?.documents || {};
    console.log('📄 Current Documents:');
    let hasDocuments = false;
    
    if (documents.idDocument?.url) {
      console.log(`  - ID Document: ${documents.idDocument.url}`);
      if (documents.idDocument.selfieUrl) {
        console.log(`    Selfie: ${documents.idDocument.selfieUrl}`);
      }
      if (documents.idDocument.selfieWithIdUrl) {
        console.log(`    Selfie with ID: ${documents.idDocument.selfieWithIdUrl}`);
      }
      hasDocuments = true;
    }
    if (documents.payslips?.urls?.length > 0) {
      console.log(`  - Payslips: ${documents.payslips.urls.length} file(s)`);
      hasDocuments = true;
    }
    if (documents.utilityBills?.urls?.length > 0) {
      console.log(`  - Utility Bills: ${documents.utilityBills.urls.length} file(s)`);
      hasDocuments = true;
    }
    if (documents.bankStatements?.urls?.length > 0) {
      console.log(`  - Bank Statements: ${documents.bankStatements.urls.length} file(s)`);
      hasDocuments = true;
    }
    if (documents.employmentLetter?.url) {
      console.log(`  - Employment Letter: ${documents.employmentLetter.url}`);
      hasDocuments = true;
    }
    if (documents.propertyProof?.urls?.length > 0) {
      console.log(`  - Property Proof: ${documents.propertyProof.urls.length} file(s)`);
      hasDocuments = true;
    }
    if (documents.propertyDocuments?.urls?.length > 0) {
      console.log(`  - Property Documents: ${documents.propertyDocuments.urls.length} file(s)`);
      hasDocuments = true;
    }
    
    if (!hasDocuments) {
      console.log(`  - No documents found`);
    }
    console.log('');
    
    // Reset verification and delete all documents (but keep isVerified and isActive)
    const result = await db.collection('users').updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          'documentVerification.status': 'unverified',
          'documentVerification.documents': {
            idDocument: {},
            payslips: {},
            utilityBills: {},
            bankStatements: {},
            employmentLetter: {},
            propertyProof: {},
            propertyDocuments: {}
          }
        },
        $unset: {
          'documentVerification.verifiedAt': '',
          'documentVerification.rejectedAt': '',
          'documentVerification.rejectionReason': '',
          'documentVerification.adminFeedback': '',
          'documentVerification.verifiedBy': '',
          'documentVerification.rejectedBy': ''
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Document verification reset + all documents deleted!\n');
    } else {
      console.log('⚠️  No changes made\n');
    }
    
    // Verify the changes
    const updatedUser = await db.collection('users').findOne({ email: email.toLowerCase() });
    
    console.log('📋 Updated Status:');
    console.log(`  isVerified: ${updatedUser.isVerified} (unchanged - email verification)`);
    console.log(`  isActive: ${updatedUser.isActive} (unchanged - account status)`);
    console.log(`  Document Status: ${updatedUser.documentVerification?.status || 'unverified'}`);
    console.log(`  ID Document: ${updatedUser.documentVerification?.documents?.idDocument?.url ? 'Still exists ❌' : '✅ Deleted'}`);
    console.log(`  Payslips: ${updatedUser.documentVerification?.documents?.payslips?.urls?.length > 0 ? 'Still exists ❌' : '✅ Deleted'}`);
    console.log(`  Utility Bills: ${updatedUser.documentVerification?.documents?.utilityBills?.urls?.length > 0 ? 'Still exists ❌' : '✅ Deleted'}`);
    console.log(`  Bank Statements: ${updatedUser.documentVerification?.documents?.bankStatements?.urls?.length > 0 ? 'Still exists ❌' : '✅ Deleted'}`);
    console.log(`  Employment Letter: ${updatedUser.documentVerification?.documents?.employmentLetter?.url ? 'Still exists ❌' : '✅ Deleted'}`);
    console.log(`  Property Proof: ${updatedUser.documentVerification?.documents?.propertyProof?.urls?.length > 0 ? 'Still exists ❌' : '✅ Deleted'}`);
    console.log(`  Property Documents: ${updatedUser.documentVerification?.documents?.propertyDocuments?.urls?.length > 0 ? 'Still exists ❌' : '✅ Deleted'}`);
    console.log('');
    console.log('✅ Farai now has documents cleared and document verification set to unverified');
    console.log('   (Email/account verification status unchanged)');
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
resetFaraiDocuments();
