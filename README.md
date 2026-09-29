# Purohith Connect Super Admin

Next.js 16 operations and publishing console for the Purohith Connect marketplace.

## Capabilities

- Supabase Auth with server-side cookies and database-backed role checks
- DAU, WAU, MAU, session, demand, and feature-adoption reporting
- Puja catalog management shared by customers and priests
- Priest verification and rejection workflow with audit records
- Programmatic SEO, GEO, AEO, and LLM discovery publishing
- Keyword clusters, revision history, FAQ schema, and search performance
- Responsive desktop, tablet, and mobile administration UI

## Configure

```bash
cp .env.example .env.local
```

Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the publishable key for project
`fvvmfrbfqwdypkagtdce`. Never put a service-role key in this application.

Apply the repository migrations from the repository root:

```bash
npx supabase link --project-ref fvvmfrbfqwdypkagtdce
npx supabase db push
```

Create the first user in Supabase Auth, then promote that existing user from the
Supabase SQL editor. Replace the email before running:

```sql
update public.app_users
set role = 'super_admin', is_active = true, updated_at = now()
where id = (select id from auth.users where email = 'owner@example.com');
```

The profile row must already exist. Creating production passwords in source code
is intentionally unsupported.

## Run

```bash
npm install
npm run dev -- --port 3006
```

Open `http://localhost:3006`. Production verification:

```bash
npm run lint
npm run build
```

## Security model

The browser receives only the publishable Supabase key. All authorization is
enforced with RLS and `private.current_app_role()`. The console verifies the Auth
user on the server and reads the canonical role from `public.app_users`. Content
mutations write to `admin_actions`, and page updates preserve the prior version
in `content_revisions`.
