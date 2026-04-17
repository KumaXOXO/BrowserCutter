// src/components/timeline/TimeRuler.tsx
import { PX_PER_SEC } from './ClipBlock'

const INTERVAL_SEC = 5 // seconds between ruler marks

export default function TimeRuler({
  trackLabelWidth,
  zoom,
}: {
  trackLabelWidth: number
  zoom: number
}) {
  const markWidth = PX_PER_SEC * zoom * INTERVAL_SEC
  const markCount = Math.ceil(700 / markWidth) + 2
  const marks = Array.from({ length: markCount }, (_, i) => i * INTERVAL_SEC)

  return (
    <div
      className="flex sticky top-0 z-10 shrink-0"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border-subtle)', userSelect: 'none' }}
    >
      <div style={{ minWidth: trackLabelWidth, width: trackLabelWidth }} />
      <div className="flex" style={{ color: '#35354A', fontSize: 9, fontFamily: 'monospace' }}>
        {marks.map((s) => (
          <span
            key={s}
            style={{ minWidth: markWidth, width: markWidth, paddingLeft: 4, paddingTop: 4, paddingBottom: 4 }}
          >
            {`0:${String(s).padStart(2, '0')}`}
          </span>
        ))}
      </div>
    </div>
  )
}
