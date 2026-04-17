// src/components/timeline/Track.tsx
import { useAppStore } from '../../store/useAppStore'
import ClipBlock from './ClipBlock'

interface Props {
  trackIndex: number
  label: string
  icon: React.ReactNode
  height: number
  zoom: number
  trackLabelWidth: number
}

export default function Track({ trackIndex, label, icon, height, zoom, trackLabelWidth }: Props) {
  const { segments, clips } = useAppStore()
  const trackSegments = segments.filter((s) => s.trackIndex === trackIndex)

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
      <div className="relative h-full" style={{ width: 700 }}>
        {trackSegments.map((seg) => {
          const clip = clips.find((c) => c.id === seg.clipId)
          return clip ? <ClipBlock key={seg.id} segment={seg} clip={clip} zoom={zoom} /> : null
        })}
      </div>
    </div>
  )
}
