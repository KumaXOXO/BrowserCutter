// src/components/panels/MediaPanel/ImageGrid.tsx
import type { Clip } from '../../../types'

export default function ImageGrid({ clips }: { clips: Clip[] }) {
  if (clips.length === 0) {
    return <p className="text-xs text-center" style={{ color: 'var(--muted-subtle)' }}>No images yet.</p>
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {clips.map((clip) => (
        <div
          key={clip.id}
          className="rounded-lg overflow-hidden cursor-pointer transition-all duration-200"
          style={{ border: '1px solid var(--border-subtle)', aspectRatio: '1' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
        >
          {clip.thumbnail && <img src={clip.thumbnail} alt={clip.name} className="w-full h-full object-cover" />}
        </div>
      ))}
    </div>
  )
}
