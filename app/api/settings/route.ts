import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const DEFAULT_ITEM_TYPES = 'Protector,Inner,Cushion,Throw,Pillow Protector'
const DEFAULT_SIZES = 'N/A,Single,Queen,King,Super King'

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
    itemTypes: s.itemTypes.split(',').map((v: string) => v.trim()).filter(Boolean),
    sizes: s.sizes.split(',').map((v: string) => v.trim()).filter(Boolean),
    returnedTotal: s.returnedTotal,
  })
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const current = await getOrCreate()

  const itemTypes = Array.isArray(body.itemTypes) ? body.itemTypes.join(',') : current.itemTypes
  const sizes = Array.isArray(body.sizes) ? body.sizes.join(',') : current.sizes
  const returnedTotal = typeof body.returnedTotal === 'number' ? body.returnedTotal : current.returnedTotal

  const updated = await prisma.settings.update({
    where: { id: 1 },
    data: { itemTypes, sizes, returnedTotal },
  })

  return NextResponse.json({
    itemTypes: updated.itemTypes.split(',').map((v: string) => v.trim()).filter(Boolean),
    sizes: updated.sizes.split(',').map((v: string) => v.trim()).filter(Boolean),
    returnedTotal: updated.returnedTotal,
  })
}
