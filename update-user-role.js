// MongoDB script to update user role to admin
// Run this with: mongo your_database_name update-user-role.js

// Update the admin user role
db.users.updateOne(
  { email: "admin@khayalami.com" },
  { $set: { role: "admin" } }
);

// Verify the update
const adminUser = db.users.findOne({ email: "admin@khayalami.com" });
print("Admin user updated:");
print("Email: " + adminUser.email);
print("Role: " + adminUser.role);
print("ID: " + adminUser._id);











