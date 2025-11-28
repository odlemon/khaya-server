// Script to delete a property and all related data (rentals, agreements, etc.)
const mongoose = require('mongoose');
require('dotenv').config();

async function deletePropertyWithRelated() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    const propertyTitle = 'Test Property - 2BR Apartment';
    
    console.log('═'.repeat(80));
    console.log('🗑️  DELETING PROPERTY AND RELATED DATA');
    console.log('═'.repeat(80));
    console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);
    
    // Find the property
    const property = await db.collection('properties').findOne({ title: propertyTitle });
    
    if (!property) {
      console.log(`❌ Property not found: "${propertyTitle}"`);
      await mongoose.disconnect();
      process.exit(1);
    }
    
    const propertyId = property._id;
    const landlordId = property.landlordId;
    
    console.log(`📋 Property found:`);
    console.log(`  ID: ${propertyId}`);
    console.log(`  Title: ${property.title}`);
    console.log(`  Landlord ID: ${landlordId}`);
    console.log(`  Address: ${property.address?.street || 'N/A'}, ${property.address?.city || 'N/A'}\n`);
    
    // Find related rentals
    const rentals = await db.collection('rentals').find({ propertyId: propertyId }).toArray();
    console.log(`📋 Related Rentals: ${rentals.length}`);
    if (rentals.length > 0) {
      rentals.forEach((rental, i) => {
        console.log(`  ${i + 1}. Rental ID: ${rental._id} (Status: ${rental.status || 'N/A'})`);
      });
    }
    console.log('');
    
    // Find related agreements
    const agreements = await db.collection('agreements').find({ propertyId: propertyId }).toArray();
    console.log(`📋 Related Agreements: ${agreements.length}`);
    if (agreements.length > 0) {
      agreements.forEach((agreement, i) => {
        console.log(`  ${i + 1}. Agreement ID: ${agreement._id} (Status: ${agreement.status || 'N/A'})`);
      });
    }
    console.log('');
    
    // Find related connections
    const connections = await db.collection('connections').find({ propertyId: propertyId }).toArray();
    console.log(`📋 Related Connections: ${connections.length}`);
    if (connections.length > 0) {
      connections.forEach((conn, i) => {
        console.log(`  ${i + 1}. Connection ID: ${conn._id} (Status: ${conn.status || 'N/A'})`);
      });
    }
    console.log('');
    
    // Find related escrow transactions
    const escrowTransactions = await db.collection('escrowtransactions').find({ propertyId: propertyId }).toArray();
    console.log(`📋 Related Escrow Transactions: ${escrowTransactions.length}`);
    if (escrowTransactions.length > 0) {
      escrowTransactions.forEach((tx, i) => {
        console.log(`  ${i + 1}. Transaction ID: ${tx._id} (Amount: ${tx.totalAmount || 0}, Status: ${tx.status || 'N/A'})`);
      });
    }
    console.log('');
    
    // Find related payments
    const payments = await db.collection('payments').find({ propertyId: propertyId }).toArray();
    console.log(`📋 Related Payments: ${payments.length}`);
    if (payments.length > 0) {
      payments.forEach((payment, i) => {
        console.log(`  ${i + 1}. Payment ID: ${payment._id} (Amount: ${payment.amount || 0})`);
      });
    }
    console.log('');
    
    // Confirm deletion
    console.log('═'.repeat(80));
    console.log('⚠️  ABOUT TO DELETE:');
    console.log('-'.repeat(80));
    console.log(`  - 1 Property`);
    console.log(`  - ${rentals.length} Rental(s)`);
    console.log(`  - ${agreements.length} Agreement(s)`);
    console.log(`  - ${connections.length} Connection(s)`);
    console.log(`  - ${escrowTransactions.length} Escrow Transaction(s)`);
    console.log(`  - ${payments.length} Payment(s)`);
    console.log('');
    console.log('Proceeding with deletion...\n');
    
    // Delete related data first
    let deletedCount = 0;
    
    // 1. Delete payments
    if (payments.length > 0) {
      const paymentResult = await db.collection('payments').deleteMany({ propertyId: propertyId });
      console.log(`  ✅ Deleted ${paymentResult.deletedCount} payment(s)`);
      deletedCount += paymentResult.deletedCount;
    }
    
    // 2. Delete escrow transactions
    if (escrowTransactions.length > 0) {
      const escrowResult = await db.collection('escrowtransactions').deleteMany({ propertyId: propertyId });
      console.log(`  ✅ Deleted ${escrowResult.deletedCount} escrow transaction(s)`);
      deletedCount += escrowResult.deletedCount;
    }
    
    // 3. Delete agreements
    if (agreements.length > 0) {
      const agreementResult = await db.collection('agreements').deleteMany({ propertyId: propertyId });
      console.log(`  ✅ Deleted ${agreementResult.deletedCount} agreement(s)`);
      deletedCount += agreementResult.deletedCount;
    }
    
    // 4. Delete rentals
    if (rentals.length > 0) {
      const rentalResult = await db.collection('rentals').deleteMany({ propertyId: propertyId });
      console.log(`  ✅ Deleted ${rentalResult.deletedCount} rental(s)`);
      deletedCount += rentalResult.deletedCount;
    }
    
    // 5. Delete connections
    if (connections.length > 0) {
      const connectionResult = await db.collection('connections').deleteMany({ propertyId: propertyId });
      console.log(`  ✅ Deleted ${connectionResult.deletedCount} connection(s)`);
      deletedCount += connectionResult.deletedCount;
    }
    
    // 6. Delete the property itself
    const propertyResult = await db.collection('properties').deleteOne({ _id: propertyId });
    console.log(`  ✅ Deleted 1 property`);
    deletedCount += propertyResult.deletedCount;
    
    console.log('');
    console.log('═'.repeat(80));
    console.log('✅ DELETION COMPLETED!');
    console.log('═'.repeat(80));
    console.log(`Total items deleted: ${deletedCount + 1}`);
    console.log('');
    
    // Verify deletion
    const remainingProperty = await db.collection('properties').findOne({ _id: propertyId });
    const remainingRentals = await db.collection('rentals').countDocuments({ propertyId: propertyId });
    const remainingAgreements = await db.collection('agreements').countDocuments({ propertyId: propertyId });
    
    console.log('🔍 Verification:');
    console.log(`  Property deleted: ${!remainingProperty ? '✅ Yes' : '❌ Still exists'}`);
    console.log(`  Remaining rentals: ${remainingRentals}`);
    console.log(`  Remaining agreements: ${remainingAgreements}`);
    console.log('═'.repeat(80));
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

deletePropertyWithRelated()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));



