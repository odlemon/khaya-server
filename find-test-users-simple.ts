// @ts-nocheck
import mongoose from "mongoose";

async function findTestUsers() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/khaya";
    await mongoose.connect(uri);
    console.log("✅ Connected to database\n");

    // Find admins
    const admins = await mongoose.connection.db.collection("users").find({ role: "admin" }).limit(3).toArray();
    console.log("=".repeat(60));
    console.log("ADMIN USERS");
    console.log("=".repeat(60));
    admins.forEach(admin => {
      console.log(`Name: ${admin.firstName} ${admin.lastName}`);
      console.log(`Email: ${admin.email}`);
      console.log(`ID: ${admin._id}\n`);
    });

    // Find active rentals
    const rentals = await mongoose.connection.db.collection("rentals").find({ status: "active" }).limit(5).toArray();
    console.log("=".repeat(60));
    console.log(`ACTIVE RENTALS (Found ${rentals.length})`);
    console.log("=".repeat(60));

    for (const rental of rentals) {
      console.log("\n" + "─".repeat(60));
      console.log(`Rental ID: ${rental._id}`);
      console.log("─".repeat(60));

      // Get tenant
      const tenant = await mongoose.connection.db.collection("users").findOne({ _id: rental.tenantId });
      if (tenant) {
        console.log(`\nTENANT:`);
        console.log(`  Name: ${tenant.firstName} ${tenant.lastName}`);
        console.log(`  Email: ${tenant.email}`);
        console.log(`  ID: ${tenant._id}`);
      }

      // Get landlord
      const landlord = await mongoose.connection.db.collection("users").findOne({ _id: rental.landlordId });
      if (landlord) {
        console.log(`\nLANDLORD:`);
        console.log(`  Name: ${landlord.firstName} ${landlord.lastName}`);
        console.log(`  Email: ${landlord.email}`);
        console.log(`  ID: ${landlord._id}`);
      }

      // Get property
      const property = await mongoose.connection.db.collection("properties").findOne({ _id: rental.propertyId });
      if (property) {
        console.log(`\nPROPERTY:`);
        console.log(`  Title: ${property.title}`);
        console.log(`  ID: ${property._id}`);
      }

      console.log(`\nRENTAL INFO:`);
      console.log(`  Agreement ID: ${rental.agreementId}`);
      console.log(`  Monthly Rent: K${rental.monthlyRent}`);
      console.log(`  Status: ${rental.status}`);
    }

    if (rentals.length > 0) {
      const testRental = rentals[0];
      const tenant = await mongoose.connection.db.collection("users").findOne({ _id: testRental.tenantId });
      const landlord = await mongoose.connection.db.collection("users").findOne({ _id: testRental.landlordId });

      console.log("\n" + "=".repeat(60));
      console.log("RECOMMENDED FOR API TESTING");
      console.log("=".repeat(60));
      console.log(`\nRental ID: ${testRental._id}`);
      console.log(`Agreement ID: ${testRental.agreementId}`);
      console.log(`Property ID: ${testRental.propertyId}`);
      console.log(`Monthly Rent: K${testRental.monthlyRent}`);
      console.log(`\nTenant: ${tenant?.email} (ID: ${tenant?._id})`);
      console.log(`Landlord: ${landlord?.email} (ID: ${landlord?._id})`);
      console.log(`Admin: ${admins[0]?.email} (ID: ${admins[0]?._id})`);
    }

    await mongoose.disconnect();
    console.log("\n✅ Disconnected");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

findTestUsers();
