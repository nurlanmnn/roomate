# Deploy Roomate API on DigitalOcean

This walks through **DigitalOcean App Platform** (managed Node, HTTPS, simple). Alternative: a **Droplet** (you manage the server) — see the end.

**Prerequisites:** MongoDB connection string (e.g. [MongoDB Atlas](https://www.mongodb.com/atlas)), GitHub repo pushed with this code.

Your API must compile then run:

- **Build:** `npm install` + `npm run build` (TypeScript → `dist/`)
- **Run:** `npm start` → `node dist/index.js`
- **Port:** App Platform sets `PORT`; the backend already uses `process.env.PORT` ([`backend/src/config/env.ts`](../backend/src/config/env.ts)).

---

## Part 1 — MongoDB (if you do not have a database yet)

1. Easiest path: **MongoDB Atlas** → create a free cluster → **Database Access** user → **Network Access** → allow `0.0.0.0/0` (or DigitalOcean’s egress later for stricter setup).
2. **Connect** → copy the **SRV** connection string → replace `<password>` → note it as `MONGODB_URI`.

*(Optional)* **DigitalOcean Managed MongoDB** is possible too; same idea — get a URI from the DO control panel.

---

## Part 2 — DigitalOcean App Platform

### 1. Account and GitHub

1. Sign in at [cloud.digitalocean.com](https://cloud.digitalocean.com).
2. **Apps** → **Create App**.
3. Connect **GitHub** (authorize DigitalOcean), pick the **roomate** repo and branch (e.g. `main`).

### 2. App spec (monorepo: only `backend/`)

1. DigitalOcean detects a default config — **Edit** the **component** so it targets the API:
   - **Source directory:** `backend`
   - **Type:** Web Service
   - **Build command:** `npm install && npm run build`
   - **Run command:** `npm start`
   - **HTTP port:** **8080** (DigitalOcean’s default for Node; they set **`PORT`** in the environment — our server uses `process.env.PORT` in [`backend/src/config/env.ts`](../backend/src/config/env.ts)).

2. **Plan:** e.g. **Basic** smallest tier for testing; scale later.

3. **Environment variables** — add **all** of these ( encrypt secrets in the UI where offered ):

   | Name | Example / notes |
   |------|------------------|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | Your Atlas SRV string |
   | `JWT_SECRET` | Long random string (generate locally) |
   | `FRONTEND_URL` | Your future web URL or `https://example.com` placeholder until you have a site — CORS for browsers; mobile often sends no `Origin` |
   | `BACKEND_PUBLIC_URL` | Will be your app URL, e.g. `https://your-app.ondigitalocean.app` (update after first deploy) |
   | `EMAIL_FROM` | Real sender you own / Brevo allows |
   | `BREVO_SMTP_HOST` | `smtp-relay.brevo.com` |
   | `BREVO_SMTP_PORT` | `587` |
   | `BREVO_SMTP_USER` | Brevo SMTP login |
   | `BREVO_SMTP_PASS` | Brevo SMTP key |
   | `ALLOWED_ORIGINS` | Optional comma-separated URLs |

   Optional: `GEMINI_API_KEY` if you use Gemini features.

4. **Health check:** Path `/health`, interval default — matches [`backend/src/index.ts`](../backend/src/index.ts).

### 3. Deploy

1. **Review** → **Create resources** (first deploy).
2. Wait for the build to finish. Open the app **URL** (something like `https://roomate-api-xxxxx.ondigitalocean.app`).

### 4. Verify

```bash
curl https://YOUR-APP-URL/health
```

Expect: `{"status":"ok"}`

### 5. Fix `BACKEND_PUBLIC_URL` (optional but good)

In App Platform → **Settings** → **App-Level Environment Variables**: set `BACKEND_PUBLIC_URL` to the exact public HTTPS URL (no trailing slash). Redeploy if needed.

### 6. Custom domain (optional)

1. **Settings** → **Domains** → add `api.yourdomain.com`.
2. Add the **CNAME** (or A record) DO shows at your DNS host.
3. Wait for TLS; use the custom URL as **`EXPO_PUBLIC_API_URL`** for the mobile app.

---

## Part 3 — Mobile app (EAS)

Use the **public https origin only** (no path):

```text
EXPO_PUBLIC_API_URL=https://your-app.ondigitalocean.app
```

(or your custom domain). See [`TESTFLIGHT_NEXT_STEPS.md`](TESTFLIGHT_NEXT_STEPS.md).

---

## Troubleshooting

| Issue | What to check |
|--------|----------------|
| Build fails on `tsc` | Build logs — fix any repo TypeScript errors; run `npm run build` locally in `backend/`. |
| Build fails on `sharp` / native | App Platform usually works; if not, try a larger build instance or open a ticket with DO logs. |
| App crashes on start | Logs → env vars (`MONGODB_URI`, `JWT_SECRET`); MongoDB IP allowlist (Atlas `0.0.0.0/0` for a quick test). |
| 502 / health check fails | `PORT` mismatch — ensure run command is `npm start` and HTTP port in UI matches DO’s assigned `PORT` (often 8080). |

---

## Alternative: Droplet (VPS)

If you prefer a VM:

1. Create an **Ubuntu** Droplet.
2. Install Node 20 LTS, `git`, **nginx**, **Certbot** (Let’s Encrypt).
3. Clone repo, `cd backend`, `npm ci`, `npm run build`.
4. Run with **PM2:** `pm2 start dist/index.js --name roomate-api` (set all env vars in a systemd or PM2 ecosystem file).
5. Nginx reverse proxy `443` → `127.0.0.1:3000` (or whatever `PORT` you use).
6. `certbot` for HTTPS on your domain.

This is more work; App Platform is enough for most launches.
