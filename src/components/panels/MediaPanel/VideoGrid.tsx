// src/components/panels/MediaPanel/VideoGrid.tsx
import { Play } from 'lucide-react'
import type { Clip } from '../../../types'

export default function VideoGrid({ clips }: { clips: Clip[] }) {
  if (clips.length === 0) {
    return <p className="text-xs text-center" style={{ color: 'var(--muted-subtle)' }}>No videos yet. Upload some above.</p>
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {clips.map((clip) => <VideoThumb key={clip.id} clip={clip} />)}
    </div>
  )
}

function VideoThumb({ clip }: { clip: Clip }) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('clipId', clip.id)}
      className="rounded-lg overflow-hidden cursor-grab transition-all duration-200"
      style={{ background: 'var(--surface2)', border: '1px solid var(--border-subtle)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      <div className="relative flex items-center justify-center" style={{ aspectRatio: '16/9', background: 'rgba(124,58,237,0.15)' }}>
        {clip.thumbnail
          ? <img src={clip.thumbnail} alt={clip.name} className="absolute inset-0 w-full h-full object-cover" />
          : <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.5)' }}>
              <Play size={12} fill="white" color="white" />
            </div>
        }
        <span className="absolute bottom-1 right-1 text-white text-xs font-mono" style={{ background: 'rgba(0,0,0,0.65)', padding: '1px 5px', borderRadius: 3 }}>
          {formatDuration(clip.duration)}
        </span>
      </div>
      <div style={{ padding: '6px 8px' }}>
        <p className="text-xs font-medium truncate">{clip.name}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted-subtle)' }}>{clip.width}×{clip.height}</p>
      </div>
    </div>
  )
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}
