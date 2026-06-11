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
