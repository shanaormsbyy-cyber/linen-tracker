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
