# Deploy Roomate API on Vercel (free)

The API runs on Vercel's free Hobby plan as a serverless function. Data stays on
MongoDB Atlas (free M0) and email on Brevo. You get a free
`https://<project>.vercel.app` URL with HTTPS, so no domain or server is needed.

## How it works

| Piece | File |
|---|---|
| Express app (routes, middleware, lazy DB connect) | [`backend/src/app.ts`](../backend/src/app.ts) |
| Vercel entry — exports the app | [`backend/api/index.ts`](../backend/api/index.ts) |
| Routing, legal pages bundle, hourly cron | [`backend/vercel.json`](../backend/vercel.json) |
| Local / VM server (`node dist/index.js`, uses `setInterval` scheduler) | [`backend/src/index.ts`](../backend/src/index.ts) |

- Every path is rewritten to the one function; Express routes it as usual.
- Each function instance connects to Mongo on its first request and reuses the
  connection. If Atlas is unreachable, requests get a 503 and the next one retries.
- Reminders: a Vercel Schedule (in `vercel.json`; Hobby allows down to every 15 min) calls `GET /internal/run-scheduler` hourly with
  `Authorization: Bearer $CRON_SECRET`. Without `CRON_SECRET` set, the endpoint
  rejects every call (401), so reminders won't run.

## One-time setup

1. **Atlas network access.** Vercel functions have no fixed IP. In Atlas →
   Network Access, allow `0.0.0.0/0` (the database is still protected by its
   username/password). If you previously allowed only the droplet's IP, the API
   will fail with 503s until you change this.
2. **Create the project.** Either:
   - Vercel dashboard → Add New → Project → import this repo → set
     **Root Directory** to `backend`, or
   - `npm i -g vercel`, then run `vercel` inside `backend/`.
3. **Environment variables** (Project → Settings → Environment Variables, Production):

   | Variable | Value |
   |---|---|
   | `MONGODB_URI` | Atlas connection string (same as the droplet's) |
   | `JWT_SECRET` | **Same value as the droplet**, or everyone gets logged out |
   | `NODE_ENV` | `production` |
   | `BREVO_SMTP_USER`, `BREVO_SMTP_PASS`, `EMAIL_FROM` | Same as the droplet |
   | `BACKEND_PUBLIC_URL` | `https://<project>.vercel.app` |
   | `NOTIFICATIONS_ENABLED` | `true` |
   | `CRON_SECRET` | A long random string, e.g. `openssl rand -hex 32` |
   | `EXPO_ACCESS_TOKEN` | Only if set on the droplet |

4. **Deploy** (push to the connected branch, or `vercel --prod`), then check:

   ```bash
   curl https://<project>.vercel.app/health
   ```

   It should return `{"status":"ok","notificationsEnabled":true}`.
5. **Point the app at it.** Set `EXPO_PUBLIC_API_URL=https://<project>.vercel.app`
   in EAS and rebuild the app.
6. **Confirm the schedule** in the project dashboard (Schedules), then shut down the
   droplet.

## Limits worth knowing (Hobby)

- Request bodies are capped at **4.5 MB**, lower than Express's 10 MB setting. A
  very large base64 avatar or settlement proof image would be rejected.
- Hobby is for non-commercial use.
- Going over a monthly usage limit pauses that feature until the next period.
  A few users are nowhere near the limits.
- The rate limiter keeps counts in memory per instance, so limits are approximate.
