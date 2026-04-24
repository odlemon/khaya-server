## Account deletion (tenant/landlord)

### Endpoint

`DELETE /api/users/me`

**Auth:** `Authorization: Bearer <token>`  
**Roles:** `tenant` or `landlord`

### Rules

- If the user has any **active agreement** (`active`, `signed`, `pending_termination`) → **409** and message to terminate first.
- If the user has any **active rental** (`active`, `suspended`) → **409** and message to terminate first.
- Otherwise returns **200** success.

### Responses

**200**

```json
{ "success": true, "message": "Your account has been deleted successfully." }
```

**409 (active agreement)**

```json
{ "success": false, "message": "You cannot delete your account while you have an active agreement. Please terminate your agreement first." }
```

**409 (active rental)**

```json
{ "success": false, "message": "You cannot delete your account while you have an active rental. Please terminate your rental first." }
```

### Frontend checklist

- Add a **“Delete account”** action in tenant + landlord settings.
- Show a **confirmation modal** (this is destructive).
- Call `DELETE /api/users/me`.
- If **409**, show the message and optionally deep-link to the termination flow.
- On **200**, log the user out and redirect to login/home.

