'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, X, ChevronDown, ChevronUp, ArrowRight, ChevronLeft,
  Check, AlertTriangle, FileText, Copy, Link2, RefreshCw,
  Droplets, Trash2, Building2, Users, Settings
} from 'lucide-react'
import { STAGES, STAGE_ORDER, stageMeta, stageNext, stagePrev, timeAgo } from '@/lib/utils'

// ── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const qc = useQueryClient()

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [addingItem, setAddingItem] = useState(false)
  const [addingClient, setAddingClient] = useState(false)
  const [addingProperty, setAddingProperty] = useState(false)
  const [managingProps, setManagingProps] = useState<any>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['clients'],
    queryFn: () => apiFetch('/clients'),
  })
  const { data: items = [] } = useQuery<any[]>({
    queryKey: ['items'],
    queryFn: () => apiFetch('/items'),
  })
  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ['properties'],
    queryFn: () => apiFetch('/properties'),
  })
  const { data: settings } = useQuery<{ itemTypes: string[]; sizes: string[] }>({
    queryKey: ['settings'],
    queryFn: () => apiFetch('/settings'),
  })

  const itemTypes = settings?.itemTypes ?? ['Protector', 'Inner', 'Cushion', 'Throw', 'Pillow Protector']
  const sizes = settings?.sizes ?? ['Single', 'Double', 'King', 'Super King']

  const advanceItem = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      apiFetch(`/items/${id}`, { method: 'PATCH', body: JSON.stringify({ stage }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  })
  const deleteItem = useMutation({
    mutationFn: (id: string) => apiFetch(`/items/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  })
  const regenToken = useMutation({
    mutationFn: (id: string) => apiFetch(`/clients/${id}/regenerate-token`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
  const deleteProperty = useMutation({
    mutationFn: (id: string) => apiFetch(`/properties/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties'] })
      qc.invalidateQueries({ queryKey: ['items'] })
    },
  })

  const counts = useMemo(() => {
    const c: Record<string, number> = { washing: 0, ready: 0, returned: 0 }
    items.forEach((i: any) => { if (c[i.stage] !== undefined) c[i.stage]++ })
    return c
  }, [items])

  const damagedCount = useMemo(
    () => items.filter((i: any) => i.damaged && i.stage !== 'returned').length,
    [items]
  )

  const itemsByProperty = useMemo(() => {
    const m: Record<string, any[]> = {}
    items.forEach((i: any) => {
      if (!m[i.propertyId]) m[i.propertyId] = []
      m[i.propertyId].push(i)
    })
    return m
  }, [items])

  const assignedProperties = useMemo(() => {
    return [...properties.filter((p: any) => p.linenClientId)].sort((a: any, b: any) => {
      const aOut = (itemsByProperty[a.id] || []).filter((i: any) => i.stage !== 'returned').length
      const bOut = (itemsByProperty[b.id] || []).filter((i: any) => i.stage !== 'returned').length
      return bOut - aOut
    })
  }, [properties, itemsByProperty])

  const unassignedProperties = properties.filter((p: any) => !p.linenClientId)

  const copyLink = (token: string, clientId: string) => {
    const url = `${window.location.origin}/linen/${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(clientId)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const toggleExpand = (id: string) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  return (
    <div style={{ background: '#08080c', minHeight: '100vh', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 48px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#3AB5D9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Droplets size={18} color="#000" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Linen Tracker</h1>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b', marginTop: 2 }}>LCA Cleaning Services</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setShowSettings(true)}
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', borderRadius: 8, padding: '8px 11px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Settings size={14} />
            </button>
            <button onClick={() => setAddingProperty(true)}
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', borderRadius: 8, padding: '8px 13px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={14} /> Add Property
            </button>
            <button onClick={() => setAddingClient(true)}
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', borderRadius: 8, padding: '8px 13px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={14} /> Add Client
            </button>
            <button onClick={() => setAddingItem(true)}
              style={{ background: '#3AB5D9', border: 'none', color: '#000', borderRadius: 8, padding: '8px 13px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> Log Removal
            </button>
          </div>
        </div>

        {/* Stage pill counts */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {STAGES.map(s => (
            <div key={s.key} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: s.color, fontWeight: 700, fontSize: 20, fontFamily: 'monospace' }}>{counts[s.key] ?? 0}</span>
              <span style={{ color: s.color, fontWeight: 600, fontSize: 12 }}>{s.label}</span>
            </div>
          ))}
          {damagedCount > 0 && (
            <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#f87171', fontWeight: 700, fontSize: 20, fontFamily: 'monospace' }}>{damagedCount}</span>
              <span style={{ color: '#f87171', fontWeight: 600, fontSize: 12 }}>Damaged</span>
            </div>
          )}
        </div>

        {/* Client list with shareable links */}
        {clients.length > 0 && (
          <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {clients.map((c: any) => (
              <div key={c.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Link2 size={14} color="#3AB5D9" />
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 120 }}>{c.name}</span>
                <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', flex: 2, minWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {typeof window !== 'undefined' ? window.location.origin : ''}/linen/{c.token}
                </span>
                <button onClick={() => setManagingProps(c)}
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Building2 size={12} /> Properties
                </button>
                <button onClick={() => copyLink(c.token, c.id)}
                  style={{ background: copied === c.id ? 'rgba(52,211,153,0.15)' : 'rgba(58,181,217,0.15)', border: `1px solid ${copied === c.id ? 'rgba(52,211,153,0.3)' : 'rgba(58,181,217,0.3)'}`, color: copied === c.id ? '#34d399' : '#3AB5D9', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {copied === c.id ? <Check size={12} /> : <Copy size={12} />}
                  {copied === c.id ? 'Copied' : 'Copy Link'}
                </button>
                <button onClick={() => { if (confirm('Regenerate token? This will break the existing shared link.')) regenToken.mutate(c.id) }}
                  style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '5px 8px' }}>
                  <RefreshCw size={12} /> Revoke
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Unassigned properties notice */}
        {unassignedProperties.length > 0 && (
          <div style={{ marginBottom: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>{unassignedProperties.length} unassigned {unassignedProperties.length === 1 ? 'property' : 'properties'}:</span>{' '}
              {unassignedProperties.map((p: any) => p.name).join(', ')}
              {clients.length > 0 && ' — assign via a client\'s Properties button above.'}
            </p>
          </div>
        )}

        {/* Property list */}
        {assignedProperties.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#475569', fontSize: 13, padding: '40px 0' }}>
            {clients.length === 0
              ? 'Add a client and assign properties to get started.'
              : 'No properties assigned to a client yet. Use the Properties button on a client above.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {assignedProperties.map((p: any) => {
              const propItems = itemsByProperty[p.id] || []
              const outItems = propItems.filter((i: any) => i.stage !== 'returned')
              const isExpanded = expanded[p.id]
              const borderCol = outItems.length > 0 ? 'rgba(58,181,217,0.35)' : 'rgba(255,255,255,0.06)'
              const bgCol = outItems.length > 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)'

              return (
                <div key={p.id} style={{ background: bgCol, border: `1px solid ${borderCol}`, borderRadius: 10, overflow: 'hidden' }}>
                  <button onClick={() => toggleExpand(p.id)}
                    style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', color: 'white' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: outItems.length > 0 ? '#3AB5D9' : '#334155', flexShrink: 0 }} />
                    <span style={{ flex: 1, textAlign: 'left', fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                    {outItems.length > 0
                      ? <span style={{ background: 'rgba(58,181,217,0.2)', color: '#3AB5D9', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{outItems.length} out</span>
                      : <span style={{ background: 'rgba(255,255,255,0.07)', color: '#475569', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>All home</span>
                    }
                    {isExpanded ? <ChevronUp size={14} color="#64748b" /> : <ChevronDown size={14} color="#64748b" />}
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 13px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {propItems.length === 0 ? (
                        <div style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>No items logged for this property</div>
                      ) : propItems.map((item: any) => {
                        const sm = stageMeta(item.stage)
                        const atStart = STAGE_ORDER.indexOf(item.stage as any) === 0
                        const atEnd = item.stage === 'returned'
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
                            <span style={{ color: '#334155', fontSize: 10 }}>{timeAgo(item.since)}</span>
                            {!atStart && (
                              <button onClick={() => advanceItem.mutate({ id: item.id, stage: stagePrev(item.stage) })}
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <ChevronLeft size={13} />
                              </button>
                            )}
                            {!atEnd && (
                              <button onClick={() => advanceItem.mutate({ id: item.id, stage: stageNext(item.stage) })}
                                style={{ background: '#3AB5D9', border: 'none', color: '#000', padding: '0 10px', height: 26, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                {item.stage === 'ready' ? 'Returned' : 'Next'} <ArrowRight size={11} />
                              </button>
                            )}
                            {atEnd && <span style={{ color: '#334155', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}><Check size={12} /> Done</span>}
                            <button onClick={() => { if (confirm('Delete this item?')) deleteItem.mutate(item.id) }}
                              style={{ background: 'transparent', border: 'none', color: '#334155', cursor: 'pointer', padding: '3px' }}>
                              <Trash2 size={12} />
                            </button>
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
      </div>

      {addingItem && (
        <AddItemModal
          properties={properties.filter((p: any) => p.linenClientId)}
          itemTypes={itemTypes}
          sizes={sizes}
          onClose={() => setAddingItem(false)}
          onAdd={() => { qc.invalidateQueries({ queryKey: ['items'] }); setAddingItem(false) }}
        />
      )}
      {addingClient && (
        <AddClientModal
          onClose={() => setAddingClient(false)}
          onAdd={() => { qc.invalidateQueries({ queryKey: ['clients'] }); setAddingClient(false) }}
        />
      )}
      {addingProperty && (
        <AddPropertyModal
          onClose={() => setAddingProperty(false)}
          onAdd={() => { qc.invalidateQueries({ queryKey: ['properties'] }); setAddingProperty(false) }}
        />
      )}
      {managingProps && (
        <ManagePropertiesModal
          client={managingProps}
          properties={properties}
          onClose={() => setManagingProps(null)}
          onSave={() => { qc.invalidateQueries({ queryKey: ['properties'] }); setManagingProps(null) }}
        />
      )}
      {showSettings && (
        <SettingsModal
          initialItemTypes={itemTypes}
          initialSizes={sizes}
          onClose={() => setShowSettings(false)}
          onSave={() => { qc.invalidateQueries({ queryKey: ['settings'] }); setShowSettings(false) }}
        />
      )}
    </div>
  )
}

// ── Modal sub-components ──────────────────────────────────────────────────────

const fieldStyle: React.CSSProperties = {
  background: '#1e2130', border: '1px solid rgba(255,255,255,0.1)',
  color: 'white', borderRadius: 8, padding: '9px 11px', width: '100%',
  fontSize: 13, fontFamily: 'system-ui', boxSizing: 'border-box',
  colorScheme: 'dark',
}
const optionStyle: React.CSSProperties = { background: '#1e2130', color: 'white' }
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 5, display: 'block',
}
const modalWrap: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50,
}
const modalBox: React.CSSProperties = {
  background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 16, width: '100%', padding: 22,
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
      <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
    </div>
  )
}

function SubmitButton({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ marginTop: 18, width: '100%', background: '#3AB5D9', border: 'none', color: '#000', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: disabled ? 0.6 : 1 }}>
      {label}
    </button>
  )
}

function AddItemModal({ properties, itemTypes, sizes, onClose, onAdd }: {
  properties: any[]; itemTypes: string[]; sizes: string[]; onClose: () => void; onAdd: () => void
}) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '')
  const [type, setType] = useState<string>(itemTypes[0] ?? '')
  const [size, setSize] = useState<string>(sizes[2] ?? sizes[0] ?? '')
  const [qty, setQty] = useState(1)
  const [due, setDue] = useState('')
  const [note, setNote] = useState('')
  const [damaged, setDamaged] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!propertyId) return
    setLoading(true)
    try {
      const count = Math.max(1, Math.min(qty, 50))
      await Promise.all(Array.from({ length: count }, () =>
        fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertyId, type, size, due: (due && due !== 'na') ? due : null, note, damaged }),
        }).then(r => { if (!r.ok) throw new Error('Failed') })
      ))
      onAdd()
    } catch (err: any) {
      alert('Failed to add item: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={modalWrap}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalBox, maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' }}>
        <ModalHeader title="Log a Removal" onClose={onClose} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <label style={labelStyle}>Property</label>
            {properties.length === 0
              ? <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>No properties assigned to a client. Assign properties first.</p>
              : <select value={propertyId} onChange={e => setPropertyId(e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>
                  {properties.map((p: any) => <option key={p.id} value={p.id} style={optionStyle}>{p.name}</option>)}
                </select>
            }
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Item</label>
              <select value={type} onChange={e => setType(e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>
                {itemTypes.map(t => <option key={t} style={optionStyle}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Size</label>
              <select value={size} onChange={e => setSize(e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>
                {sizes.map(s => <option key={s} style={optionStyle}>{s}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Qty</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => setQty(q => Math.max(1, q - 1))}
                  style={{ ...fieldStyle, width: 30, padding: '9px 0', textAlign: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 16, lineHeight: 1 }}>−</button>
                <input
                  type="number" min={1} max={50} value={qty}
                  onChange={e => setQty(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  style={{ ...fieldStyle, textAlign: 'center', padding: '9px 4px', minWidth: 0 }}
                />
                <button onClick={() => setQty(q => Math.min(50, q + 1))}
                  style={{ ...fieldStyle, width: 30, padding: '9px 0', textAlign: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 16, lineHeight: 1 }}>+</button>
              </div>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Expected back by <span style={{ color: '#334155', fontWeight: 400 }}>(optional)</span></label>
              <button onClick={() => setDue(due === 'na' ? '' : 'na')}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                <span style={{ width: 15, height: 15, borderRadius: 4, border: `1.5px solid ${due === 'na' ? '#3AB5D9' : '#334155'}`, background: due === 'na' ? '#3AB5D9' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {due === 'na' && <Check size={10} color="#000" />}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: due === 'na' ? '#3AB5D9' : '#475569' }}>N/A</span>
              </button>
            </div>
            {due !== 'na' && <input type="date" value={due} onChange={e => setDue(e.target.value)} style={fieldStyle} />}
          </div>
          <div>
            <label style={labelStyle}>Notes <span style={{ color: '#334155', fontWeight: 400 }}>(optional)</span></label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="e.g. stain on corner" style={{ ...fieldStyle, resize: 'vertical' }} />
          </div>
          <button onClick={() => setDamaged(d => !d)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, background: damaged ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${damaged ? 'rgba(248,113,113,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, padding: '10px 11px', cursor: 'pointer', color: 'white' }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${damaged ? '#f87171' : '#334155'}`, background: damaged ? '#f87171' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {damaged && <Check size={12} color="#000" />}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: damaged ? '#f87171' : '#94a3b8' }}>Flag as damaged</span>
          </button>
        </div>
        <SubmitButton onClick={submit} disabled={loading || !propertyId} label={loading ? 'Adding...' : qty > 1 ? `Add ${qty} to Tracker` : 'Add to Tracker'} />
      </div>
    </div>
  )
}

