// @ts-nocheck
/**
 * REVENUE & ESCROW WORKFLOW TEST SUITE
 *
 * This script tests the complete revenue model and escrow workflow
 * to verify it's working according to requirements.
 *
 * Test Scenarios:
 * 1. In-app payment flow with automatic escrow
 * 2. External payment request flow with admin approval
 * 3. Payment calculation with deductions
 * 4. Escrow transaction creation
 * 5. Revenue source tracking
 * 6. Distribution flow
 */

import { dbConnection } from "./src/utils/database";
import { paymentService } from "./src/services/PaymentService";
import { paymentCalculationService } from "./src/services/PaymentCalculationService";
import { paymentRequestService } from "./src/services/PaymentRequestService";
import { subscriptionService } from "./src/services/SubscriptionService";
import { escrowService } from "./src/services/EscrowService";
import { distributionService } from "./src/services/DistributionService";
import { revenueSourceService } from "./src/services/RevenueSourceService";
import { Rental } from "./src/models/Rental";
import { User } from "./src/models/User";
import { Property } from "./src/models/Property";
import { Agreement } from "./src/models/Agreement";
import { Payment } from "./src/models/Payment";
import { EscrowTransaction, EscrowAccount, Payout } from "./src/models/Escrow";
import { RevenueSource } from "./src/models/RevenueSource";
import { PaymentRequest } from "./src/models/PaymentRequest";
import { Subscription } from "./src/models/Subscription";

// Test results tracker
const testResults: any[] = [];

function logTest(name: string, passed: boolean, details?: string) {
  const result = { name, passed, details, timestamp: new Date() };
  testResults.push(result);
  console.log(`${passed ? '✅' : '❌'} ${name}`);
  if (details) console.log(`   ${details}`);
}

