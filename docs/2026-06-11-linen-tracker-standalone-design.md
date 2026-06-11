# Linen Tracker — Standalone App Design Spec

**Date:** 2026-06-11
**Status:** Approved

---

## Overview

A standalone linen tracking application for LCA Cleaning Services, completely independent of Hostly. LCA uses it internally to track which linen items (mattress protectors and inners) are currently out of properties and where they are in the laundry cycle. A read-only public URL can be shared with property managers so they can see the status across their properties.

---

## Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** SQLite via Prisma (local dev); swap to Turso or Neon for Vercel deployment (one env var change)
- **Deployment target:** Vercel
- **Auth:** None — management pages are open, public page is gated by token in URL only

---

## Stages

| Stage | Meaning |
|-------|---------|
| **Washing** | Collected from property, being laundered |
| **Ready** | Clean, ready to be returned |
| **Returned** | Back at property — cycle complete |

---

## Pages

### `/` — Internal management dashboard

Open to anyone with the URL. Full CRUD for properties, clients, and linen items.

**Features:**
- Stage pill counts (Washing / Ready / Returned) + Damaged count
- Client list with shareable public link per client, copy-to-clipboard, regenerate token (revokes old link)
- Property list grouped by client, sorted: properties with items out first, "all home" properties dimmed
- Each property expands to show items with Advance / Back / Delete controls
- "Log Removal" modal — fields: Property, Type (Protector/Inner), Size (Single/Double/King/Super King), Expected return date (optional), Notes (optional), Damaged flag
- "Add Property" — name only
- "Add Client" — name only, token auto-generated
- "Assign Properties" modal — assign properties to a client

### `/linen/[token]` — Public read-only view

No login. Token in URL is the only gate. Invalid/missing token shows a plain "Not found" page.

**Features:**
- Header: "Linen Tracker", client name, "Updated X ago", Live dot (auto-refreshes every 60s)
- Stage summary pills (Washing / Ready / Returned counts)
- Property list sorted: items-out properties first, all-home properties dimmed at bottom
- Each property expands to show items: size/type, stage badge, time since last change, damaged flag, note icon
- Footer: "Managed by LCA Cleaning Services · Hamilton, NZ"

---

## Data model

### `LinenClient`
```
id         String   @id @default(cuid())
name       String
token      String   @unique   // 32 random hex chars
createdAt  DateTime @default(now())
```

### `Property`
```
id             String        @id @default(cuid())
name           String
linenClientId  String?       // FK → LinenClient (nullable)
createdAt      DateTime      @default(now())
```

### `LinenItem`
```
id             String    @id @default(cuid())
propertyId     String    // FK → Property
linenClientId  String    // FK → LinenClient
type           String    // "Protector" | "Inner"
size           String    // "Single" | "Double" | "King" | "Super King"
stage          String    // "washing" | "ready" | "returned"
since          DateTime  // when stage last changed
due            DateTime? // optional expected return date
note           String?
damaged        Boolean   @default(false)
createdAt      DateTime  @default(now())
```

---

## API routes

All routes are Next.js Route Handlers under `app/api/`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/public/[token]` | Public: client name + properties + items for token |
| GET | `/api/properties` | List all properties |
| POST | `/api/properties` | Create property |
| PATCH | `/api/properties/[id]` | Update property name |
| DELETE | `/api/properties/[id]` | Delete property |
| GET | `/api/clients` | List clients with properties |
| POST | `/api/clients` | Create client |
| POST | `/api/clients/[id]/regenerate-token` | Regenerate public token |
| PATCH | `/api/clients/[id]/properties` | Assign properties to client |
| GET | `/api/items` | List all items (with property name) |
| POST | `/api/items` | Create item (stage: washing) |
| PATCH | `/api/items/[id]` | Update stage, note, damaged, due |
| DELETE | `/api/items/[id]` | Delete item |

---

## Visual design

- **Background:** `#08080c`
- **Accent:** `#3AB5D9` cyan
- **Text:** white / `#94a3b8` secondary / `#64748b` muted
- **Cards:** glassmorphism — `rgba(255,255,255,0.05)` bg, `rgba(255,255,255,0.09)` border, backdrop blur
- **Stage colours:**
  - Washing: `#3AB5D9` cyan
  - Ready: `#34d399` green
  - Returned: `#94a3b8` muted
  - Damaged: `#f87171` red
- Properties with items out: cyan-tinted border
- All-home properties: visually dimmed
- Fully responsive — works on mobile and desktop

---

## Project structure

```
linentracker/
  app/
    page.tsx                        ← management dashboard
    linen/[token]/page.tsx          ← public read-only page
    api/
      public/[token]/route.ts
      properties/route.ts
      properties/[id]/route.ts
      clients/route.ts
      clients/[id]/regenerate-token/route.ts
      clients/[id]/properties/route.ts
      items/route.ts
      items/[id]/route.ts
  lib/
    db.ts                           ← Prisma client singleton
  prisma/
    schema.prisma
    dev.db                          ← SQLite file (gitignored)
  docs/
    2026-06-11-linen-tracker-standalone-design.md
```

---

## Deployment notes

- For Vercel: replace SQLite with Turso (libsql) or Neon (Postgres) — update `DATABASE_URL` env var and change Prisma provider from `sqlite` to `turso` or `postgresql`. No code changes required beyond that.
- `prisma/dev.db` is gitignored — never committed.

---

## Out of scope

- Authentication / login
- Email / push notifications
- Multi-stage variants (Drying, etc.)
- Linen inventory / stock counts
- Multi-company support
