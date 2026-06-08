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

## What is NOT in this repo

- Nginx cannot be changed by backend Node code — it is a separate web server in front of Node.
- Socket.IO already runs inside `khaya-backend` (`src/app.ts`); no extra backend code is required once nginx proxies `/socket.io/`.
