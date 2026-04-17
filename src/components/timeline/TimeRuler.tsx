// src/components/timeline/TimeRuler.tsx
const MARKS = Array.from({ length: 8 }, (_, i) => i * 5) // 0, 5, 10, 15 ...

export default function TimeRuler({ trackLabelWidth }: { trackLabelWidth: number }) {
  return (
    <div
      className="flex sticky top-0 z-10 shrink-0"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border-subtle)', userSelect: 'none' }}
    >
      <div style={{ minWidth: trackLabelWidth, width: trackLabelWidth }} />
      <div className="flex" style={{ color: '#35354A', fontSize: 9, fontFamily: 'monospace' }}>
        {MARKS.map((s) => (
          <span key={s} style={{ minWidth: 100, width: 100, paddingLeft: 4, paddingTop: 4, paddingBottom: 4 }}>
            {`0:${String(s).padStart(2,'0')}`}
          </span>
        ))}
      </div>
    </div>
  )
}
