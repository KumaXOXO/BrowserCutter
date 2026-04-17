// src/components/preview/PlaybackControls.tsx
import { SkipBack, Play, SkipForward, Volume2 } from 'lucide-react'

export default function PlaybackControls() {
  return (
    <div
      className="flex items-center gap-2.5 px-4 shrink-0"
      style={{ height: 46, background: 'var(--surface)', borderTop: '1px solid var(--border-subtle)' }}
    >
      <IconBtn><SkipBack size={14} fill="currentColor" /></IconBtn>
      <PlayBtn />
      <IconBtn><SkipForward size={14} fill="currentColor" /></IconBtn>
      <span className="text-xs font-mono shrink-0" style={{ color: 'var(--muted-subtle)' }}>00:00:00</span>
      <SeekBar />
      <span className="text-xs font-mono shrink-0" style={{ color: 'var(--muted-subtle)' }}>00:00:00</span>
      <IconBtn><Volume2 size={14} /></IconBtn>
    </div>
  )
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button
      className="flex items-center justify-center rounded-md cursor-pointer transition-all duration-150"
      style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: 'var(--muted-subtle)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted-subtle)' }}
    >
      {children}
    </button>
  )
}

function PlayBtn() {
  return (
    <button
      className="flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 shrink-0"
      style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#E11D48,#C41232)', border: 'none', boxShadow: '0 3px 10px rgba(225,29,72,0.4)' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 5px 16px rgba(225,29,72,0.6)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 3px 10px rgba(225,29,72,0.4)' }}
    >
      <Play size={12} fill="white" color="white" />
    </button>
  )
}

function SeekBar() {
  return (
    <div
      className="flex-1 relative cursor-pointer"
      style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', transition: 'height 150ms' }}
      onMouseEnter={(e) => { e.currentTarget.style.height = '5px' }}
      onMouseLeave={(e) => { e.currentTarget.style.height = '3px' }}
    >
      <div style={{ width: '0%', height: '100%', borderRadius: 2, background: 'linear-gradient(90deg,#E11D48,#F43F5E)' }} />
    </div>
  )
}
