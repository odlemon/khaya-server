// Script to reset document verification and delete all documents for both users
const mongoose = require('mongoose');
require('dotenv').config();

async function resetDocumentsComplete() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    const emails = [
      'veximagames@gmail.com',      // Landlord
      'nkarata@clearcoverhealth.com' // Tenant
    ];
    
    console.log('═'.repeat(80));
    console.log('🗑️  RESETTING DOCUMENT VERIFICATION & DELETING DOCUMENTS');
    console.log('═'.repeat(80));
    console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);
    
    for (const email of emails) {
      // Find user by email
      const user = await db.collection('users').findOne({ email: email.toLowerCase() });
      
      if (!user) {
        console.log(`❌ User not found with email: ${email}`);
        continue;
      }
      
      console.log(`📋 Processing: ${user.firstName} ${user.lastName} (${user.role})`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Current Document Status: ${user.documentVerification?.status || 'unverified'}`);
      
      // Count existing documents
      const documents = user.documentVerification?.documents || {};
      let docCount = 0;
      if (documents.idDocument?.url) docCount++;
      if (documents.payslips?.urls?.length > 0) docCount += documents.payslips.urls.length;
      if (documents.utilityBills?.urls?.length > 0) docCount += documents.utilityBills.urls.length;
      if (documents.bankStatements?.urls?.length > 0) docCount += documents.bankStatements.urls.length;
      if (documents.employmentLetter?.url) docCount++;
      if (documents.propertyProof?.urls?.length > 0) docCount += documents.propertyProof.urls.length;
      if (documents.propertyDocuments?.urls?.length > 0) docCount += documents.propertyDocuments.urls.length;
      
      console.log(`  Existing Documents: ${docCount}`);
      
      // Reset document verification status and delete all documents
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
        console.log(`  ✅ Document verification reset and all documents deleted\n`);
      } else {
        console.log(`  ⚠️  No changes made\n`);
      }
    }
    
    // Verify both updates
    console.log('📋 Verification Summary:');
    console.log('-'.repeat(80));
    
    for (const email of emails) {
      const user = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (user) {
        const isDocumentVerified = user.documentVerification?.status === 'verified';
        const documents = user.documentVerification?.documents || {};
        
        console.log(`${user.firstName} ${user.lastName} (${user.role}):`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Document Status: ${user.documentVerification?.status || 'unverified'}`);
        console.log(`  isDocumentVerified: ${isDocumentVerified}`);
        
        // Check if documents are cleared
        const hasDocuments = documents.idDocument?.url || 
                            documents.payslips?.urls?.length > 0 ||
                            documents.utilityBills?.urls?.length > 0 ||
                            documents.bankStatements?.urls?.length > 0 ||
                            documents.employmentLetter?.url ||
                            documents.propertyProof?.urls?.length > 0 ||
                            documents.propertyDocuments?.urls?.length > 0;
        
        console.log(`  Documents Deleted: ${!hasDocuments ? '✅ Yes' : '❌ Still exist'}`);
        console.log('');
      }
    }
    
    console.log('═'.repeat(80));
    console.log('✅ Document verification reset and documents deleted for both users!');
    console.log('═'.repeat(80));
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

resetDocumentsComplete()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

