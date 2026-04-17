// src/components/layout/IconSidebar.tsx
import { Film, Type, Sparkles, ArrowRightLeft, AudioLines, Settings } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { ActiveTab } from '../../types'

const TABS: { id: ActiveTab; icon: React.ReactNode; label: string; bpm?: boolean }[] = [
  { id: 'media',       icon: <Film size={17} />,              label: 'Media' },
  { id: 'text',        icon: <Type size={17} />,              label: 'Text & Subtitles' },
  { id: 'effects',     icon: <Sparkles size={17} />,          label: 'Effects' },
  { id: 'transitions', icon: <ArrowRightLeft size={17} />,    label: 'Transitions' },
  { id: 'bpm',         icon: <AudioLines size={17} />,        label: 'BPM Cutting Tool', bpm: true },
]

export default function IconSidebar() {
  const { activeTab, setActiveTab } = useAppStore()

  return (
    <div
      className="flex flex-col items-center py-2 gap-1 border-r shrink-0"
      style={{ width: 50, background: 'var(--surface)', borderColor: 'var(--border-subtle)' }}
    >
      {TABS.map((tab) => (
        <TabIcon
          key={tab.id}
          tab={tab}
          active={activeTab === tab.id}
          onClick={() => setActiveTab(tab.id)}
        />
      ))}

      <div className="flex-1" />

      <TabIcon
        tab={{ id: 'settings', icon: <Settings size={17} />, label: 'Settings' }}
        active={activeTab === 'settings'}
        onClick={() => setActiveTab('settings')}
      />
    </div>
  )
}

function TabIcon({
  tab,
  active,
  onClick,
}: {
  tab: { id: ActiveTab; icon: React.ReactNode; label: string; bpm?: boolean }
  active: boolean
  onClick: () => void
}) {
  const isBpm = tab.bpm

  const baseStyle: React.CSSProperties = {
    width: 36, height: 36,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 9,
    cursor: 'pointer',
    border: '1px solid transparent',
    position: 'relative',
    transition: 'all 180ms cubic-bezier(.4,0,.2,1)',
    color: active
      ? isBpm ? '#F43F5E' : 'var(--text)'
      : 'var(--muted2)',
    background: active
      ? isBpm ? 'rgba(225,29,72,0.12)' : 'rgba(255,255,255,0.09)'
      : 'transparent',
    borderColor: active
      ? isBpm ? 'rgba(225,29,72,0.3)' : 'rgba(255,255,255,0.12)'
      : 'transparent',
    boxShadow: active && isBpm ? '0 0 12px rgba(225,29,72,0.2)' : 'none',
  }

  return (
    <button
      title={tab.label}
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'var(--text)' } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted2)' } }}
    >
      {tab.icon}
      {isBpm && (
        <span
          style={{
            position: 'absolute', top: 6, right: 6,
            width: 5, height: 5, borderRadius: '50%',
            background: '#E11D48',
            animation: 'pulse-dot 1.8s ease-in-out infinite',
          }}
        />
      )}
    </button>
  )
}
