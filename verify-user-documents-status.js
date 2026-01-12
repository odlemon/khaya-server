// @ts-nocheck
/**
 * Script to verify document verification status for a user by ID
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const logFile = path.join(process.cwd(), 'verification-status-log.txt');

function log(msg) {
  const line = `${msg}\n`;
  fs.appendFileSync(logFile, line, 'utf8');
  console.log(msg);
}

async function verifyUserDocumentsStatus() {
  // Clear log file
  if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
  }
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    const userId = '6925b95302dfd334e855f29f';
    
    log('═'.repeat(80));
    log('🔍 VERIFYING DOCUMENT VERIFICATION STATUS');
    log('═'.repeat(80));
    log(`⏰ Time: ${new Date().toLocaleString()}\n`);
    log(`🔍 User ID: ${userId}\n`);
    
    const user = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(userId) });
    
    if (!user) {
      log(`❌ User not found with ID: ${userId}`);
      await mongoose.disconnect();
      process.exit(1);
    }
    
    log('📋 User Information:');
    log(`  User ID: ${user._id}`);
    log(`  Name: ${user.firstName} ${user.lastName}`);
    log(`  Email: ${user.email}`);
    log(`  Role: ${user.role}`);
    log(`  isVerified: ${user.isVerified || false}`);
    log(`  isActive: ${user.isActive || false}`);
    log('');
    
    log('📄 Document Verification Status:');
    log(`  Status: ${user.documentVerification?.status || 'unverified'}`);
    log(`  Verified At: ${user.documentVerification?.verifiedAt || 'N/A'}`);
    log(`  Rejected At: ${user.documentVerification?.rejectedAt || 'N/A'}`);
    log(`  Admin Feedback: ${user.documentVerification?.adminFeedback || 'N/A'}`);
    log(`  Rejection Reason: ${user.documentVerification?.rejectionReason || 'N/A'}`);
    log('');
    
    const documents = user.documentVerification?.documents || {};
    log('📎 Documents:');
    
    const idDoc = documents.idDocument;
    if (idDoc && (idDoc.url || idDoc.selfieUrl || idDoc.selfieWithIdUrl)) {
      log(`  ❌ ID Document: EXISTS`);
      if (idDoc.url) log(`     URL: ${idDoc.url}`);
      if (idDoc.selfieUrl) log(`     Selfie: ${idDoc.selfieUrl}`);
      if (idDoc.selfieWithIdUrl) log(`     Selfie with ID: ${idDoc.selfieWithIdUrl}`);
    } else {
      log(`  ✅ ID Document: DELETED`);
    }
    
    if (documents.payslips?.urls?.length > 0) {
      log(`  ❌ Payslips: EXISTS (${documents.payslips.urls.length} file(s))`);
    } else {
      log(`  ✅ Payslips: DELETED`);
    }
    
    if (documents.utilityBills?.urls?.length > 0) {
      log(`  ❌ Utility Bills: EXISTS (${documents.utilityBills.urls.length} file(s))`);
    } else {
      log(`  ✅ Utility Bills: DELETED`);
    }
    
    if (documents.bankStatements?.urls?.length > 0) {
      log(`  ❌ Bank Statements: EXISTS (${documents.bankStatements.urls.length} file(s))`);
    } else {
      log(`  ✅ Bank Statements: DELETED`);
    }
    
    if (documents.employmentLetter?.url) {
      log(`  ❌ Employment Letter: EXISTS`);
    } else {
      log(`  ✅ Employment Letter: DELETED`);
    }
    
    if (documents.propertyProof?.urls?.length > 0) {
      log(`  ❌ Property Proof: EXISTS (${documents.propertyProof.urls.length} file(s))`);
    } else {
      log(`  ✅ Property Proof: DELETED`);
    }
    
    if (documents.propertyDocuments?.urls?.length > 0) {
      log(`  ❌ Property Documents: EXISTS (${documents.propertyDocuments.urls.length} file(s))`);
    } else {
      log(`  ✅ Property Documents: DELETED`);
    }
    
    log('');
    log('═'.repeat(80));
    
    // Summary
    const hasAnyDocuments = 
      (idDoc && (idDoc.url || idDoc.selfieUrl || idDoc.selfieWithIdUrl)) ||
      documents.payslips?.urls?.length > 0 ||
      documents.utilityBills?.urls?.length > 0 ||
      documents.bankStatements?.urls?.length > 0 ||
      documents.employmentLetter?.url ||
      documents.propertyProof?.urls?.length > 0 ||
      documents.propertyDocuments?.urls?.length > 0;
    
    if (hasAnyDocuments) {
      log('⚠️  WARNING: Some documents still exist!');
    } else {
      log('✅ SUCCESS: All documents have been deleted!');
    }
    
    if (user.documentVerification?.status === 'unverified') {
      log('✅ Document verification status is correctly set to "unverified"');
    } else {
      log(`⚠️  Document verification status is: ${user.documentVerification?.status || 'unverified'}`);
    }
    
    log('═'.repeat(80));
    
    await mongoose.disconnect();
    log('\n✅ Disconnected from MongoDB\n');
    
  } catch (error) {
    log(`❌ Error: ${error.message}`);
    log(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
verifyUserDocumentsStatus();




