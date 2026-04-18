// src/components/panels/MediaPanel/MusicList.tsx
import { Music } from 'lucide-react'
import type { Clip } from '../../../types'

export default function MusicList({ clips }: { clips: Clip[] }) {
  if (clips.length === 0) {
    return <p className="text-xs text-center" style={{ color: 'var(--muted-subtle)' }}>No audio files yet.</p>
  }

  return (
    <div className="flex flex-col gap-1">
      {clips.map((clip) => (
        <div
          key={clip.id}
          draggable
          onDragStart={(e) => e.dataTransfer.setData('clipId', clip.id)}
          className="flex items-center gap-2.5 rounded-lg cursor-grab transition-all duration-150"
          style={{ padding: '8px 10px', border: '1px solid transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
        >
          <div className="rounded-lg flex items-center justify-center shrink-0" style={{ width: 32, height: 32, background: 'rgba(225,29,72,0.15)' }}>
            <Music size={14} color="#F43F5E" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{clip.name}</p>
            <p className="text-xs" style={{ color: 'var(--muted-subtle)' }}>
              {Math.floor(clip.duration / 60)}:{String(Math.floor(clip.duration % 60)).padStart(2,'0')}
              {clip.bpm ? ` · ${clip.bpm} BPM` : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
