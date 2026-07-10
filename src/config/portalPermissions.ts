// @ts-nocheck

export type PortalType = "khayalami" | "bank" | "insurance";

export interface PermissionDefinition {
  key: string;
  label: string;
  module: string;
}

export interface PortalPermissionCatalog {
  portal: PortalType;
  label: string;
  modules: {
    module: string;
    label: string;
    permissions: PermissionDefinition[];
  }[];
}

const KHAYALAMI_PERMISSIONS: PortalPermissionCatalog = {
  portal: "khayalami",
  label: "Khayalami Admin",
  modules: [
    {
      module: "dashboard",
      label: "Dashboard",
      permissions: [{ key: "khayalami.dashboard.view", label: "View dashboard" }],
    },
    {
      module: "users",
      label: "Users",
      permissions: [
        { key: "khayalami.users.view", label: "View users" },
        { key: "khayalami.users.terminate", label: "Terminate accounts" },
        { key: "khayalami.users.reinstate", label: "Reinstate accounts" },
        { key: "khayalami.users.delete", label: "Delete users" },
        { key: "khayalami.users.update_status", label: "Update user status" },
      ],
    },
    {
      module: "properties",
      label: "Properties",
      permissions: [
        { key: "khayalami.properties.view", label: "View properties" },
        { key: "khayalami.properties.verify", label: "Verify properties" },
        { key: "khayalami.properties.reject", label: "Reject properties" },
        { key: "khayalami.properties.update_status", label: "Update property status" },
      ],
    },
    {
      module: "connections",
      label: "Connections",
      permissions: [{ key: "khayalami.connections.view", label: "View connections" }],
    },
    {
      module: "agreements",
      label: "Agreements",
      permissions: [
        { key: "khayalami.agreements.view", label: "View agreements" },
        { key: "khayalami.agreements.create", label: "Create agreements" },
        { key: "khayalami.agreements.from_template", label: "Create from template" },
        { key: "khayalami.agreements.generate_word", label: "Generate Word document" },
      ],
    },
    {
      module: "documents",
      label: "Documents",
      permissions: [
        { key: "khayalami.documents.view", label: "View documents" },
        { key: "khayalami.documents.verify", label: "Verify documents" },
        { key: "khayalami.documents.reject", label: "Reject documents" },
      ],
    },
    {
      module: "payments",
      label: "Payments",
      permissions: [
        { key: "khayalami.payments.view", label: "View payments" },
        { key: "khayalami.payment_requests.view", label: "View payment requests" },
        { key: "khayalami.payment_requests.approve", label: "Approve payment requests" },
        { key: "khayalami.payment_requests.reject", label: "Reject payment requests" },
      ],
    },
    {
      module: "escrow",
      label: "Escrow & Distribution",
      permissions: [
        { key: "khayalami.escrow.view", label: "View escrow" },
        { key: "khayalami.escrow.distribute", label: "Distribute escrow" },
        { key: "khayalami.distribution.view", label: "View distribution" },
        { key: "khayalami.distribution.manual", label: "Manual distribution" },
      ],
    },
    {
      module: "commissions",
      label: "Commissions",
      permissions: [{ key: "khayalami.commissions.view", label: "View commissions" }],
    },
    {
      module: "transactions",
      label: "Transactions",
      permissions: [{ key: "khayalami.transactions.view", label: "View transactions" }],
    },
    {
      module: "maintenance",
      label: "Maintenance",
      permissions: [
        { key: "khayalami.maintenance.view", label: "View maintenance" },
        { key: "khayalami.maintenance.assign_vendor", label: "Assign vendor" },
        { key: "khayalami.maintenance.update_eta", label: "Update ETA" },
        { key: "khayalami.maintenance.mark_arrived", label: "Mark arrived" },
      ],
    },
    {
      module: "services",
      label: "Services",
      permissions: [
        { key: "khayalami.services.view", label: "View services" },
        { key: "khayalami.services.assign", label: "Assign services" },
        { key: "khayalami.services.approve", label: "Approve services" },
        { key: "khayalami.services.reject", label: "Reject services" },
        { key: "khayalami.services.billing", label: "Manage billing" },
      ],
    },
    {
      module: "service_providers",
      label: "Service Providers",
      permissions: [
        { key: "khayalami.service_providers.view", label: "View providers" },
        { key: "khayalami.service_providers.create", label: "Create providers" },
        { key: "khayalami.service_providers.edit", label: "Edit providers" },
        { key: "khayalami.service_providers.verify", label: "Verify providers" },
        { key: "khayalami.service_providers.delete", label: "Delete providers" },
      ],
    },
    {
      module: "chat",
      label: "Chat",
      permissions: [
        { key: "khayalami.chat.view", label: "View chats" },
        { key: "khayalami.chat.join", label: "Join chats" },
        { key: "khayalami.chat.send", label: "Send messages" },
      ],
    },
    {
      module: "reports",
      label: "Reports & Analytics",
      permissions: [
        { key: "khayalami.reports.view", label: "View reports" },
        { key: "khayalami.analytics.view", label: "View analytics" },
      ],
    },
    {
      module: "staff",
      label: "Staff Management",
      permissions: [
        { key: "khayalami.staff.roles.manage", label: "Manage roles" },
        { key: "khayalami.staff.users.manage", label: "Manage staff users" },
      ],
    },
  ],
};

