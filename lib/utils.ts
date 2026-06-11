export const STAGES = [
  { key: 'washing',  label: 'Washing',  color: '#3AB5D9', bg: 'rgba(58,181,217,0.15)',  border: 'rgba(58,181,217,0.35)' },
  { key: 'ready',    label: 'Ready',    color: '#34d399', bg: 'rgba(52,211,153,0.15)',  border: 'rgba(52,211,153,0.35)' },
  { key: 'returned', label: 'Returned', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' },
] as const

export type StageKey = typeof STAGES[number]['key']

export const STAGE_ORDER: StageKey[] = ['washing', 'ready', 'returned']

export function stageMeta(key: string) {
  return STAGES.find(s => s.key === key) ?? STAGES[2]
}

export function stageNext(key: string): string {
  const i = STAGE_ORDER.indexOf(key as StageKey)
  return STAGE_ORDER[i + 1] ?? key
}

export function stagePrev(key: string): string {
  const i = STAGE_ORDER.indexOf(key as StageKey)
  return STAGE_ORDER[i - 1] ?? key
}

export function timeAgo(ts: string | Date): string {
  const ms = Date.now() - new Date(ts).getTime()
  if (!isFinite(ms)) return '—'
  const m = Math.round(ms / 60000)
  if (m < 2) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return d === 1 ? 'yesterday' : `${d}d ago`
}

export const ITEM_TYPES = ['Protector', 'Inner'] as const
export const SIZES = ['Single', 'Double', 'King', 'Super King'] as const
