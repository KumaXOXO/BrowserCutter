// src/App.tsx
import TopBar from './components/layout/TopBar'
import IconSidebar from './components/layout/IconSidebar'
import LeftPanel from './components/layout/LeftPanel'
import VideoPreview from './components/preview/VideoPreview'
import PlaybackControls from './components/preview/PlaybackControls'
import Timeline from './components/timeline/Timeline'

export default function App() {
  return (
    <div className="flex flex-col" style={{ height: '100vh' }}>
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <IconSidebar />
        <LeftPanel />
        <div className="flex flex-col flex-1 overflow-hidden">
          <VideoPreview />
          <PlaybackControls />
          <Timeline />
        </div>
      </div>
    </div>
  )
}
