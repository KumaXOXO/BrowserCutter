// src/components/preview/VideoPreview.tsx
import { Film } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export default function VideoPreview() {
  const segments = useAppStore((s) => s.segments)

  return (
    <div className="flex flex-1 items-center justify-center min-h-0" style={{ background: '#05050C', padding: 20 }}>
      <div
        className="relative flex items-center justify-center"
        style={{
          aspectRatio: '16/9',
          maxHeight: '100%',
          maxWidth: '100%',
          background: '#000',
          borderRadius: 6,
          overflow: 'hidden',
          boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#12122A,#0A0A1A,#12122A)' }}>
          {segments.length === 0 && (
            <div className="text-center">
              <Film size={40} style={{ margin: '0 auto 12px', opacity: 0.15 }} />
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Drag a clip to the timeline to begin</p>
            </div>
          )}
        </div>
        <div
          className="absolute text-xs font-mono"
          style={{ bottom: 10, right: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(4px)' }}
        >
          00:00:00
        </div>
      </div>
    </div>
  )
}
