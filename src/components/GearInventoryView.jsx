import { useMemo, useState } from 'react'
import { Backpack, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import './GearInventoryView.css'

const CATEGORIES = [
  ['canna', 'Canna'],
  ['mulinello', 'Mulinello'],
  ['filo', 'Filo / trecciato'],
  ['artificiale', 'Esca / artificiale'],
  ['terminale', 'Terminale'],
  ['accessorio', 'Accessorio'],
  ['abbigliamento', 'Abbigliamento'],
  ['altro', 'Altro'],
]

const EMPTY_FORM = {
  category: 'canna',
  brand: '',
  model: '',
  specs: '',
  notes: '',
}

function categoryLabel(value) {
  return CATEGORIES.find(([id]) => id === value)?.[1] || value || 'Altro'
}

export default function GearInventoryView({
  gear,
  cloudEnabled,
  status,
  saving,
  onSave,
  onDelete,
}) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('tutti')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return gear.filter((item) => {
      const categoryMatch = filter === 'tutti' || item.category === filter
      const text = [item.brand, item.model, item.specs, item.notes, categoryLabel(item.category)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return categoryMatch && (!term || text.includes(term))
    })
  }, [gear, search, filter])

  const counts = useMemo(() => {
    const result = new Map()
    gear.forEach((item) => result.set(item.category, (result.get(item.category) || 0) + 1))
    return result
  }, [gear])

  function openNew() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setEditorOpen(true)
  }

  function openEdit(item) {
    setEditingId(item.id)
    setForm({
      category: item.category || 'altro',
      brand: item.brand || '',
      model: item.model || '',
      specs: item.specs || '',
      notes: item.notes || '',
    })
    setEditorOpen(true)
  }

  function closeEditor() {
    if (saving) return
    setEditorOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  async function submit(event) {
    event.preventDefault()
    if (saving) return
    const saved = await onSave({ ...form, id: editingId })
    if (saved !== false) closeEditor()
  }

  return (
    <>
      <section className="page-intro compact">
        <div>
          <div className="eyebrow">Inventario personale</div>
          <h1>Attrezzatura</h1>
          <p>
            Organizza canne, mulinelli, fili, artificiali e accessori.
            {cloudEnabled ? ' L’inventario è sincronizzato con il tuo account XFish.' : ' In modalità ospite resta su questo dispositivo.'}
          </p>
        </div>
        <button className="primary-button" type="button" onClick={openNew}><Plus size={18} /> Aggiungi</button>
      </section>

      {status && <div className="status-banner">{status}</div>}

      <section className="gear-tools">
        <label className="gear-search">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cerca marca, modello, note…" />
        </label>

        <div className="gear-filters" aria-label="Filtra attrezzatura">
          <button type="button" className={filter === 'tutti' ? 'active' : ''} onClick={() => setFilter('tutti')}>Tutto <span>{gear.length}</span></button>
          {CATEGORIES.map(([id, label]) => (
            <button key={id} type="button" className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>
              {label} <span>{counts.get(id) || 0}</span>
            </button>
          ))}
        </div>
      </section>

      {gear.length === 0 ? (
        <section className="section-block empty-state">
          <Backpack size={34} />
          <h2>Inventario vuoto</h2>
          <p>Aggiungi la prima canna, il mulinello o un artificiale. Non servono foto né upload, quindi questa sezione consuma pochissime risorse cloud.</p>
        </section>
      ) : filtered.length === 0 ? (
        <section className="section-block gear-no-results">Nessun elemento corrisponde ai filtri selezionati.</section>
      ) : (
        <section className="gear-grid">
          {filtered.map((item) => (
            <article className="gear-card" key={item.id}>
              <div className="gear-card-head">
                <div>
                  <span className="gear-category">{categoryLabel(item.category)}</span>
                  <h2>{[item.brand, item.model].filter(Boolean).join(' ') || categoryLabel(item.category)}</h2>
                </div>
                <div className="gear-card-actions">
                  <button type="button" onClick={() => openEdit(item)} aria-label="Modifica"><Pencil size={16} /></button>
                  <button type="button" className="danger" onClick={() => onDelete(item)} aria-label="Elimina"><Trash2 size={16} /></button>
                </div>
              </div>
              {item.specs && <p className="gear-specs">{item.specs}</p>}
              {item.notes && <small>{item.notes}</small>}
            </article>
          ))}
        </section>
      )}

      {editorOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeEditor}>
          <section className="catch-modal gear-modal" role="dialog" aria-modal="true" aria-labelledby="gear-editor-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><div className="eyebrow">Inventario XFish</div><h2 id="gear-editor-title">{editingId ? 'Modifica attrezzatura' : 'Nuova attrezzatura'}</h2></div>
              <button className="icon-button" type="button" onClick={closeEditor} aria-label="Chiudi"><X /></button>
            </div>

            <form className="gear-form" onSubmit={submit}>
              <label>Categoria
                <select value={form.category} onChange={update('category')}>
                  {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <div className="form-two-columns">
                <label>Marca<input value={form.brand} onChange={update('brand')} placeholder="es. Shimano" /></label>
                <label>Modello<input value={form.model} onChange={update('model')} placeholder="es. Catana" /></label>
              </div>
              <label>Specifiche<input value={form.specs} onChange={update('specs')} placeholder="es. 2,40 m · 12–45 g" /></label>
              <label>Note<textarea rows="4" value={form.notes} onChange={update('notes')} placeholder="Montaggio, utilizzo, manutenzione…" /></label>
              <button className="primary-button full-width" type="submit" disabled={saving}>
                {saving ? 'Salvataggio…' : editingId ? 'Salva modifiche' : 'Aggiungi all’inventario'}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