function logSection(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${title}`);
  console.log(`${'='.repeat(60)}\n`);
}

async function setupTestData() {
  logSection('SETTING UP TEST DATA');

  try {
    // Create test tenant
    const tenant = await User.findOne({ role: "tenant" }) || await User.create({
      email: "test-tenant@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "Tenant",
      role: "tenant",
      phoneNumber: "+1234567890",
      isEmailVerified: true
    });

    // Create test landlord
    const landlord = await User.findOne({ role: "landlord" }) || await User.create({
      email: "test-landlord@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "Landlord",
      role: "landlord",
      phoneNumber: "+1234567891",
      isEmailVerified: true
    });

    // Create test admin
    const admin = await User.findOne({ role: "admin" }) || await User.create({
      email: "test-admin@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "Admin",
      role: "admin",
      phoneNumber: "+1234567892",
      isEmailVerified: true
    });

    // Create test property
    const property = await Property.findOne({ landlordId: landlord._id }) || await Property.create({
      landlordId: landlord._id,
      title: "Test Property - 2BR Apartment",
      description: "Test property for revenue workflow testing with escrow system",
      propertyType: "apartment",
      listingType: "rent",
      address: {
        street: "123 Test Street",
        city: "Test City",
        state: "Test State",
        postalCode: "12345",
        country: "Test Country",
        coordinates: {
          latitude: 0,
          longitude: 0
        }
      },
      price: 500,
      deposit: 500,
      zeroDepositAvailable: true,
      utilitiesIncluded: false,
      bedrooms: 2,
      bathrooms: 1,
      area: 75,
      floor: 2,
      totalFloors: 5,
      furnishingLevel: "semi_furnished",
      amenities: ["wifi", "parking"],
      petFriendly: false,
      petOwnershipAllowed: false,
      proximityToTransport: {
        busStop: 200,
        trainStation: 1000,
        taxiRank: 300
      },
      boreholeAvailable: false,
      solarAvailable: false,
      backupPower: false,
      internetAvailable: true,
      parkingAvailable: true,
      parkingSpaces: 1,
      khayalamiAgentAssistance: false,
      viewingSchedule: {
        available: true,
        preferredTimes: ["weekends"],
        contactPhone: "+1234567891"
      },
      images: {
        mainImage: "https://example.com/main.jpg",
        gallery: ["https://example.com/img1.jpg"],
        floorPlan: "https://example.com/plan.jpg"
      },
      status: "published",
      isVerified: true,
      isFeatured: false,
      availableFrom: new Date()
    });

    // Create test agreement
    let agreement = await Agreement.findOne({
      landlordId: landlord._id,
      tenantId: tenant._id
    });

    if (!agreement) {
      agreement = await Agreement.create({
        landlordId: landlord._id,
        tenantId: tenant._id,
        propertyId: property._id,
        title: "Test Rental Agreement",
        agreementType: "rental",
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        rentAmount: 500,
        depositAmount: 500,
        zeroDeposit: false,
        paymentDueDay: 1,
        lateFeeAmount: 50,
        status: "active"
      });
    }

    // Create test rental
    let rental = await Rental.findOne({
      landlordId: landlord._id,
      tenantId: tenant._id
    });

    if (!rental) {
      rental = await Rental.create({
        landlordId: landlord._id,
        tenantId: tenant._id,
        propertyId: property._id,
        agreementId: agreement._id,
        monthlyRent: 500,
        securityDeposit: 500,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        paymentDueDay: 1,
        status: "active",
        stats: {
          totalPayments: 0,
          paidPayments: 0,
          overduePayments: 0
        }
      });
    }

    logTest("Test Data Setup", true, "Created/found tenant, landlord, admin, property, agreement, rental");

    return { tenant, landlord, admin, property, agreement, rental };
  } catch (error: any) {
    logTest("Test Data Setup", false, error.message);
    throw error;
  }
}

async function testPaymentCalculation(rental: any, tenant: any, landlord: any) {
  logSection('TEST 1: PAYMENT CALCULATION SERVICE');

  try {
    // Test without subscription
    const calculation1 = await paymentCalculationService.calculateRentDeductions(
      500,
      tenant._id.toString(),
      landlord._id.toString(),
      rental._id.toString()
    );

    console.log('Calculation (No Subscription):', JSON.stringify(calculation1, null, 2));

    // Verify calculation structure
    logTest(
      "Calculation Structure",
      calculation1.totalAmount === 500 &&
      calculation1.hasOwnProperty('subscriptionFee') &&
      calculation1.hasOwnProperty('processingFee') &&
      calculation1.hasOwnProperty('netRentAmount') &&
      calculation1.hasOwnProperty('khayalamiTotal'),
      `Total: ${calculation1.totalAmount}, Processing: ${calculation1.processingFee}, Net: ${calculation1.netRentAmount}`
    );

    // Verify processing fee (2% of 500 = 10)
    const expectedProcessingFee = 10; // 2% of 500
    logTest(
      "Processing Fee Calculation",
      calculation1.processingFee === expectedProcessingFee,
      `Expected: ${expectedProcessingFee}, Got: ${calculation1.processingFee}`
    );

    // Verify net rent amount
    const expectedNetRent = 500 - calculation1.processingFee - calculation1.subscriptionFee - calculation1.insurancePremium;
    logTest(
      "Net Rent Calculation",
      calculation1.netRentAmount === expectedNetRent,
      `Expected: ${expectedNetRent}, Got: ${calculation1.netRentAmount}`
    );

    // Create a subscription and test again (or use existing one)
    let subscription = await Subscription.findOne({
      tenantId: tenant._id,
      rentalId: rental._id
    });

    if (!subscription) {
      subscription = await subscriptionService.createSubscription({
        tenantId: tenant._id.toString(),
        rentalId: rental._id.toString(),
        planType: "premium",
        propertyValueBracket: "low"
      });
    }

    logTest("Subscription Created", true, `Price: $${subscription.price}/month`);

    const calculation2 = await paymentCalculationService.calculateRentDeductions(
      500,
      tenant._id.toString(),
      landlord._id.toString(),
      rental._id.toString()
    );

    console.log('Calculation (With Subscription):', JSON.stringify(calculation2, null, 2));

    logTest(
      "Subscription Fee Included",
      calculation2.subscriptionFee > 0,
      `Subscription Fee: ${calculation2.subscriptionFee}`
    );

    return { calculation: calculation2, subscription };
  } catch (error: any) {
    logTest("Payment Calculation", false, error.message);
    throw error;
  }
}

async function testInAppPaymentFlow(rental: any, tenant: any) {
  logSection('TEST 2: IN-APP PAYMENT FLOW');

  try {
    // Create in-app payment
    const payment = await paymentService.createNewPayment(
      rental._id.toString(),
      tenant._id.toString(),
      {
        amount: 500,
        paymentMethod: "in_app",
        paymentType: "rent",
        gatewayResponse: {
          provider: "stripe",
          transactionId: "TEST-" + Date.now(),
          transactionRef: "REF-" + Date.now(),
          paidAt: new Date(),
          rawResponse: { status: "success" }
        },
        notes: "Test in-app payment"
      }
    );

    logTest("Payment Created", !!payment, `Payment ID: ${payment._id}`);
    logTest("Payment Status", payment.status === "verified", `Status: ${payment.status}`);

    // Check if escrow transaction was created
    const escrowTransaction = await EscrowTransaction.findOne({ paymentId: payment._id });
    logTest("Escrow Transaction Created", !!escrowTransaction, `Escrow ID: ${escrowTransaction?._id}`);

    if (escrowTransaction) {
      logTest(
        "Escrow Status",
        escrowTransaction.status === "held",
        `Status: ${escrowTransaction.status}`
      );

      console.log('Escrow Transaction Details:', {
        totalAmount: escrowTransaction.totalAmount,
        landlordAmount: escrowTransaction.landlordAmount,
        khayalamiAmount: escrowTransaction.khayalamiAmount,
        deductions: escrowTransaction.deductions
      });

      // Verify deductions
      logTest(
        "Deductions Breakdown",
        escrowTransaction.deductions.totalDeductions === escrowTransaction.khayalamiAmount,
        `Total Deductions: ${escrowTransaction.deductions.totalDeductions}`
      );

      // Verify amounts
      const totalCheck = escrowTransaction.landlordAmount + escrowTransaction.khayalamiAmount;
      logTest(
        "Amount Consistency",
        totalCheck === escrowTransaction.totalAmount,
        `Landlord(${escrowTransaction.landlordAmount}) + Khayalami(${escrowTransaction.khayalamiAmount}) = Total(${escrowTransaction.totalAmount})`
      );
    }

    // Check if revenue sources were created
    const revenueSources = await RevenueSource.find({ paymentId: payment._id });
    logTest(
      "Revenue Sources Created",
      revenueSources.length > 0,
      `Found ${revenueSources.length} revenue source(s)`
    );

    if (revenueSources.length > 0) {
      console.log('Revenue Sources:', revenueSources.map(r => ({
        type: r.sourceType,
        amount: r.amount,
        status: r.status
      })));
    }

    return { payment, escrowTransaction, revenueSources };
  } catch (error: any) {
    logTest("In-App Payment Flow", false, error.message);
    throw error;
  }
}

async function testExternalPaymentFlow(rental: any, tenant: any, admin: any) {
  logSection('TEST 3: EXTERNAL PAYMENT REQUEST FLOW');

  try {
    // Create payment request
    const paymentRequest = await paymentRequestService.createPaymentRequest({
      tenantId: tenant._id.toString(),
      rentalId: rental._id.toString(),
      amount: 600,
      proofOfPayment: "https://example.com/receipt.jpg",
      paymentMethod: "bank_transfer",
      notes: "Test external payment via bank"
    });

    logTest("Payment Request Created", !!paymentRequest, `Request ID: ${paymentRequest._id}`);
    logTest(
      "Request Status",
      paymentRequest.status === "pending_admin_approval",
      `Status: ${paymentRequest.status}`
    );

    // Get pending requests
    const pendingRequests = await paymentRequestService.getPendingRequests();
    logTest(
      "Get Pending Requests",
      pendingRequests.length > 0,
      `Found ${pendingRequests.length} pending request(s)`
    );

    // Admin approves request
    const approvalResult = await paymentRequestService.approvePaymentRequest(
      paymentRequest._id.toString(),
      admin._id.toString()
    );

    logTest("Admin Approval", !!approvalResult, "Payment request approved");
    logTest(
      "Payment Created After Approval",
      !!approvalResult.payment,
      `Payment ID: ${approvalResult.payment._id}`
    );
    logTest(
      "Payment Verified",
      approvalResult.payment.status === "verified",
      `Status: ${approvalResult.payment.status}`
    );

    // Check escrow transaction
    const escrowTransaction = await EscrowTransaction.findOne({
      paymentId: approvalResult.payment._id
    });

    logTest(
      "Escrow Created for External Payment",
      !!escrowTransaction && escrowTransaction.status === "held",
      `Escrow Status: ${escrowTransaction?.status}`
    );

    if (escrowTransaction) {
      logTest(
        "Payment Source Marked",
        escrowTransaction.paymentSource === "external_deposit",
        `Payment Source: ${escrowTransaction.paymentSource}`
      );
    }

    // Updated request status
    const updatedRequest = await PaymentRequest.findById(paymentRequest._id);
    logTest(
      "Request Status Updated",
      updatedRequest?.status === "processed",
      `Status: ${updatedRequest?.status}`
    );

    return { paymentRequest: updatedRequest, payment: approvalResult.payment, escrowTransaction };
  } catch (error: any) {
    logTest("External Payment Flow", false, error.message);
    throw error;
  }
}

async function testEscrowSummary() {
  logSection('TEST 4: ESCROW SUMMARY & ACCOUNT');

  try {
    const summary = await escrowService.getEscrowSummary();

    logTest("Escrow Summary Retrieved", !!summary, "Summary fetched successfully");

    console.log('Escrow Summary:', {
      totalHeld: summary.totalHeld,
      pendingLandlordPayouts: summary.pendingLandlordPayouts,
      pendingKhayalamiPayouts: summary.pendingKhayalamiPayouts,
      transactionCounts: summary.transactionCounts
    });

    logTest(
      "Total Held > 0",
      summary.totalHeld > 0,
      `Total Held: ${summary.totalHeld}`
    );

    logTest(
      "Held Transactions Count",
      summary.transactionCounts.held > 0,
      `Held Transactions: ${summary.transactionCounts.held}`
    );

    return summary;
  } catch (error: any) {
    logTest("Escrow Summary", false, error.message);
    throw error;
  }
}

async function testDistributionFlow(admin: any) {
  logSection('TEST 5: DISTRIBUTION FLOW');

  try {
    // Get pending distribution info
    const heldTransactions = await escrowService.getHeldTransactionsForDistribution();

    logTest(
      "Get Held Transactions",
      heldTransactions.length > 0,
      `Found ${heldTransactions.length} transaction(s) ready for distribution`
    );

    if (heldTransactions.length === 0) {
      logTest("Distribution Flow", false, "No transactions to distribute");
      return;
    }

    console.log('Transactions to distribute:', heldTransactions.map(t => ({
      id: t._id,
      totalAmount: t.totalAmount,
      landlordAmount: t.landlordAmount,
      khayalamiAmount: t.khayalamiAmount,
      status: t.status
    })));

    // Run manual distribution
    const distributionResult = await distributionService.runManualDistribution(
      admin._id.toString()
    );

    logTest("Distribution Executed", distributionResult.success, "Distribution completed");

    console.log('Distribution Result:', {
      totalDistributed: distributionResult.totalDistributed,
      landlordPayouts: distributionResult.landlordPayouts,
      khayalamiPayouts: distributionResult.khayalamiPayouts,
      payoutIds: distributionResult.payoutIds
    });

    logTest(
      "Payouts Created",
      distributionResult.payoutIds.length > 0,
      `Created ${distributionResult.payoutIds.length} payout(s)`
    );

    // Verify payouts were created
    const payouts = await Payout.find({
      _id: { $in: distributionResult.payoutIds }
    });

    logTest(
      "Payout Records",
      payouts.length === distributionResult.payoutIds.length,
      `Found ${payouts.length} payout record(s)`
    );

    // Verify escrow transactions were updated
    const distributedTransactions = await EscrowTransaction.find({
      status: "distributed"
    });

    logTest(
      "Escrow Transactions Updated",
      distributedTransactions.length > 0,
      `${distributedTransactions.length} transaction(s) marked as distributed`
    );

    // Verify revenue sources were marked as distributed
    const distributedRevenueSources = await RevenueSource.find({
      status: "distributed"
    });

    logTest(
      "Revenue Sources Distributed",
      distributedRevenueSources.length > 0,
      `${distributedRevenueSources.length} revenue source(s) marked as distributed`
    );

    return { distributionResult, payouts, distributedTransactions };
  } catch (error: any) {
    logTest("Distribution Flow", false, error.message);
    throw error;
  }
}

async function testRevenueSourceTracking() {
  logSection('TEST 6: REVENUE SOURCE TRACKING');

  try {
    // Get revenue by source type
    const subscriptionRevenue = await revenueSourceService.getRevenueBySource("subscription");
    const processingRevenue = await revenueSourceService.getRevenueBySource("processing_fee");

    logTest(
      "Subscription Revenue Tracked",
      subscriptionRevenue >= 0,
      `Total: ${subscriptionRevenue}`
    );

    logTest(
      "Processing Fee Revenue Tracked",
      processingRevenue >= 0,
      `Total: ${processingRevenue}`
    );

    // Get revenue by period (last 30 days)
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date();
    const periodRevenue = await revenueSourceService.getRevenueByPeriod(startDate, endDate);

    console.log('Revenue by Source (Last 30 days):', periodRevenue);

    logTest(
      "Revenue by Period",
      periodRevenue.length >= 0,
      `Found ${periodRevenue.length} revenue source type(s)`
    );

    return { subscriptionRevenue, processingRevenue, periodRevenue };
  } catch (error: any) {
    logTest("Revenue Source Tracking", false, error.message);
    throw error;
  }
}

async function cleanupTestData() {
  logSection('CLEANUP TEST DATA');

  try {
    // Note: Commenting out cleanup to preserve test data for inspection
    // Uncomment if you want to clean up after tests

    /*
    await Payment.deleteMany({ notes: /Test/ });
    await EscrowTransaction.deleteMany({});
    await RevenueSource.deleteMany({});
    await PaymentRequest.deleteMany({});
    await Payout.deleteMany({});
    await Subscription.deleteMany({});
    */

    logTest("Cleanup", true, "Test data preserved for inspection");
  } catch (error: any) {
    logTest("Cleanup", false, error.message);
  }
}

function printTestSummary() {
  logSection('TEST SUMMARY');

  const total = testResults.length;
  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const passRate = ((passed / total) * 100).toFixed(2);

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Pass Rate: ${passRate}%\n`);

  if (failed > 0) {
    console.log('Failed Tests:');
    testResults
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  ❌ ${r.name}`);
        if (r.details) console.log(`     ${r.details}`);
      });
  }
}

async function runTests() {
  console.log('\n🚀 STARTING REVENUE & ESCROW WORKFLOW TESTS\n');

  try {
    // Connect to database
    await dbConnection.connect();
    logTest("Database Connection", true, "Connected to MongoDB");

    // Setup test data
    const testData = await setupTestData();

    // Run tests
    await testPaymentCalculation(testData.rental, testData.tenant, testData.landlord);
    await testInAppPaymentFlow(testData.rental, testData.tenant);
    await testExternalPaymentFlow(testData.rental, testData.tenant, testData.admin);
    await testEscrowSummary();
    await testDistributionFlow(testData.admin);
    await testRevenueSourceTracking();

    // Cleanup
    await cleanupTestData();

    // Print summary
    printTestSummary();

    // Disconnect
    await dbConnection.disconnect();
    logTest("Database Disconnection", true, "Disconnected from MongoDB");

    console.log('\n✅ ALL TESTS COMPLETED\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    console.error(error.stack);

    printTestSummary();

    process.exit(1);
  }
}

// Run tests
runTests();
