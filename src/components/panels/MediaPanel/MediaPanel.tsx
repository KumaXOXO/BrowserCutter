// src/components/panels/MediaPanel/MediaPanel.tsx
import { useAppStore } from '../../../store/useAppStore'
import { PanelLabel } from '../TextPanel'
import UploadZone from './UploadZone'
import VideoGrid from './VideoGrid'
import MusicList from './MusicList'
import ImageGrid from './ImageGrid'
import type { MediaSubTab } from '../../../types'

const SUB_TABS: { id: MediaSubTab; label: string }[] = [
  { id: 'videos', label: 'Videos' },
  { id: 'music',  label: 'Music'  },
  { id: 'images', label: 'Images' },
]

export default function MediaPanel() {
  const { clips, mediaSubTab, setMediaSubTab } = useAppStore()

  const videos = clips.filter((c) => c.type === 'video')
  const music  = clips.filter((c) => c.type === 'audio')
  const images = clips.filter((c) => c.type === 'image')

  return (
    <div className="flex flex-col gap-3 p-3.5 overflow-y-auto h-full">
      <PanelLabel>Media</PanelLabel>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'var(--surface2)' }}>
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMediaSubTab(tab.id)}
            className="flex-1 text-xs font-medium rounded-md py-1.5 cursor-pointer transition-all duration-150"
            style={{
              border: 'none',
              color: mediaSubTab === tab.id ? 'var(--text)' : 'var(--muted2)',
              background: mediaSubTab === tab.id ? 'rgba(255,255,255,0.08)' : 'transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <UploadZone />

      {mediaSubTab === 'videos' && <VideoGrid clips={videos} />}
      {mediaSubTab === 'music'  && <MusicList clips={music} />}
      {mediaSubTab === 'images' && <ImageGrid clips={images} />}
    </div>
  )
}
