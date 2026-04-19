# TNA System — Training Needs Analysis Platform

A full-stack web application for conducting TESDA-aligned Training Needs Analysis (TNA) surveys, generating AI-powered gap analysis reports, and producing NTESDP-compliant training plans.

**Stack:** React 19 + Tailwind 4 + tRPC 11 + Express 4 + Drizzle ORM + MySQL

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Environment Variables](#3-environment-variables)
4. [Database Setup](#4-database-setup)
5. [Build for Production](#5-build-for-production)
6. [Running in Production](#6-running-in-production)
7. [Deploying to Hostinger VPS](#7-deploying-to-hostinger-vps)
8. [Updating After Pushing to GitHub](#8-updating-after-pushing-to-github)
9. [Project Structure](#9-project-structure)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Tool | Minimum Version | Install |
|------|----------------|---------|
| Node.js | 22.x LTS | https://nodejs.org or `nvm install 22` |
| pnpm | 10.x | `npm install -g pnpm` |
| MySQL | 8.0+ | Local or remote (TiDB / PlanetScale also work) |
| Git | Any | https://git-scm.com |

---

## 2. Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/tna-system.git
cd tna-system

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and fill in all required values (see Section 3)

# 4. Run database migrations
pnpm db:push

# 5. Start the development server
pnpm dev
```

The app will be available at `http://localhost:3000`.

---

## 3. Environment Variables

Copy `.env.example` to `.env` and fill in the values. **Never commit `.env` to Git.**

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Full MySQL connection string |
| `JWT_SECRET` | ✅ | Random secret for session cookies (min 32 chars) |
| `VITE_APP_ID` | ✅ | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | ✅ | Manus OAuth backend URL |
| `VITE_OAUTH_PORTAL_URL` | ✅ | Manus login portal URL |
| `OWNER_OPEN_ID` | ✅ | Owner's Manus Open ID |
| `OWNER_NAME` | ✅ | Owner's display name |
| `BUILT_IN_FORGE_API_URL` | ✅ | Manus built-in API base URL |
| `BUILT_IN_FORGE_API_KEY` | ✅ | Manus built-in API key (server-side) |
| `VITE_FRONTEND_FORGE_API_KEY` | ✅ | Manus built-in API key (client-side) |
| `VITE_FRONTEND_FORGE_API_URL` | ✅ | Manus built-in API URL (client-side) |
| `PORT` | ⬜ | HTTP port (default: `3000`) |
| `NODE_ENV` | ⬜ | `production` or `development` |
| `VITE_ANALYTICS_ENDPOINT` | ⬜ | Analytics endpoint (optional) |
| `VITE_ANALYTICS_WEBSITE_ID` | ⬜ | Analytics website ID (optional) |

**Generating a secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> **AI Provider credentials** (OpenAI / Gemini API keys) are stored in the database and configured through the Admin UI at `/admin/ai-settings` after first login. They do not go in `.env`.

---

## 4. Database Setup

The app uses **Drizzle ORM** with MySQL. All schema changes are managed through migration files in the `drizzle/` directory.

### First-time setup

```bash
# Generate and apply all migrations
pnpm db:push
```

This command runs `drizzle-kit generate` (creates SQL migration files) then `drizzle-kit migrate` (applies them to the database).

### Subsequent schema changes

After editing `drizzle/schema.ts`:

```bash
pnpm db:push
```

### Manual migration (if needed)

```bash
# Generate migration SQL only (does not apply)
pnpm drizzle-kit generate

# Apply pending migrations
pnpm drizzle-kit migrate
```

### Promoting a user to Admin

After the first user logs in, promote them to admin via MySQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

Or use the Hostinger MySQL panel / phpMyAdmin.

---

## 5. Build for Production

```bash
# Install dependencies (skip dev deps)
pnpm install --frozen-lockfile

# Build frontend (Vite) + backend (esbuild)
pnpm build
```

Build output:
- `dist/` — compiled server bundle (`index.js`) + Vite frontend assets (`client/`)

---

## 6. Running in Production

### Option A — Direct Node.js

```bash
NODE_ENV=production node dist/index.js
```

### Option B — PM2 (recommended for VPS)

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2 using the included config
pm2 start ecosystem.config.cjs

# Save PM2 process list (auto-restart on reboot)
pm2 save
pm2 startup
```

The `ecosystem.config.cjs` file at the project root configures PM2 with the correct environment and restart policy.

---

## 7. Deploying to Hostinger VPS

> **Requirement:** Hostinger **VPS KVM 2** or higher (Ubuntu 22.04 LTS). Shared hosting does NOT support Node.js.

### Step 1 — Provision the VPS

```bash
# SSH into your VPS
ssh root@YOUR_VPS_IP

# Update system
apt update && apt upgrade -y

# Install Node.js 22 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Install pnpm
npm install -g pnpm pm2

# Install MySQL
apt install -y mysql-server
mysql_secure_installation
```

### Step 2 — Create the MySQL database

```sql
-- Run inside MySQL as root
CREATE DATABASE tna_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'tna_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON tna_system.* TO 'tna_user'@'localhost';
FLUSH PRIVILEGES;
```

### Step 3 — Clone the repository

```bash
# On the VPS
cd /var/www
git clone https://github.com/YOUR_USERNAME/tna-system.git
cd tna-system
```

### Step 4 — Configure environment variables

```bash
cp .env.example .env
nano .env
# Fill in all required values, especially:
# DATABASE_URL=mysql://tna_user:your_strong_password@127.0.0.1:3306/tna_system
# JWT_SECRET=<generated random string>
# NODE_ENV=production
```

### Step 5 — Install, migrate, and build

```bash
pnpm install --frozen-lockfile
pnpm db:push
pnpm build
```

### Step 6 — Start with PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # Follow the printed command to enable auto-start on reboot
```

### Step 7 — Configure Nginx reverse proxy

```bash
apt install -y nginx

# Create site config
nano /etc/nginx/sites-available/tna-system
```

Paste the following (replace `yourdomain.com`):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 20M;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/tna-system /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### Step 8 — Enable HTTPS with Let's Encrypt

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Follow prompts; auto-renewal is configured automatically
```

### Step 9 — Point your domain DNS

In your domain registrar (or Hostinger DNS panel), add:

| Type | Name | Value |
|------|------|-------|
| A | `@` | Your VPS IP address |
| A | `www` | Your VPS IP address |

DNS propagation takes 5–60 minutes.

### Step 10 — Verify and promote admin

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs tna-system --lines 50

# Promote first user to admin (after logging in once)
mysql -u tna_user -p tna_system
```
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

---

## 8. Updating After Pushing to GitHub

After pushing new code to GitHub, run these commands on the VPS:

```bash
cd /var/www/tna-system

# Pull latest changes
git pull origin main

# Install any new dependencies
pnpm install --frozen-lockfile

# Apply any new database migrations
pnpm db:push

# Rebuild the app
pnpm build

# Restart the server (zero-downtime reload)
pm2 reload tna-system
```

**One-liner update script** (save as `update.sh` on the VPS):

```bash
#!/bin/bash
set -e
cd /var/www/tna-system
git pull origin main
pnpm install --frozen-lockfile
pnpm db:push
pnpm build
pm2 reload tna-system
echo "✅ TNA System updated successfully"
```

```bash
chmod +x update.sh
./update.sh
```

---

## 9. Project Structure

```
tna-system/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── pages/           # Page-level components
│   │   │   ├── admin/       # HR Officer / Admin pages
│   │   │   └── survey/      # Staff survey flow
│   │   ├── components/      # Reusable UI components
│   │   │   ├── AdminLayout.tsx   # Sidebar for admin pages
│   │   │   ├── StaffLayout.tsx   # Sidebar for staff pages
│   │   │   └── TNAWizard.tsx     # Campaign setup wizard
│   │   ├── lib/trpc.ts      # tRPC client binding
│   │   └── App.tsx          # Routes & layout
├── server/                  # Express + tRPC backend
│   ├── _core/               # Framework plumbing (OAuth, context, LLM)
│   ├── routers.ts           # All tRPC procedures
│   ├── db.ts                # Drizzle query helpers
│   └── aiProvider.ts        # AI provider abstraction (OpenAI / Gemini)
├── drizzle/                 # Database schema & migrations
│   ├── schema.ts            # Table definitions
│   └── *.sql                # Generated migration files
├── shared/                  # Shared types & constants
├── .env.example             # Environment variable template
├── .gitignore               # Git ignore rules
├── ecosystem.config.cjs     # PM2 process config
├── package.json             # Scripts & dependencies
├── pnpm-lock.yaml           # Locked dependency versions
├── drizzle.config.ts        # Drizzle ORM config
└── vite.config.ts           # Vite build config
```

---

## 10. Troubleshooting

| Problem | Solution |
|---------|----------|
| `502 Bad Gateway` from Nginx | Check `pm2 status` and `pm2 logs tna-system` — the Node.js process may have crashed |
| `DATABASE_URL is required` error | Ensure `.env` exists and has `DATABASE_URL` set correctly |
| `pnpm build` fails with OOM | Add swap: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile` |
| SSL certificate not renewing | Run `certbot renew --dry-run` to test; check `systemctl status certbot.timer` |
| Login redirects fail | Ensure `APP_URL` in `.env` matches the exact domain used in the browser (including `https://`) |
| AI generation not working | Configure AI provider at `/admin/ai-settings` after logging in as admin |
| QR code not downloading | Ensure the browser allows file downloads from the domain |

---

## License

This project is proprietary software developed for TESDA TNA operations.

---

*Generated and maintained by the TNA System development team.*
