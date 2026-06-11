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
