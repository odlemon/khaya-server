# 🛠️ Maintenance (Tenant) — Frontend Implementation Guide

This guide shows how tenants create, track, and complete maintenance requests.

## Endpoints (Tenant)

- Create request
```http
POST /api/maintenance/:rentalId/requests
Authorization: Bearer TENANT_TOKEN
{
  "issueType": "plumbing",           // plumbing|electrical|hvac|appliance|structural|other
  "urgency": "high",                  // low|medium|high|emergency
  "title": "Sink leaking",
  "description": "Pipe under sink is dripping",
  "photoUrls": ["https://..."],
  "videoUrls": ["https://..."]
}
```

- List my requests
```http
GET /api/maintenance/my
Authorization: Bearer TENANT_TOKEN
```

- Get one
```http
GET /api/maintenance/requests/:id
Authorization: Bearer TENANT_TOKEN
```

- Cancel (pending/approved only)
```http
POST /api/maintenance/requests/:id/cancel
Authorization: Bearer TENANT_TOKEN
```

- Mark completed (if resolved on-site)
```http
POST /api/maintenance/requests/:id/complete
Authorization: BearER TENANT_TOKEN
{
  "notes": "Vendor fixed and tested"
}
```

## UI Flow

1) Choose rental → open “Report Issue”
2) Fill form (issueType, urgency, title, description, media)
3) Submit → show request status page
4) Track status chips: pending → approved → in_progress → completed (or rejected/cancelled)
5) If resolved, allow “Mark as Completed”

## State Model (example)
```ts
export type MaintenanceRequest = {
  _id: string;
  rentalId: string;
  issueType: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'other';
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  title: string;
  description: string;
  photoUrls?: string[];
  videoUrls?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
};
```

## Realtime (optional enhancement)

Subscribe to socket events (room by rentalId or landlord/tenant userId) to update in place:
- maintenance_created
- maintenance_approved
- maintenance_rejected
- maintenance_progress
- maintenance_completed

Example handler sketch:
```js
socket.on('maintenance_approved', (payload) => {
  // update local store for request payload.requestId
});
```

## Error Handling Tips
- Show friendly messages for authorization (e.g., not part of rental)
- Guard cancel/complete buttons by status
- Validate media array sizes and MIME types client-side

## QA Checklist
- Create request succeeds and appears in list
- Cancel button only shown for pending/approved
- Complete button only shown for in_progress/approved/pending (as allowed by backend)
- Status updates reflected without refresh (if sockets enabled)



