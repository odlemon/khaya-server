// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EscrowTransaction } from '../models/Escrow';
import { Payout } from '../models/Escrow';
import { LandlordBalance } from '../models/LandlordBalance';
import { User } from '../models/User';

dotenv.config();

async function verifyDistributionCalculations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    // Get all distributed transactions
    const distributedTransactions = await EscrowTransaction.find({
      status: 'distributed'
    }).sort({ createdAt: 1 });

    console.log(`📋 DISTRIBUTED TRANSACTIONS: ${distributedTransactions.length}\n`);

    let totalAmount = 0;
    let totalLandlordAmount = 0;
    let totalKhayalamiAmount = 0;

    // Group by landlord
    const landlordGroups = new Map();
    for (const t of distributedTransactions) {
      const landlordId = t.landlordId.toString();
      if (!landlordGroups.has(landlordId)) {
        landlordGroups.set(landlordId, []);
      }
      landlordGroups.get(landlordId).push(t);

      totalAmount += t.totalAmount;
      totalLandlordAmount += t.landlordAmount;
      totalKhayalamiAmount += t.khayalamiAmount;
    }

    console.log(`📊 TOTAL AMOUNTS:`);
    console.log(`  Total Amount: ${totalAmount}`);
    console.log(`  Total Landlord Amount: ${totalLandlordAmount}`);
    console.log(`  Total Khayalami Amount: ${totalKhayalamiAmount}`);
    console.log(`  Sum Check: ${totalLandlordAmount + totalKhayalamiAmount} (should equal ${totalAmount})\n`);

    // Verify each transaction
    console.log(`🔍 TRANSACTION BREAKDOWN:\n`);
    for (const [landlordId, transactions] of landlordGroups.entries()) {
      const landlord = await User.findById(landlordId);
      const landlordName = landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Unknown';
      
      console.log(`${landlordName} (${landlordId}):`);
      
      let landlordTotal = 0;
      let khayalamiTotal = 0;
      let transactionTotal = 0;

      for (const t of transactions) {
        console.log(`  Payment ${t.paymentId}:`);
        console.log(`    Total: ${t.totalAmount}`);
        console.log(`    Landlord: ${t.landlordAmount}`);
        console.log(`    Khayalami: ${t.khayalamiAmount}`);
        console.log(`    Check: ${t.landlordAmount + t.khayalamiAmount} (should equal ${t.totalAmount})`);
        
        const check = Math.abs((t.landlordAmount + t.khayalamiAmount) - t.totalAmount);
        if (check > 0.01) {
          console.log(`    ⚠️  WARNING: Amount mismatch! Difference: ${check}`);
        } else {
          console.log(`    ✅ Correct`);
        }

        landlordTotal += t.landlordAmount;
        khayalamiTotal += t.khayalamiAmount;
        transactionTotal += t.totalAmount;
      }

      console.log(`  Subtotal:`);
      console.log(`    Total: ${transactionTotal}`);
      console.log(`    Landlord: ${landlordTotal}`);
      console.log(`    Khayalami: ${khayalamiTotal}`);
      console.log(`    Check: ${landlordTotal + khayalamiTotal} (should equal ${transactionTotal})\n`);

      // Check payout
      const payout = await Payout.findOne({
        recipientId: landlordId,
        payoutType: 'landlord',
        status: 'pending'
      }).sort({ createdAt: -1 });

      if (payout) {
        console.log(`  Payout:`);
        console.log(`    Amount: ${payout.amount}`);
        console.log(`    Expected: ${landlordTotal}`);
        const payoutCheck = Math.abs(payout.amount - landlordTotal);
        if (payoutCheck > 0.01) {
          console.log(`    ⚠️  WARNING: Payout doesn't match! Difference: ${payoutCheck}`);
        } else {
          console.log(`    ✅ Correct`);
        }

        // Check balance
        const balance = await LandlordBalance.findOne({ landlordId });
        if (balance) {
          console.log(`  Balance:`);
          console.log(`    Available: ${balance.availableBalance}`);
          console.log(`    Expected: ${landlordTotal} (if starting from 0)`);
          
          // Find the distribution transaction
          const distributionTransaction = balance.transactions.find((tr: any) => 
            tr.description?.includes('Escrow distribution')
          );
          
          if (distributionTransaction) {
            console.log(`    Distribution Transaction:`);
            console.log(`      Amount: ${distributionTransaction.amount}`);
            console.log(`      Expected: ${landlordTotal}`);
            const transCheck = Math.abs(distributionTransaction.amount - landlordTotal);
            if (transCheck > 0.01) {
              console.log(`      ⚠️  WARNING: Transaction amount doesn't match! Difference: ${transCheck}`);
            } else {
              console.log(`      ✅ Correct`);
            }
          }
        }
      }
      console.log('');
    }

    // Check Khayalami payout
    const khayalamiPayout = await Payout.findOne({
      payoutType: 'khayalami',
      status: 'pending'
    }).sort({ createdAt: -1 });

    if (khayalamiPayout) {
      console.log(`Khayalami Payout:`);
      console.log(`  Amount: ${khayalamiPayout.amount}`);
      console.log(`  Expected: ${totalKhayalamiAmount}`);
      const khayalamiCheck = Math.abs(khayalamiPayout.amount - totalKhayalamiAmount);
      if (khayalamiCheck > 0.01) {
        console.log(`  ⚠️  WARNING: Payout doesn't match! Difference: ${khayalamiCheck}`);
      } else {
        console.log(`  ✅ Correct`);
      }
    }

    // Final verification
    console.log(`\n✅ FINAL VERIFICATION:`);
    const sumCheck = totalLandlordAmount + totalKhayalamiAmount;
    const sumDifference = Math.abs(sumCheck - totalAmount);
    
    if (sumDifference > 0.01) {
      console.log(`  ⚠️  WARNING: Total mismatch!`);
      console.log(`    Landlord + Khayalami = ${sumCheck}`);
      console.log(`    Total Amount = ${totalAmount}`);
      console.log(`    Difference = ${sumDifference}`);
    } else {
      console.log(`  ✅ All amounts balance correctly!`);
      console.log(`    Total: ${totalAmount}`);
      console.log(`    Landlords: ${totalLandlordAmount}`);
      console.log(`    Khayalami: ${totalKhayalamiAmount}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Verification complete');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verifyDistributionCalculations();






