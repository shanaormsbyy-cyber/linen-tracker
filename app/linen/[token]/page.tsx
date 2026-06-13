'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ChevronDown, ChevronUp, AlertTriangle, Droplets } from 'lucide-react'
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
    <div style={{ minHeight: '100vh', background: '#08080c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: '2.5px solid rgba(58,181,217,0.2)', borderTopColor: '#3AB5D9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#08080c', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ textAlign: 'center', color: '#475569', fontSize: 14 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>404</div>
        <div>Link not found or expired.</div>
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

  const sortedProperties = [...data.properties].sort((a, b) => {
    const aOut = a.items.filter(i => i.stage !== 'returned').length
    const bOut = b.items.filter(i => i.stage !== 'returned').length
    return bOut - aOut
  })

  return (
    <div style={{ background: '#08080c', minHeight: '100vh', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
      `}</style>

      {/* Hero header */}
      <div style={{ background: 'linear-gradient(160deg, #0d1520 0%, #08080c 60%)', borderBottom: '1px solid rgba(58,181,217,0.15)', padding: '28px 16px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: '#3AB5D9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Droplets size={20} color="#000" />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Linen Tracker</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{data.clientName}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(58,181,217,0.08)', border: '1px solid rgba(58,181,217,0.25)', color: '#3AB5D9', fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3AB5D9', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
              Live
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${damagedCount > 0 ? 4 : 3}, 1fr)`, gap: 10 }}>
            {STAGES.map(s => (
              <div key={s.key} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${s.border}`, borderRadius: 12, padding: '14px 12px' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: 'monospace', lineHeight: 1 }}>
                  {counts[s.key as keyof typeof counts] ?? 0}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: s.color, opacity: 0.8, marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {s.label}
                </div>
              </div>
            ))}
            {damagedCount > 0 && (
              <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 12, padding: '14px 12px' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#f87171', fontFamily: 'monospace', lineHeight: 1 }}>{damagedCount}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#f87171', opacity: 0.8, marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Damaged</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Property list */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 56px' }}>
        {totalOut === 0 && (
          <div style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 12, padding: '16px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>✓</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#34d399' }}>All linen returned</div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>Nothing is currently out for washing.</div>
            </div>
          </div>
        )}

        {sortedProperties.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#475569', fontSize: 13, padding: '40px 0' }}>No properties to display.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedProperties.map(prop => {
              const outItems = prop.items.filter(i => i.stage !== 'returned')
              const hasOut = outItems.length > 0
              const isExpanded = expanded[prop.id]

              // Group items by stage for display
              const byStage: Record<string, LinenItem[]> = {}
              prop.items.forEach(item => {
                if (!byStage[item.stage]) byStage[item.stage] = []
                byStage[item.stage].push(item)
              })

              return (
                <div key={prop.id} style={{
                  background: hasOut ? 'rgba(58,181,217,0.04)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${hasOut ? 'rgba(58,181,217,0.25)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 14,
                  overflow: 'hidden',
                }}>
                  <button onClick={() => toggle(prop.id)} style={{
                    width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', color: 'white',
                  }}>
                    {/* Status dot */}
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                      background: hasOut ? '#3AB5D9' : '#1e3a2f',
                      boxShadow: hasOut ? '0 0 8px rgba(58,181,217,0.5)' : 'none',
                    }} />

                    <span style={{ flex: 1, textAlign: 'left', fontWeight: 600, fontSize: 15, color: hasOut ? 'white' : '#475569' }}>
                      {prop.name}
                    </span>

                    {/* Stage mini-pills */}
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      {hasOut ? outItems.reduce((acc: Record<string, number>, i) => {
                        acc[i.stage] = (acc[i.stage] || 0) + 1; return acc
                      }, {} as Record<string, number>) && STAGES.filter(s => s.key !== 'returned' && byStage[s.key]?.length).map(s => (
                        <span key={s.key} style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                          {byStage[s.key].length} {s.label}
                        </span>
                      )) : (
                        <span style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                          All home
                        </span>
                      )}
                    </div>

                    {isExpanded
                      ? <ChevronUp size={15} color={hasOut ? '#3AB5D9' : '#334155'} />
                      : <ChevronDown size={15} color={hasOut ? '#64748b' : '#334155'} />
                    }
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {prop.items.length === 0 ? (
                        <div style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: '6px 0' }}>No items logged</div>
                      ) : STAGES.filter(s => byStage[s.key]?.length > 0).map(s => (
                        <div key={s.key}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
                            {s.label}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {byStage[s.key].map(item => (
                              <div key={item.id} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 11px',
                              }}>
                                <span style={{ flex: 1, fontSize: 13, color: '#cbd5e1', fontWeight: 500 }}>
                                  {item.size !== 'N/A' ? `${item.size} ` : ''}{item.type}
                                </span>
                                {item.damaged && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20 }}>
                                    <AlertTriangle size={10} /> Damaged
                                  </span>
                                )}
                                {item.note && (
                                  <span title={item.note} style={{ fontSize: 10, color: '#475569', fontStyle: 'italic', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.note}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div style={{ textAlign: 'center', color: '#1e293b', fontSize: 11, marginTop: 40 }}>
          Managed by LCA Cleaning Services · Hamilton, NZ
        </div>
      </div>
    </div>
  )
}
