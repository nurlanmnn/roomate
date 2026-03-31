# Deploying the Roomate API

The server is a Node/Express app in [`backend/`](../backend/). It needs **HTTPS** in production so the iOS app can call it.

## Environment variables

Copy [`backend/.env.example`](../backend/.env.example) to `backend/.env` on the host (or set variables in the platform UI). Required at minimum:

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB Atlas or self-hosted connection string |
| `JWT_SECRET` | Strong random string for auth tokens |
| `NODE_ENV` | Set to `production` |
| `FRONTEND_URL` | Your web app URL for CORS (native apps work without Origin) |
| `EMAIL_FROM`, `BREVO_*` | If you use email verification / mail |

Optional: `ALLOWED_ORIGINS` — comma-separated extra origins allowed by CORS (e.g. marketing site).

## Hosting options

Any Node host that supports env vars and TLS works, for example:

- **Railway**, **Render**, **Fly.io**, **DigitalOcean App Platform**, **Heroku**, **AWS/GCP** with a reverse proxy.

**DigitalOcean (step-by-step):** see [`DEPLOY_DIGITALOCEAN.md`](DEPLOY_DIGITALOCEAN.md).

Typical steps:

1. Connect this repo (or deploy the `backend/` folder). **Monorepo:** on hosts like DigitalOcean App Platform, set **Source directory** to `backend` on the GitHub connect screen (see [`DEPLOY_DIGITALOCEAN.md`](DEPLOY_DIGITALOCEAN.md)) or detection fails.
2. Set **Start command**: `npm start` or `node dist/index.js` if you compile TypeScript (see your `package.json`).
3. Set **Port**: match `PORT` (often the platform sets `PORT` automatically — align `backend` to read `process.env.PORT`).
4. Add a **custom domain** and enable HTTPS (usually automatic).
5. Point the mobile app at this URL via **`EXPO_PUBLIC_API_URL`** in EAS (see [`docs/APP_STORE_IOS.md`](APP_STORE_IOS.md)).

## Health check

After deploy, verify:

```bash
curl https://your-api.example.com/health
```

You should see `{"status":"ok"}`.

## What we need from you

- Your chosen host and region.
- A **MongoDB** URI (Atlas is common).
- The **final public API URL** (e.g. `https://api.yourdomain.com`) so we can set `EXPO_PUBLIC_API_URL` for production builds.
