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
