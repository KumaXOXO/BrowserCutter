// src/components/timeline/TextTrack.tsx
import { useRef } from 'react'
import { Type } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { PX_PER_SEC } from './ClipBlock'
import type { TextOverlay } from '../../types'

interface Props {
  zoom: number
  trackLabelWidth: number
  trackId?: string
}

export default function TextTrack({ zoom, trackLabelWidth, trackId }: Props) {
  const { textOverlays, selectedElement, selectedTextIds, setSelectedElement, updateTextOverlay, playheadPosition } = useAppStore()
  const px = PX_PER_SEC * zoom

  const visibleOverlays = textOverlays.filter((o) =>
    trackId ? (o.trackId ?? 'text') === trackId : !o.trackId,
  )

  const totalWidth = Math.max(
    4000,
    (playheadPosition + 120) * px,
    visibleOverlays.reduce((max, o) => Math.max(max, (o.startOnTimeline + o.duration) * px), 0) + 600,
  )

  return (
    <div
      className="flex items-center"
      style={{ height: 26, borderBottom: '1px solid rgba(255,255,255,0.03)' }}
    >
      {trackLabelWidth > 0 && (
        <div
          className="flex items-center gap-1 px-2 shrink-0"
          style={{ minWidth: trackLabelWidth, width: trackLabelWidth, fontSize: 10, color: 'var(--muted-subtle)' }}
        >
          <Type size={9} /> Text
        </div>
      )}
      <div className="relative h-full" style={{ width: totalWidth }}>
        {visibleOverlays.map((overlay) => (
          <TextBlock
            key={overlay.id}
            overlay={overlay}
            px={px}
            isSelected={selectedElement?.id === overlay.id || selectedTextIds.includes(overlay.id)}
            onSelect={() => setSelectedElement({ type: 'text', id: overlay.id })}
            onUpdate={(patch) => updateTextOverlay(overlay.id, patch)}
          />
        ))}
      </div>
    </div>
  )
}

interface TextBlockProps {
  overlay: TextOverlay
  px: number
  isSelected: boolean
  onSelect: () => void
  onUpdate: (patch: Partial<TextOverlay>) => void
}

function TextBlock({ overlay, px, isSelected, onSelect, onUpdate }: TextBlockProps) {
  const left = overlay.startOnTimeline * px
  const width = Math.max(4, overlay.duration * px)
  const overlayRef = useRef(overlay)
  overlayRef.current = overlay
  const { resizeEnabled } = useAppStore()

  function handleBodyMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation()
    onSelect()

    const trackContent = (e.currentTarget as HTMLElement).parentElement!
    const trackRect = trackContent.getBoundingClientRect()
    const scrollContainer = trackContent.closest('.overflow-auto') as HTMLElement | null
    const scrollLeft = scrollContainer?.scrollLeft ?? 0
    const offsetX = e.clientX - trackRect.left + scrollLeft - left

    const handleMouseMove = (ev: MouseEvent) => {
      const { projectSettings: ps, bpmConfig } = useAppStore.getState()
      const curScroll = scrollContainer?.scrollLeft ?? 0
      const beatDur = ps.snapToBeat ? 60 / Math.max(1, bpmConfig.bpm) : 0
      const rawStart = Math.max(0, (ev.clientX - trackRect.left + curScroll - offsetX) / px)
      const newStart = beatDur > 0 ? Math.round(rawStart / beatDur) * beatDur : rawStart
      onUpdate({ startOnTimeline: newStart })
    }
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  function handleRightTrimMouseDown(e: React.MouseEvent) {
    if (!resizeEnabled) return
    e.stopPropagation()
    const startX = e.clientX
    const initialDur = overlayRef.current.duration

    const handleMouseMove = (ev: MouseEvent) => {
      const dSec = (ev.clientX - startX) / px
      onUpdate({ duration: Math.max(0.1, initialDur + dSec) })
    }
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      onMouseDown={handleBodyMouseDown}
      style={{
        position: 'absolute',
        top: 3, bottom: 3,
        left, width,
        borderRadius: 4,
        background: 'rgba(234,179,8,0.18)',
        border: isSelected ? '2px solid #F43F5E' : '1px solid rgba(234,179,8,0.5)',
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.filter = 'brightness(1.25)' }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = '' }}
    >
      <span style={{ fontSize: 9, fontWeight: 600, color: '#FDE68A', padding: '0 5px', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
        T {overlay.text.slice(0, 14)}{overlay.text.length > 14 ? '…' : ''}
      </span>
      {/* Right trim handle — only visible when resizeEnabled */}
      {resizeEnabled && (
        <div
          onMouseDown={handleRightTrimMouseDown}
          style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: 6,
            cursor: 'ew-resize', zIndex: 2,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '0 4px 4px 0',
          }}
        />
      )}
    </div>
  )
}
