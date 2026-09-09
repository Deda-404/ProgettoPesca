import { useEffect, useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import { loadLocalCatchPhoto } from '../lib/photos'
import './CatchPhoto.css'

export default function CatchPhoto({ item }) {
  const [localUrl, setLocalUrl] = useState('')
  const [failed, setFailed] = useState(false)

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

  const src = item?.photoUrl || localUrl
  if (failed || (!src && item?.photoPath)) {
    return <div className="catch-photo-placeholder"><ImageIcon size={18} /> Foto non disponibile</div>
  }
  if (!src) return null

  return (
    <div className="catch-photo-wrap">
      <img
        className="catch-photo"
        src={src}
        alt={`Cattura: ${item.species || 'pesce'}`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  )
}
