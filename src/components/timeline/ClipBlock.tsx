// src/components/timeline/ClipBlock.tsx
import type { Segment, Clip } from '../../types'
import { useAppStore } from '../../store/useAppStore'

const CLIP_GRADIENTS = [
  'linear-gradient(135deg,#5B21B6,#7C3AED)',
  'linear-gradient(135deg,#0C5F78,#0891B2)',
  'linear-gradient(135deg,#065F46,#059669)',
]

const PX_PER_SEC = 20 // 20px per second at zoom 1

interface Props {
  segment: Segment
  clip: Clip
  zoom: number
}

export default function ClipBlock({ segment, clip, zoom }: Props) {
  const { selectedElement, setSelectedElement } = useAppStore()
  const isSelected = selectedElement?.id === segment.id
  const px = PX_PER_SEC * zoom
  const left  = segment.startOnTimeline * px
  const width = (segment.outPoint - segment.inPoint) * px

  const bgIndex = clip.id.charCodeAt(0) % CLIP_GRADIENTS.length
  const bg = CLIP_GRADIENTS[bgIndex]
  const label = clip.name.replace(/\.[^.]+$/, '').slice(0, 1).toUpperCase()

  return (
    <div
      onClick={() => setSelectedElement({ type: 'segment', id: segment.id })}
      style={{
        position: 'absolute',
        top: 4, bottom: 4,
        left, width,
        borderRadius: 5,
        background: bg,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        outline: isSelected ? '2px solid rgba(255,255,255,0.9)' : 'none',
        outlineOffset: 1,
        transition: 'filter 120ms',
      }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.filter = 'brightness(1.2)' }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = '' }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.9)', padding: '0 7px', whiteSpace: 'nowrap', letterSpacing: 0.3 }}>
        {label}
      </span>
    </div>
  )
}

export { PX_PER_SEC }