function AddClientModal({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }).then(r => { if (!r.ok) throw new Error('Failed') })
      onAdd()
    } catch (err: any) {
      alert('Failed to create client: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={modalWrap}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalBox, maxWidth: 360 }}>
        <ModalHeader title="Add Client" onClose={onClose} />
        <label style={labelStyle}>Client / Company Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Coastal Properties"
          onKeyDown={e => e.key === 'Enter' && submit()} style={fieldStyle} />
        <SubmitButton onClick={submit} disabled={loading || !name.trim()} label={loading ? 'Creating...' : 'Create Client'} />
      </div>
    </div>
  )
}

function AddPropertyModal({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }).then(r => { if (!r.ok) throw new Error('Failed') })
      onAdd()
    } catch (err: any) {
      alert('Failed to create property: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={modalWrap}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalBox, maxWidth: 360 }}>
        <ModalHeader title="Add Property" onClose={onClose} />
        <label style={labelStyle}>Property Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 12 Ocean Drive"
          onKeyDown={e => e.key === 'Enter' && submit()} style={fieldStyle} />
        <SubmitButton onClick={submit} disabled={loading || !name.trim()} label={loading ? 'Creating...' : 'Create Property'} />
      </div>
    </div>
  )
}

function ManagePropertiesModal({ client, properties, onClose, onSave }: { client: any; properties: any[]; onClose: () => void; onSave: () => void }) {
  const [selected, setSelected] = useState<string[]>(
    properties.filter((p: any) => p.linenClientId === client.id).map((p: any) => p.id)
  )
  const [loading, setLoading] = useState(false)

  const toggle = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const save = async () => {
    setLoading(true)
    try {
      await fetch(`/api/clients/${client.id}/properties`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyIds: selected }),
      }).then(r => { if (!r.ok) throw new Error('Failed') })
      onSave()
    } catch (err: any) {
      alert('Failed to save properties: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={modalWrap}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalBox, maxWidth: 400, maxHeight: '80vh', overflowY: 'auto' }}>
        <ModalHeader title="Assign Properties" onClose={onClose} />
        <p style={{ color: '#475569', fontSize: 12, margin: '0 0 14px' }}>
          Properties assigned to <strong style={{ color: '#94a3b8' }}>{client.name}</strong> will appear on their shared linen link.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {properties.map((p: any) => {
            const isSelected = selected.includes(p.id)
            const takenByOther = p.linenClientId && p.linenClientId !== client.id
            return (
              <button key={p.id} onClick={() => !takenByOther && toggle(p.id)} disabled={takenByOther}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: isSelected ? 'rgba(58,181,217,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isSelected ? 'rgba(58,181,217,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, padding: '10px 12px', cursor: takenByOther ? 'not-allowed' : 'pointer', color: 'white', textAlign: 'left', opacity: takenByOther ? 0.4 : 1 }}>
                <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${isSelected ? '#3AB5D9' : '#334155'}`, background: isSelected ? '#3AB5D9' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isSelected && <Check size={12} color="#000" />}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                {takenByOther && <span style={{ fontSize: 10, color: '#475569', marginLeft: 'auto' }}>assigned elsewhere</span>}
              </button>
            )
          })}
        </div>
        <SubmitButton onClick={save} disabled={loading} label={loading ? 'Saving...' : 'Save'} />
      </div>
    </div>
  )
}

function TagList({ items, onRemove }: { items: string[]; onRemove: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {items.map(v => (
        <span key={v} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(58,181,217,0.12)', border: '1px solid rgba(58,181,217,0.25)', color: '#3AB5D9', borderRadius: 6, padding: '4px 9px', fontSize: 12, fontWeight: 600 }}>
          {v}
          <button onClick={() => onRemove(v)} style={{ background: 'transparent', border: 'none', color: '#3AB5D9', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex' }}>
            <X size={11} />
          </button>
        </span>
      ))}
    </div>
  )
}

function SettingsModal({ initialItemTypes, initialSizes, onClose, onSave }: {
  initialItemTypes: string[]; initialSizes: string[]; onClose: () => void; onSave: () => void
}) {
  const [itemTypes, setItemTypes] = useState<string[]>(initialItemTypes)
  const [sizes, setSizes] = useState<string[]>(initialSizes)
  const [newType, setNewType] = useState('')
  const [newSize, setNewSize] = useState('')
  const [loading, setLoading] = useState(false)

  const addType = () => {
    const v = newType.trim()
    if (v && !itemTypes.includes(v)) setItemTypes(t => [...t, v])
    setNewType('')
  }
  const addSize = () => {
    const v = newSize.trim()
    if (v && !sizes.includes(v)) setSizes(s => [...s, v])
    setNewSize('')
  }

  const save = async () => {
    setLoading(true)
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemTypes, sizes }),
      }).then(r => { if (!r.ok) throw new Error('Failed') })
      onSave()
    } catch (err: any) {
      alert('Failed to save settings: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={modalWrap}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalBox, maxWidth: 420, maxHeight: '85vh', overflowY: 'auto' }}>
        <ModalHeader title="Settings" onClose={onClose} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Item types */}
          <div>
            <label style={labelStyle}>Item Types</label>
            <TagList items={itemTypes} onRemove={v => setItemTypes(t => t.filter(x => x !== v))} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                value={newType}
                onChange={e => setNewType(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addType()}
                placeholder="e.g. Duvet"
                style={{ ...fieldStyle, flex: 1 }}
              />
              <button onClick={addType} disabled={!newType.trim()}
                style={{ background: '#3AB5D9', border: 'none', color: '#000', borderRadius: 8, padding: '0 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: !newType.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                Add
              </button>
            </div>
          </div>

          {/* Sizes */}
          <div>
            <label style={labelStyle}>Sizes</label>
            <TagList items={sizes} onRemove={v => setSizes(s => s.filter(x => x !== v))} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                value={newSize}
                onChange={e => setNewSize(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSize()}
                placeholder="e.g. Queen"
                style={{ ...fieldStyle, flex: 1 }}
              />
              <button onClick={addSize} disabled={!newSize.trim()}
                style={{ background: '#3AB5D9', border: 'none', color: '#000', borderRadius: 8, padding: '0 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: !newSize.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                Add
              </button>
            </div>
          </div>
        </div>

        <SubmitButton onClick={save} disabled={loading} label={loading ? 'Saving...' : 'Save Settings'} />
      </div>
    </div>
  )
}
