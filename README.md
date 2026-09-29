# 🎟️ Eventrix — The Hub for Every Dev Event You Can't Miss

<p align="center">
  <img src="public/icons/logo.png" alt="Eventrix logo" width="72" />
</p>

<p align="center">
  <strong>Hackathons, meetups & conferences — discover them, publish them, book a spot.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Cloudinary-images-3448C5?logo=cloudinary&logoColor=white" alt="Cloudinary" />
</p>

<p align="center">
  <a href="#-quick-start">Quick start</a> •
  <a href="#-features">Features</a> •
  <a href="#-how-it-works">How it works</a> •
  <a href="#%EF%B8%8F-api-reference">API</a> •
  <a href="#-troubleshooting">Troubleshooting</a>
</p>

---

## ✨ Features

| Area | What you get |
|---|---|
| 🏠 **Home** (`/`) | Hero headline, animated light-rays backdrop, featured-events grid streamed via `<Suspense>` |
| 📅 **All events** (`/events`) | Newest-first grid of `EventCard`s with empty + loading states |
| 🔍 **Event details** (`/events/[slug]`) | Banner, overview, agenda, meta (date / time / venue / mode / audience), similar-events rail, sticky booking card |
| ➕ **Create event** (`/create-event`) | Full `EventForm`: cover-image upload with preview, date/time inputs, mode select, tags + agenda editors, server validation errors shown inline |
| 🎫 **Booking** | Email signup per event via the `createBooking` Server Action |
| 📊 **Analytics** | PostHog autocapture + explicit events (`explore_events_clicked`, `event_selected`, `event_created`, `event_booked`) and `captureException` error reporting |

## 🧱 Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack, `cacheComponents: true` / Partial Prerendering)
- **UI:** React 19, Tailwind CSS 4, `next/font` (Inter + Schibsted Grotesk + Martian Mono), Lucide icons
- **Data:** MongoDB + Mongoose 9 (`Event` / `Booking` models, lean reads, `serializeEvent` DTOs)
- **Media:** Cloudinary uploads (`eventrix` folder) via `upload_stream`
- **Analytics:** PostHog (`posthog-js`, `@posthog/nextjs-config` sourcemaps)

## 🚀 Quick start

**Prerequisites:** Node 20+, a MongoDB connection string, a Cloudinary account. PostHog is optional.

```bash
npm install
cp .env.example .env.local   # then fill in the table below
npm run dev                  # → http://localhost:3000
```

### 🔑 Environment variables

| Variable | Required | What it's for |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `MONGODB_DB_NAME` | ➖ | DB name override (else taken from the URI) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | ✅ | Cover-image uploads |
| `NEXT_PUBLIC_BASE_URL` | ✅ | e.g. `http://localhost:3000` — used by server-side `fetch()` calls to the local API |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` / `NEXT_PUBLIC_POSTHOG_HOST` | ➖ | Client analytics (events only fire when both are set) |
| `POSTHOG_API_KEY` / `POSTHOG_PROJECT_ID` | ➖ | Sourcemap upload via `withPostHogConfig` |

## 🗂️ Project structure

```text
app/
  page.tsx                 # home + featured events (Suspense-streamed)
  events/page.tsx          # all-events grid
  events/[slug]/page.tsx   # details + similar events + booking
  create-event/page.tsx    # renders EventForm
  api/events/route.ts      # GET list · POST create (multipart + Cloudinary)
  api/events/[slug]/route.ts
components/
  EventForm.tsx  EventCard.tsx  BookEvent.tsx  ExploreBtn.tsx  Navbar.tsx  LightRays.tsx
database/        # event.model.ts (schema + normalisers + serializeEvent), booking.model.ts
lib/
  mongodb.ts               # cached Mongoose connection (globalThis, serverless-safe)
  actions/                 # 'use server' actions: events.action.ts, booking.action.ts
```

## ⚙️ How it works

- **Create flow:** `EventForm` → `multipart/form-data` → `POST /api/events` → buffer → `cloudinary.uploader.upload_stream` → `Event.create()` → redirect to `/events/[slug]`. A `createEventAction` Server Action variant also exists.
- **Smart normalisation:** the `Event` pre-save hook lowercases/aliases `mode` → `online | offline | hybrid`, coerces `tags`/`agenda` from JSON / comma / newline forms, normalises dates to ISO `YYYY-MM-DD` and times to `HH:mm` (trailing zones like `IST` accepted, then ignored).
- **Serialization safety:** every read passes through `serializeEvent()` (`ObjectId` → string, `Date` → ISO) so props crossing the Server → Client boundary are always plain JSON.
- **Rendering:** `cacheComponents` is on — pages ship a static shell and stream uncached reads from `<Suspense>` children (never `await` data in the page body, or you'll hit a *Blocking Route* error). `BookEvent` calls a `'use server'` action so Mongoose never enters the browser bundle.

## 🛠️ API reference

| Method | Route | Body | Response |
|---|---|---|---|
| `GET` | `/api/events` | — | `{ events: SerializedEvent[] }` (newest first) |
| `GET` | `/api/events/[slug]` | — | `{ event }` or 404 |
| `POST` | `/api/events` | `multipart/form-data`: `title, description, overview, venue, location, date, time, mode, audience, organizer, tags (JSON), agenda (JSON), image (file)` | `201 { event }` · `400` validation detail · `500` wrapper |

```bash
npm run dev    # start Turbopack dev server
npm start      # serve production build
npm run lint   # eslint
```

## 🐞 Troubleshooting

| Symptom | Cause → Fix |
|---|---|
| `Module not found: Can't resolve 'async_hooks'` | A Client Component transitively imported Mongoose. Keep DB imports behind `'use server'` actions/route handlers — fixed in `booking.action.ts`. |
| `Only plain objects can be passed to Client Components` | Raw `ObjectId`/`Date` in props. Map reads through `serializeEvent()` — done on all read paths. |
| `Route "/events/[slug]": uncached data during prerendering` | `await`ed data in the page body with `cacheComponents` on. Move reads into `<Suspense>`-wrapped async children (see `app/page.tsx`, `app/events/[slug]/page.tsx`). |
| `Event creation failed` with no detail | Now fixed: validation errors return `400 { message }` and the form throws `data.error \|\| data.message`. Time accepts `18:00`, `10:00 AM`, `9:00 AM - 6:00 PM`, trailing `IST`/`+0530` ignored. |

## 🗺️ Roadmap

- [ ] Search / filter / pagination on `/events`
- [ ] Auth + "my events" dashboard
- [ ] Booking management (cancel, attendee list)
- [ ] OG images + SEO per event

---

<p align="center">Built with 💚 using Next.js, MongoDB & Cloudinary.</p>


