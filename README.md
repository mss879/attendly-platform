# Attendly

*Powered by ARC AI*

Multi-event ticketing **platform**: organizers apply to host events; attendees book numbered seats, pay by bank transfer, and check in at the gate with a personal QR ticket.

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind, GSAP + WebGL) · Supabase (Postgres, Auth, Storage) · Resend (email)

## How the platform works

### Attendees

1. **Browse** — the landing page (`/`) pitches the platform; `/events` lists upcoming events (with live countdowns) and completed ones. Each event has its own page at `/events/<slug>`.
2. **Book** — on `/events/<slug>/book` they fill in their details, pick numbered seats on the live plan, and upload their bank-transfer slip.
3. **Verify** — the event's organizer reviews the slip and clicks **Verify**; a sequential ticket number + QR code is issued and emailed.
4. **Gate** — staff open the event's **Scan tickets** page, scan the QR (or type the ticket number), and the attendee is checked in. Duplicate scans show a red "ALREADY CHECKED IN" warning.

### Organizers (apply + approval)

1. **Apply** — `/host` → create an account (`/host/signup`) → fill the "Create event" form (name, venue, date, seating layout, price, bank details).
2. **Review** — the event sits in **pending** until the super admin approves it from `/admin/platform`. The organizer is emailed on approval/rejection; rejected events can be edited and are automatically resubmitted.
3. **Manage** — each organizer sees only their own events at `/admin` and manages registrations, payment reviews, settings and the gate at `/admin/e/<eventId>`.

### Roles

- **Organizer** — any signed-up user; owns their events, sees only their own data.
- **Super admin** — the platform owner; sees every event, approves/rejects applications at `/admin/platform`.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run the five migration files **in order**:
   - `supabase/migrations/0001_registrations.sql`
   - `supabase/migrations/0002_payment_slips.sql`
   - `supabase/migrations/0003_tickets.sql`
   - `supabase/migrations/0004_seats.sql`
   - `supabase/migrations/0005_platform.sql` ← multi-event platform (events, profiles, roles; seeds the Bradby event and backfills existing bookings onto it)
3. **Promote yourself to super admin.** Sign up once via `/host/signup` (or create a user in **Authentication → Users**), then run:

   ```sql
   update public.profiles set role = 'super_admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

4. The seeded Bradby event has **blank bank details** (they used to live in env vars). Set them via the event's **Settings** page in the admin console, or directly:

   ```sql
   update public.events
   set bank = '{"name":"Your Bank","accountName":"...","accountNumber":"...","branch":"..."}'
   where slug = 'bradby-shield-2026';
   ```

   To give the Bradby event a real date (enables the countdown):

   ```sql
   update public.events
   set starts_at = '2026-06-13 14:00:00+05:30'
   where slug = 'bradby-shield-2026';
   ```

### 2. Resend

1. Create an API key at [resend.com/api-keys](https://resend.com/api-keys).
2. For production, verify your domain and set `EMAIL_FROM` to e.g. `Attendly <tickets@yourdomain.com>`. Without a verified domain, Resend only delivers to your own account email (using `onboarding@resend.dev`).

### 3. Environment

```bash
cp .env.local.example .env.local
```

Fill in the Supabase URL + keys, Resend key and your public app URL. (The old `EVENT_NAME` / `TICKET_PRICE` / `BANK_*` vars are gone — those now live per event in the database.)

### 4. Run

```bash
npm install
npm run dev
```

- Platform landing: `http://localhost:3000/`
- Events hub: `http://localhost:3000/events`
- Organizer application: `http://localhost:3000/host`
- Admin console: `http://localhost:3000/admin`

> **Note:** the gate scanner needs camera access, which browsers only allow on `localhost` or **HTTPS** — deploy (e.g. Vercel) before using it on phones at the venue.

## Design notes

- **Multi-tenancy:** every registration/seat carries an `event_id`; seats are unique per event (`unique(event_id, seat_no)`), so double-booking stays impossible under concurrency. Admin pages and APIs check event ownership (`requireEventAccess`) on every request; RLS policies additionally scope organizer reads to their own events.
- **Security:** all writes go through server route handlers using the service-role key. RLS is enabled on every table. Registrants authenticate with an unguessable personal token; organizers with Supabase Auth. Payment slips live in a private bucket, viewed via short-lived signed URLs.
- **Event lifecycle:** `pending → published | rejected` (super-admin review). "Completed" is derived: a published event whose start time is more than 12 h in the past. Events with no `starts_at` show "Date TBA" and no countdown.
- **Animations:** GSAP (ScrollTrigger, DrawSVG) + hand-rolled WebGL fragment shaders (landing hero, aurora background, preloader) — no extra dependencies; everything honors `prefers-reduced-motion`.
- **QR reliability:** the QR encodes only a 36-char opaque token (low QR version → large modules), error-correction level Q, 600×600 PNG with a proper quiet zone. Manual ticket-number entry is the gate fallback.
- **Double-entry protection:** check-in is a single atomic `UPDATE … WHERE checked_in_at IS NULL`, so the same ticket can never check in twice, even from two gates simultaneously. Tickets from other events are rejected at the gate.
- **Fail-soft email:** if Resend is down or unconfigured, bookings/verifications/approvals still succeed; the personal link is also shown on-screen after booking.
- **Legacy URLs:** `/book` permanently redirects to the Bradby event's booking page so existing links and emails keep working.
