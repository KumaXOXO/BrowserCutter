// CuttingToolPanel.tsx — floating panel shown on the right of the timeline in cut mode
import { ChevronUp, ChevronDown } from 'lucide-react'

const GRID_VALUES = [2, 4, 8, 16, 32, 64, 128]

interface Props {
  visible: boolean
  cutSubMode: 'free' | 'grid'
  cutGridParts: number
  onSubMode: (mode: 'free' | 'grid') => void
  onGridParts: (parts: number) => void
}

export default function CuttingToolPanel({ visible, cutSubMode, cutGridParts, onSubMode, onGridParts }: Props) {
  const currentIdx = GRID_VALUES.indexOf(cutGridParts)

  function stepUp() {
    const next = currentIdx < GRID_VALUES.length - 1 ? currentIdx + 1 : currentIdx
    onGridParts(GRID_VALUES[next])
  }

  function stepDown() {
    const prev = currentIdx > 0 ? currentIdx - 1 : 0
    onGridParts(GRID_VALUES[prev])
  }

  return (
    <div
      style={{
        position: 'absolute',
        right: 8,
        top: 34,
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '10px 10px',
        background: 'var(--surface2)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        minWidth: 96,
        // Entrance animation via transition on opacity + transform
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(12px)',
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 180ms ease, transform 180ms ease',
      }}
    >
      <div className="text-xs font-bold" style={{ color: 'var(--muted-subtle)', letterSpacing: '0.08em', textAlign: 'center', marginBottom: 2 }}>
        CUT
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1">
        <ModeBtn active={cutSubMode === 'free'} onClick={() => onSubMode('free')} title="Free cut — click anywhere to split">
          FREE
        </ModeBtn>
        <ModeBtn active={cutSubMode === 'grid'} onClick={() => onSubMode('grid')} title="Grid cut — split into equal parts">
          GRID
        </ModeBtn>
      </div>

      {/* Revolver selector — only in grid mode */}
      <div
        style={{
          overflow: 'hidden',
          maxHeight: cutSubMode === 'grid' ? 120 : 0,
          opacity: cutSubMode === 'grid' ? 1 : 0,
          transition: 'max-height 200ms ease, opacity 180ms ease',
        }}
      >
        <div style={{ height: 8 }} />
        <div style={{ height: 1, background: 'var(--border-subtle)', marginBottom: 8 }} />

        <div className="flex flex-col items-center gap-1">
          <div className="text-xs" style={{ color: 'var(--muted-subtle)', marginBottom: 2 }}>parts</div>

          {/* Drum roller */}
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: '4px 0',
              width: 72,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0,
            }}
          >
            <button
              onClick={stepUp}
              disabled={currentIdx >= GRID_VALUES.length - 1}
              className="flex items-center justify-center transition-opacity"
              style={{
                background: 'transparent', border: 'none', cursor: currentIdx < GRID_VALUES.length - 1 ? 'pointer' : 'not-allowed',
                color: 'var(--muted2)', opacity: currentIdx < GRID_VALUES.length - 1 ? 0.8 : 0.2, width: '100%', padding: '3px 0',
              }}
              title="More parts"
            >
              <ChevronUp size={13} />
            </button>

            {/* Visible rows: prev, current, next */}
            <div style={{ width: '100%', textAlign: 'center' }}>
              {currentIdx > 0 && (
                <div
                  className="cursor-pointer"
                  onClick={stepDown}
                  style={{ fontSize: 10, color: 'var(--muted-subtle)', padding: '2px 0', opacity: 0.5, userSelect: 'none' }}
                >
                  {GRID_VALUES[currentIdx - 1]}
                </div>
              )}
              <div
                style={{
                  fontSize: 15, fontWeight: 700, color: '#F43F5E',
                  padding: '3px 0', userSelect: 'none',
                  textShadow: '0 0 8px rgba(244,63,94,0.4)',
                }}
              >
                {cutGridParts}
              </div>
              {currentIdx < GRID_VALUES.length - 1 && (
                <div
                  className="cursor-pointer"
                  onClick={stepUp}
                  style={{ fontSize: 10, color: 'var(--muted-subtle)', padding: '2px 0', opacity: 0.5, userSelect: 'none' }}
                >
                  {GRID_VALUES[currentIdx + 1]}
                </div>
              )}
            </div>

            <button
              onClick={stepDown}
              disabled={currentIdx <= 0}
              className="flex items-center justify-center transition-opacity"
              style={{
                background: 'transparent', border: 'none', cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
                color: 'var(--muted2)', opacity: currentIdx > 0 ? 0.8 : 0.2, width: '100%', padding: '3px 0',
              }}
              title="Fewer parts"
            >
              <ChevronDown size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModeBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex-1 text-xs rounded cursor-pointer transition-all duration-150"
      style={{
        padding: '3px 0', fontWeight: 700, letterSpacing: '0.04em',
        color: active ? '#F43F5E' : 'var(--muted2)',
        background: active ? 'rgba(225,29,72,0.12)' : 'transparent',
        border: `1px solid ${active ? 'rgba(225,29,72,0.55)' : 'var(--border-subtle)'}`,
      }}
    >
      {children}
    </button>
  )
}
