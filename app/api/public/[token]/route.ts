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

  const settings = await prisma.settings.findUnique({ where: { id: 1 } })
  const returnedTotal = settings?.returnedTotal ?? 0

  return NextResponse.json({
    clientName: client.name,
    returnedTotal,
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
