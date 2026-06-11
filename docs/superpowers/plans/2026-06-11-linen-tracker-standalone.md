# Linen Tracker Standalone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully standalone Next.js linen tracking app at `C:\Users\dener\linentracker`, independent of Hostly, deployable to Vercel.

**Architecture:** Single Next.js 14 (App Router) app with API Route Handlers, Prisma ORM, and a SQLite database. No auth — the management dashboard is open, the public read-only page is gated by a token in the URL. All data (properties, clients, items) is managed inside the app itself.

**Tech Stack:** Next.js 14, TypeScript, Prisma 5, SQLite (`better-sqlite3`), `@tanstack/react-query`, `lucide-react`, `cuid2`

---

## File Map

| File | Responsibility |
|------|---------------|
| `prisma/schema.prisma` | DB schema — LinenClient, Property, LinenItem |
| `lib/db.ts` | Prisma client singleton |
| `lib/utils.ts` | `timeAgo()`, stage metadata constants |
| `app/api/properties/route.ts` | GET list, POST create |
| `app/api/properties/[id]/route.ts` | PATCH update name, DELETE |
| `app/api/clients/route.ts` | GET list, POST create |
| `app/api/clients/[id]/regenerate-token/route.ts` | POST regenerate token |
| `app/api/clients/[id]/properties/route.ts` | PATCH assign properties to client |
| `app/api/items/route.ts` | GET list, POST create |
| `app/api/items/[id]/route.ts` | PATCH update, DELETE |
| `app/api/public/[token]/route.ts` | GET public read-only data |
| `app/page.tsx` | Management dashboard (full CRUD UI) |
| `app/linen/[token]/page.tsx` | Public read-only page |
| `app/layout.tsx` | Root layout with QueryClientProvider |
| `app/providers.tsx` | React Query provider (client component) |

---

## Task 1: Scaffold the Next.js project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `.gitignore`
- Create: `.env`

- [ ] **Step 1: Initialise the project**

Run from `C:\Users\dener\linentracker`:
```bash
npx create-next-app@14 . --typescript --app --no-tailwind --no-eslint --no-src-dir --import-alias "@/*"
```
When prompted, answer: No to all optional features.

- [ ] **Step 2: Install dependencies**

```bash
npm install @prisma/client @tanstack/react-query lucide-react @paralleldrive/cuid2
npm install -D prisma
```

- [ ] **Step 3: Create `.env`**

Create `.env` at the project root:
```
DATABASE_URL="file:./prisma/dev.db"
```

- [ ] **Step 4: Verify Next.js starts**

```bash
npm run dev
```
Expected: server starts on http://localhost:3000 with no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 14 project"
```

---

## Task 2: Prisma schema and database

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/db.ts`

- [ ] **Step 1: Initialise Prisma**

```bash
npx prisma init --datasource-provider sqlite
```
This creates `prisma/schema.prisma` and adds `DATABASE_URL` to `.env` (already set correctly).

- [ ] **Step 2: Replace `prisma/schema.prisma` with the full schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model LinenClient {
  id         String      @id @default(cuid())
  name       String
  token      String      @unique
  createdAt  DateTime    @default(now())
  properties Property[]
  items      LinenItem[]
}

model Property {
  id            String      @id @default(cuid())
  name          String
  linenClientId String?
  createdAt     DateTime    @default(now())
  client        LinenClient? @relation(fields: [linenClientId], references: [id])
  items         LinenItem[]
}

model LinenItem {
  id            String      @id @default(cuid())
  propertyId    String
  linenClientId String
  type          String
  size          String
  stage         String      @default("washing")
  since         DateTime    @default(now())
  due           DateTime?
  note          String?
  damaged       Boolean     @default(false)
  createdAt     DateTime    @default(now())
  property      Property    @relation(fields: [propertyId], references: [id])
  client        LinenClient @relation(fields: [linenClientId], references: [id])
}
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name init
```
Expected: `prisma/dev.db` is created and `prisma/migrations/` folder appears.

- [ ] **Step 4: Create `lib/db.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 5: Add `prisma/dev.db` to `.gitignore`**

