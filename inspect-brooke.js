// @ts-nocheck
/**
 * Script to inspect Brooke's account data from database
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function inspectBrooke() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    const email = 'brookechimoto@gmail.com';
    
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log(`❌ User not found with email: ${email}`);
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log('═'.repeat(80));
    console.log('📋 BROOKE ACCOUNT INSPECTION');
    console.log('═'.repeat(80));
    console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);
    
    console.log('👤 User Info:');
    console.log(`  Name: ${user.firstName} ${user.lastName}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  _id: ${user._id}\n`);
    
    console.log('🔐 Verification Status:');
    console.log(`  isVerified: ${user.isVerified} ${user.isVerified ? '✅' : '❌'}`);
    console.log(`  isActive: ${user.isActive} ${user.isActive ? '✅' : '❌'}\n`);
    
    console.log('📄 Document Verification:');
    console.log(`  Status: ${user.documentVerification?.status || 'unverified'}`);
    console.log(`  Verified At: ${user.documentVerification?.verifiedAt || 'N/A'}`);
    console.log(`  Rejected At: ${user.documentVerification?.rejectedAt || 'N/A'}\n`);
    
    console.log('📎 Documents:');
    const docs = user.documentVerification?.documents || {};
    console.log(`  ID Document: ${docs.idDocument?.url ? '✅ Has document' : '❌ Empty'}`);
    console.log(`  Payslips: ${docs.payslips?.urls?.length > 0 ? `✅ ${docs.payslips.urls.length} file(s)` : '❌ Empty'}`);
    console.log(`  Utility Bills: ${docs.utilityBills?.urls?.length > 0 ? `✅ ${docs.utilityBills.urls.length} file(s)` : '❌ Empty'}`);
    console.log(`  Bank Statements: ${docs.bankStatements?.urls?.length > 0 ? `✅ ${docs.bankStatements.urls.length} file(s)` : '❌ Empty'}`);
    console.log(`  Employment Letter: ${docs.employmentLetter?.url ? '✅ Has document' : '❌ Empty'}`);
    console.log(`  Property Proof: ${docs.propertyProof?.urls?.length > 0 ? `✅ ${docs.propertyProof.urls.length} file(s)` : '❌ Empty'}`);
    console.log(`  Property Documents: ${docs.propertyDocuments?.urls?.length > 0 ? `✅ ${docs.propertyDocuments.urls.length} file(s)` : '❌ Empty'}\n`);
    
    // Write full data to file
    const outputPath = path.join(process.cwd(), 'brooke-inspection.json');
    const safeUser = {
      _id: user._id?.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isVerified: user.isVerified,
      isActive: user.isActive,
      documentVerification: user.documentVerification || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(safeUser, null, 2), 'utf8');
    console.log(`📄 Full data saved to: ${outputPath}\n`);
    
    console.log('═'.repeat(80));
    console.log('🔍 LOGIN CHECK:');
    if (!user.isActive) {
      console.log('❌ BLOCKED: isActive is FALSE - Account is not active');
    } else if (!user.isVerified) {
      console.log('❌ BLOCKED: isVerified is FALSE - Email not verified');
    } else {
      console.log('✅ SHOULD BE ABLE TO LOGIN: Both isActive and isVerified are TRUE');
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

inspectBrooke();




