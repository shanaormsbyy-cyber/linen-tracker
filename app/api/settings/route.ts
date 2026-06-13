import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const DEFAULT_ITEM_TYPES = 'Protector,Inner,Cushion,Throw,Pillow Protector'
const DEFAULT_SIZES = 'N/A,Single,Double,King,Super King'

async function getOrCreate() {
  const existing = await prisma.settings.findUnique({ where: { id: 1 } })
  if (existing) return existing
  return prisma.settings.create({
    data: { id: 1, itemTypes: DEFAULT_ITEM_TYPES, sizes: DEFAULT_SIZES },
  })
}

export async function GET() {
  const s = await getOrCreate()
  return NextResponse.json({
    itemTypes: s.itemTypes.split(',').map(v => v.trim()).filter(Boolean),
    sizes: s.sizes.split(',').map(v => v.trim()).filter(Boolean),
  })
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const current = await getOrCreate()

  const itemTypes = Array.isArray(body.itemTypes)
    ? body.itemTypes.join(',')
    : current.itemTypes
  const sizes = Array.isArray(body.sizes)
    ? body.sizes.join(',')
    : current.sizes

  const updated = await prisma.settings.update({
    where: { id: 1 },
    data: { itemTypes, sizes },
  })

  return NextResponse.json({
    itemTypes: updated.itemTypes.split(',').map(v => v.trim()).filter(Boolean),
    sizes: updated.sizes.split(',').map(v => v.trim()).filter(Boolean),
  })
}