Open `.gitignore` and confirm (or add) these lines:
```
prisma/dev.db
prisma/dev.db-journal
.env
```

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations lib/db.ts .gitignore
git commit -m "feat: prisma schema and sqlite database"
```

---

## Task 3: Shared utilities

**Files:**
- Create: `lib/utils.ts`

- [ ] **Step 1: Create `lib/utils.ts`**

```typescript
export const STAGES = [
  { key: 'washing',  label: 'Washing',  color: '#3AB5D9', bg: 'rgba(58,181,217,0.15)',  border: 'rgba(58,181,217,0.35)' },
  { key: 'ready',    label: 'Ready',    color: '#34d399', bg: 'rgba(52,211,153,0.15)',  border: 'rgba(52,211,153,0.35)' },
  { key: 'returned', label: 'Returned', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' },
] as const

export type StageKey = typeof STAGES[number]['key']

export const STAGE_ORDER: StageKey[] = ['washing', 'ready', 'returned']

export function stageMeta(key: string) {
  return STAGES.find(s => s.key === key) ?? STAGES[2]
}

export function stageNext(key: string): string {
  const i = STAGE_ORDER.indexOf(key as StageKey)
  return STAGE_ORDER[i + 1] ?? key
}

export function stagePrev(key: string): string {
  const i = STAGE_ORDER.indexOf(key as StageKey)
  return STAGE_ORDER[i - 1] ?? key
}

export function timeAgo(ts: string | Date): string {
  const ms = Date.now() - new Date(ts).getTime()
  if (!isFinite(ms)) return '—'
  const m = Math.round(ms / 60000)
  if (m < 2) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return d === 1 ? 'yesterday' : `${d}d ago`
}

export const ITEM_TYPES = ['Protector', 'Inner'] as const
export const SIZES = ['Single', 'Double', 'King', 'Super King'] as const
```

- [ ] **Step 2: Commit**

```bash
git add lib/utils.ts
git commit -m "feat: shared stage utilities and constants"
```

---

## Task 4: API — properties

**Files:**
- Create: `app/api/properties/route.ts`
- Create: `app/api/properties/[id]/route.ts`

- [ ] **Step 1: Create `app/api/properties/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createId } from '@paralleldrive/cuid2'

export async function GET() {
  const properties = await prisma.property.findMany({
    orderBy: { name: 'asc' },
    include: { client: { select: { id: true, name: true } } },
  })
  return NextResponse.json(properties)
}

export async function POST(req: Request) {
  const { name } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  const property = await prisma.property.create({
    data: { id: createId(), name: name.trim() },
  })
  return NextResponse.json(property)
}
```

- [ ] **Step 2: Create `app/api/properties/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { name } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  const property = await prisma.property.update({
    where: { id: params.id },
    data: { name: name.trim() },
  })
  return NextResponse.json(property)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.property.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Test manually**

Start dev server (`npm run dev`) and run in a terminal:
```bash
# Create a property
curl -X POST http://localhost:3000/api/properties \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Property"}'
# Expected: {"id":"...","name":"Test Property","linenClientId":null,"createdAt":"..."}

# List properties
curl http://localhost:3000/api/properties
# Expected: array containing the created property
```

- [ ] **Step 4: Commit**

```bash
git add app/api/properties
git commit -m "feat: properties API routes"
```

---

## Task 5: API — clients

**Files:**
- Create: `app/api/clients/route.ts`
- Create: `app/api/clients/[id]/regenerate-token/route.ts`
- Create: `app/api/clients/[id]/properties/route.ts`

- [ ] **Step 1: Create `app/api/clients/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createId } from '@paralleldrive/cuid2'
import crypto from 'crypto'

export async function GET() {
  const clients = await prisma.linenClient.findMany({
    orderBy: { name: 'asc' },
    include: { properties: { select: { id: true, name: true } } },
  })
  return NextResponse.json(clients)
}

export async function POST(req: Request) {
  const { name } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  const token = crypto.randomBytes(16).toString('hex')
  const client = await prisma.linenClient.create({
    data: { id: createId(), name: name.trim(), token },
  })
  return NextResponse.json(client)
}
```

- [ ] **Step 2: Create `app/api/clients/[id]/regenerate-token/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const client = await prisma.linenClient.findUnique({ where: { id: params.id } })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const token = crypto.randomBytes(16).toString('hex')
  const updated = await prisma.linenClient.update({
    where: { id: params.id },
    data: { token },
  })
  return NextResponse.json(updated)
}
```

- [ ] **Step 3: Create `app/api/clients/[id]/properties/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const client = await prisma.linenClient.findUnique({ where: { id: params.id } })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { propertyIds } = await req.json()

  // Unassign all properties currently assigned to this client
  await prisma.property.updateMany({
    where: { linenClientId: params.id },
    data: { linenClientId: null },
  })

  // Assign the new set
  if (Array.isArray(propertyIds) && propertyIds.length > 0) {
    await prisma.property.updateMany({
      where: { id: { in: propertyIds } },
      data: { linenClientId: params.id },
    })
  }

  const updated = await prisma.linenClient.findUnique({
    where: { id: params.id },
    include: { properties: { select: { id: true, name: true } } },
  })
  return NextResponse.json(updated)
}
```

- [ ] **Step 4: Test manually**

