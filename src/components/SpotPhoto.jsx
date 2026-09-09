import { useEffect, useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import { loadLocalSpotPhoto } from '../lib/spotPhotos'
import './SpotPhoto.css'

export default function SpotPhoto({ spot }) {
  const [localUrl, setLocalUrl] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    let objectUrl = ''
    setFailed(false)

    if (!spot?.photoLocalKey || spot?.photoUrl) {
      setLocalUrl('')
      return undefined
    }

    loadLocalSpotPhoto(spot.photoLocalKey)
      .then((blob) => {
        if (!active || !blob) return
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
  }, [spot?.photoLocalKey, spot?.photoUrl])

  const src = spot?.photoUrl || localUrl
  if (!src) {
    return failed || spot?.photoPath ? (
      <div className="spot-photo-placeholder"><ImageIcon size={18} /> Foto non disponibile</div>
    ) : null
  }

  return (
    <div className="spot-photo-wrap">
      <img
        className="spot-photo"
        src={src}
        alt={`Spot: ${spot.name || 'pesca'}`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  )
}
