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
