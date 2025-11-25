// @ts-nocheck
/**
 * COMPREHENSIVE API TEST - Revenue & Escrow Workflow
 *
 * This script tests the ACTUAL API endpoints with real authentication
 * to verify the complete user journey from login to payment to distribution
 */

import axios, { AxiosInstance } from "axios";

const BASE_URL = "http://localhost:3002";

// Test data from database
const TEST_DATA = {
  tenant: {
    email: "nkarata@clearcoverhealth.com",
    password: "TestPassword123!",
    name: "Elisa Desterviell",
    id: "68fca19f124aee2c52c8916d"
  },
  landlord: {
    email: "veximagames@gmail.com",
    password: "TestPassword123!",
    name: "Craig Hood",
    id: "68fca0d8124aee2c52c89153"
  },
  admin: {
    email: "admin@khaya.com",
    password: "TestPassword123!",
    name: "System Admin",
    id: "68f2606a4318aa2025a66694"
  },
  rental: {
    id: "68fca787124aee2c52c893fc",
    propertyId: "68fca3d7124aee2c52c89261",
    agreementId: "68fca73c124aee2c52c893d4",
    monthlyRent: 500
  }
};

// Test results tracker
const testResults: any[] = [];
let tenantToken: string = "";
let landlordToken: string = "";
let adminToken: string = "";
let createdPaymentId: string = "";
let createdPaymentRequestId: string = "";

function logTest(name: string, passed: boolean, details?: string) {
  const result = { name, passed, details, timestamp: new Date() };
  testResults.push(result);
  console.log(`${passed ? '✅' : '❌'} ${name}`);
  if (details) console.log(`   ${details}`);
}

