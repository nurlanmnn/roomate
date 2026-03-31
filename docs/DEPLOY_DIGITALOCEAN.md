# Deploy Roomate API on DigitalOcean (Droplet)

This guide is for a **DigitalOcean Droplet** (a VPS you manage). It’s usually cheaper than App Platform, but you are responsible for **updates, security patches, HTTPS, and process management**.

**Prerequisites**

- **A domain** (recommended): e.g. `api.yourdomain.com` pointing to your droplet IP.
- **MongoDB connection string** (e.g. [MongoDB Atlas](https://www.mongodb.com/atlas)) → `MONGODB_URI`.
- A place to store secrets securely (password manager).

Your API is TypeScript and runs as:

- **Build:** `npm ci && npm run build` (creates `dist/`)
- **Run:** `node dist/index.js` (via PM2/systemd)

---

## Part 1 — Create the Droplet

1. DigitalOcean → **Create** → **Droplets**.
2. Image: **Ubuntu 22.04 LTS** (or 24.04 LTS).
3. Size: **at least 1GB RAM** recommended for stability (uploads + base64 images). 512MB can work but is more crash-prone under memory pressure.
4. Auth: **SSH key** (recommended).
5. Create droplet and note the public IP: `YOUR_DROPLET_IP`.

---

## Part 2 — First SSH + basic security

SSH in as root:

```bash
ssh root@YOUR_DROPLET_IP
```

Create a non-root user and enable firewall:

```bash
adduser deploy
usermod -aG sudo deploy

ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
```

Then use the `deploy` user:

```bash
exit
ssh deploy@YOUR_DROPLET_IP
```

---

## Part 3 — Install Node, nginx, and build tools

On the droplet:

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install git nginx certbot python3-certbot-nginx build-essential
```

Install Node 20 LTS:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt -y install nodejs
node -v
npm -v
```

---

## Part 4 — Get the code onto the server

Option A (simplest): clone from GitHub:

```bash
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/<YOUR_GITHUB_USER>/roomate.git
cd roomate/backend
```

---

## Part 5 — Configure environment variables

Create `backend/.env` on the droplet (do **not** commit this):

```bash
cp .env.example .env
nano .env
```

Fill at minimum:

- `NODE_ENV=production`
- `PORT=3000`
- `MONGODB_URI=...`
- `JWT_SECRET=...` (long random string)
- `FRONTEND_URL=https://example.com` (placeholder ok; native apps usually send no Origin)
- `BACKEND_PUBLIC_URL=https://api.yourdomain.com` (use your domain once DNS is set; otherwise can be `http://YOUR_DROPLET_IP`)

If you use email verification in production, also fill `BREVO_*` and `EMAIL_FROM`.

---

## Part 6 — Build and run with PM2

Install dependencies and build:

```bash
npm ci
npm run build
```

Install PM2 and run the server:

```bash
sudo npm i -g pm2
pm2 start dist/index.js --name roomate-api
pm2 save
pm2 startup systemd -u deploy --hp /home/deploy
```

Verify it’s listening:

```bash
curl http://127.0.0.1:3000/health
```

Expect: `{"status":"ok"}`

---

## Part 7 — nginx reverse proxy

Create an nginx site:

```bash
sudo nano /etc/nginx/sites-available/roomate-api
```

Paste (replace `api.yourdomain.com` with your domain):

```nginx
server {
  server_name api.yourdomain.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/roomate-api /etc/nginx/sites-enabled/roomate-api
sudo nginx -t
sudo systemctl reload nginx
```

---

## Part 8 — HTTPS (Let’s Encrypt)

Before this step, set DNS:

- Create an **A record**: `api.yourdomain.com` → `YOUR_DROPLET_IP`

Then run:

```bash
sudo certbot --nginx -d api.yourdomain.com
```

Certbot will set up HTTPS and auto-renew.

Verify:

```bash
curl https://api.yourdomain.com/health
```

---

## Part 9 — Deploy updates (repeat when you change code)

```bash
cd ~/apps/roomate/backend
git pull
npm ci
npm run build
pm2 restart roomate-api
```

---

## Part 10 — Mobile app (EAS)

Set your production API URL (public HTTPS origin, no path):

```text
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
```

Then follow [`TESTFLIGHT_NEXT_STEPS.md`](TESTFLIGHT_NEXT_STEPS.md) for the TestFlight build and submission.

---

## Alternative: DigitalOcean App Platform (managed)

If you decide later you want a managed service with GitHub auto-deploy + built-in TLS, see the previous App Platform steps in your history, or switch back and I’ll restore them in this doc.
