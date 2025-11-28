// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Agreement } from '../models/Agreement';
import { User } from '../models/User';
import { EscrowTransaction, EscrowAccount, Payout } from '../models/Escrow';
import { Subscription } from '../models/Subscription';
import { PaymentRequest } from '../models/PaymentRequest';
import { LandlordPreferences } from '../models/LandlordPreferences';
import { Payment } from '../models/Payment';
import { RevenueSource } from '../models/RevenueSource';
import { LandlordBalance } from '../models/LandlordBalance';

dotenv.config();

const EMAILS = [
  'veximagames@gmail.com',
  'nkarata@clearcoverhealth.com'
];

async function demoCleanup() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find users by email
    const users = await User.find({
      email: { $in: EMAILS }
    });

    if (users.length === 0) {
      console.log('❌ No users found with those emails');
      return;
    }

    console.log(`📧 Found ${users.length} user(s):`);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}): ${user._id}`);
    });

    const userIds = users.map(u => u._id);

    // ============================================
    // 1. DELETE AGREEMENTS BETWEEN THESE USERS
    // ============================================
    console.log('\n📋 Step 1: Deleting agreements between these users...');
    // Find agreements where both landlord and tenant are in our user list
    const agreements = await Agreement.find({
      landlordId: { $in: userIds },
      tenantId: { $in: userIds }
    });

    if (agreements.length > 0) {
      console.log(`  Found ${agreements.length} agreement(s) to delete`);
      const agreementIds = agreements.map(a => a._id);
      
      const deleteAgreements = await Agreement.deleteMany({
        _id: { $in: agreementIds }
      });
      console.log(`  ✅ Deleted ${deleteAgreements.deletedCount} agreement(s)`);
    } else {
      console.log('  ℹ️  No agreements found');
    }

    // ============================================
    // 2. DELETE ALL ESCROW TRANSACTIONS
    // ============================================
    console.log('\n💰 Step 2: Deleting all escrow transactions for these users...');
    const escrowTransactions = await EscrowTransaction.find({
      $or: [
        { landlordId: { $in: userIds } },
        { tenantId: { $in: userIds } }
      ]
    });

    if (escrowTransactions.length > 0) {
      console.log(`  Found ${escrowTransactions.length} escrow transaction(s) to delete`);
      const escrowIds = escrowTransactions.map(e => e._id);
      
      const deleteEscrow = await EscrowTransaction.deleteMany({
        _id: { $in: escrowIds }
      });
      console.log(`  ✅ Deleted ${deleteEscrow.deletedCount} escrow transaction(s)`);
    } else {
      console.log('  ℹ️  No escrow transactions found');
    }

    // ============================================
    // 3. REMOVE SUBSCRIPTIONS
    // ============================================
    console.log('\n📱 Step 3: Removing subscriptions...');
    
    // Delete tenant subscriptions
    const tenantSubscriptions = await Subscription.find({
      tenantId: { $in: userIds }
    });

    if (tenantSubscriptions.length > 0) {
      console.log(`  Found ${tenantSubscriptions.length} tenant subscription(s) to delete`);
      const deleteSubscriptions = await Subscription.deleteMany({
        tenantId: { $in: userIds }
      });
      console.log(`  ✅ Deleted ${deleteSubscriptions.deletedCount} tenant subscription(s)`);
    } else {
      console.log('  ℹ️  No tenant subscriptions found');
    }

    // Remove landlord subscriptions from LandlordPreferences
    for (const userId of userIds) {
      const preferences = await LandlordPreferences.findOne({ landlordId: userId });
      if (preferences) {
        let updated = false;
        
        // Reset premium features subscription
        if (preferences.premiumFeatures?.isSubscribed) {
          preferences.premiumFeatures = {
            isSubscribed: false,
            planType: 'basic',
            autoRenew: false
          };
          updated = true;
          console.log(`  ✅ Removed premium features subscription for ${users.find(u => u._id.toString() === userId.toString())?.email}`);
        }

        // Reset zero deposit protection subscription
        if (preferences.zeroDepositProtection?.isSubscribed) {
          preferences.zeroDepositProtection = {
            isSubscribed: false,
            autoRenew: false
          };
          updated = true;
          console.log(`  ✅ Removed zero deposit protection subscription for ${users.find(u => u._id.toString() === userId.toString())?.email}`);
        }

        if (updated) {
          await preferences.save();
        }
      }
    }

    // ============================================
    // 4. DELETE PAYMENT REQUESTS FOR AGREEMENT FEES
    // ============================================
    console.log('\n💳 Step 4: Deleting payment requests for agreement fees...');
    const agreementFeeRequests = await PaymentRequest.find({
      requestType: 'agreement_fee',
      $or: [
        { landlordId: { $in: userIds } },
        { tenantId: { $in: userIds } }
      ]
    });

    if (agreementFeeRequests.length > 0) {
      console.log(`  Found ${agreementFeeRequests.length} agreement fee payment request(s) to delete`);
      const deletePaymentRequests = await PaymentRequest.deleteMany({
        requestType: 'agreement_fee',
        $or: [
          { landlordId: { $in: userIds } },
          { tenantId: { $in: userIds } }
        ]
      });
      console.log(`  ✅ Deleted ${deletePaymentRequests.deletedCount} payment request(s)`);
    } else {
      console.log('  ℹ️  No agreement fee payment requests found');
    }

    // ============================================
    // 5. REMOVE DOCUMENT VERIFICATION
    // ============================================
    console.log('\n📄 Step 5: Removing document verification...');
    for (const userId of userIds) {
      const user = await User.findById(userId);
      if (user) {
        user.documentVerification = {
          status: 'unverified',
          documents: {}
        };
        user.isVerified = false;
        await user.save();
        console.log(`  ✅ Reset document verification for ${user.email}`);
      }
    }

    // ============================================
    // 6. DELETE PAYMENTS RELATED TO AGREEMENTS (optional cleanup)
    // ============================================
    console.log('\n💵 Step 6: Cleaning up payments related to deleted agreements...');
    // Get agreement IDs that were deleted (if any)
    const deletedAgreementIds = agreements.map(a => a._id);
    if (deletedAgreementIds.length > 0) {
      const payments = await Payment.find({
        agreementId: { $in: deletedAgreementIds }
      });

      if (payments.length > 0) {
        console.log(`  Found ${payments.length} payment(s) related to deleted agreements`);
        const deletePayments = await Payment.deleteMany({
          agreementId: { $in: deletedAgreementIds }
        });
        console.log(`  ✅ Deleted ${deletePayments.deletedCount} payment(s)`);
      } else {
        console.log('  ℹ️  No payments found for deleted agreements');
      }
    } else {
      console.log('  ℹ️  No agreements were deleted, skipping payment cleanup');
    }

    // Also delete any payments directly between these users (not tied to agreements)
    const directPayments = await Payment.find({
      $or: [
        { landlordId: { $in: userIds }, tenantId: { $in: userIds } }
      ]
    });

    if (directPayments.length > 0) {
      console.log(`  Found ${directPayments.length} direct payment(s) between these users`);
      const deleteDirectPayments = await Payment.deleteMany({
        $or: [
          { landlordId: { $in: userIds }, tenantId: { $in: userIds } }
        ]
      });
      console.log(`  ✅ Deleted ${deleteDirectPayments.deletedCount} direct payment(s)`);
    }

    // ============================================
    // 7. DELETE PAYOUTS
    // ============================================
    console.log('\n💸 Step 7: Deleting payouts...');
    let payouts: any[] = [];
    const foundPayouts = await Payout.find({
      $or: [
        { recipientId: { $in: userIds } },
        { recipientType: 'khayalami' } // Delete all Khayalami payouts too
      ]
    });
    payouts = foundPayouts;

    if (payouts.length > 0) {
      console.log(`  Found ${payouts.length} payout(s) to delete`);
      const deletePayouts = await Payout.deleteMany({
        $or: [
          { recipientId: { $in: userIds } },
          { recipientType: 'khayalami' }
        ]
      });
      console.log(`  ✅ Deleted ${deletePayouts.deletedCount} payout(s)`);
    } else {
      console.log('  ℹ️  No payouts found');
    }

    // ============================================
    // 8. DELETE REVENUE SOURCES
    // ============================================
    console.log('\n💰 Step 8: Deleting revenue sources...');
    let revenueSources: any[] = [];
    const foundRevenueSources = await RevenueSource.find({
      $or: [
        { payerId: { $in: userIds } },
        { recipientId: { $in: userIds } }
      ]
    });
    revenueSources = foundRevenueSources;

    if (revenueSources.length > 0) {
      console.log(`  Found ${revenueSources.length} revenue source(s) to delete`);
      const deleteRevenueSources = await RevenueSource.deleteMany({
        $or: [
          { payerId: { $in: userIds } },
          { recipientId: { $in: userIds } }
        ]
      });
      console.log(`  ✅ Deleted ${deleteRevenueSources.deletedCount} revenue source(s)`);
    } else {
      console.log('  ℹ️  No revenue sources found');
    }

    // ============================================
    // 9. RESET ESCROW ACCOUNT TOTALS
    // ============================================
    console.log('\n🏦 Step 9: Resetting escrow account totals...');
    const escrowAccount = await EscrowAccount.findOne({ accountType: 'main' });
    if (escrowAccount) {
      escrowAccount.totalHeld = 0;
      escrowAccount.totalDistributed = 0;
      escrowAccount.totalLandlordPayouts = 0;
      escrowAccount.totalKhayalamiPayouts = 0;
      escrowAccount.totalTransactions = 0;
      escrowAccount.pendingTransactions = 0;
      escrowAccount.distributedTransactions = 0;
      escrowAccount.monthlyHeld = [];
      await escrowAccount.save();
      console.log('  ✅ Reset escrow account totals');
    } else {
      console.log('  ℹ️  No escrow account found');
    }

    // ============================================
    // 10. RESET LANDLORD BALANCES
    // ============================================
    console.log('\n💳 Step 10: Resetting landlord balances...');
    for (const userId of userIds) {
      const user = await User.findById(userId);
      if (user && user.role === 'landlord') {
        const balance = await LandlordBalance.findOne({ landlordId: userId });
        if (balance) {
          balance.availableBalance = 0;
          balance.pendingBalance = 0;
          balance.totalEarnings = 0;
          balance.totalWithdrawn = 0;
          balance.transactions = [];
          balance.stats = {
            totalPaymentsReceived: 0,
            totalRentCollected: 0,
            totalDepositsCollected: 0,
            averageMonthlyIncome: 0
          };
          await balance.save();
          console.log(`  ✅ Reset balance for ${user.email}`);
        }
      }
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(50));
    console.log('✅ DEMO CLEANUP COMPLETED SUCCESSFULLY');
    console.log('='.repeat(50));
    console.log('\n📊 Summary:');
    console.log(`  - Users processed: ${users.length}`);
    console.log(`  - Agreements deleted: ${agreements.length}`);
    console.log(`  - Escrow transactions deleted: ${escrowTransactions.length}`);
    console.log(`  - Tenant subscriptions deleted: ${tenantSubscriptions.length}`);
    console.log(`  - Agreement fee payment requests deleted: ${agreementFeeRequests.length}`);
    console.log(`  - Document verifications reset: ${userIds.length}`);
    console.log(`  - Payouts deleted: ${payouts.length}`);
    console.log(`  - Revenue sources deleted: ${revenueSources.length}`);
    console.log(`  - Escrow account totals reset: ${escrowAccount ? 'Yes' : 'No'}`);
    console.log('\n⚠️  NOTE: Rental properties were NOT deleted (as requested)');
    console.log('='.repeat(50));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the script
demoCleanup()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

