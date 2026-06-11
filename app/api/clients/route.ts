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
