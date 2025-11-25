// @ts-nocheck
import mongoose from "mongoose";

async function disable2FA() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/khaya";
    await mongoose.connect(uri);
    console.log("✅ Connected to database\n");

    // Disable 2FA for tenant
    await mongoose.connection.db.collection("users").updateOne(
      { email: "nkarata@clearcoverhealth.com" },
      { $set: { twoFactorEnabled: false } }
    );
    console.log("✅ Disabled 2FA for tenant: nkarata@clearcoverhealth.com");

    await mongoose.disconnect();
    console.log("\n✅ Disconnected");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

disable2FA();
