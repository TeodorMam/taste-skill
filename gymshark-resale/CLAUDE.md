# Aktivbruk

Norwegian marketplace for used training clothes. Next.js 14 (App Router) +
Supabase. Deployed on Netlify from `main`. The `README.md` in this directory
describes the original single-brand MVP and is out of date; do not trust it.

## Database: new tables need explicit grants

From 30 October 2026, Supabase no longer grants Data API access automatically
to new tables in the `public` schema. A table without grants is invisible to
supabase-js, PostgREST and GraphQL even when its RLS policies are correct, and
the failure looks like an RLS problem.

Every migration that creates a table in `public` includes its grants in the
same file:

```sql
grant select on public.your_table to anon;
grant select, insert, update, delete on public.your_table to authenticated;
grant select, insert, update, delete on public.your_table to service_role;
```

Apply this from now on, not from 30 October. Granting a privilege that already
exists is a no-op, so the statements behave identically before and after the
cutoff. Writing them always means never having to remember the date.

Two things to get right:

- **`service_role` is the one that hurts.** The cron job (`api/cron/payout`)
  and every `/admin` page use the service-role client. Omit that line and the
  homepage keeps working while payouts and the dashboard fail quietly.
- **Drop the `anon` line for tables no visitor should read**, such as `orders`
  and `messages`. Grants say which roles may query the table at all; RLS still
  decides which rows come back. A grant is not a policy, and `grant select to
  anon` does not make a table public.

Existing tables keep the grants Supabase gave them; verified 24 September 2026,
all eleven public tables hold `anon, authenticated, service_role`.