```bash
# Create a client
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -d '{"name":"Coastal Properties"}'
# Expected: {"id":"...","name":"Coastal Properties","token":"<32hexchars>","createdAt":"..."}

# List clients
curl http://localhost:3000/api/clients
# Expected: array with properties array included
```

- [ ] **Step 5: Commit**

```bash
git add app/api/clients
git commit -m "feat: clients API routes"
```

---

## Task 6: API — items

**Files:**
- Create: `app/api/items/route.ts`
- Create: `app/api/items/[id]/route.ts`

- [ ] **Step 1: Create `app/api/items/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createId } from '@paralleldrive/cuid2'

export async function GET() {
  const items = await prisma.linenItem.findMany({
    orderBy: { since: 'desc' },
    include: { property: { select: { id: true, name: true } } },
  })
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const { propertyId, type, size, due, note, damaged } = await req.json()
  if (!propertyId || !type || !size) {
    return NextResponse.json({ error: 'propertyId, type and size are required' }, { status: 400 })
  }

  const property = await prisma.property.findUnique({ where: { id: propertyId } })
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  if (!property.linenClientId) {
    return NextResponse.json({ error: 'Property is not assigned to a client' }, { status: 400 })
  }

  const item = await prisma.linenItem.create({
    data: {
      id: createId(),
      propertyId,
      linenClientId: property.linenClientId,
      type,
      size,
      stage: 'washing',
      since: new Date(),
      due: due ? new Date(due) : null,
      note: note?.trim() || null,
      damaged: !!damaged,
    },
    include: { property: { select: { id: true, name: true } } },
  })
  return NextResponse.json(item)
}
```

- [ ] **Step 2: Create `app/api/items/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const item = await prisma.linenItem.findUnique({ where: { id: params.id } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { stage, note, damaged, due } = await req.json()
  const data: Record<string, unknown> = {}
  if (stage !== undefined) { data.stage = stage; data.since = new Date() }
  if (note !== undefined) data.note = note?.trim() || null
  if (damaged !== undefined) data.damaged = !!damaged
  if (due !== undefined) data.due = due ? new Date(due) : null

  const updated = await prisma.linenItem.update({
    where: { id: params.id },
    data,
    include: { property: { select: { id: true, name: true } } },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const item = await prisma.linenItem.findUnique({ where: { id: params.id } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.linenItem.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/items
git commit -m "feat: items API routes"
```

---

## Task 7: API — public token route

**Files:**
- Create: `app/api/public/[token]/route.ts`

- [ ] **Step 1: Create `app/api/public/[token]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const client = await prisma.linenClient.findUnique({
    where: { token: params.token },
    include: {
      properties: {
        orderBy: { name: 'asc' },
        include: {
          items: { orderBy: { since: 'desc' } },
        },
      },
    },
  })

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    clientName: client.name,
    properties: client.properties.map(p => ({
      id: p.id,
      name: p.name,
      items: p.items.map(i => ({
        id: i.id,
        type: i.type,
        size: i.size,
        stage: i.stage,
        since: i.since,
        due: i.due,
        note: i.note,
        damaged: i.damaged,
      })),
    })),
  })
}
```

- [ ] **Step 2: Test manually**

First create a client and get its token from `curl http://localhost:3000/api/clients`, then:
```bash
curl http://localhost:3000/api/public/<token>
# Expected: {"clientName":"Coastal Properties","properties":[...]}

curl http://localhost:3000/api/public/invalidtoken
# Expected: 404 {"error":"Not found"}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/public
git commit -m "feat: public token API route"
```

---

## Task 8: Root layout and React Query provider

**Files:**
- Create: `app/providers.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `app/providers.tsx`**

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

- [ ] **Step 2: Replace `app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Linen Tracker',
  description: 'LCA Cleaning Services linen management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#08080c' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Delete any default Next.js files that are no longer needed**

```bash
rm -f app/globals.css app/page.module.css public/vercel.svg public/next.svg
```

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/providers.tsx
git commit -m "feat: root layout and React Query provider"
```

---

## Task 9: Public read-only page `/linen/[token]`

**Files:**
- Create: `app/linen/[token]/page.tsx`

- [ ] **Step 1: Create `app/linen/[token]/page.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ChevronDown, ChevronUp, AlertTriangle, FileText } from 'lucide-react'
import { stageMeta, timeAgo, STAGES } from '@/lib/utils'

interface LinenItem {
  id: string
  type: string
  size: string
  stage: string
  since: string
  damaged: boolean
  note: string | null
}

interface LinenProperty {
  id: string
  name: string
  items: LinenItem[]
}

interface PublicData {
  clientName: string
  properties: LinenProperty[]
}

