# Gymshark Resale Oslo — MVP

A minimal, single-brand resale web app for Gymshark clothing in Oslo. Built to
answer one question: _can people in Oslo actually buy and sell Gymshark items
in a simple dedicated environment?_

Stack: **Next.js 14 (App Router) + Tailwind CSS + Supabase (Postgres + Storage)**.
No auth, no payments, no algorithm. ~300 lines of app code.

## Features

- Landing page with "Post item" / "Browse items" CTAs
- Browse page: image grid of all listings (sold items shown with a badge)
- Post page: photo upload + title/size/price/condition/location/contact
  - Hard-enforced rule: title must contain "Gymshark", else submission is blocked
    with the message **"Only Gymshark items allowed"**
- Item page: full detail, reveal-on-click contact info, mark-as-sold toggle

## 1. Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com) project

## 2. Supabase setup

1. Create a new Supabase project.
2. In the project dashboard → **SQL Editor**, paste the contents of
   [`supabase/schema.sql`](./supabase/schema.sql) and run it. This creates the
   `items` table, indexes, and anonymous-access RLS policies.
3. In **Storage**, create a new bucket named `item-images` and set it to
   **public** (or run the commented `insert into storage.buckets …` snippet at
   the bottom of `schema.sql`).
4. Still in Storage → **Policies** for `item-images`, add a policy that allows
   anonymous `INSERT`:

   ```sql
   create policy "anon upload" on storage.objects
     for insert to anon
     with check (bucket_id = 'item-images');
   ```

5. In **Project Settings → API**, copy the **Project URL** and the **anon
   public** key.

## 3. Local development

```bash
cd gymshark-resale
cp .env.local.example .env.local
# paste your Supabase URL + anon key into .env.local
npm install
npm run dev
```

Open http://localhost:3000.

Environment variables:

| Variable                               | Where to find it                                  |
| -------------------------------------- | ------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase → Settings → API → Project URL           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API → `publishable` API key |

## 4. Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **New Project** → import the repo. Set the **Root Directory** to
   `gymshark-resale/`.
3. Framework preset: **Next.js** (auto-detected).
4. Under **Environment Variables**, add the same two variables as above.
5. Deploy. Vercel will pick up `package.json` and build.

That's it — visit your Vercel URL and post the first item.

## Data model

```
items
  id           uuid        primary key
  title        text        must contain "Gymshark" (enforced in UI)
  image_url    text        public URL from Supabase Storage
  size         text
  price        numeric     NOK
  condition    text
  location     text        defaults to "Oslo"
  contact      text        Instagram handle or phone
  is_sold      boolean     default false
  created_at   timestamptz default now()
```

## MVP scope / non-goals

- No authentication. Anyone can post, anyone can toggle `is_sold`. Fine for a
  validation prototype, **not** for production — tighten RLS and add auth before
  wider release.
- No payments, no chat, no search, no categories, no algorithms.
- Only Gymshark. Title validation is a simple `/gymshark/i` regex on the
  client; good enough for the MVP hypothesis.

## Project layout

```
gymshark-resale/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # header + nav
│   │   ├── page.tsx            # landing
│   │   ├── browse/page.tsx     # grid of all items
│   │   ├── post/page.tsx       # create-item form + image upload
│   │   └── item/[id]/page.tsx  # item detail + contact + mark sold
│   ├── components/ItemCard.tsx
│   └── lib/supabase.ts
├── supabase/schema.sql         # run this in Supabase SQL editor
└── package.json
```
