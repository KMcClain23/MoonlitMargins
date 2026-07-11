# The Moonlit Margins Sisterhood — site rebuild

Next.js 16 + Tailwind + Supabase + Resend + Cloudflare R2, deployed on Vercel.

## What's built so far

- Design system: "Modern moonlit" — plum/ink background, lilac + candlelight
  amber accents, Fraunces/Manrope/IBM Plex Mono type, the margin-note
  signature component.
- Pages: Home, Join the Sisterhood, Interview with Us, Collab with Us,
  The Sisterhood (leadership + members), Events, Memories.
- One shared `/api/applications` route backing all three application forms —
  validates input, writes to Supabase, and sends a leadership notification
  plus an applicant confirmation via Resend.
- Supabase schema for `applications`, `events`, `members`, `memories` with
  row-level security (public read-only on events/members/memories, no public
  write access anywhere — all writes go through the server using the service
  role key).
- **Admin panel** at `/admin`, protected by cookie-based auth (same pattern
  as the Reinita site): a single shared password, a signed httpOnly session
  cookie, and middleware that gates every `/admin` page and `/api/admin`
  route. From there leadership can review and accept/decline applications,
  and add or remove events, members, and memories without touching Supabase
  directly.

## Local setup

```bash
npm install
cp .env.local.example .env.local   # fill in real values, see below
npm run dev
```

## Environment variables

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page — **server only, never expose client-side** |
| `RESEND_API_KEY` | Resend dashboard |
| `RESEND_FROM_EMAIL` / `NOTIFY_EMAIL` | Your sending domain + the inbox leadership checks |
| `R2_*` | Cloudflare R2 bucket, same pattern as dmnarration.com |

## Cloudflare R2 setup

This is manual, one-time dashboard work in Cloudflare (not something that
happens through this codebase). Steps:

1. **Create the bucket.** Cloudflare dashboard → R2 → Create bucket. Name it
   `moonlit-margins-media` (or whatever you put in `R2_BUCKET_NAME`).
2. **Enable public access.** Open the bucket → Settings → Public access →
   enable the `r2.dev` subdomain. Copy that URL into `R2_PUBLIC_URL`
   (no trailing slash).
3. **Create an API token.** R2 → Manage API Tokens → Create API Token.
   Give it read + write permissions scoped to this bucket. Copy the Access
   Key ID and Secret Access Key into `R2_ACCESS_KEY_ID` /
   `R2_SECRET_ACCESS_KEY`.
4. **Get the Account ID.** Shown on the R2 overview page in the Cloudflare
   dashboard sidebar. Goes in `R2_ACCOUNT_ID`.
5. **Configure CORS on the bucket** so the browser is allowed to upload
   directly to it. Bucket → Settings → CORS Policy → paste:

   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "https://themoonlitmarginssisterhood.com"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["Content-Type"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

   Add any other domain you preview/deploy on later (Vercel preview URLs,
   for instance) to `AllowedOrigins` as needed.

Once all five `R2_*` variables are filled in and CORS is set, the **Upload**
button in `/admin/members` and `/admin/memories` uploads straight to this
bucket, no manual URL copying needed. Pasting a URL directly still works too
(it's just a text field underneath the button), useful for the temporary
Wix-hosted photos already in the database.

## Database setup

In the Supabase SQL editor, run `supabase/schema.sql`. That creates all four
tables and the RLS policies in one shot.

To seed leadership (Kaya, Aleia, etc.) and the member grid, insert rows into
`members` — either directly in the Supabase table editor for now, or I can
build a small admin page for this next.

## Admin panel

Visit `/admin` and sign in with `ADMIN_PASSWORD`. Set both `ADMIN_PASSWORD`
and `ADMIN_SESSION_SECRET` (any long random string — used to sign the
session cookie) before deploying. Sessions last 12 hours.

- **Applications** — filter by member/interview/collab, expand to read
  full answers, mark in review, accept, or decline.
- **Events** — add/remove upcoming events shown on the public Events page.
- **Members** — add/remove people in the public Sisterhood directory, flag
  leadership council members. Photo field uploads directly to R2, or takes
  a pasted URL.
- **Memories** — add/remove photos or videos in the public gallery. One
  field for the media itself: upload a photo/video file, or paste any link
  (a YouTube/Vimeo link embeds automatically, a direct file link just
  plays). Type is auto-detected, nothing to pick manually. An optional
  "Cover image" field lets you set a manual thumbnail for the rare case
  the automatic one doesn't come through.

If you already ran `schema.sql` before this update, also run:
- `supabase/migrations/2026-07-add-video-memories.sql`
- `supabase/migrations/2026-07-add-memory-cover.sql`

in the SQL editor once, both are additive and don't touch existing rows.

## Still to build

- Real content: leadership bios/photos, the actual perks copy sign-off,
  and og-image / favicon assets.

## Deploying

Same flow as your other client sites: push to GitHub, import into Vercel,
add the env vars above in the Vercel project settings, deploy.
