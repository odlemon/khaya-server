// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EscrowTransaction } from './src/models/Escrow';
import { escrowService } from './src/services/EscrowService';

dotenv.config();

async function testDistributionQuery() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Test the actual service method
    const transactions = await escrowService.getHeldTransactionsForDistribution();
    
    console.log(`📊 Transactions from service method: ${transactions.length}\n`);
    
    // Test direct query
    const directQuery = await EscrowTransaction.find({
      status: 'held',
      landlordPayoutStatus: 'pending'
    });
    
    console.log(`📊 Transactions from direct query: ${directQuery.length}\n`);
    
    // Check why there's a difference
    if (transactions.length !== directQuery.length) {
      console.log(`\n⚠️  DISCREPANCY DETECTED!`);
      console.log(`   Service method: ${transactions.length}`);
      console.log(`   Direct query: ${directQuery.length}`);
      
      const serviceIds = transactions.map(t => t._id.toString()).sort();
      const directIds = directQuery.map(t => t._id.toString()).sort();
      
      const missing = directIds.filter(id => !serviceIds.includes(id));
      if (missing.length > 0) {
        console.log(`\n   Missing from service method (${missing.length}):`);
        for (const id of missing) {
          const tx = directQuery.find(t => t._id.toString() === id);
          console.log(`     - ${id}: PaymentType=${tx?.paymentType}, RentalId=${tx?.rentalId || 'None'}`);
        }
      }
    }

    // Show totals
    const totalAmount = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const totalLandlordAmount = transactions.reduce((sum, t) => sum + (t.landlordAmount || 0), 0);
    const totalKhayalamiAmount = transactions.reduce((sum, t) => sum + (t.khayalamiAmount || 0), 0);

    console.log(`\n💰 TOTALS FROM SERVICE METHOD:`);
    console.log(`   Total Amount: ${totalAmount}`);
    console.log(`   Landlord Share: ${totalLandlordAmount}`);
    console.log(`   Khayalami Commission: ${totalKhayalamiAmount}`);

    const directTotalAmount = directQuery.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const directTotalLandlordAmount = directQuery.reduce((sum, t) => sum + (t.landlordAmount || 0), 0);
    const directTotalKhayalamiAmount = directQuery.reduce((sum, t) => sum + (t.khayalamiAmount || 0), 0);

    console.log(`\n💰 TOTALS FROM DIRECT QUERY:`);
    console.log(`   Total Amount: ${directTotalAmount}`);
    console.log(`   Landlord Share: ${directTotalLandlordAmount}`);
    console.log(`   Khayalami Commission: ${directTotalKhayalamiAmount}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testDistributionQuery()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

