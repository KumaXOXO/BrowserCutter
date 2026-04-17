// src/components/timeline/Timeline.tsx
import { useState } from 'react'
import { Film, Type, Volume2 } from 'lucide-react'
import TimeRuler from './TimeRuler'
import Track from './Track'

const TRACK_LABEL_WIDTH = 78

export default function Timeline() {
  const [zoom, setZoom] = useState(1)

  return (
    <div
      className="flex flex-col shrink-0"
      style={{ height: 205, background: 'var(--bg)', borderTop: '1px solid var(--border-subtle)' }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-2.5 shrink-0"
        style={{ height: 30, background: 'var(--surface)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--muted-subtle)', fontSize: 10 }}>Timeline</span>
          <button
            className="text-xs rounded cursor-pointer transition-all duration-150"
            style={{ padding: '2px 8px', color: 'var(--muted2)', background: 'transparent', border: '1px solid var(--border-subtle)' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(225,29,72,0.5)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--muted2)' }}
          >
            + Track
          </button>
        </div>
        <input type="range" min={0.5} max={5} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ width: 72, accentColor: '#E11D48', cursor: 'pointer' }} />
      </div>

      {/* Scrollable tracks */}
      <div className="flex-1 overflow-auto relative">
        <TimeRuler trackLabelWidth={TRACK_LABEL_WIDTH} />
        <div style={{ position: 'relative' }}>
          {/* Playhead */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: TRACK_LABEL_WIDTH + 80, width: 1.5, background: '#E11D48', zIndex: 20, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: -2, left: -5, width: 12, height: 8, background: '#E11D48', clipPath: 'polygon(0 0, 100% 0, 50% 100%)', borderRadius: 2 }} />
          </div>

          <Track trackIndex={0} label="V1" icon={<Film size={9} />} height={38} zoom={zoom} trackLabelWidth={TRACK_LABEL_WIDTH} />
          <Track trackIndex={1} label="Text" icon={<Type size={9} />} height={26} zoom={zoom} trackLabelWidth={TRACK_LABEL_WIDTH} />

          {/* Audio track (static) */}
          <div className="flex items-center" style={{ height: 28 }}>
            <div className="flex items-center gap-1 px-2 shrink-0" style={{ minWidth: TRACK_LABEL_WIDTH, width: TRACK_LABEL_WIDTH, fontSize: 10, color: 'var(--muted-subtle)' }}>
              <Volume2 size={9} /> Audio
            </div>
            <div style={{ position: 'relative', height: 18, width: 700, borderRadius: 4, overflow: 'hidden', margin: '5px 0', background: '#0A1A12' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg,#1A4A2A 0,#2E7040 3px,#1A4A2A 6px)', opacity: 0.65 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
