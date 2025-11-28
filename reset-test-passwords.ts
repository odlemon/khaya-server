// @ts-nocheck
import mongoose from "mongoose";
import bcrypt from "bcrypt";

async function resetPasswords() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/khaya";
    await mongoose.connect(uri);
    console.log("✅ Connected to database\n");

    const testPassword = "TestPassword123!";
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    // Reset tenant password
    await mongoose.connection.db.collection("users").updateOne(
      { email: "nkarata@clearcoverhealth.com" },
      { $set: { password: hashedPassword } }
    );
    console.log("✅ Reset tenant password: nkarata@clearcoverhealth.com");

    // Reset landlord password
    await mongoose.connection.db.collection("users").updateOne(
      { email: "veximagames@gmail.com" },
      { $set: { password: hashedPassword } }
    );
    console.log("✅ Reset landlord password: veximagames@gmail.com");

    // Reset admin password
    await mongoose.connection.db.collection("users").updateOne(
      { email: "admin@khaya.com" },
      { $set: { password: hashedPassword } }
    );
    console.log("✅ Reset admin password: admin@khaya.com");

    console.log(`\n🔑 All passwords reset to: ${testPassword}`);

    await mongoose.disconnect();
    console.log("\n✅ Disconnected");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

resetPasswords();
