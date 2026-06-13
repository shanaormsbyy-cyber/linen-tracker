'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ChevronDown, ChevronUp, AlertTriangle, FileText } from 'lucide-react'
import { stageMeta, timeAgo, STAGES } from '@/lib/utils'

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
  const [lastFetch, setLastFetch] = useState<Date>(new Date())

  const fetchData = () => {
    fetch(`/api/public/${token}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then(d => {
        if (!d) { setLoading(false); return }
        setData(d)
        setLastFetch(new Date())
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
      <div style={{ width: 32, height: 32, border: '2px solid rgba(58,181,217,0.3)', borderTopColor: '#3AB5D9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#08080c', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ textAlign: 'center', color: '#475569', fontSize: 14 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>404</div>
        <div>Not found</div>
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

  const sortedProperties = [...data.properties].sort((a, b) => {
    const aOut = a.items.filter(i => i.stage !== 'returned').length
    const bOut = b.items.filter(i => i.stage !== 'returned').length
    return bOut - aOut
  })

  return (
    <div style={{ background: '#08080c', minHeight: '100vh', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 48px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Linen Tracker</h1>
              <span style={{ color: '#64748b', fontSize: 13 }}>— {data.clientName}</span>
            </div>
          </div>
          <div style={{ background: 'rgba(58,181,217,0.12)', border: '1px solid rgba(58,181,217,0.3)', color: '#3AB5D9', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3AB5D9', display: 'inline-block' }} />
            Live
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {STAGES.map(s => (
            <span key={s.key} style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 20 }}>
              {counts[s.key as keyof typeof counts] ?? 0} {s.label}
            </span>
          ))}
        </div>

        {sortedProperties.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#475569', fontSize: 13, padding: '40px 0' }}>No properties to display.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sortedProperties.map(prop => {
              const outItems = prop.items.filter(i => i.stage !== 'returned')
              const hasOut = outItems.length > 0
              const isExpanded = expanded[prop.id]
              return (
                <div key={prop.id} style={{ background: hasOut ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${hasOut ? 'rgba(58,181,217,0.35)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, overflow: 'hidden' }}>
                  <button onClick={() => toggle(prop.id)} style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', color: 'white' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: hasOut ? '#3AB5D9' : '#334155', flexShrink: 0 }} />
                    <span style={{ flex: 1, textAlign: 'left', fontWeight: 600, fontSize: 14, color: hasOut ? 'white' : '#475569' }}>{prop.name}</span>
                    {hasOut
                      ? <span style={{ background: 'rgba(58,181,217,0.2)', color: '#3AB5D9', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{outItems.length} out</span>
                      : <span style={{ background: 'rgba(255,255,255,0.06)', color: '#475569', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>All home</span>
                    }
                    {isExpanded ? <ChevronUp size={13} color={hasOut ? '#3AB5D9' : '#334155'} /> : <ChevronDown size={13} color={hasOut ? '#64748b' : '#334155'} />}
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 13px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {prop.items.length === 0 ? (
                        <div style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: '6px 0' }}>No items logged</div>
                      ) : prop.items.map(item => {
                        const sm = stageMeta(item.stage)
                        return (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ flex: 1, fontSize: 12, color: '#94a3b8', minWidth: 120 }}>{item.size} {item.type}</span>
                            {item.damaged && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20 }}>
                                <AlertTriangle size={10} /> Damaged
                              </span>
                            )}
                            {item.note && <span title={item.note} style={{ display: 'flex', alignItems: 'center' }}><FileText size={11} color="#475569" /></span>}
                            <span style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{sm.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div style={{ textAlign: 'center', color: '#334155', fontSize: 11, marginTop: 32 }}>
          Managed by LCA Cleaning Services · Hamilton, NZ
        </div>
      </div>
    </div>
  )
}