const BANK_PERMISSIONS: PortalPermissionCatalog = {
  portal: "bank",
  label: "Bank Dashboard",
  modules: [
    {
      module: "dashboard",
      label: "Dashboard",
      permissions: [{ key: "bank.dashboard.view", label: "View dashboard" }],
    },
    {
      module: "escrow",
      label: "Escrow",
      permissions: [{ key: "bank.escrow.view", label: "View escrow" }],
    },
    {
      module: "payouts",
      label: "Landlord Payouts",
      permissions: [
        { key: "bank.payouts.view", label: "View payouts" },
        { key: "bank.payouts.mark_paid", label: "Mark payout paid" },
      ],
    },
    {
      module: "insurance_payouts",
      label: "Insurance Payouts",
      permissions: [
        { key: "bank.insurance_payouts.view", label: "View insurance payouts" },
        { key: "bank.insurance_payouts.mark_paid", label: "Mark insurance payout paid" },
      ],
    },
  ],
};

const INSURANCE_PERMISSIONS: PortalPermissionCatalog = {
  portal: "insurance",
  label: "Insurance Dashboard",
  modules: [
    {
      module: "dashboard",
      label: "Dashboard",
      permissions: [{ key: "insurance.dashboard.view", label: "View dashboard" }],
    },
    {
      module: "policies",
      label: "Policies",
      permissions: [{ key: "insurance.policies.view", label: "View policies" }],
    },
  ],
};

export const PORTAL_PERMISSION_CATALOGS: PortalPermissionCatalog[] = [
  KHAYALAMI_PERMISSIONS,
  BANK_PERMISSIONS,
  INSURANCE_PERMISSIONS,
];

export const ALL_PORTAL_PERMISSION_KEYS: string[] = PORTAL_PERMISSION_CATALOGS.flatMap(
  (catalog) => catalog.modules.flatMap((m) => m.permissions.map((p) => p.key))
);

export function getCatalogForPortal(portal: PortalType): PortalPermissionCatalog | undefined {
  return PORTAL_PERMISSION_CATALOGS.find((c) => c.portal === portal);
}

export function getAllPermissionKeysForPortal(portal: PortalType): string[] {
  const catalog = getCatalogForPortal(portal);
  if (!catalog) return [];
  return catalog.modules.flatMap((m) => m.permissions.map((p) => p.key));
}

export function isValidPermissionForPortal(portal: PortalType, key: string): boolean {
  return getAllPermissionKeysForPortal(portal).includes(key);
}

export function validatePermissionsForPortal(
  portal: PortalType,
  permissions: string[]
): { valid: boolean; invalid: string[] } {
  const allowed = new Set(getAllPermissionKeysForPortal(portal));
  const invalid = permissions.filter((p) => !allowed.has(p));
  return { valid: invalid.length === 0, invalid };
}

export const PORTAL_TO_USER_ROLE: Record<PortalType, "admin" | "bank_admin" | "insurance_admin"> = {
  khayalami: "admin",
  bank: "bank_admin",
  insurance: "insurance_admin",
};

export const USER_ROLE_TO_PORTAL: Partial<Record<string, PortalType>> = {
  admin: "khayalami",
  bank_admin: "bank",
  insurance_admin: "insurance",
};

export const STAFF_PORTAL_ROLES = ["admin", "bank_admin", "insurance_admin"] as const;
