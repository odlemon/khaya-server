// @ts-nocheck
/**
 * Find existing landlord-tenant connections for API testing
 */

import { dbConnection } from "./src/utils/database";
import { User } from "./src/models/User";
import { Rental } from "./src/models/Rental";
import { Agreement } from "./src/models/Agreement";
// Import to register schema
import "./src/models/Property";

async function findTestUsers() {
  try {
    await dbConnection.connect();
    console.log("✅ Connected to database\n");

    // Find admin users
    console.log("=".repeat(60));
    console.log("ADMIN USERS");
    console.log("=".repeat(60));
    const admins = await User.find({ role: "admin" }).limit(5);
    console.log(`Found ${admins.length} admin(s):\n`);
    admins.forEach(admin => {
      console.log(`Admin: ${admin.firstName} ${admin.lastName}`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  ID: ${admin._id}`);
      console.log();
    });

    // Find active rentals with all relationships
    console.log("=".repeat(60));
    console.log("ACTIVE RENTALS WITH CONNECTIONS");
    console.log("=".repeat(60));

    const rentals = await Rental.find({ status: "active" })
      .populate("tenantId")
      .populate("landlordId")
      .populate("propertyId")
      .populate("agreementId")
      .limit(5);

    console.log(`Found ${rentals.length} active rental(s):\n`);

    for (const rental of rentals) {
      console.log("─".repeat(60));
      console.log(`RENTAL #${rental._id}`);
      console.log("─".repeat(60));

      if (rental.tenantId) {
        console.log(`\nTENANT:`);
        console.log(`  Name: ${rental.tenantId.firstName} ${rental.tenantId.lastName}`);
        console.log(`  Email: ${rental.tenantId.email}`);
        console.log(`  Phone: ${rental.tenantId.phoneNumber || 'N/A'}`);
        console.log(`  ID: ${rental.tenantId._id}`);
      }

      if (rental.landlordId) {
        console.log(`\nLANDLORD:`);
        console.log(`  Name: ${rental.landlordId.firstName} ${rental.landlordId.lastName}`);
        console.log(`  Email: ${rental.landlordId.email}`);
        console.log(`  Phone: ${rental.landlordId.phoneNumber || 'N/A'}`);
        console.log(`  ID: ${rental.landlordId._id}`);
      }

      if (rental.propertyId) {
        console.log(`\nPROPERTY:`);
        console.log(`  Title: ${rental.propertyId.title}`);
        console.log(`  Address: ${rental.propertyId.address?.street || 'N/A'}, ${rental.propertyId.address?.city || 'N/A'}`);
        console.log(`  ID: ${rental.propertyId._id}`);
      }

      console.log(`\nRENTAL INFO:`);
      console.log(`  Monthly Rent: ${rental.monthlyRent}`);
      console.log(`  Security Deposit: ${rental.securityDeposit}`);
      console.log(`  Start Date: ${rental.startDate}`);
      console.log(`  End Date: ${rental.endDate}`);
      console.log(`  Status: ${rental.status}`);
      console.log(`  Payment Stats: ${rental.stats?.totalPayments || 0} total, ${rental.stats?.paidPayments || 0} paid`);

      if (rental.agreementId) {
        console.log(`\nAGREEMENT:`);
        console.log(`  ID: ${rental.agreementId._id}`);
        console.log(`  Status: ${rental.agreementId.status || 'N/A'}`);
      }

      console.log();
    }

    // Find users suitable for testing (with emails)
    console.log("=".repeat(60));
    console.log("RECOMMENDED TEST USERS");
    console.log("=".repeat(60));

    if (rentals.length > 0) {
      const testRental = rentals[0];
      console.log("\n✅ RECOMMENDED TEST SCENARIO:\n");
      console.log(`Rental ID: ${testRental._id}`);
      console.log(`Agreement ID: ${testRental.agreementId?._id || 'N/A'}`);
      console.log(`Property ID: ${testRental.propertyId?._id || 'N/A'}`);
      console.log();
      console.log(`Tenant Email: ${testRental.tenantId?.email}`);
      console.log(`Tenant ID: ${testRental.tenantId?._id}`);
      console.log();
      console.log(`Landlord Email: ${testRental.landlordId?.email}`);
      console.log(`Landlord ID: ${testRental.landlordId?._id}`);
      console.log();
      if (admins.length > 0) {
        console.log(`Admin Email: ${admins[0].email}`);
        console.log(`Admin ID: ${admins[0]._id}`);
      }
      console.log();
      console.log("Monthly Rent Amount: K" + testRental.monthlyRent);
    } else {
      console.log("\n⚠️ No active rentals found!");
    }

    await dbConnection.disconnect();
    console.log("\n✅ Database disconnected");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

findTestUsers();
