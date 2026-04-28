# PrepBoi — Deployment Guide

Everything you need to go from zero to live. Two paths: **Netlify** (recommended, ~15 min) or **Docker** (self-hosted, ~30 min).

---

## Prerequisites

You'll need accounts at:
- [Supabase](https://supabase.com) — free tier works
- [Resend](https://resend.com) — free tier works (3,000 emails/month)
- [Anthropic](https://console.anthropic.com) — pay-as-you-go (quiz generation)
- [Netlify](https://netlify.com) — free tier works (Netlify path only)

---

## Step 1 — Set up Supabase

### 1a. Create a project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Name it `prepboi` (or your brand name), choose a region close to your users, set a strong DB password
4. Wait ~2 minutes for provisioning

### 1b. Run the database schema
1. In your Supabase project, go to **SQL Editor → New Query**
2. Open `supabase/migrations/001_schema.sql` from this repo
3. Paste the entire file and click **Run**
4. You should see: `Success. No rows returned`

### 1c. Get your API keys
Go to **Project Settings → API** and copy:
- `Project URL` → this is your `VITE_SUPABASE_URL`
- `anon public` key → this is your `VITE_SUPABASE_ANON_KEY`

### 1d. Create your first organization + super user
After deploying the app (Step 2 or 3), you'll need to manually seed your first org row.

In **SQL Editor**, run:
```sql
-- 1. Insert your organization
INSERT INTO organizations (name, slug)
VALUES ('Your Restaurant Name', 'your-restaurant-slug')
RETURNING id;
-- Copy the returned UUID — you'll need it below

-- 2. Insert your first location
INSERT INTO locations (org_id, name, address)
VALUES ('<org_id_from_above>', 'Main Location', '123 Main St')
RETURNING id;
-- Copy the location UUID too
```

Then sign up through your deployed app. Supabase will create the auth user and auto-create a profile. Immediately after, run:
```sql
-- 3. Elevate your account to super_user
UPDATE profiles
SET role = 'super_user',
    org_id = '<org_id>',
    location_id = '<location_id>'
WHERE id = '<your_auth_user_id>';
-- Find your auth user ID in: Authentication → Users
```

You can now use the Admin panel to create all future accounts.

---

## Step 2 — Netlify Deploy (Recommended)

### 2a. Set up Resend (email notifications)
1. Sign up at [resend.com](https://resend.com)
2. Verify your sending domain (or use Resend's sandbox for testing)
3. Go to **API Keys → Create API Key**
4. Copy the key — you'll need it for the Edge Function

### 2b. Deploy the Edge Function
Install the [Supabase CLI](https://supabase.com/docs/guides/cli) first:
```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
# Your project ref is in: Settings → General → Reference ID

# Set the secrets the Edge Function needs
supabase secrets set RESEND_API_KEY=re_your_key_here
supabase secrets set FROM_EMAIL=noreply@yourdomain.com
supabase secrets set APP_URL=https://your-app.netlify.app

# Deploy the function
supabase functions deploy notify-email
```

### 2c. Wire the webhook
1. In Supabase Dashboard → **Database → Webhooks → Create a new hook**
2. Settings:
   - Name: `notify-email-on-insert`
   - Table: `notifications`
   - Events: ✅ `INSERT`
   - Type: `HTTP Request`
   - URL: `https://<your-project-ref>.supabase.co/functions/v1/notify-email`
   - Headers: `Authorization: Bearer <your-supabase-anon-key>`
3. Click **Create webhook**

### 2d. Deploy to Netlify
1. Push this repo to GitHub (or GitLab/Bitbucket)
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
3. Connect your repo
4. Build settings (auto-detected from `netlify.toml`, but verify):
   - Build command: `npm ci && npm run build`
   - Publish directory: `dist`
5. Go to **Site settings → Environment variables** and add:
   ```
   VITE_SUPABASE_URL        = https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY   = eyJhbGci...
   VITE_ANTHROPIC_API_KEY   = sk-ant-api03-...
   VITE_APP_URL             = https://your-site.netlify.app
   ```
6. Click **Deploy site**

### 2e. Custom domain (optional)
In Netlify → **Domain management → Add custom domain**, follow the DNS instructions.
Update `VITE_APP_URL` and re-run `supabase secrets set APP_URL=https://yourcustomdomain.com`.

---

## Step 3 — Docker Deploy (Self-Hosted)

Use this if you're running on your own server (DigitalOcean, AWS EC2, Hetzner, etc).

### 3a. Set up Resend + Edge Function
Same as Steps 2a–2c above. The Edge Function runs on Supabase's infrastructure regardless of where you host the frontend.

### 3b. Build & run
```bash
# Clone the repo on your server
git clone https://github.com/your-org/prepboi.git
cd prepboi

# Copy and fill in your env vars
cp .env.example .env
nano .env   # fill in all values

# Build and start (reads .env automatically)
docker compose up -d --build

# Check it's healthy
docker compose ps
curl http://localhost/health
```

The app is now running on port 80.

### 3c. SSL with Caddy (recommended)
Install [Caddy](https://caddyserver.com) on your server for automatic HTTPS:

```
# /etc/caddy/Caddyfile
yourdomain.com {
    reverse_proxy localhost:80
}
```

```bash
systemctl enable --now caddy
```

Caddy handles Let's Encrypt automatically.

### 3d. Updates
```bash
git pull
docker compose up -d --build
```

---

## Step 4 — Multi-Location Setup

For franchise / chain clients with multiple stores:

1. In **SQL Editor**, insert a location for each store:
```sql
INSERT INTO locations (org_id, name, address, timezone)
VALUES
  ('<org_id>', 'Mill Ave',       '123 Mill Ave, Tempe AZ',    'America/Phoenix'),
  ('<org_id>', 'Downtown',       '456 Central Ave, Phoenix AZ','America/Phoenix'),
  ('<org_id>', 'Old Town',       '789 Brown Ave, Scottsdale AZ','America/Phoenix');
```

2. When creating users via the Admin panel, assign each user to their location.

3. Checklists can be scoped:
   - **No location** = appears for all locations in the org
   - **Specific location** = only appears for that store

4. The Dashboard filters by location automatically based on the viewer's assignment.

---

## Step 5 — Role Quick Reference

| Role | Can do |
|---|---|
| **Employee** | Complete checklists, read SOPs, take quizzes, view recipes, scale recipes |
| **Shift Leader** | Everything above + see submission dashboard + assign training + receive notifications |
| **Super User** | Everything above + Admin panel (create users, build checklists, create SOPs, manage recipes, upload PDFs) |

---

## Troubleshooting

**"Missing Supabase env vars" on startup**
→ Make sure `.env` is filled in and Vite can read it. Variable names must start with `VITE_`.

**Users can't sign in**
→ Check Supabase → Authentication → Users — confirm the account exists and email is confirmed.
→ Go to Auth → Settings → disable "Email confirmations" for internal-only apps.

**Notifications not sending email**
→ Check Supabase → Edge Functions → `notify-email` → Logs
→ Verify the webhook is set up correctly (Step 2c)
→ Confirm `RESEND_API_KEY` is set: `supabase secrets list`

**Quiz generation not working**
→ Check `VITE_ANTHROPIC_API_KEY` is set and has credits
→ SOPs with pre-built `quiz_questions` never call the API — only SOPs without them do

**RLS blocking data**
→ Every table has RLS enabled. If a user can't see data, check:
  1. Their `org_id` in `profiles` matches the data
  2. Their `role` is in `assigned_roles` (for checklists)
  3. Run `select my_org_id(), my_role();` in SQL Editor while impersonating the user

**Docker: port 80 already in use**
→ Change `"80:80"` to `"8080:80"` in `docker-compose.yml` and access via port 8080

---

## Environment Variable Reference

| Variable | Where to get it | Required |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API | ✅ |
| `VITE_ANTHROPIC_API_KEY` | console.anthropic.com/keys | ✅ (quiz AI) |
| `VITE_APP_URL` | Your deployed domain | ✅ |
| `RESEND_API_KEY` *(Edge Function secret)* | resend.com/api-keys | ✅ (email) |
| `FROM_EMAIL` *(Edge Function secret)* | Your verified sender | ✅ (email) |

---

## Support Checklist Before Going Live

- [ ] Database schema applied with no errors
- [ ] First org + location inserted
- [ ] First super_user account promoted
- [ ] At least one checklist created and assigned
- [ ] Test checklist submission → notification appears in bell → email received
- [ ] At least one SOP created
- [ ] At least one recipe created
- [ ] Employee test account created, can sign in and see assigned checklists
- [ ] Shift leader test account, can see dashboard
- [ ] Email confirmation disabled in Supabase Auth settings (for internal teams)
- [ ] Custom domain configured (if applicable)

That's everything. You're live. 🎉
