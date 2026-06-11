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
