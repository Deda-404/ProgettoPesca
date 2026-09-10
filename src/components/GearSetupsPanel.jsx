import { useEffect, useMemo, useState } from 'react'
import { Link2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { deleteRemoteSetup, loadRemoteSetups, saveRemoteSetup } from '../lib/gearSetups'
import { loadLocalState, saveLocalState } from '../lib/storage'
import './GearSetupsPanel.css'

const EMPTY = { name: '', rodId: '', reelId: '', mainLineId: '', leaderId: '', notes: '' }

function gearTitle(item) {
  return [item.brand, item.model].filter(Boolean).join(' ') || item.specs || item.category || 'Elemento'
}

export default function GearSetupsPanel({ userId, gear, cloudEnabled }) {
  const [setups, setSetups] = useState(() => loadLocalState('xfish:gear-setups', []))
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!cloudEnabled || !userId) return
    loadRemoteSetups(userId).then(setSetups).catch(() => setStatus('Non riesco a sincronizzare le montature.'))
  }, [cloudEnabled, userId])

  useEffect(() => {
    if (!cloudEnabled) saveLocalState('xfish:gear-setups', setups)
  }, [cloudEnabled, setups])

  const gearById = useMemo(() => new Map(gear.map((item) => [item.id, item])), [gear])
  const choices = (category) => gear.filter((item) => item.category === category)

  function openNew() { setEditingId(null); setForm(EMPTY); setOpen(true) }
  function openEdit(item) { setEditingId(item.id); setForm({ name:item.name||'',rodId:item.rodId||'',reelId:item.reelId||'',mainLineId:item.mainLineId||'',leaderId:item.leaderId||'',notes:item.notes||'' }); setOpen(true) }
  function close() { if (!saving) setOpen(false) }
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  async function submit(event) {
    event.preventDefault()
    if (!form.name.trim()) return
    setSaving(true); setStatus('')
    try {
      let saved
      if (cloudEnabled) saved = await saveRemoteSetup(userId, { ...form, id: editingId })
      else {
        const now = new Date().toISOString()
        saved = { ...form, id: editingId || crypto.randomUUID(), createdAt: editingId ? setups.find((x)=>x.id===editingId)?.createdAt : now, updatedAt: now }
      }
      setSetups((current) => editingId ? current.map((x) => x.id === saved.id ? saved : x) : [saved, ...current])
      setOpen(false); setForm(EMPTY); setEditingId(null); setStatus('Montatura salvata.')
    } catch (error) { setStatus(error?.message || 'Impossibile salvare la montatura.') }
    finally { setSaving(false) }
  }

  async function remove(item) {
    if (!window.confirm(`Eliminare la montatura “${item.name}”?`)) return
    try {
      if (cloudEnabled) await deleteRemoteSetup(userId, item.id)
      setSetups((current) => current.filter((x) => x.id !== item.id))
      setStatus('Montatura eliminata.')
    } catch (error) { setStatus(error?.message || 'Impossibile eliminare la montatura.') }
  }

  const renderSelect = (label, key, category) => (
    <label>{label}<select value={form[key]} onChange={update(key)}><option value="">Non selezionato</option>{choices(category).map((item)=><option key={item.id} value={item.id}>{gearTitle(item)}</option>)}</select></label>
  )

  return <section className="section-block gear-setups-panel">
    <div className="section-title-row"><div><h2>Configurazioni / montature</h2><span className="muted-label">Canna, mulinello, lenza madre e terminale</span></div><button className="secondary-button" type="button" onClick={openNew}><Plus size={17}/> Nuova</button></div>
    {status && <div className="status-banner gear-setup-status">{status}</div>}
    {setups.length ? <div className="gear-setup-list">{setups.map((item)=><article key={item.id}><div><strong>{item.name}</strong><span>{[
      item.rodId && `Canna: ${gearTitle(gearById.get(item.rodId)||{})}`,
      item.reelId && `Mulinello: ${gearTitle(gearById.get(item.reelId)||{})}`,
      item.mainLineId && `Lenza: ${gearTitle(gearById.get(item.mainLineId)||{})}`,
      item.leaderId && `Terminale: ${gearTitle(gearById.get(item.leaderId)||{})}`,
    ].filter(Boolean).join(' · ') || 'Nessun componente selezionato'}</span>{item.notes&&<small>{item.notes}</small>}</div><div><button onClick={()=>openEdit(item)} aria-label="Modifica"><Pencil size={15}/></button><button onClick={()=>remove(item)} className="danger" aria-label="Elimina"><Trash2 size={15}/></button></div></article>)}</div> : <div className="gear-setup-empty"><Link2 size={24}/><span>Nessuna montatura salvata.</span></div>}
    {open && <div className="modal-backdrop" role="presentation" onMouseDown={close}><section className="catch-modal gear-modal" role="dialog" aria-modal="true" onMouseDown={(e)=>e.stopPropagation()}><div className="modal-header"><div><div className="eyebrow">Montature XFish</div><h2>{editingId?'Modifica montatura':'Nuova montatura'}</h2></div><button className="icon-button" type="button" onClick={close}><X/></button></div><form className="gear-form" onSubmit={submit}><label>Nome<input value={form.name} onChange={update('name')} required placeholder="es. Spinning scogliera"/></label>{renderSelect('Canna','rodId','canna')}{renderSelect('Mulinello','reelId','mulinello')}{renderSelect('Lenza madre','mainLineId','filo')}{renderSelect('Terminale','leaderId','terminale')}<label>Note<textarea rows="3" value={form.notes} onChange={update('notes')}/></label><button className="primary-button full-width" disabled={saving}>{saving?'Salvataggio…':'Salva montatura'}</button></form></section></div>}
  </section>
}