export default function PublicLinenPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<PublicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [lastFetch, setLastFetch] = useState<Date>(new Date())

  const fetchData = () => {
    fetch(`/api/public/${token}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then(d => {
        if (!d) { setLoading(false); return }
        setData(d)
        setLastFetch(new Date())
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [token])

  const toggle = (id: string) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#08080c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid rgba(58,181,217,0.3)', borderTopColor: '#3AB5D9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#08080c', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ textAlign: 'center', color: '#475569', fontSize: 14 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>404</div>
        <div>Not found</div>
      </div>
    </div>
  )

  if (!data) return null

  const allItems = data.properties.flatMap(p => p.items)
  const counts = {
    washing: allItems.filter(i => i.stage === 'washing').length,
    ready: allItems.filter(i => i.stage === 'ready').length,
    returned: allItems.filter(i => i.stage === 'returned').length,
  }

  const sortedProperties = [...data.properties].sort((a, b) => {
    const aOut = a.items.filter(i => i.stage !== 'returned').length
    const bOut = b.items.filter(i => i.stage !== 'returned').length
    return bOut - aOut
  })

  return (
    <div style={{ background: '#08080c', minHeight: '100vh', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 48px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Linen Tracker</h1>
              <span style={{ color: '#64748b', fontSize: 13 }}>— {data.clientName}</span>
            </div>
            <div style={{ marginTop: 4 }}>
              <span style={{ color: '#475569', fontSize: 11 }}>Updated {timeAgo(lastFetch.toISOString())}</span>
            </div>
          </div>
          <div style={{ background: 'rgba(58,181,217,0.12)', border: '1px solid rgba(58,181,217,0.3)', color: '#3AB5D9', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3AB5D9', display: 'inline-block' }} />
            Live
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {STAGES.map(s => (
            <span key={s.key} style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 20 }}>
              {counts[s.key as keyof typeof counts] ?? 0} {s.label}
            </span>
          ))}
        </div>

        {sortedProperties.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#475569', fontSize: 13, padding: '40px 0' }}>No properties to display.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sortedProperties.map(prop => {
              const outItems = prop.items.filter(i => i.stage !== 'returned')
              const hasOut = outItems.length > 0
              const isExpanded = expanded[prop.id]
              return (
                <div key={prop.id} style={{ background: hasOut ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${hasOut ? 'rgba(58,181,217,0.35)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, overflow: 'hidden' }}>
                  <button onClick={() => toggle(prop.id)} style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', color: 'white' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: hasOut ? '#3AB5D9' : '#334155', flexShrink: 0 }} />
                    <span style={{ flex: 1, textAlign: 'left', fontWeight: 600, fontSize: 14, color: hasOut ? 'white' : '#475569' }}>{prop.name}</span>
                    {hasOut
                      ? <span style={{ background: 'rgba(58,181,217,0.2)', color: '#3AB5D9', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{outItems.length} out</span>
                      : <span style={{ background: 'rgba(255,255,255,0.06)', color: '#475569', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>All home</span>
                    }
                    {isExpanded ? <ChevronUp size={13} color={hasOut ? '#3AB5D9' : '#334155'} /> : <ChevronDown size={13} color={hasOut ? '#64748b' : '#334155'} />}
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 13px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {prop.items.length === 0 ? (
                        <div style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: '6px 0' }}>No items logged</div>
                      ) : prop.items.map(item => {
                        const sm = stageMeta(item.stage)
                        return (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ flex: 1, fontSize: 12, color: '#94a3b8', minWidth: 120 }}>{item.size} {item.type}</span>
                            {item.damaged && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20 }}>
                                <AlertTriangle size={10} /> Damaged
                              </span>
                            )}
                            {item.note && <span title={item.note} style={{ display: 'flex', alignItems: 'center' }}><FileText size={11} color="#475569" /></span>}
                            <span style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{sm.label}</span>
                            <span style={{ color: '#334155', fontSize: 10 }}>{timeAgo(item.since)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div style={{ textAlign: 'center', color: '#1e293b', fontSize: 11, marginTop: 32 }}>
          Managed by LCA Cleaning Services · Hamilton, NZ
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test in browser**

1. Create a client via `curl -X POST http://localhost:3000/api/clients -H "Content-Type: application/json" -d '{"name":"Test Client"}'`
2. Note the `token` in the response
3. Open `http://localhost:3000/linen/<token>` in the browser
4. Verify: header shows "Linen Tracker — Test Client", Live dot visible, "No properties to display" message shows
5. Open `http://localhost:3000/linen/badtoken` — verify 404 page shows

- [ ] **Step 3: Commit**

```bash
git add app/linen
git commit -m "feat: public read-only linen page"
```

---

## Task 10: Management dashboard `/`

**Files:**
- Create: `app/page.tsx`

This is the largest file. It contains the full management UI with all modals inline as sub-components at the bottom of the file.

- [ ] **Step 1: Create `app/page.tsx`**

```typescript
'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, X, ChevronDown, ChevronUp, ArrowRight, ChevronLeft,
  Check, AlertTriangle, FileText, Copy, Link2, RefreshCw,
  Droplets, Trash2, Building2, Users, Pencil
} from 'lucide-react'
import { STAGES, STAGE_ORDER, ITEM_TYPES, SIZES, stageMeta, stageNext, stagePrev, timeAgo } from '@/lib/utils'

// ── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const qc = useQueryClient()

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [addingItem, setAddingItem] = useState(false)
  const [addingClient, setAddingClient] = useState(false)
  const [addingProperty, setAddingProperty] = useState(false)
  const [managingProps, setManagingProps] = useState<any>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['clients'],
    queryFn: () => apiFetch('/clients'),
  })
  const { data: items = [] } = useQuery<any[]>({
    queryKey: ['items'],
    queryFn: () => apiFetch('/items'),
  })
  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ['properties'],
    queryFn: () => apiFetch('/properties'),
  })

  const advanceItem = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      apiFetch(`/items/${id}`, { method: 'PATCH', body: JSON.stringify({ stage }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  })
  const deleteItem = useMutation({
    mutationFn: (id: string) => apiFetch(`/items/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  })
  const regenToken = useMutation({
    mutationFn: (id: string) => apiFetch(`/clients/${id}/regenerate-token`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
  const deleteProperty = useMutation({
    mutationFn: (id: string) => apiFetch(`/properties/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties'] })
      qc.invalidateQueries({ queryKey: ['items'] })
    },
  })

  const counts = useMemo(() => {
    const c: Record<string, number> = { washing: 0, ready: 0, returned: 0 }
    items.forEach((i: any) => { if (c[i.stage] !== undefined) c[i.stage]++ })
    return c
  }, [items])

  const damagedCount = useMemo(
    () => items.filter((i: any) => i.damaged && i.stage !== 'returned').length,
    [items]
  )

  const itemsByProperty = useMemo(() => {
    const m: Record<string, any[]> = {}
    items.forEach((i: any) => {
      if (!m[i.propertyId]) m[i.propertyId] = []
      m[i.propertyId].push(i)
    })
    return m
  }, [items])

  const assignedProperties = useMemo(() => {
    return [...properties.filter((p: any) => p.linenClientId)].sort((a: any, b: any) => {
      const aOut = (itemsByProperty[a.id] || []).filter((i: any) => i.stage !== 'returned').length
      const bOut = (itemsByProperty[b.id] || []).filter((i: any) => i.stage !== 'returned').length
      return bOut - aOut
    })
  }, [properties, itemsByProperty])

  const unassignedProperties = properties.filter((p: any) => !p.linenClientId)

  const copyLink = (token: string, clientId: string) => {
    const url = `${window.location.origin}/linen/${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(clientId)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const toggleExpand = (id: string) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  return (
    <div style={{ background: '#08080c', minHeight: '100vh', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 48px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#3AB5D9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Droplets size={18} color="#000" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Linen Tracker</h1>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b', marginTop: 2 }}>LCA Cleaning Services</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setAddingProperty(true)}
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', borderRadius: 8, padding: '8px 13px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={14} /> Add Property
            </button>
            <button onClick={() => setAddingClient(true)}
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', borderRadius: 8, padding: '8px 13px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={14} /> Add Client
            </button>
            <button onClick={() => setAddingItem(true)}
              style={{ background: '#3AB5D9', border: 'none', color: '#000', borderRadius: 8, padding: '8px 13px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> Log Removal
            </button>
          </div>
        </div>

        {/* Stage pill counts */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {STAGES.map(s => (
            <div key={s.key} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: s.color, fontWeight: 700, fontSize: 20, fontFamily: 'monospace' }}>{counts[s.key] ?? 0}</span>
              <span style={{ color: s.color, fontWeight: 600, fontSize: 12 }}>{s.label}</span>
            </div>
          ))}
          {damagedCount > 0 && (
            <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#f87171', fontWeight: 700, fontSize: 20, fontFamily: 'monospace' }}>{damagedCount}</span>
              <span style={{ color: '#f87171', fontWeight: 600, fontSize: 12 }}>Damaged</span>
            </div>
          )}
        </div>

        {/* Client list with shareable links */}
        {clients.length > 0 && (
          <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {clients.map((c: any) => (
              <div key={c.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Link2 size={14} color="#3AB5D9" />
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 120 }}>{c.name}</span>
                <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', flex: 2, minWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {typeof window !== 'undefined' ? window.location.origin : ''}/linen/{c.token}
                </span>
                <button onClick={() => setManagingProps(c)}
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Building2 size={12} /> Properties
                </button>
                <button onClick={() => copyLink(c.token, c.id)}
                  style={{ background: copied === c.id ? 'rgba(52,211,153,0.15)' : 'rgba(58,181,217,0.15)', border: `1px solid ${copied === c.id ? 'rgba(52,211,153,0.3)' : 'rgba(58,181,217,0.3)'}`, color: copied === c.id ? '#34d399' : '#3AB5D9', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {copied === c.id ? <Check size={12} /> : <Copy size={12} />}
                  {copied === c.id ? 'Copied' : 'Copy Link'}
                </button>
                <button onClick={() => { if (confirm('Regenerate token? This will break the existing shared link.')) regenToken.mutate(c.id) }}
                  style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '5px 8px' }}>
                  <RefreshCw size={12} /> Revoke
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Unassigned properties notice */}
        {unassignedProperties.length > 0 && (
          <div style={{ marginBottom: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>{unassignedProperties.length} unassigned {unassignedProperties.length === 1 ? 'property' : 'properties'}:</span>{' '}
              {unassignedProperties.map((p: any) => p.name).join(', ')}
              {clients.length > 0 && ' — assign via a client's Properties button above.'}
            </p>
          </div>
        )}

        {/* Property list */}
        {assignedProperties.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#475569', fontSize: 13, padding: '40px 0' }}>
            {clients.length === 0
              ? 'Add a client and assign properties to get started.'
              : 'No properties assigned to a client yet. Use the Properties button on a client above.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {assignedProperties.map((p: any) => {
              const propItems = itemsByProperty[p.id] || []
              const outItems = propItems.filter((i: any) => i.stage !== 'returned')
              const isExpanded = expanded[p.id]
              const borderCol = outItems.length > 0 ? 'rgba(58,181,217,0.35)' : 'rgba(255,255,255,0.06)'
              const bgCol = outItems.length > 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)'

              return (
                <div key={p.id} style={{ background: bgCol, border: `1px solid ${borderCol}`, borderRadius: 10, overflow: 'hidden' }}>
                  <button onClick={() => toggleExpand(p.id)}
                    style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', color: 'white' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: outItems.length > 0 ? '#3AB5D9' : '#334155', flexShrink: 0 }} />
                    <span style={{ flex: 1, textAlign: 'left', fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                    {outItems.length > 0
                      ? <span style={{ background: 'rgba(58,181,217,0.2)', color: '#3AB5D9', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{outItems.length} out</span>
                      : <span style={{ background: 'rgba(255,255,255,0.07)', color: '#475569', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>All home</span>
                    }
                    {isExpanded ? <ChevronUp size={14} color="#64748b" /> : <ChevronDown size={14} color="#64748b" />}
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 13px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {propItems.length === 0 ? (
                        <div style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>No items logged for this property</div>
                      ) : propItems.map((item: any) => {
                        const sm = stageMeta(item.stage)
                        const atStart = STAGE_ORDER.indexOf(item.stage as any) === 0
                        const atEnd = item.stage === 'returned'
                        return (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ flex: 1, fontSize: 12, color: '#94a3b8', minWidth: 120 }}>{item.size} {item.type}</span>
                            {item.damaged && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20 }}>
                                <AlertTriangle size={10} /> Damaged
                              </span>
                            )}
                            {item.note && <span title={item.note} style={{ display: 'flex', alignItems: 'center' }}><FileText size={11} color="#475569" /></span>}
                            <span style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{sm.label}</span>
                            <span style={{ color: '#334155', fontSize: 10 }}>{timeAgo(item.since)}</span>
                            {!atStart && (
                              <button onClick={() => advanceItem.mutate({ id: item.id, stage: stagePrev(item.stage) })}
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <ChevronLeft size={13} />
                              </button>
                            )}
                            {!atEnd && (
                              <button onClick={() => advanceItem.mutate({ id: item.id, stage: stageNext(item.stage) })}
                                style={{ background: '#3AB5D9', border: 'none', color: '#000', padding: '0 10px', height: 26, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                {item.stage === 'ready' ? 'Returned' : 'Next'} <ArrowRight size={11} />
                              </button>
                            )}
                            {atEnd && <span style={{ color: '#334155', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}><Check size={12} /> Done</span>}
                            <button onClick={() => { if (confirm('Delete this item?')) deleteItem.mutate(item.id) }}
                              style={{ background: 'transparent', border: 'none', color: '#334155', cursor: 'pointer', padding: '3px' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {addingItem && (
        <AddItemModal
          properties={properties.filter((p: any) => p.linenClientId)}
          onClose={() => setAddingItem(false)}
          onAdd={() => { qc.invalidateQueries({ queryKey: ['items'] }); setAddingItem(false) }}
        />
      )}
      {addingClient && (
        <AddClientModal
          onClose={() => setAddingClient(false)}
          onAdd={() => { qc.invalidateQueries({ queryKey: ['clients'] }); setAddingClient(false) }}
        />
      )}
      {addingProperty && (
        <AddPropertyModal
          onClose={() => setAddingProperty(false)}
          onAdd={() => { qc.invalidateQueries({ queryKey: ['properties'] }); setAddingProperty(false) }}
        />
      )}
      {managingProps && (
        <ManagePropertiesModal
          client={managingProps}
          properties={properties}
          onClose={() => setManagingProps(null)}
          onSave={() => { qc.invalidateQueries({ queryKey: ['properties'] }); setManagingProps(null) }}
        />
      )}
    </div>
  )
}

// ── Modal sub-components ──────────────────────────────────────────────────────

const fieldStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  color: 'white', borderRadius: 8, padding: '9px 11px', width: '100%',
  fontSize: 13, fontFamily: 'system-ui', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 5, display: 'block',
}
const modalWrap: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50,
}
const modalBox: React.CSSProperties = {
  background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 16, width: '100%', padding: 22,
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
      <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
    </div>
  )
}

function SubmitButton({ onClick, disabled, label, loadingLabel }: { onClick: () => void; disabled: boolean; label: string; loadingLabel: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ marginTop: 18, width: '100%', background: '#3AB5D9', border: 'none', color: '#000', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: disabled ? 0.6 : 1 }}>
      {label}
    </button>
  )
}

function AddItemModal({ properties, onClose, onAdd }: { properties: any[]; onClose: () => void; onAdd: () => void }) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '')
  const [type, setType] = useState<string>(ITEM_TYPES[0])
  const [size, setSize] = useState<string>(SIZES[2])
  const [due, setDue] = useState('')
  const [note, setNote] = useState('')
  const [damaged, setDamaged] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!propertyId) return
    setLoading(true)
    try {
      await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, type, size, due: due || null, note, damaged }),
      }).then(r => { if (!r.ok) throw new Error('Failed') })
      onAdd()
    } catch (err: any) {
      alert('Failed to add item: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={modalWrap}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalBox, maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' }}>
        <ModalHeader title="Log a Removal" onClose={onClose} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <label style={labelStyle}>Property</label>
            {properties.length === 0
              ? <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>No properties assigned to a client. Assign properties first.</p>
              : <select value={propertyId} onChange={e => setPropertyId(e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>
                  {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            }
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Item</label>
              <select value={type} onChange={e => setType(e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>
                {ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Size</label>
              <select value={size} onChange={e => setSize(e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>
                {SIZES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Expected back by <span style={{ color: '#334155', fontWeight: 400 }}>(optional)</span></label>
            <input type="date" value={due} onChange={e => setDue(e.target.value)} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Notes <span style={{ color: '#334155', fontWeight: 400 }}>(optional)</span></label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="e.g. stain on corner" style={{ ...fieldStyle, resize: 'vertical' }} />
          </div>
          <button onClick={() => setDamaged(d => !d)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, background: damaged ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${damaged ? 'rgba(248,113,113,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, padding: '10px 11px', cursor: 'pointer', color: 'white' }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${damaged ? '#f87171' : '#334155'}`, background: damaged ? '#f87171' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {damaged && <Check size={12} color="#000" />}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: damaged ? '#f87171' : '#94a3b8' }}>Flag as damaged</span>
          </button>
        </div>
        <SubmitButton onClick={submit} disabled={loading || !propertyId} label="Add to Tracker" loadingLabel="Adding..." />
      </div>
    </div>
  )
}

function AddClientModal({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }).then(r => { if (!r.ok) throw new Error('Failed') })
      onAdd()
    } catch (err: any) {
      alert('Failed to create client: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={modalWrap}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalBox, maxWidth: 360 }}>
        <ModalHeader title="Add Client" onClose={onClose} />
        <label style={labelStyle}>Client / Company Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Coastal Properties"
          onKeyDown={e => e.key === 'Enter' && submit()} style={fieldStyle} />
        <SubmitButton onClick={submit} disabled={loading || !name.trim()} label="Create Client" loadingLabel="Creating..." />
      </div>
    </div>
  )
}

function AddPropertyModal({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }).then(r => { if (!r.ok) throw new Error('Failed') })
      onAdd()
    } catch (err: any) {
      alert('Failed to create property: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={modalWrap}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalBox, maxWidth: 360 }}>
        <ModalHeader title="Add Property" onClose={onClose} />
        <label style={labelStyle}>Property Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 12 Ocean Drive"
          onKeyDown={e => e.key === 'Enter' && submit()} style={fieldStyle} />
        <SubmitButton onClick={submit} disabled={loading || !name.trim()} label="Create Property" loadingLabel="Creating..." />
      </div>
    </div>
  )
}

function ManagePropertiesModal({ client, properties, onClose, onSave }: { client: any; properties: any[]; onClose: () => void; onSave: () => void }) {
  const [selected, setSelected] = useState<string[]>(
    properties.filter((p: any) => p.linenClientId === client.id).map((p: any) => p.id)
  )
  const [loading, setLoading] = useState(false)

  const toggle = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const save = async () => {
    setLoading(true)
    try {
      await fetch(`/api/clients/${client.id}/properties`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyIds: selected }),
      }).then(r => { if (!r.ok) throw new Error('Failed') })
      onSave()
    } catch (err: any) {
      alert('Failed to save properties: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={modalWrap}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalBox, maxWidth: 400, maxHeight: '80vh', overflowY: 'auto' }}>
        <ModalHeader title="Assign Properties" onClose={onClose} />
        <p style={{ color: '#475569', fontSize: 12, margin: '0 0 14px' }}>
          Properties assigned to <strong style={{ color: '#94a3b8' }}>{client.name}</strong> will appear on their shared linen link.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {properties.map((p: any) => {
            const isSelected = selected.includes(p.id)
            const takenByOther = p.linenClientId && p.linenClientId !== client.id
            return (
              <button key={p.id} onClick={() => !takenByOther && toggle(p.id)} disabled={takenByOther}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: isSelected ? 'rgba(58,181,217,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isSelected ? 'rgba(58,181,217,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, padding: '10px 12px', cursor: takenByOther ? 'not-allowed' : 'pointer', color: 'white', textAlign: 'left', opacity: takenByOther ? 0.4 : 1 }}>
                <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${isSelected ? '#3AB5D9' : '#334155'}`, background: isSelected ? '#3AB5D9' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isSelected && <Check size={12} color="#000" />}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                {takenByOther && <span style={{ fontSize: 10, color: '#475569', marginLeft: 'auto' }}>assigned elsewhere</span>}
              </button>
            )
          })}
        </div>
        <SubmitButton onClick={save} disabled={loading} label="Save" loadingLabel="Saving..." />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test the full management dashboard in the browser**

Open `http://localhost:3000` and verify:
1. "Add Property" creates a property — it appears in the unassigned notice
2. "Add Client" creates a client — it appears in the client list with a token URL
3. "Properties" button on a client opens the assign modal — select a property and save — property disappears from unassigned notice
4. "Log Removal" modal shows the assigned property — add an item — it appears under the property row
5. Expand property row — item shows with stage badge and Next button
6. Click Next — stage advances to Ready, then Returned
7. Click the back arrow — stage goes back
8. Delete an item — it disappears
9. Copy Link — copies the public URL to clipboard
10. Open the copied URL in a new tab — public page shows the property and item correctly

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: management dashboard with full CRUD UI"
```

---

## Task 11: Final polish and Vercel readiness

**Files:**
- Create: `next.config.js` (update)
- Create: `vercel.json` (if needed)

- [ ] **Step 1: Ensure `next.config.js` is minimal and correct**

Replace contents of `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {}
module.exports = nextConfig
```

- [ ] **Step 2: Run a production build locally to catch any type errors**

```bash
npm run build
```
Expected: build completes with no errors. Warnings about `params` types in route handlers are acceptable — errors are not.

Fix any TypeScript errors before proceeding.

- [ ] **Step 3: Verify `.gitignore` is complete**

Ensure `.gitignore` contains at minimum:
```
node_modules/
.next/
prisma/dev.db
prisma/dev.db-journal
.env
.env.local
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: production build verified, gitignore complete"
```

---

## Deployment to Vercel (when ready)

These steps are not part of the implementation — follow when ready to go live:

1. Push repo to GitHub
2. Create a free [Turso](https://turso.tech) database (SQLite-compatible, works on Vercel)
3. In Vercel project settings, add env var: `DATABASE_URL=libsql://your-db.turso.io?authToken=your-token`
4. In `prisma/schema.prisma`, change provider to `"turso"` and add `relationMode = "prisma"` — see [Prisma Turso docs](https://www.prisma.io/docs/guides/database/turso)
5. Run `npx prisma migrate deploy` against the Turso database
6. Deploy — Vercel will auto-build on push

Alternatively: use [Neon](https://neon.tech) free Postgres — change provider to `"postgresql"` and use the Neon connection string.
