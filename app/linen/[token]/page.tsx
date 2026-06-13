'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { stageMeta, STAGES } from '@/lib/utils'

interface LinenItem {
  id: string
  type: string
  size: string
  stage: string
  since: string
  damaged: boolean
  note: string | null
}

interface LinenProperty {
  id: string
  name: string
  items: LinenItem[]
}

interface PublicData {
  clientName: string
  properties: LinenProperty[]
}

export default function PublicLinenPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<PublicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const fetchData = () => {
    fetch(`/api/public/${token}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then(d => {
        if (!d) { setLoading(false); return }
        setData(d)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [token])

  const toggle = (id: string) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#05070d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 40, height: 40, border: '2px solid rgba(58,181,217,0.15)', borderTopColor: '#3AB5D9', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
        <span style={{ color: '#334155', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading</span>
      </div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#05070d', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ textAlign: 'center', color: '#334155' }}>
        <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-0.04em', color: '#1e293b' }}>404</div>
        <div style={{ fontSize: 14, marginTop: 8 }}>This link is invalid or has expired.</div>
      </div>
    </div>
  )

  if (!data) return null

  const allItems = data.properties.flatMap(p => p.items)
  const counts = {
    washing: allItems.filter(i => i.stage === 'washing').length,
    ready: allItems.filter(i => i.stage === 'ready').length,
    returned: allItems.filter(i => i.stage === 'returned').length,
  }
  const totalOut = counts.washing + counts.ready
  const damagedCount = allItems.filter(i => i.damaged && i.stage !== 'returned').length
  const totalItems = allItems.length

  const sortedProperties = [...data.properties].sort((a, b) => {
    const aOut = a.items.filter(i => i.stage !== 'returned').length
    const bOut = b.items.filter(i => i.stage !== 'returned').length
    return bOut - aOut
  })

  const stageConfig = {
    washing: { label: 'At Laundry', color: '#3AB5D9', bg: 'rgba(58,181,217,0.08)', border: 'rgba(58,181,217,0.2)', glow: 'rgba(58,181,217,0.15)' },
    ready:   { label: 'Ready',      color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)', glow: 'rgba(52,211,153,0.15)' },
    returned:{ label: 'Returned',   color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.15)', glow: 'transparent' },
  } as const

  return (
    <div style={{ background: '#05070d', minHeight: '100vh', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes pulse   { 0%,100% { opacity:1 } 50% { opacity:0.35 } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      {/* Top gradient band */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #3AB5D9, #34d399, #3AB5D9)', backgroundSize: '200% 100%' }} />

      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg, rgba(58,181,217,0.07) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '32px 20px 28px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#3AB5D9', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>LCA Cleaning Services</div>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>Linen Status</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 2.5s ease-in-out infinite' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#34d399' }}>Live</span>
              </div>
              <div style={{ fontSize: 11, color: '#334155' }}>{data.clientName}</div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {(['washing', 'ready', 'returned'] as const).map(key => {
              const cfg = stageConfig[key]
              const count = counts[key]
              return (
                <div key={key} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 14, padding: '16px 14px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: cfg.glow, filter: 'blur(20px)', pointerEvents: 'none' }} />
                  <div style={{ fontSize: 36, fontWeight: 800, color: cfg.color, lineHeight: 1, letterSpacing: '-0.03em' }}>{count}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: cfg.color, opacity: 0.7, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cfg.label}</div>
                </div>
              )
            })}
          </div>

          {damagedCount > 0 && (
            <div style={{ marginTop: 10, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={15} color="#f87171" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#f87171' }}>{damagedCount} damaged item{damagedCount !== 1 ? 's' : ''} require attention</span>
            </div>
          )}
        </div>
      </div>

      {/* Properties */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 20px 64px', animation: 'fadeIn 0.4s ease' }}>

        {totalOut === 0 && totalItems > 0 && (
          <div style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 14, padding: '18px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle2 size={18} color="#34d399" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#34d399' }}>All linen is home</div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>Nothing is currently out for washing.</div>
            </div>
          </div>
        )}

        {sortedProperties.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#334155', fontSize: 13, padding: '60px 0' }}>No properties to display.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedProperties.map(prop => {
              const outItems = prop.items.filter(i => i.stage !== 'returned')
              const hasOut = outItems.length > 0
              const isExpanded = expanded[prop.id]

              const byStage: Record<string, LinenItem[]> = {}
              prop.items.forEach(item => {
                if (!byStage[item.stage]) byStage[item.stage] = []
                byStage[item.stage].push(item)
              })

              const stagesWithItems = (['washing', 'ready', 'returned'] as const).filter(s => byStage[s]?.length > 0)

              return (
                <div key={prop.id} style={{
                  background: hasOut ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)',
                  border: `1px solid ${hasOut ? 'rgba(58,181,217,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 14,
                  overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}>
                  <button
                    onClick={() => toggle(prop.id)}
                    style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', color: 'white', textAlign: 'left' }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: hasOut ? 'rgba(58,181,217,0.12)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${hasOut ? 'rgba(58,181,217,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 14 }}>🏠</span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: hasOut ? 'white' : '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {prop.name}
                      </div>
                      {hasOut && (
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                          {outItems.length} item{outItems.length !== 1 ? 's' : ''} out
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                      {hasOut ? (
                        stagesWithItems.filter(s => s !== 'returned').map(s => {
                          const cfg = stageConfig[s]
                          return (
                            <span key={s} style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>
                              {byStage[s].length} {cfg.label}
                            </span>
                          )
                        })
                      ) : (
                        <span style={{ background: 'rgba(52,211,153,0.08)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20 }}>
                          All home
                        </span>
                      )}
                      <div style={{ color: '#334155', marginLeft: 4 }}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '14px 18px 16px' }}>
                      {prop.items.length === 0 ? (
                        <div style={{ color: '#334155', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>No items logged for this property.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {stagesWithItems.map(stageKey => {
                            const cfg = stageConfig[stageKey]
                            return (
                              <div key={stageKey}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                                  <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    {cfg.label}
                                  </span>
                                  <span style={{ fontSize: 10, color: '#334155', fontWeight: 600 }}>({byStage[stageKey].length})</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {byStage[stageKey].map(item => (
                                    <div key={item.id} style={{
                                      display: 'flex', alignItems: 'center', gap: 10,
                                      background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)',
                                      borderRadius: 9, padding: '9px 13px',
                                    }}>
                                      <span style={{ flex: 1, fontSize: 13, color: '#cbd5e1', fontWeight: 500 }}>
                                        {item.size !== 'N/A' ? `${item.size} ` : ''}{item.type}
                                      </span>
                                      {item.note && (
                                        <span style={{ fontSize: 11, color: '#475569', fontStyle: 'italic', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {item.note}
                                        </span>
                                      )}
                                      {item.damaged && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
                                          <AlertTriangle size={9} /> Damaged
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
