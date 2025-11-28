// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkDbValues() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Use raw collection to see actual DB values
    const db = mongoose.connection.db;
    const collection = db.collection('escrowtransactions');
    
    const allHeld = await collection.find({ status: 'held' }).toArray();
    console.log(`📊 Total held transactions (raw): ${allHeld.length}\n`);

    const withPending = await collection.find({ 
      status: 'held', 
      landlordPayoutStatus: 'pending' 
    }).toArray();
    console.log(`📊 With landlordPayoutStatus='pending': ${withPending.length}\n`);

    // Check what landlordPayoutStatus values exist
    const statusCounts: Record<string, number> = {};
    for (const tx of allHeld) {
      const status = tx.landlordPayoutStatus || 'undefined/null';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    console.log(`📊 BREAKDOWN BY LANDLORD PAYOUT STATUS:\n`);
    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`   ${status}: ${count}`);
    }

    // Show first few transactions
    console.log(`\n📋 SAMPLE TRANSACTIONS:\n`);
    for (const tx of allHeld.slice(0, 5)) {
      console.log(`   Payment: ${tx.paymentId}`);
      console.log(`     Status: ${tx.status}`);
      console.log(`     landlordPayoutStatus: ${tx.landlordPayoutStatus} (type: ${typeof tx.landlordPayoutStatus})`);
      console.log(`     Has field: ${'landlordPayoutStatus' in tx}`);
      console.log(`     ---`);
    }

    // Update any missing landlordPayoutStatus to 'pending'
    const toUpdate = allHeld.filter(tx => !tx.landlordPayoutStatus);
    if (toUpdate.length > 0) {
      console.log(`\n🔧 Updating ${toUpdate.length} transactions to set landlordPayoutStatus: 'pending'...`);
      await collection.updateMany(
        { 
          status: 'held',
          $or: [
            { landlordPayoutStatus: { $exists: false } },
            { landlordPayoutStatus: null }
          ]
        },
        { $set: { landlordPayoutStatus: 'pending' } }
      );
      console.log(`✅ Updated\n`);
      
      // Check again
      const afterUpdate = await collection.find({ 
        status: 'held', 
        landlordPayoutStatus: 'pending' 
      }).toArray();
      console.log(`📊 After update - with landlordPayoutStatus='pending': ${afterUpdate.length}\n`);
      
      const totalAmount = afterUpdate.reduce((sum: number, t: any) => sum + (t.totalAmount || 0), 0);
      const totalLandlord = afterUpdate.reduce((sum: number, t: any) => sum + (t.landlordAmount || 0), 0);
      const totalKhayalami = afterUpdate.reduce((sum: number, t: any) => sum + (t.khayalamiAmount || 0), 0);
      
      console.log(`💰 TOTALS:`);
      console.log(`   Total Amount: ${totalAmount.toLocaleString()}`);
      console.log(`   Landlord Share: ${totalLandlord.toLocaleString()}`);
      console.log(`   Khayalami Commission: ${totalKhayalami.toLocaleString()}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkDbValues()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

