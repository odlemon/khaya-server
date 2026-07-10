// @ts-nocheck
/**
 * Seed RBAC test roles + staff users with fixed passwords (no email dependency).
 *
 * npx ts-node src/scripts/seedRbacTestUsers.ts
 * npm run seed:rbac-test
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/User";
import { StaffRole } from "../models/StaffRole";
import { staffRoleService } from "../services/StaffRoleService";
import { slugifyRoleName } from "../utils/staffAuth";

dotenv.config();

const TEST_PASSWORD = "Test@123456";
const MUST_CHANGE_PASSWORD = "Temp@Test1";

type RoleSeed = {
  name: string;
  portal: "khayalami" | "bank" | "insurance";
  permissions: string[];
};

type UserSeed = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleName: string;
  portal: "khayalami" | "bank" | "insurance";
  mustChangePassword?: boolean;
};

const ROLES: RoleSeed[] = [
  {
    name: "Users Viewer",
    portal: "khayalami",
    permissions: ["khayalami.dashboard.view", "khayalami.users.view"],
  },
  {
    name: "Payments Officer",
    portal: "khayalami",
    permissions: [
      "khayalami.dashboard.view",
      "khayalami.payments.view",
      "khayalami.payment_requests.view",
      "khayalami.payment_requests.approve",
      "khayalami.payment_requests.reject",
    ],
  },
  {
    name: "Dashboard Only",
    portal: "khayalami",
    permissions: ["khayalami.dashboard.view"],
  },
  {
    name: "Staff Manager",
    portal: "khayalami",
    permissions: [
      "khayalami.dashboard.view",
      "khayalami.staff.roles.manage",
      "khayalami.staff.users.manage",
    ],
  },
  {
    name: "Payouts Viewer",
    portal: "bank",
    permissions: ["bank.dashboard.view", "bank.payouts.view"],
  },
  {
    name: "Policies Viewer",
    portal: "insurance",
    permissions: ["insurance.dashboard.view", "insurance.policies.view"],
  },
];

const USERS: UserSeed[] = [
  {
    email: "staff.users@khaya.test",
    password: TEST_PASSWORD,
    firstName: "Users",
    lastName: "Viewer",
    roleName: "Users Viewer",
    portal: "khayalami",
  },
  {
    email: "staff.payments@khaya.test",
    password: TEST_PASSWORD,
    firstName: "Payments",
    lastName: "Officer",
    roleName: "Payments Officer",
    portal: "khayalami",
  },
  {
    email: "staff.minimal@khaya.test",
    password: TEST_PASSWORD,
    firstName: "Dashboard",
    lastName: "Only",
    roleName: "Dashboard Only",
    portal: "khayalami",
  },
  {
    email: "staff.manager@khaya.test",
    password: TEST_PASSWORD,
    firstName: "Staff",
    lastName: "Manager",
    roleName: "Staff Manager",
    portal: "khayalami",
  },
  {
    email: "staff.mustchange@khaya.test",
    password: MUST_CHANGE_PASSWORD,
    firstName: "Must",
    lastName: "Change",
    roleName: "Users Viewer",
    portal: "khayalami",
    mustChangePassword: true,
  },
  {
    email: "staff.bank@khaya.test",
    password: TEST_PASSWORD,
    firstName: "Bank",
    lastName: "Payouts",
    roleName: "Payouts Viewer",
    portal: "bank",
  },
  {
    email: "staff.insurance@khaya.test",
    password: TEST_PASSWORD,
    firstName: "Insurance",
    lastName: "Policies",
    roleName: "Policies Viewer",
    portal: "insurance",
  },
];

async function upsertRole(role: RoleSeed, createdBy?: mongoose.Types.ObjectId) {
  const slug = slugifyRoleName(role.name);
  let doc = await StaffRole.findOne({ portal: role.portal, slug });

  if (doc) {
    doc.name = role.name;
    doc.permissions = role.permissions;
    doc.isActive = true;
    await doc.save();
    return doc;
  }

  return StaffRole.create({
    name: role.name,
    slug,
    portal: role.portal,
    permissions: role.permissions,
    isActive: true,
    createdBy,
  });
}

async function upsertStaffUser(user: UserSeed, staffRoleId: mongoose.Types.ObjectId, createdBy?: mongoose.Types.ObjectId) {
  const email = user.email.toLowerCase();
  const userRole = staffRoleService.getUserRoleForPortal(user.portal);
  const existing = await User.findOne({ email });

  if (existing) {
    if (existing.role === "tenant" || existing.role === "landlord") {
      throw new Error(`Cannot overwrite app user: ${email}`);
    }
    existing.firstName = user.firstName;
    existing.lastName = user.lastName;
    existing.password = user.password;
    existing.role = userRole;
    existing.staffRoleId = staffRoleId;
    existing.isSuperAdmin = false;
    existing.mustChangePassword = !!user.mustChangePassword;
    existing.isVerified = true;
    existing.isActive = true;
    await existing.save();
    return { email, action: "updated" as const };
  }

  await User.create({
    email,
    password: user.password,
    firstName: user.firstName,
    lastName: user.lastName,
    role: userRole,
    staffRoleId,
    isSuperAdmin: false,
    mustChangePassword: !!user.mustChangePassword,
    isVerified: true,
    isActive: true,
    createdByStaff: createdBy,
  });

  return { email, action: "created" as const };
}

async function ensureSuperAdmins() {
  const updates = [
    { email: "admin@khaya.com", role: "admin" as const },
    { email: "admin@metbank", role: "bank_admin" as const },
    { email: "admin@insurance.com", role: "insurance_admin" as const },
  ];

  for (const item of updates) {
    const user = await User.findOne({ email: item.email });
    if (user && !user.isSuperAdmin) {
      user.isSuperAdmin = true;
      await user.save();
      console.log(`✅ Marked super-admin: ${item.email}`);
    }
  }
}

async function seedRbacTestUsers() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("❌ MONGODB_URI is not set");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB\n");

  const systemAdmin = await User.findOne({ email: "admin@khaya.com" });
  const createdBy = systemAdmin?._id;

  await ensureSuperAdmins();

  const roleIdByKey = new Map<string, mongoose.Types.ObjectId>();

  console.log("📋 Roles:");
  for (const role of ROLES) {
    const doc = await upsertRole(role, createdBy);
    roleIdByKey.set(`${role.portal}:${role.name}`, doc._id);
    console.log(`  ✅ ${role.portal} / ${role.name} (${role.permissions.length} permissions)`);
  }

  console.log("\n👤 Staff users:");
  for (const user of USERS) {
    const roleId = roleIdByKey.get(`${user.portal}:${user.roleName}`);
    if (!roleId) {
      throw new Error(`Role not found: ${user.portal} / ${user.roleName}`);
    }
    const result = await upsertStaffUser(user, roleId, createdBy);
    console.log(`  ✅ ${result.action}: ${user.email} → ${user.roleName}`);
  }

  console.log("\n📄 Credentials documented in docs/PORTAL_RBAC_TEST_CREDENTIALS.md");
  console.log("🔐 All test staff passwords are fixed — emails are not sent.\n");
}

seedRbacTestUsers()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  });