function logSection(title: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${title}`);
  console.log(`${'='.repeat(70)}\n`);
}

async function makeRequest(method: string, url: string, data?: any, token?: string) {
  try {
    const headers: any = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios({
      method,
      url: `${BASE_URL}${url}`,
      data,
      headers,
      validateStatus: () => true // Don't throw on any status
    });

    return {
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      data: response.data
    };
  } catch (error: any) {
    return {
      success: false,
      status: error.response?.status || 500,
      error: error.message,
      data: error.response?.data
    };
  }
}

async function testTenantLogin() {
  logSection('TEST 1: TENANT LOGIN');

  const result = await makeRequest('POST', '/api/auth/login', {
    email: TEST_DATA.tenant.email,
    password: TEST_DATA.tenant.password
  });

  logTest("Tenant Login API Call", result.success, `Status: ${result.status}`);

  if (result.success && result.data?.token) {
    tenantToken = result.data.token;
    logTest("Tenant JWT Token Received", true, `Token length: ${tenantToken.length}`);
    console.log(`\nTenant Details:`);
    console.log(`  Name: ${result.data.user?.firstName} ${result.data.user?.lastName}`);
    console.log(`  Email: ${result.data.user?.email}`);
    console.log(`  Role: ${result.data.user?.role}`);
  } else {
    logTest("Tenant JWT Token Received", false, `Error: ${JSON.stringify(result.data)}`);
  }

  return result.success;
}

async function testLandlordLogin() {
  logSection('TEST 2: LANDLORD LOGIN');

  const result = await makeRequest('POST', '/api/auth/login', {
    email: TEST_DATA.landlord.email,
    password: TEST_DATA.landlord.password
  });

  logTest("Landlord Login API Call", result.success, `Status: ${result.status}`);

  if (result.success && result.data?.token) {
    landlordToken = result.data.token;
    logTest("Landlord JWT Token Received", true, `Token length: ${landlordToken.length}`);
    console.log(`\nLandlord Details:`);
    console.log(`  Name: ${result.data.user?.firstName} ${result.data.user?.lastName}`);
    console.log(`  Email: ${result.data.user?.email}`);
    console.log(`  Role: ${result.data.user?.role}`);
  } else {
    logTest("Landlord JWT Token Received", false, `Error: ${JSON.stringify(result.data)}`);
  }

  return result.success;
}

async function testAdminLogin() {
  logSection('TEST 3: ADMIN LOGIN');

  const result = await makeRequest('POST', '/api/auth/login', {
    email: TEST_DATA.admin.email,
    password: TEST_DATA.admin.password
  });

  logTest("Admin Login API Call", result.success, `Status: ${result.status}`);

  if (result.success && result.data?.token) {
    adminToken = result.data.token;
    logTest("Admin JWT Token Received", true, `Token length: ${adminToken.length}`);
    console.log(`\nAdmin Details:`);
    console.log(`  Name: ${result.data.user?.firstName} ${result.data.user?.lastName}`);
    console.log(`  Email: ${result.data.user?.email}`);
    console.log(`  Role: ${result.data.user?.role}`);
  } else {
    logTest("Admin JWT Token Received", false, `Error: ${JSON.stringify(result.data)}`);
  }

  return result.success;
}

async function testTenantCreateInAppPayment() {
  logSection('TEST 4: TENANT CREATE IN-APP PAYMENT');

  const result = await makeRequest(
    'POST',
    `/api/payments/rental/${TEST_DATA.rental.id}/create`,
    {
      amount: 500,
      paymentMethod: "in_app",
      paymentType: "rent",
      gatewayResponse: {
        provider: "stripe",
        transactionId: "test-" + Date.now(),
        transactionRef: "ref-" + Date.now(),
        paidAt: new Date(),
        rawResponse: { status: "success" }
      },
      notes: "API Test - In-app payment"
    },
    tenantToken
  );

  logTest("Create In-App Payment API", result.success, `Status: ${result.status}`);

  if (result.success && result.data?.data?.payment) {
    const payment = result.data.data.payment;
    createdPaymentId = payment._id;

    logTest("Payment Record Created", true, `Payment ID: ${createdPaymentId}`);
    logTest("Payment Status Verified", payment.status === "verified", `Status: ${payment.status}`);

    console.log(`\nPayment Details:`);
    console.log(`  ID: ${payment._id}`);
    console.log(`  Amount: K${payment.amount}`);
    console.log(`  Status: ${payment.status}`);
    console.log(`  Method: ${payment.paymentMethod}`);

    if (result.data.data.escrowTransaction) {
      const escrow = result.data.data.escrowTransaction;
      logTest("Escrow Transaction Created", true, `Escrow ID: ${escrow._id}`);
      logTest("Escrow Status Held", escrow.status === "held", `Status: ${escrow.status}`);

      console.log(`\nEscrow Details:`);
      console.log(`  Total: K${escrow.totalAmount}`);
      console.log(`  Landlord: K${escrow.landlordAmount}`);
      console.log(`  Khayalami: K${escrow.khayalamiAmount}`);
      console.log(`  Deductions: ${JSON.stringify(escrow.deductions)}`);

      const totalCheck = escrow.landlordAmount + escrow.khayalamiAmount;
      logTest(
        "Escrow Amount Split Correct",
        Math.abs(totalCheck - escrow.totalAmount) < 0.01,
        `${escrow.landlordAmount} + ${escrow.khayalamiAmount} = ${totalCheck}`
      );
    } else {
      logTest("Escrow Transaction Created", false, "No escrow transaction in response");
    }
  } else {
    logTest("Payment Record Created", false, `Error: ${JSON.stringify(result.data)}`);
  }

  return result.success;
}

async function testTenantCreateExternalPaymentRequest() {
  logSection('TEST 5: TENANT CREATE EXTERNAL PAYMENT REQUEST');

  const result = await makeRequest(
    'POST',
    '/api/payment-requests',
    {
      rentalId: TEST_DATA.rental.id,
      amount: 600,
      proofOfPayment: "https://example.com/receipt-test.jpg",
      paymentMethod: "bank_transfer",
      notes: "API Test - External bank transfer"
    },
    tenantToken
  );

  logTest("Create Payment Request API", result.success, `Status: ${result.status}`);

  if (result.success && result.data?.data) {
    const request = result.data.data;
    createdPaymentRequestId = request._id;

    logTest("Payment Request Created", true, `Request ID: ${createdPaymentRequestId}`);
    logTest(
      "Request Status Pending Approval",
      request.status === "pending_admin_approval",
      `Status: ${request.status}`
    );

    console.log(`\nPayment Request Details:`);
    console.log(`  ID: ${request._id}`);
    console.log(`  Amount: K${request.amount}`);
    console.log(`  Status: ${request.status}`);
    console.log(`  Method: ${request.paymentMethod}`);
    console.log(`  Submitted At: ${request.submittedAt}`);
  } else {
    logTest("Payment Request Created", false, `Error: ${JSON.stringify(result.data)}`);
  }

  return result.success;
}

async function testAdminGetPendingRequests() {
  logSection('TEST 6: ADMIN VIEW PENDING PAYMENT REQUESTS');

  const result = await makeRequest(
    'GET',
    '/api/payment-requests/pending',
    null,
    adminToken
  );

  logTest("Get Pending Requests API", result.success, `Status: ${result.status}`);

  if (result.success && result.data?.data) {
    const requests = result.data.data;
    logTest("Pending Requests Retrieved", Array.isArray(requests), `Found ${requests.length} request(s)`);

    const ourRequest = requests.find((r: any) => r._id === createdPaymentRequestId);
    logTest(
      "Our Request in Pending List",
      !!ourRequest,
      ourRequest ? `Found: ${ourRequest._id}` : "Not found in list"
    );

    if (ourRequest) {
      console.log(`\nOur Payment Request:`);
      console.log(`  Tenant: ${ourRequest.tenantId?.firstName} ${ourRequest.tenantId?.lastName}`);
      console.log(`  Amount: K${ourRequest.amount}`);
      console.log(`  Method: ${ourRequest.paymentMethod}`);
      console.log(`  Status: ${ourRequest.status}`);
    }
  } else {
    logTest("Pending Requests Retrieved", false, `Error: ${JSON.stringify(result.data)}`);
  }

  return result.success;
}

async function testAdminApprovePaymentRequest() {
  logSection('TEST 7: ADMIN APPROVE PAYMENT REQUEST');

  if (!createdPaymentRequestId) {
    logTest("Admin Approve Payment Request", false, "No payment request ID available");
    return false;
  }

  const result = await makeRequest(
    'POST',
    `/api/payment-requests/${createdPaymentRequestId}/approve`,
    {},
    adminToken
  );

  logTest("Approve Payment Request API", result.success, `Status: ${result.status}`);

  if (result.success && result.data?.data) {
    const data = result.data.data;

    logTest("Payment Created After Approval", !!data.payment, `Payment ID: ${data.payment?._id}`);
    logTest(
      "Payment Status After Approval",
      data.payment?.status === "verified" || data.payment?.status === "paid",
      `Status: ${data.payment?.status}`
    );

    if (data.escrowTransaction) {
      logTest("Escrow Created for External Payment", true, `Escrow ID: ${data.escrowTransaction._id}`);

      console.log(`\nExternal Payment Escrow:`);
      console.log(`  Total: K${data.escrowTransaction.totalAmount || data.escrowTransaction.totalHeld}`);
      console.log(`  Status: ${data.escrowTransaction.status || 'N/A'}`);
    }

    logTest(
      "Request Status Updated",
      data.paymentRequest?.status === "processed",
      `Status: ${data.paymentRequest?.status}`
    );
  } else {
    logTest("Payment Created After Approval", false, `Error: ${JSON.stringify(result.data)}`);
  }

  return result.success;
}

async function testGetEscrowSummary() {
  logSection('TEST 8: GET ESCROW SUMMARY (ADMIN)');

  const result = await makeRequest(
    'GET',
    '/api/escrow/summary',
    null,
    adminToken
  );

  logTest("Get Escrow Summary API", result.success, `Status: ${result.status}`);

  if (result.success && result.data?.data) {
    const summary = result.data.data;

    logTest("Escrow Summary Retrieved", true, "Summary data received");
    logTest("Total Held Amount > 0", summary.totalHeld > 0, `Total Held: K${summary.totalHeld}`);

    console.log(`\nEscrow Summary:`);
    console.log(`  Total Held: K${summary.totalHeld}`);
    console.log(`  Pending Landlord Payouts: K${summary.pendingLandlordPayouts}`);
    console.log(`  Pending Khayalami Payouts: K${summary.pendingKhayalamiPayouts}`);
    console.log(`  Transaction Counts:`, summary.transactionCounts);
  } else {
    logTest("Escrow Summary Retrieved", false, `Error: ${JSON.stringify(result.data)}`);
  }

  return result.success;
}

async function testLandlordViewEscrowTransactions() {
  logSection('TEST 9: LANDLORD VIEW ESCROW TRANSACTIONS');

  const result = await makeRequest(
    'GET',
    `/api/escrow/landlord/${TEST_DATA.landlord.id}`,
    null,
    landlordToken
  );

  logTest("Get Landlord Escrow Transactions API", result.success, `Status: ${result.status}`);

  if (result.success && result.data?.data) {
    const transactions = result.data.data;
    logTest("Escrow Transactions Retrieved", Array.isArray(transactions), `Found ${transactions.length} transaction(s)`);

    if (transactions.length > 0) {
      console.log(`\nLandlord Escrow Transactions:`);
      transactions.slice(0, 3).forEach((t: any, i: number) => {
        console.log(`  ${i + 1}. K${t.totalAmount} - Status: ${t.status} - Landlord gets: K${t.landlordAmount}`);
      });
    }
  } else {
    logTest("Escrow Transactions Retrieved", false, `Error: ${JSON.stringify(result.data)}`);
  }

  return result.success;
}

async function printTestSummary() {
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

  console.log('\n' + '='.repeat(70));
  console.log('TEST DATA USED:');
  console.log('='.repeat(70));
  console.log(`Tenant: ${TEST_DATA.tenant.email}`);
  console.log(`Landlord: ${TEST_DATA.landlord.email}`);
  console.log(`Admin: ${TEST_DATA.admin.email}`);
  console.log(`Rental ID: ${TEST_DATA.rental.id}`);
  console.log(`Monthly Rent: K${TEST_DATA.rental.monthlyRent}`);
}

async function runAPITests() {
  console.log('\n🚀 STARTING API REVENUE & ESCROW WORKFLOW TESTS\n');
  console.log(`Testing against: ${BASE_URL}\n`);

  try {
    // Phase 1: Authentication
    await testTenantLogin();
    await testLandlordLogin();
    await testAdminLogin();

    // Phase 2: Tenant creates payment
    if (tenantToken) {
      await testTenantCreateInAppPayment();
      await testTenantCreateExternalPaymentRequest();
    }

    // Phase 3: Admin approves
    if (adminToken) {
      await testAdminGetPendingRequests();
      await testAdminApprovePaymentRequest();
      await testGetEscrowSummary();
    }

    // Phase 4: Landlord views escrow
    if (landlordToken) {
      await testLandlordViewEscrowTransactions();
    }

    // Print summary
    printTestSummary();

    console.log('\n✅ ALL API TESTS COMPLETED\n');
  } catch (error: any) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    printTestSummary();
  }
}

// Run tests
runAPITests();
