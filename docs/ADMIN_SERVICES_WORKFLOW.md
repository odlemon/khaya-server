# 👩‍💼 Admin Services Workflow (No Vendor Management)

This guide explains exactly what the Admin does for Service Requests when a landlord approves with `hasVendor: false` (admin provides vendor). Payments for services are tracked on the Service itself (separate from rent) and are held/visible under that Service.

---

## 📥 1) See Service Requests That Need Admin Action

Landlord approved without vendor → status becomes `approved`. These are your queue.

Endpoint:

```http
GET /api/services/admin/needing-vendor
Authorization: Bearer ADMIN_TOKEN
```

Response contains services with status `approved` (awaiting Admin scheduling or rejection).

---

## ✅ 2) Approve (Schedule) A Service

When you decide the service should proceed (even without storing vendor details), set it to `scheduled`. You may provide a date; if omitted, the requestedDate is used.

Endpoint:

```http
POST /api/services/admin/:serviceId/approve
Authorization: Bearer ADMIN_TOKEN

{
  "scheduledDate": "2025-10-25T09:00:00.000Z" // optional
}
```

Effect:
- status: `approved` → `scheduled`
- assignedAdmin: current admin
- scheduledDate: provided or requestedDate

---

## ❌ 3) Reject A Service

If the service shouldn’t proceed, reject it with a reason.

Endpoint:

```http
POST /api/services/admin/:serviceId/reject
Authorization: Bearer ADMIN_TOKEN

{
  "rejectionReason": "Insufficient details provided"
}
```

Effect:
- status: `approved` → `rejected`
- Notifies landlord/tenant (UI should reflect change)

---

## 🧩 (Optional) Attach A Vendor

If you need to store a vendor label for coordination (still no vendor management), you can attach one and schedule in a single step.

Endpoint:

```http
POST /api/services/admin/:serviceId/assign-vendor
Authorization: Bearer ADMIN_TOKEN

{
  "name": "Plumbing Pros",
  "phoneNumber": "+260971234567",
  "company": "Plumbing Pros Ltd",
  "scheduledDate": "2025-10-25T09:00:00.000Z"
}
```

Effect:
- status: `approved` → `scheduled`
- serviceProvider populated (label only)
- assignedAdmin set

---

## ✅ 4) Completion (Who Marks Done?)

Either the Tenant (from their app) or Admin (if coordinating) can mark a scheduled service as completed.

Tenant endpoint:

```http
POST /api/services/:serviceId/complete
Authorization: Bearer TENANT_TOKEN

{
  "completionNotes": "All fixed",
  "finalCost": 150,
  "photos": ["https://.../after.jpg"]
}
```

Admin endpoint (same payload, different role):

```http
POST /api/services/:serviceId/complete
Authorization: Bearer ADMIN_TOKEN
{
  "completionNotes": "Confirmed by vendor",
  "finalCost": 150
}
```

Effect:
- status: `scheduled|in_progress` → `completed`
- completedDate set, optional finalCost stored

---

## 💰 5) Payments (Held On The Service)

Service-related payments are tracked on the Service record (separate from rent). Who pays is controlled by `paidBy` on the Service: `tenant` | `landlord` | `split`.

- When status becomes `completed`, the UI should surface the Pay button to the responsible party.
- Payments use the existing Payments API with `paymentType: "service"` and link back to the Service via `rentalId/agreementId/propertyId`.
- Admin can view service payments in reports, but verification/payout follows the global payments policy.

Quick references:

- List services with payment status (for dashboard filtering):

```http
GET /api/services/payment-status?paymentStatus=unpaid&status=completed
Authorization: Bearer ADMIN_TOKEN | LANDLORD_TOKEN | TENANT_TOKEN
```

- Global admin payments listing (includes service payments):

```http
GET /api/payments/admin/all
Authorization: Bearer ADMIN_TOKEN
```

Notes:
- Cash payments: stay in `paid` until verified; in-app payments are auto-`verified`.
- Receipts and gateway data live on the Payment; the Service holds the linkage and current paymentStatus.

---

## 🧭 Admin Decision Tree

```
approved (awaiting admin)
  ├─ approve → scheduled → (tenant/admin marks) completed → payment flows (tenant/landlord/split)
  ├─ assign-vendor → scheduled → completed → payment flows
  └─ reject → rejected
```

---

## 🔌 Endpoint Cheat Sheet

- Queue: GET `/api/services/admin/needing-vendor`
- Approve/Schedule: POST `/api/services/admin/:serviceId/approve`
- Reject: POST `/api/services/admin/:serviceId/reject`
- (Optional) Assign Vendor: POST `/api/services/admin/:serviceId/assign-vendor`
- Mark Completed: POST `/api/services/:serviceId/complete` (Admin or Tenant)
- Filter by Payment Status: GET `/api/services/payment-status`
- Admin Payments (all): GET `/api/payments/admin/all`

---

## 📌 Operational Tips

- Always set a `scheduledDate` when approving, or the UI will default to the requested date.
- Keep notes in `approvalNotes` / `completionNotes` for audit trail.
- For emergencies (`urgency = emergency`), prioritize scheduling and notify stakeholders immediately.
- Use the Reports endpoint for monthly summaries:
  - GET `/api/admin/reports?section=overview&groupBy=month`

---

Everything here avoids vendor database management. Admin actions are limited to scheduling, optional label assignment, and accept/reject decisions; payments remain linked and visible on the Service.



