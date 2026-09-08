# Deployment configs

These files live in the repo so you can version-control server setup. **Copy them to the VPS manually** — nothing here auto-applies nginx on your server.

## Portal server (`khayamanage.co.zw`)

| File | Purpose |
|------|---------|
| `nginx-khayamanage-portal.conf` | HTTPS portal + `/api/backend` + `/socket.io` proxy |

```bash
# On the portal VPS
cd /path/to/khaya-backend   # or copy just the conf file
sudo cp deploy/nginx-khayamanage-portal.conf /etc/nginx/sites-available/khayamanage
sudo ln -sf /etc/nginx/sites-available/khayamanage /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**Portal `.env.production` (rebuild after change):**

```env
VITE_API_URL=https://khayamanage.co.zw/api/backend
VITE_SOCKET_URL=https://khayamanage.co.zw
```

**Smoke test:**

```bash
curl https://khayamanage.co.zw/api/backend/health
curl "https://khayamanage.co.zw/socket.io/?EIO=4&transport=polling"
```

- Health → `{"status":"OK",...}`
- Socket → JSON starting with `0{` (not `404`)

## Backend server (`31.220.82.129:4002`)

| File | Purpose |
|------|---------|
| `nginx-khaya-4002.conf` | Optional reverse proxy in front of Node on port 4002 |

If the portal nginx already proxies to `:4002`, you usually **do not** need this on the backend host.

### Required backend `.env` for emailed links

```env
BACKEND_URL=https://khayamanage.co.zw/api/backend
```

Links that are emailed to people are built from `BACKEND_URL` (falling back to
`API_PUBLIC_URL`, then `API_URL`) — most visibly the **Download Agreement (PDF)**
button in the agreement email. With none of them set the code falls back to
`http://localhost:4002`, so recipients get a link that is dead for everyone but
the server itself.

The `/api/backend` suffix is **required**, not optional. The portal nginx proxies
`/api/backend/` to the backend root, so:

| `BACKEND_URL` | Emailed link resolves to | Result |
|---|---|---|
| unset | `http://localhost:4002/api/agreements/public/…` | dead for recipients |
| `https://khayamanage.co.zw` | `/api/agreements/public/…` | 404 at the portal |
| `https://khayamanage.co.zw/api/backend` | `/api/backend/api/agreements/public/…` | ✅ correct |

The endpoint itself already responds with `Content-Type: application/pdf` and
`Content-Disposition: attachment`, so the link downloads a file rather than
opening a viewer, and it is token-authenticated so recipients need no login.

## What is NOT in this repo

- Nginx cannot be changed by backend Node code — it is a separate web server in front of Node.
- Socket.IO already runs inside `khaya-backend` (`src/app.ts`); no extra backend code is required once nginx proxies `/socket.io/`.
