// src/components/timeline/Track.tsx
import { useAppStore } from '../../store/useAppStore'
import ClipBlock, { PX_PER_SEC } from './ClipBlock'

interface Props {
  trackIndex: number
  label: string
  icon: React.ReactNode
  height: number
  zoom: number
  trackLabelWidth: number
}

export default function Track({ trackIndex, label, icon, height, zoom, trackLabelWidth }: Props) {
  const { segments, clips, addSegment } = useAppStore()
  const trackSegments = segments.filter((s) => s.trackIndex === trackIndex)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const clipId = e.dataTransfer.getData('clipId')
    if (!clipId) return
    const clip = clips.find((c) => c.id === clipId)
    if (!clip) return

    // Enforce track type: video/image → V1 (trackIndex 0), audio → Audio (trackIndex 2)
    if (clip.type === 'video' && trackIndex !== 0) return
    if (clip.type === 'image' && trackIndex !== 0) return
    if (clip.type === 'audio' && trackIndex !== 2) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const startOnTimeline = Math.max(0, x / (PX_PER_SEC * zoom))

    addSegment({
      id: crypto.randomUUID(),
      clipId,
      trackIndex,
      startOnTimeline,
      inPoint: 0,
      outPoint: clip.duration,
    })
  }

  return (
    <div
      className="flex items-center"
      style={{ height, borderBottom: '1px solid rgba(255,255,255,0.03)' }}
    >
      <div
        className="flex items-center gap-1 px-2 shrink-0"
        style={{ minWidth: trackLabelWidth, width: trackLabelWidth, fontSize: 10, color: 'var(--muted-subtle)' }}
      >
        {icon} {label}
      </div>
      <div
        className="relative h-full"
        style={{ width: 700 }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {trackSegments.map((seg) => {
          const clip = clips.find((c) => c.id === seg.clipId)
          return clip ? <ClipBlock key={seg.id} segment={seg} clip={clip} zoom={zoom} /> : null
        })}
      </div>
    </div>
  )
}
