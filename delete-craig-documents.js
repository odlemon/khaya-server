// Script to delete Craig's uploaded documents
const mongoose = require('mongoose');
require('dotenv').config();

async function deleteCraigDocuments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    const email = 'veximagames@gmail.com'; // Craig's email
    
    console.log('═'.repeat(80));
    console.log('🗑️  DELETING CRAIG\'S DOCUMENTS');
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
    console.log(`  Current Document Status: ${user.documentVerification?.status || 'unverified'}\n`);
    
    // Show current documents
    const documents = user.documentVerification?.documents || {};
    console.log('📄 Current Documents:');
    if (documents.idDocument?.url) {
      console.log(`  - ID Document: ${documents.idDocument.url}`);
    }
    if (documents.propertyProof?.urls?.length > 0) {
      console.log(`  - Property Proof: ${documents.propertyProof.urls.length} file(s)`);
      documents.propertyProof.urls.forEach((url, i) => {
        console.log(`    ${i + 1}. ${url}`);
      });
    }
    if (documents.propertyDocuments?.urls?.length > 0) {
      console.log(`  - Property Documents: ${documents.propertyDocuments.urls.length} file(s)`);
      documents.propertyDocuments.urls.forEach((url, i) => {
        console.log(`    ${i + 1}. ${url}`);
      });
    }
    console.log('');
    
    // Delete all documents and reset verification status
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
      console.log('✅ All documents deleted successfully!\n');
    } else {
      console.log('⚠️  No changes made\n');
    }
    
    // Verify the deletion
    const updatedUser = await db.collection('users').findOne({ email: email.toLowerCase() });
    
    console.log('📋 Updated Status:');
    console.log(`  Document Status: ${updatedUser.documentVerification?.status || 'unverified'}`);
    console.log(`  ID Document: ${updatedUser.documentVerification?.documents?.idDocument?.url ? 'Still exists' : '✅ Deleted'}`);
    console.log(`  Property Proof: ${updatedUser.documentVerification?.documents?.propertyProof?.urls?.length > 0 ? 'Still exists' : '✅ Deleted'}`);
    console.log(`  Property Documents: ${updatedUser.documentVerification?.documents?.propertyDocuments?.urls?.length > 0 ? 'Still exists' : '✅ Deleted'}`);
    console.log('');
    console.log('✅ Craig can now upload documents again (including selfie)');
    console.log('═'.repeat(80));
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

deleteCraigDocuments()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));



