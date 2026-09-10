import { useEffect, useState } from 'react'
import { Image as ImageIcon, X } from 'lucide-react'
import { loadLocalCatchPhoto } from '../lib/photos'
import './CatchPhoto.css'

export default function CatchPhoto({ item }) {
  const [localUrl, setLocalUrl] = useState('')
  const [failed, setFailed] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)

  useEffect(() => {
    let active = true
    let objectUrl = ''
    setFailed(false)

    if (!item?.photoLocalKey || item?.photoUrl) {
      setLocalUrl('')
      return undefined
    }

    loadLocalCatchPhoto(item.photoLocalKey)
      .then((blob) => {
        if (!active || !blob) {
          if (active) setFailed(true)
          return
        }
        objectUrl = URL.createObjectURL(blob)
        setLocalUrl(objectUrl)
      })
      .catch(() => {
        if (active) setFailed(true)
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [item?.photoLocalKey, item?.photoUrl])

  useEffect(() => {
    if (!viewerOpen) return undefined

    function closeOnEscape(event) {
      if (event.key === 'Escape') setViewerOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [viewerOpen])

  const src = item?.photoUrl || localUrl
  if (failed || (!src && item?.photoPath)) {
    return <div className="catch-photo-placeholder"><ImageIcon size={18} /> Foto non disponibile</div>
  }
  if (!src) return null

  const alt = `Cattura: ${item.species || 'pesce'}`

  return (
    <>
      <div className="catch-photo-wrap">
        <button
          className="catch-photo-open"
          type="button"
          onClick={() => setViewerOpen(true)}
          aria-label={`Apri foto completa: ${item.species || 'cattura'}`}
        >
          <img
            className="catch-photo"
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        </button>
      </div>

      {viewerOpen && (
        <div className="catch-photo-lightbox" role="presentation" onMouseDown={() => setViewerOpen(false)}>
          <div
            className="catch-photo-lightbox-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`Foto completa: ${item.species || 'cattura'}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="catch-photo-lightbox-close" type="button" onClick={() => setViewerOpen(false)} aria-label="Chiudi foto">
              <X size={22} />
            </button>
            <img src={src} alt={alt} onError={() => setFailed(true)} />
          </div>
        </div>
      )}
    </>
  )
}
