# BrowserCutter Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a fully interactive app shell — all panels, tabs, sidebar, layout, and media upload working — so Phase 2 can layer in video logic on top.

**Architecture:** Vite + React + TypeScript SPA. Zustand manages all app state (clips, timeline segments, active tab, selected element, project settings). The layout mirrors the VEED.io-style design from the approved UI mockup: icon sidebar → context panel → video preview + timeline. No video processing in this phase — only file loading and state management.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS v3, shadcn/ui, Zustand, Lucide React, File System Access API (with standard `<input>` fallback)

**Spec:** `docs/superpowers/specs/2026-04-17-browsercutter-design.md`
**Mockup reference:** `ui-mockup.html`

---

## File Map

| File | Responsibility |
|---|---|
| `src/types/index.ts` | All TypeScript types (Clip, Segment, Effect, BpmConfig, etc.) |
| `src/store/useAppStore.ts` | Zustand store — single source of truth |
| `src/App.tsx` | Root layout: TopBar + Sidebar + LeftPanel + right area |
| `src/index.css` | Global styles, CSS variables, scrollbar |
| `src/components/layout/TopBar.tsx` | Logo, editable project name, Undo/Redo, Export button |
| `src/components/layout/IconSidebar.tsx` | 6 tab icons, active state, BPM pulse dot |
| `src/components/layout/LeftPanel.tsx` | Renders active panel based on store.activeTab |
| `src/components/panels/MediaPanel/UploadZone.tsx` | Drag-and-drop + file picker, calls store.addClip |
| `src/components/panels/MediaPanel/VideoGrid.tsx` | Grid of video clip thumbnails |
| `src/components/panels/MediaPanel/MusicList.tsx` | List of audio files |
| `src/components/panels/MediaPanel/ImageGrid.tsx` | Grid of image thumbnails |
| `src/components/panels/MediaPanel/MediaPanel.tsx` | Sub-tab switcher: Videos / Music / Images |
| `src/components/panels/TextPanel.tsx` | Add text button + SRT import button (static) |
| `src/components/panels/EffectsPanel.tsx` | Effects list + Adjustment Layer button (static) |
| `src/components/panels/TransitionsPanel.tsx` | Transition cards (static) |
| `src/components/panels/BpmPanel.tsx` | Full BPM tool UI wired to bpmConfig store |
| `src/components/panels/SettingsPanel.tsx` | Resolution, FPS, format, toggles wired to projectSettings |
| `src/components/panels/InspectorPanel.tsx` | Shows selected segment/clip properties |
| `src/components/preview/VideoPreview.tsx` | Dark canvas area with "no clip" placeholder |
| `src/components/preview/PlaybackControls.tsx` | Play button, seek bar, timecodes (static for now) |
| `src/components/timeline/TimeRuler.tsx` | Time marker row |
| `src/components/timeline/ClipBlock.tsx` | Single clip rectangle on timeline, click → selectElement |
| `src/components/timeline/Track.tsx` | One horizontal track row with its clip blocks |
| `src/components/timeline/Timeline.tsx` | All tracks + toolbar + playhead + zoom slider |
| `src/lib/video/thumbnail.ts` | Generate video thumbnail via canvas |
| `src/lib/video/fileHandler.ts` | File System Access API helpers with input fallback |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json` (via Vite), `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `components.json`

- [ ] **Step 1: Create Vite project**

Run in `C:\Users\Administrator\Desktop\BrowserCutter\`:
```bash
npm create vite@latest . -- --template react-ts
```
When prompted "Current directory is not empty", choose `Ignore files and continue`.

- [ ] **Step 2: Install base dependencies**
```bash
npm install
npm install zustand lucide-react clsx tailwind-merge class-variance-authority
```

- [ ] **Step 3: Install and init Tailwind**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 4: Replace `tailwind.config.js` with TypeScript version**

Delete `tailwind.config.js`, create `tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#07070F',
        surface:  '#0E0E1C',
        surface2: '#141428',
        surface3: '#1C1C34',
        border:   'rgba(255,255,255,0.07)',
        accent:   '#E11D48',
        muted:    '#5A5A7A',
        muted2:   '#888898',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 5: Init shadcn/ui**
```bash
npx shadcn@latest init
```
When prompted: choose `Dark` theme, CSS variables `yes`, `src/` as component dir.

- [ ] **Step 6: Add required shadcn components**
```bash
npx shadcn@latest add button input select separator scroll-area slider tabs checkbox label radio-group
```

- [ ] **Step 7: Add Inter font to `index.html`**

Replace `<head>` content in `index.html`:
```html
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <title>BrowserCutter</title>
</head>
```

- [ ] **Step 8: Replace `src/index.css`**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg:       #07070F;
  --surface:  #0E0E1C;
  --surface2: #141428;
  --border:   rgba(255,255,255,0.07);
  --accent:   #E11D48;
  --muted:    #5A5A7A;
  --text:     #EEEEF8;
}

* { box-sizing: border-box; }
html, body, #root { height: 100%; overflow: hidden; }
body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--text); }

::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.65); }
}
@keyframes shimmer {
  0%   { transform: translateX(-100%) skewX(-15deg); }
  100% { transform: translateX(300%) skewX(-15deg); }
}
```

- [ ] **Step 9: Verify dev server starts**
```bash
npm run dev
```
Expected: `http://localhost:5173` opens with default Vite page. No errors in console.

- [ ] **Step 10: Commit**
```bash
git init
git add .
git commit -m "feat: project scaffold — Vite + React + TS + Tailwind + shadcn/ui"
```

---

## Task 2: Core Types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Create types file**

```typescript
// src/types/index.ts

export type ClipId = string
export type SegmentId = string

export type ClipType = 'video' | 'audio' | 'image'
export type BpmMode = 'sequential' | 'random' | 'forfeit'
export type SegmentLength = 0.5 | 1 | 2 | 4
export type ActiveTab = 'media' | 'text' | 'effects' | 'transitions' | 'bpm' | 'settings' | 'inspector'
export type MediaSubTab = 'videos' | 'music' | 'images'
export type EffectType = 'brightness' | 'contrast' | 'saturation' | 'grayscale' | 'blur' | 'vignette' | 'sharpen'
export type TransitionType = 'cut' | 'fade' | 'wipe' | 'zoom' | 'slide' | 'dissolve'
export type Resolution = '1920x1080' | '3840x2160' | '1280x720'
export type FrameRate = 24 | 30 | 60
export type ExportFormat = 'mp4' | 'webm'

export interface Clip {
  id: ClipId
  file: File
  name: string
  duration: number       // seconds
  width: number
  height: number
  type: ClipType
  thumbnail?: string     // data URL (video/image only)
  bpm?: number
}

export interface Segment {
  id: SegmentId
  clipId: ClipId
  trackIndex: number
  startOnTimeline: number  // seconds from timeline start
  inPoint: number          // seconds from clip start
  outPoint: number         // seconds from clip start
}

export interface Effect {
  type: EffectType
  value: number            // 0–100
}

export interface AdjustmentLayer {
  id: string
  startOnTimeline: number
  duration: number
  effects: Effect[]
}

export interface Transition {
  id: string
  type: TransitionType
  beforeSegmentId: SegmentId
  afterSegmentId: SegmentId
  duration: number         // seconds
}

export interface TextOverlay {
  id: string
  text: string
  startOnTimeline: number
  duration: number
  font: string
  size: number             // px
  color: string
  x: number                // 0–1 relative to canvas width
  y: number                // 0–1 relative to canvas height
}

export interface BpmConfig {
  bpm: number
  mode: BpmMode
  segmentLength: SegmentLength
  outputDuration: number
  outputUnit: 'seconds' | 'beats'
  selectedClipIds: ClipId[]
}

export interface ProjectSettings {
  resolution: Resolution
  fps: FrameRate
  format: ExportFormat
  autoDetectBpm: boolean
  snapToBeat: boolean
  hardwareAcceleration: boolean
}

export type SelectedElementType = 'segment' | 'adjustment' | 'text' | 'transition' | null

export interface SelectedElement {
  type: SelectedElementType
  id: string
}
```

- [ ] **Step 2: Verify TypeScript accepts the file**
```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**
```bash
git add src/types/index.ts
git commit -m "feat: add core TypeScript types"
```

---

## Task 3: Zustand Store

**Files:**
- Create: `src/store/useAppStore.ts`

- [ ] **Step 1: Create store**

```typescript
// src/store/useAppStore.ts
import { create } from 'zustand'
import type {
  Clip, ClipId, Segment, SegmentId, AdjustmentLayer,
  Transition, TextOverlay, BpmConfig, ProjectSettings,
  ActiveTab, MediaSubTab, SelectedElement,
} from '../types'

interface AppState {
  // ─── Navigation ───
  activeTab: ActiveTab
  mediaSubTab: MediaSubTab
  selectedElement: SelectedElement | null

  // ─── Project ───
  projectName: string
  projectSettings: ProjectSettings

  // ─── Media library ───
  clips: Clip[]

  // ─── Timeline ───
  segments: Segment[]
  adjustmentLayers: AdjustmentLayer[]
  transitions: Transition[]
  textOverlays: TextOverlay[]
  playheadPosition: number  // seconds

  // ─── BPM tool ───
  bpmConfig: BpmConfig

  // ─── Actions ───
  setActiveTab: (tab: ActiveTab) => void
  setMediaSubTab: (tab: MediaSubTab) => void
  setSelectedElement: (el: SelectedElement | null) => void
  setProjectName: (name: string) => void
  updateProjectSettings: (settings: Partial<ProjectSettings>) => void

  addClip: (clip: Clip) => void
  removeClip: (id: ClipId) => void

  addSegment: (segment: Segment) => void
  removeSegment: (id: SegmentId) => void
  updateSegment: (id: SegmentId, patch: Partial<Segment>) => void
  addSegments: (segments: Segment[]) => void

  updateBpmConfig: (patch: Partial<BpmConfig>) => void
  setPlayheadPosition: (pos: number) => void
}

export const useAppStore = create<AppState>((set) => ({
  // ─── Navigation ───
  activeTab: 'media',
  mediaSubTab: 'videos',
  selectedElement: null,

  // ─── Project ───
  projectName: 'Untitled Project',
  projectSettings: {
    resolution: '1920x1080',
    fps: 30,
    format: 'mp4',
    autoDetectBpm: true,
    snapToBeat: true,
    hardwareAcceleration: false,
  },

  // ─── Media library ───
  clips: [],

  // ─── Timeline ───
  segments: [],
  adjustmentLayers: [],
  transitions: [],
  textOverlays: [],
  playheadPosition: 0,

  // ─── BPM tool ───
  bpmConfig: {
    bpm: 128,
    mode: 'random',
    segmentLength: 1,
    outputDuration: 30,
    outputUnit: 'seconds',
    selectedClipIds: [],
  },

  // ─── Actions ───
  setActiveTab: (tab) => set({ activeTab: tab }),
  setMediaSubTab: (tab) => set({ mediaSubTab: tab }),
  setSelectedElement: (el) => set({ selectedElement: el, activeTab: el ? 'inspector' : 'media' }),
  setProjectName: (name) => set({ projectName: name }),
  updateProjectSettings: (patch) =>
    set((s) => ({ projectSettings: { ...s.projectSettings, ...patch } })),

  addClip: (clip) => set((s) => ({ clips: [...s.clips, clip] })),
  removeClip: (id) => set((s) => ({ clips: s.clips.filter((c) => c.id !== id) })),

  addSegment: (segment) => set((s) => ({ segments: [...s.segments, segment] })),
  removeSegment: (id) => set((s) => ({ segments: s.segments.filter((seg) => seg.id !== id) })),
  updateSegment: (id, patch) =>
    set((s) => ({ segments: s.segments.map((seg) => seg.id === id ? { ...seg, ...patch } : seg) })),
  addSegments: (segments) => set((s) => ({ segments: [...s.segments, ...segments] })),

  updateBpmConfig: (patch) =>
    set((s) => ({ bpmConfig: { ...s.bpmConfig, ...patch } })),
  setPlayheadPosition: (pos) => set({ playheadPosition: pos }),
}))
```

- [ ] **Step 2: Verify no TypeScript errors**
```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**
```bash
git add src/store/useAppStore.ts
git commit -m "feat: add Zustand store"
```

---

## Task 4: File Handler & Thumbnail Lib

**Files:**
- Create: `src/lib/video/fileHandler.ts`
- Create: `src/lib/video/thumbnail.ts`

- [ ] **Step 1: Create fileHandler**

```typescript
// src/lib/video/fileHandler.ts
import { v4 as uuidv4 } from 'uuid'
import type { Clip } from '../../types'
import { generateThumbnail } from './thumbnail'

// Install uuid first: npm install uuid @types/uuid
export async function openVideoFiles(): Promise<File[]> {
  // File System Access API (Chrome 86+)
  if ('showOpenFilePicker' in window) {
    const handles = await (window as Window & typeof globalThis).showOpenFilePicker({
      multiple: true,
      types: [
        { description: 'Video files', accept: { 'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv'] } },
        { description: 'Audio files', accept: { 'audio/*': ['.mp3', '.wav', '.aac', '.ogg'] } },
        { description: 'Image files', accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'] } },
      ],
    })
    return Promise.all(handles.map((h: FileSystemFileHandle) => h.getFile()))
  }

  // Fallback: standard file input
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'video/*,audio/*,image/*'
    input.onchange = () => resolve(Array.from(input.files ?? []))
    input.click()
  })
}

export async function fileToClip(file: File): Promise<Clip> {
  const type = file.type.startsWith('video/') ? 'video'
    : file.type.startsWith('audio/') ? 'audio'
    : 'image'

  const id = uuidv4()

  if (type === 'video') {
    const { duration, width, height, thumbnail } = await getVideoMeta(file)
    return { id, file, name: file.name, duration, width, height, type, thumbnail }
  }

  if (type === 'audio') {
    const duration = await getAudioDuration(file)
    return { id, file, name: file.name, duration, width: 0, height: 0, type }
  }

  // image
  const thumbnail = URL.createObjectURL(file)
  return { id, file, name: file.name, duration: 5, width: 0, height: 0, type, thumbnail }
}

async function getVideoMeta(file: File): Promise<{ duration: number; width: number; height: number; thumbnail: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.src = url
    video.preload = 'metadata'
    video.onloadedmetadata = async () => {
      const { duration, videoWidth: width, videoHeight: height } = video
      const thumbnail = await generateThumbnail(video)
      URL.revokeObjectURL(url)
      resolve({ duration, width, height, thumbnail })
    }
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load video')) }
  })
}

async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio')
    const url = URL.createObjectURL(file)
    audio.src = url
    audio.onloadedmetadata = () => { resolve(audio.duration); URL.revokeObjectURL(url) }
    audio.onerror = () => { resolve(0); URL.revokeObjectURL(url) }
  })
}
```

- [ ] **Step 2: Install uuid**
```bash
npm install uuid @types/uuid
```

- [ ] **Step 3: Create thumbnail generator**

```typescript
// src/lib/video/thumbnail.ts

export function generateThumbnail(video: HTMLVideoElement): Promise<string> {
  return new Promise((resolve) => {
    const seekTo = Math.min(1, video.duration * 0.1)
    video.currentTime = seekTo
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = 320
      canvas.height = Math.round(320 / (video.videoWidth / video.videoHeight))
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
  })
}
```

- [ ] **Step 4: Verify no TypeScript errors**
```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 5: Commit**
```bash
git add src/lib/
git commit -m "feat: add file handler and thumbnail generator"
```

---

## Task 5: App Layout Shell

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Update `src/main.tsx`**

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 2: Create `src/App.tsx`**

```tsx
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
```

- [ ] **Step 3: Commit**
```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: app layout shell"
```

---

## Task 6: TopBar Component

**Files:**
- Create: `src/components/layout/TopBar.tsx`

- [ ] **Step 1: Create TopBar**

```tsx
// src/components/layout/TopBar.tsx
import { Undo2, Redo2, Save } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export default function TopBar() {
  const { projectName, setProjectName } = useAppStore()

  return (
    <div
      className="flex items-center justify-between px-3 border-b shrink-0"
      style={{ height: 48, background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Left: logo + project name */}
      <div className="flex items-center gap-2.5">
        <Logo />
        <span className="font-bold text-sm tracking-tight" style={{ background: 'linear-gradient(90deg,#EEEEF8,#A8A8C8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          BrowserCutter
        </span>
        <div className="w-px h-4 mx-1" style={{ background: 'var(--border)' }} />
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="bg-transparent border-b border-transparent text-sm outline-none transition-all duration-150 px-1 rounded"
          style={{ color: 'var(--muted)', width: 180 }}
          onFocus={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          onBlur={(e)  => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent' }}
        />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
        <IconBtn title="Undo"><Undo2 size={14} /></IconBtn>
        <IconBtn title="Redo"><Redo2 size={14} /></IconBtn>
        <div className="w-px h-4 mx-1" style={{ background: 'var(--border)' }} />
        <GhostBtn>
          <Save size={13} />
          Save
        </GhostBtn>
        <PrimaryBtn onClick={() => alert('Export not yet implemented')}>
          Export Video
        </PrimaryBtn>
      </div>
    </div>
  )
}

function Logo() {
  return (
    <div
      className="flex items-center justify-center rounded-lg shrink-0"
      style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#E11D48,#9C1EAB)', boxShadow: '0 4px 12px rgba(225,29,72,0.4)' }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/>
        <line x1="6" y1="8.5" x2="6" y2="21"/><line x1="18" y1="3" x2="18" y2="15.5"/>
        <line x1="6" y1="14" x2="18" y2="10"/>
      </svg>
    </div>
  )
}

function IconBtn({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <button
      title={title}
      className="flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer"
      style={{ width: 28, height: 28, color: 'var(--muted)', background: 'transparent', border: 'none' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}
    >
      {children}
    </button>
  )
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer"
      style={{ padding: '6px 12px', color: 'var(--muted2)', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted2)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
    >
      {children}
    </button>
  )
}

function PrimaryBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg text-sm font-semibold text-white cursor-pointer transition-all duration-200"
      style={{ padding: '7px 16px', background: 'linear-gradient(135deg,#E11D48,#C41232)', border: 'none', boxShadow: '0 4px 14px rgba(225,29,72,0.35)' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 22px rgba(225,29,72,0.5)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 14px rgba(225,29,72,0.35)' }}
      onMouseDown={(e)  => { e.currentTarget.style.transform = 'scale(0.97)' }}
      onMouseUp={(e)    => { e.currentTarget.style.transform = 'translateY(-1px)' }}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```
Expected: TopBar renders with logo, project name input, undo/redo buttons, Export button.

- [ ] **Step 3: Commit**
```bash
git add src/components/layout/TopBar.tsx
git commit -m "feat: TopBar component"
```

---

## Task 7: IconSidebar Component

**Files:**
- Create: `src/components/layout/IconSidebar.tsx`

- [ ] **Step 1: Create IconSidebar**

```tsx
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
      style={{ width: 50, background: 'var(--surface)', borderColor: 'var(--border)' }}
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
      : 'var(--muted)',
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
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' } }}
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
```

- [ ] **Step 2: Verify in browser**

Expected: 6 icons in sidebar, BPM icon has red dot, clicking switches active state.

- [ ] **Step 3: Commit**
```bash
git add src/components/layout/IconSidebar.tsx
git commit -m "feat: IconSidebar with tab switching"
```

---

## Task 8: LeftPanel Shell + All Panels

**Files:**
- Create: `src/components/layout/LeftPanel.tsx`
- Create: `src/components/panels/TextPanel.tsx`
- Create: `src/components/panels/EffectsPanel.tsx`
- Create: `src/components/panels/TransitionsPanel.tsx`
- Create: `src/components/panels/SettingsPanel.tsx`
- Create: `src/components/panels/InspectorPanel.tsx`

- [ ] **Step 1: Create LeftPanel shell**

```tsx
// src/components/layout/LeftPanel.tsx
import { useAppStore } from '../../store/useAppStore'
import MediaPanel from '../panels/MediaPanel/MediaPanel'
import TextPanel from '../panels/TextPanel'
import EffectsPanel from '../panels/EffectsPanel'
import TransitionsPanel from '../panels/TransitionsPanel'
import BpmPanel from '../panels/BpmPanel'
import SettingsPanel from '../panels/SettingsPanel'
import InspectorPanel from '../panels/InspectorPanel'

export default function LeftPanel() {
  const { activeTab } = useAppStore()

  return (
    <div
      className="flex flex-col border-r overflow-hidden shrink-0"
      style={{ width: 284, background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {activeTab === 'media'       && <MediaPanel />}
      {activeTab === 'text'        && <TextPanel />}
      {activeTab === 'effects'     && <EffectsPanel />}
      {activeTab === 'transitions' && <TransitionsPanel />}
      {activeTab === 'bpm'         && <BpmPanel />}
      {activeTab === 'settings'    && <SettingsPanel />}
      {activeTab === 'inspector'   && <InspectorPanel />}
    </div>
  )
}
```

- [ ] **Step 2: Create TextPanel**

```tsx
// src/components/panels/TextPanel.tsx
import { Type, FileText } from 'lucide-react'

export default function TextPanel() {
  return (
    <div className="flex flex-col gap-3 p-3.5 overflow-y-auto h-full">
      <PanelLabel>Text & Subtitles</PanelLabel>
      <GhostAction icon={<Type size={13} />} label="Add Text Overlay" onClick={() => alert('Phase 2')} />
      <GhostAction icon={<FileText size={13} />} label="Import .srt File" onClick={() => alert('Phase 2')} />
      <p className="text-xs" style={{ color: 'var(--muted)' }}>No text or subtitles added yet.</p>
    </div>
  )
}

function GhostAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 w-full rounded-lg text-sm transition-all duration-150 cursor-pointer"
      style={{ padding: '10px 12px', color: 'var(--muted2)', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(225,29,72,0.5)'; e.currentTarget.style.color = 'var(--text)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'var(--muted2)' }}
    >
      {icon} {label}
    </button>
  )
}

export function PanelLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{children}</p>
}
```

- [ ] **Step 3: Create EffectsPanel**

```tsx
// src/components/panels/EffectsPanel.tsx
import { Sun, CircleHalf, Droplets, Blend, Circle, Zap, ScanLine } from 'lucide-react'
import { PanelLabel } from './TextPanel'
import type { EffectType } from '../../types'

const EFFECTS: { type: EffectType; label: string; icon: React.ReactNode }[] = [
  { type: 'brightness',  label: 'Brightness / Exposure', icon: <Sun size={13} /> },
  { type: 'contrast',    label: 'Contrast',               icon: <CircleHalf size={13} /> },
  { type: 'saturation',  label: 'Saturation',             icon: <Droplets size={13} /> },
  { type: 'grayscale',   label: 'Black & White',          icon: <Blend size={13} /> },
  { type: 'blur',        label: 'Blur',                   icon: <Circle size={13} /> },
  { type: 'vignette',    label: 'Vignette',               icon: <ScanLine size={13} /> },
  { type: 'sharpen',     label: 'Sharpen',                icon: <Zap size={13} /> },
]

export default function EffectsPanel() {
  return (
    <div className="flex flex-col gap-3 p-3.5 overflow-y-auto h-full">
      <PanelLabel>Effects</PanelLabel>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>Click to apply to selected clip</p>
      <div className="flex flex-col gap-0.5">
        {EFFECTS.map((e) => (
          <EffectRow key={e.type} icon={e.icon} label={e.label} onClick={() => alert(`Apply ${e.label} — Phase 2`)} />
        ))}
      </div>
      <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <PanelLabel>Adjustment Layer</PanelLabel>
        <button
          className="w-full mt-2 rounded-lg text-xs cursor-pointer transition-all duration-150"
          style={{ padding: '9px', color: '#EF4444', background: 'transparent', border: '1px dashed rgba(239,68,68,0.3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.6)'; e.currentTarget.style.background = 'rgba(239,68,68,0.05)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.background = 'transparent' }}
          onClick={() => alert('Phase 2')}
        >
          + Add Adjustment Layer
        </button>
      </div>
    </div>
  )
}

function EffectRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full rounded-lg text-sm text-left cursor-pointer transition-all duration-150"
      style={{ padding: '8px 10px', color: 'var(--muted2)', background: 'transparent', border: '1px solid transparent' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted2)'; e.currentTarget.style.borderColor = 'transparent' }}
    >
      {icon} {label}
    </button>
  )
}
```

- [ ] **Step 4: Create TransitionsPanel**

```tsx
// src/components/panels/TransitionsPanel.tsx
import { PanelLabel } from './TextPanel'
import type { TransitionType } from '../../types'

const TRANSITIONS: { type: TransitionType; label: string; symbol: string }[] = [
  { type: 'cut',      label: 'Cut',      symbol: '▶' },
  { type: 'fade',     label: 'Fade',     symbol: 'A→B' },
  { type: 'wipe',     label: 'Wipe',     symbol: '|→' },
  { type: 'zoom',     label: 'Zoom',     symbol: '⊕' },
  { type: 'slide',    label: 'Slide',    symbol: '↗' },
  { type: 'dissolve', label: 'Dissolve', symbol: '◈' },
]

export default function TransitionsPanel() {
  return (
    <div className="flex flex-col gap-3 p-3.5 overflow-y-auto h-full">
      <PanelLabel>Transitions</PanelLabel>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>Drag between two clips on the timeline</p>
      <div className="grid grid-cols-2 gap-2">
        {TRANSITIONS.map((t) => (
          <TransCard key={t.type} label={t.label} symbol={t.symbol} onClick={() => alert(`${t.label} — Phase 2`)} />
        ))}
      </div>
    </div>
  )
}

function TransCard({ label, symbol, onClick }: { label: string; symbol: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center rounded-lg cursor-pointer transition-all duration-180"
      style={{ padding: '12px 8px', background: 'var(--surface2)', border: '1px solid var(--border)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(225,29,72,0.5)'; e.currentTarget.style.background = 'rgba(225,29,72,0.05)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.transform = '' }}
    >
      <span className="text-sm mb-1" style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>{symbol}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}
```

- [ ] **Step 5: Create SettingsPanel**

```tsx
// src/components/panels/SettingsPanel.tsx
import { PanelLabel } from './TextPanel'
import { useAppStore } from '../../store/useAppStore'

export default function SettingsPanel() {
  const { projectSettings, updateProjectSettings } = useAppStore()

  return (
    <div className="flex flex-col gap-3 p-3.5 overflow-y-auto h-full">
      <PanelLabel>Settings</PanelLabel>
      <div className="flex flex-col">
        <SettingRow label="Resolution" sub="Output video size">
          <select
            className="inp"
            value={projectSettings.resolution}
            onChange={(e) => updateProjectSettings({ resolution: e.target.value as typeof projectSettings.resolution })}
          >
            <option value="1920x1080">1920×1080</option>
            <option value="3840x2160">3840×2160</option>
            <option value="1280x720">1280×720</option>
          </select>
        </SettingRow>
        <SettingRow label="Frame Rate" sub="FPS">
          <select
            className="inp"
            value={projectSettings.fps}
            onChange={(e) => updateProjectSettings({ fps: Number(e.target.value) as typeof projectSettings.fps })}
          >
            <option value={24}>24 fps</option>
            <option value={30}>30 fps</option>
            <option value={60}>60 fps</option>
          </select>
        </SettingRow>
        <SettingRow label="Format" sub="Export format">
          <select
            className="inp"
            value={projectSettings.format}
            onChange={(e) => updateProjectSettings({ format: e.target.value as typeof projectSettings.format })}
          >
            <option value="mp4">MP4</option>
            <option value="webm">WebM</option>
          </select>
        </SettingRow>
        <SettingRow label="Auto-detect BPM" sub="On upload">
          <Toggle
            on={projectSettings.autoDetectBpm}
            onChange={(v) => updateProjectSettings({ autoDetectBpm: v })}
          />
        </SettingRow>
        <SettingRow label="Snap to Beat" sub="Timeline snapping">
          <Toggle
            on={projectSettings.snapToBeat}
            onChange={(v) => updateProjectSettings({ snapToBeat: v })}
          />
        </SettingRow>
        <SettingRow label="Hardware Accel." sub="GPU when available">
          <Toggle
            on={projectSettings.hardwareAcceleration}
            onChange={(v) => updateProjectSettings({ hardwareAcceleration: v })}
          />
        </SettingRow>
      </div>
    </div>
  )
}

function SettingRow({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{sub}</p>
      </div>
      {children}
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="cursor-pointer shrink-0 transition-all duration-200"
      style={{
        width: 34, height: 19, borderRadius: 99,
        position: 'relative',
        background: on ? '#E11D48' : 'var(--surface3)',
        border: `1px solid ${on ? '#E11D48' : 'rgba(255,255,255,0.12)'}`,
        boxShadow: on ? '0 0 8px rgba(225,29,72,0.4)' : 'none',
      }}
    >
      <span
        className="absolute rounded-full transition-all duration-200"
        style={{
          top: 2, left: on ? 17 : 2,
          width: 13, height: 13,
          background: on ? 'white' : 'var(--muted2)',
          boxShadow: on ? '0 2px 6px rgba(225,29,72,0.5)' : 'none',
        }}
      />
    </button>
  )
}
```

Add to `src/index.css`:
```css
.inp {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 7px 10px;
  font-size: 12px;
  color: var(--text);
  outline: none;
  font-family: inherit;
  width: 100%;
  transition: border-color 180ms, box-shadow 180ms;
  cursor: pointer;
}
.inp:focus { border-color: rgba(225,29,72,0.5); box-shadow: 0 0 0 3px rgba(225,29,72,0.1); }
```

- [ ] **Step 6: Create InspectorPanel**

```tsx
// src/components/panels/InspectorPanel.tsx
import { useAppStore } from '../../store/useAppStore'
import { PanelLabel } from './TextPanel'

const CLIP_COLORS: Record<string, { bg: string; color: string }> = {
  video: { bg: 'rgba(124,58,237,0.15)', color: '#A78BFA' },
  audio: { bg: 'rgba(225,29,72,0.15)',  color: '#F43F5E' },
  image: { bg: 'rgba(5,150,105,0.15)',  color: '#34D399' },
}

export default function InspectorPanel() {
  const { selectedElement, segments, clips, updateSegment } = useAppStore()

  if (!selectedElement) {
    return (
      <div className="flex flex-col gap-3 p-3.5 h-full items-center justify-center">
        <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>Select a clip on the timeline to inspect it</p>
      </div>
    )
  }

  const segment = segments.find((s) => s.id === selectedElement.id)
  const clip = segment ? clips.find((c) => c.id === segment.clipId) : null

  if (!segment || !clip) return null

  const style = CLIP_COLORS[clip.type] ?? CLIP_COLORS.video
  const duration = segment.outPoint - segment.inPoint

  return (
    <div className="flex flex-col gap-4 p-3.5 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <PanelLabel>Inspector</PanelLabel>
        <span className="text-xs font-semibold rounded px-2 py-0.5" style={{ background: style.bg, color: style.color }}>{clip.name}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="In Point">
          <InpField value={formatTime(segment.inPoint)} onChange={(v) => updateSegment(segment.id, { inPoint: parseTime(v) })} />
        </Field>
        <Field label="Out Point">
          <InpField value={formatTime(segment.outPoint)} onChange={(v) => updateSegment(segment.id, { outPoint: parseTime(v) })} />
        </Field>
      </div>
      <Field label="Duration">
        <InpField value={formatTime(duration)} readOnly />
      </Field>

      <div style={{ height: 1, background: 'var(--border)' }} />

      <Field label="Volume">
        <input type="range" min={0} max={100} defaultValue={100} className="w-full" style={{ accentColor: '#E11D48' }} />
      </Field>
      <Field label="Speed">
        <input type="range" min={25} max={400} defaultValue={100} className="w-full" style={{ accentColor: '#E11D48' }} />
      </Field>

      <div style={{ height: 1, background: 'var(--border)' }} />

      <div>
        <PanelLabel>Applied Effects</PanelLabel>
        <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>No effects applied.</p>
        <button className="text-xs mt-2 cursor-pointer transition-colors" style={{ color: '#E11D48', background: 'transparent', border: 'none' }}>+ Add Effect</button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{label}</label>
      {children}
    </div>
  )
}

function InpField({ value, readOnly, onChange }: { value: string; readOnly?: boolean; onChange?: (v: string) => void }) {
  return (
    <input
      className="inp"
      value={value}
      readOnly={readOnly}
      style={{ opacity: readOnly ? 0.5 : 1, cursor: readOnly ? 'default' : 'text' }}
      onChange={(e) => onChange?.(e.target.value)}
    />
  )
}

function formatTime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec.toFixed(2)).padStart(5,'0')}`
}

function parseTime(str: string): number {
  const parts = str.split(':')
  if (parts.length !== 3) return 0
  return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2])
}
```

- [ ] **Step 7: Verify all panels render**

Click each tab icon — each panel should appear. No console errors.

- [ ] **Step 8: Commit**
```bash
git add src/components/layout/LeftPanel.tsx src/components/panels/
git commit -m "feat: all panel components — Text, Effects, Transitions, Settings, Inspector"
```

---

## Task 9: MediaPanel with Upload

**Files:**
- Create: `src/components/panels/MediaPanel/UploadZone.tsx`
- Create: `src/components/panels/MediaPanel/VideoGrid.tsx`
- Create: `src/components/panels/MediaPanel/MusicList.tsx`
- Create: `src/components/panels/MediaPanel/ImageGrid.tsx`
- Create: `src/components/panels/MediaPanel/MediaPanel.tsx`

- [ ] **Step 1: Create UploadZone**

```tsx
// src/components/panels/MediaPanel/UploadZone.tsx
import { Upload } from 'lucide-react'
import { openVideoFiles, fileToClip } from '../../../lib/video/fileHandler'
import { useAppStore } from '../../../store/useAppStore'

export default function UploadZone() {
  const addClip = useAppStore((s) => s.addClip)

  async function handleUpload() {
    const files = await openVideoFiles()
    for (const file of files) {
      const clip = await fileToClip(file)
      addClip(clip)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    Promise.all(files.map(fileToClip)).then((clips) => clips.forEach(addClip))
  }

  return (
    <button
      onClick={handleUpload}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="w-full text-center rounded-xl cursor-pointer transition-all duration-200"
      style={{ padding: '18px 12px', border: '1.5px dashed rgba(255,255,255,0.12)', background: 'transparent' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(225,29,72,0.5)'; e.currentTarget.style.background = 'rgba(225,29,72,0.04)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'transparent' }}
    >
      <Upload size={20} className="mx-auto mb-2" style={{ color: 'var(--muted)' }} />
      <p className="text-xs" style={{ color: 'var(--muted2)' }}>
        Drop files or <span style={{ color: '#E11D48' }}>browse</span>
      </p>
    </button>
  )
}
```

- [ ] **Step 2: Create VideoGrid**

```tsx
// src/components/panels/MediaPanel/VideoGrid.tsx
import { Play } from 'lucide-react'
import type { Clip } from '../../../types'

export default function VideoGrid({ clips }: { clips: Clip[] }) {
  if (clips.length === 0) {
    return <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>No videos yet. Upload some above.</p>
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {clips.map((clip) => <VideoThumb key={clip.id} clip={clip} />)}
    </div>
  )
}

const CLIP_BG: Record<string, string> = {
  a: 'rgba(124,58,237,0.2)', b: 'rgba(8,145,178,0.2)', c: 'rgba(5,150,105,0.2)',
}

function VideoThumb({ clip }: { clip: Clip }) {
  return (
    <div
      className="rounded-lg overflow-hidden cursor-pointer transition-all duration-200"
      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      <div className="relative flex items-center justify-center" style={{ aspectRatio: '16/9', background: 'rgba(124,58,237,0.15)' }}>
        {clip.thumbnail
          ? <img src={clip.thumbnail} alt={clip.name} className="absolute inset-0 w-full h-full object-cover" />
          : <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.5)' }}>
              <Play size={12} fill="white" color="white" />
            </div>
        }
        <span className="absolute bottom-1 right-1 text-white text-xs font-mono" style={{ background: 'rgba(0,0,0,0.65)', padding: '1px 5px', borderRadius: 3 }}>
          {formatDuration(clip.duration)}
        </span>
      </div>
      <div style={{ padding: '6px 8px' }}>
        <p className="text-xs font-medium truncate">{clip.name}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{clip.width}×{clip.height}</p>
      </div>
    </div>
  )
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}
```

- [ ] **Step 3: Create MusicList**

```tsx
// src/components/panels/MediaPanel/MusicList.tsx
import { Music } from 'lucide-react'
import type { Clip } from '../../../types'

export default function MusicList({ clips }: { clips: Clip[] }) {
  if (clips.length === 0) {
    return <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>No audio files yet.</p>
  }

  return (
    <div className="flex flex-col gap-1">
      {clips.map((clip) => (
        <div
          key={clip.id}
          className="flex items-center gap-2.5 rounded-lg cursor-pointer transition-all duration-150"
          style={{ padding: '8px 10px', border: '1px solid transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
        >
          <div className="rounded-lg flex items-center justify-center shrink-0" style={{ width: 32, height: 32, background: 'rgba(225,29,72,0.15)' }}>
            <Music size={14} color="#F43F5E" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{clip.name}</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {Math.floor(clip.duration / 60)}:{String(Math.floor(clip.duration % 60)).padStart(2,'0')}
              {clip.bpm ? ` · ${clip.bpm} BPM` : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create ImageGrid**

```tsx
// src/components/panels/MediaPanel/ImageGrid.tsx
import type { Clip } from '../../../types'

export default function ImageGrid({ clips }: { clips: Clip[] }) {
  if (clips.length === 0) {
    return <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>No images yet.</p>
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {clips.map((clip) => (
        <div
          key={clip.id}
          className="rounded-lg overflow-hidden cursor-pointer transition-all duration-200"
          style={{ border: '1px solid var(--border)', aspectRatio: '1' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          {clip.thumbnail && <img src={clip.thumbnail} alt={clip.name} className="w-full h-full object-cover" />}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create MediaPanel**

```tsx
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
```

- [ ] **Step 6: Test file upload**

Open app → Media tab → click upload zone → select a video file.
Expected: thumbnail appears in grid, clip stored in Zustand.

- [ ] **Step 7: Commit**
```bash
git add src/components/panels/MediaPanel/ src/lib/
git commit -m "feat: MediaPanel with Videos/Music/Images sub-tabs and file upload"
```

---

## Task 10: BpmPanel

**Files:**
- Create: `src/components/panels/BpmPanel.tsx`

- [ ] **Step 1: Create BpmPanel**

```tsx
// src/components/panels/BpmPanel.tsx
import { useAppStore } from '../../store/useAppStore'
import { PanelLabel } from './TextPanel'
import type { BpmMode, SegmentLength } from '../../types'

const MODES: { id: BpmMode; label: string; example: string }[] = [
  { id: 'sequential', label: 'Sequential', example: 'A→B→C→A→B→C' },
  { id: 'random',     label: 'Random',     example: 'ACBBA...'      },
  { id: 'forfeit',    label: 'Forfeit',     example: 'AB→BC→CD'     },
]

const SEGMENT_LENGTHS: { value: SegmentLength; label: string }[] = [
  { value: 0.5, label: '½ Beat' },
  { value: 1,   label: '1 Beat' },
  { value: 2,   label: '2 Beats' },
  { value: 4,   label: '4 Beats' },
]

export default function BpmPanel() {
  const { bpmConfig, clips, updateBpmConfig } = useAppStore()
  const videoCli = clips.filter((c) => c.type === 'video')

  return (
    <div className="flex flex-col gap-4 p-3.5 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#E11D48', display: 'inline-block', animation: 'pulse-dot 1.8s ease-in-out infinite' }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#F43F5E' }}>BPM Cutting Tool</span>
      </div>

      {/* Clip selection */}
      <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
        <PanelLabel>Select Source Clips</PanelLabel>
        {videoCli.length === 0 && <p className="text-xs" style={{ color: 'var(--muted)' }}>Upload video clips in the Media tab first.</p>}
        {videoCli.map((clip) => (
          <label key={clip.id} className="flex items-center gap-2.5 cursor-pointer py-1.5 text-xs" style={{ fontSize: 12 }}>
            <input
              type="checkbox"
              style={{ accentColor: '#E11D48' }}
              checked={bpmConfig.selectedClipIds.includes(clip.id)}
              onChange={(e) => {
                const ids = e.target.checked
                  ? [...bpmConfig.selectedClipIds, clip.id]
                  : bpmConfig.selectedClipIds.filter((id) => id !== clip.id)
                updateBpmConfig({ selectedClipIds: ids })
              }}
            />
            <span className="rounded" style={{ width: 9, height: 9, background: '#7C3AED', flexShrink: 0 }} />
            <span className="flex-1 truncate">{clip.name}</span>
            <span style={{ color: 'var(--muted)' }}>{Math.floor(clip.duration / 60)}:{String(Math.floor(clip.duration % 60)).padStart(2,'0')}</span>
          </label>
        ))}
      </div>

      {/* BPM */}
      <div>
        <PanelLabel style={{ marginBottom: 8 }}>BPM</PanelLabel>
        <div className="flex gap-2">
          <input
            type="number"
            className="inp"
            style={{ width: 80 }}
            value={bpmConfig.bpm}
            min={20} max={300}
            onChange={(e) => updateBpmConfig({ bpm: Number(e.target.value) })}
          />
          <button
            className="flex-1 rounded-lg text-xs cursor-pointer transition-all duration-150"
            style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'var(--muted2)' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(225,29,72,0.5)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'var(--muted2)' }}
            onClick={() => alert('BPM detection — Phase 2')}
          >
            Auto-Detect
          </button>
        </div>
      </div>

      {/* Mode */}
      <div>
        <PanelLabel>Cutting Mode</PanelLabel>
        <div className="flex flex-col gap-1.5 mt-2">
          {MODES.map((m) => {
            const selected = bpmConfig.mode === m.id
            return (
              <button
                key={m.id}
                onClick={() => updateBpmConfig({ mode: m.id })}
                className="flex items-start gap-2.5 rounded-lg p-2.5 cursor-pointer text-left transition-all duration-150"
                style={{
                  border: `1px solid ${selected ? 'rgba(225,29,72,0.5)' : 'var(--border)'}`,
                  background: selected ? 'rgba(225,29,72,0.06)' : 'var(--surface2)',
                  boxShadow: selected ? '0 0 0 1px rgba(225,29,72,0.15)' : 'none',
                }}
              >
                <input type="radio" name="bpm-mode" readOnly checked={selected} style={{ accentColor: '#E11D48', marginTop: 2 }} />
                <div>
                  <p className="text-xs font-medium">{m.label}</p>
                  <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--muted)' }}>{m.example}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Segment length + output */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <PanelLabel>Segment</PanelLabel>
          <select
            className="inp mt-1.5"
            value={bpmConfig.segmentLength}
            onChange={(e) => updateBpmConfig({ segmentLength: Number(e.target.value) as SegmentLength })}
          >
            {SEGMENT_LENGTHS.map((sl) => <option key={sl.value} value={sl.value}>{sl.label}</option>)}
          </select>
        </div>
        <div>
          <PanelLabel>Output</PanelLabel>
          <div className="flex gap-1 mt-1.5">
            <input
              type="number"
              className="inp"
              style={{ width: 52 }}
              value={bpmConfig.outputDuration}
              min={1}
              onChange={(e) => updateBpmConfig({ outputDuration: Number(e.target.value) })}
            />
            <select
              className="inp"
              style={{ paddingLeft: 6, paddingRight: 6 }}
              value={bpmConfig.outputUnit}
              onChange={(e) => updateBpmConfig({ outputUnit: e.target.value as 'seconds' | 'beats' })}
            >
              <option value="seconds">sec</option>
              <option value="beats">beats</option>
            </select>
          </div>
        </div>
      </div>

      {/* Generate button */}
      <button
        className="w-full rounded-xl font-bold text-sm text-white cursor-pointer transition-all duration-220 relative overflow-hidden"
        style={{ padding: 13, background: 'linear-gradient(135deg,#E11D48,#9C1EAB)', border: 'none', boxShadow: '0 4px 20px rgba(225,29,72,0.4), 0 4px 20px rgba(156,30,171,0.2)' }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(225,29,72,0.55)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(225,29,72,0.4)' }}
        onMouseDown={(e)  => { e.currentTarget.style.transform = 'scale(0.98)' }}
        onMouseUp={(e)    => { e.currentTarget.style.transform = 'translateY(-2px)' }}
        onClick={() => alert('Generate Cut — Phase 2')}
      >
        Generate Cut
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify BPM panel renders**

Click BPM tab — panel appears, BPM input responds, mode cards switch selection.

- [ ] **Step 3: Commit**
```bash
git add src/components/panels/BpmPanel.tsx
git commit -m "feat: BpmPanel — fully wired to store (Generate stubbed)"
```

---

## Task 11: Static Preview & Timeline

**Files:**
- Create: `src/components/preview/VideoPreview.tsx`
- Create: `src/components/preview/PlaybackControls.tsx`
- Create: `src/components/timeline/TimeRuler.tsx`
- Create: `src/components/timeline/ClipBlock.tsx`
- Create: `src/components/timeline/Track.tsx`
- Create: `src/components/timeline/Timeline.tsx`

- [ ] **Step 1: Create VideoPreview**

```tsx
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
```

- [ ] **Step 2: Create PlaybackControls**

```tsx
// src/components/preview/PlaybackControls.tsx
import { SkipBack, Play, SkipForward, Volume2 } from 'lucide-react'

export default function PlaybackControls() {
  return (
    <div
      className="flex items-center gap-2.5 px-4 shrink-0"
      style={{ height: 46, background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
    >
      <IconBtn><SkipBack size={14} fill="currentColor" /></IconBtn>
      <PlayBtn />
      <IconBtn><SkipForward size={14} fill="currentColor" /></IconBtn>
      <span className="text-xs font-mono shrink-0" style={{ color: 'var(--muted)' }}>00:00:00</span>
      <SeekBar />
      <span className="text-xs font-mono shrink-0" style={{ color: 'var(--muted)' }}>00:00:00</span>
      <IconBtn><Volume2 size={14} /></IconBtn>
    </div>
  )
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button
      className="flex items-center justify-center rounded-md cursor-pointer transition-all duration-150"
      style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: 'var(--muted)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}
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
```

- [ ] **Step 3: Create TimeRuler**

```tsx
// src/components/timeline/TimeRuler.tsx
const MARKS = Array.from({ length: 8 }, (_, i) => i * 5) // 0:00, 0:05, 0:10 ...

export default function TimeRuler({ trackLabelWidth }: { trackLabelWidth: number }) {
  return (
    <div
      className="flex sticky top-0 z-10 shrink-0"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', userSelect: 'none' }}
    >
      <div style={{ minWidth: trackLabelWidth, width: trackLabelWidth }} />
      <div className="flex" style={{ color: '#35354A', fontSize: 9, fontFamily: 'monospace' }}>
        {MARKS.map((s) => (
          <span key={s} style={{ minWidth: 100, width: 100, paddingLeft: 4, paddingTop: 4, paddingBottom: 4 }}>
            {`0:${String(s).padStart(2,'0')}`}
          </span>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create ClipBlock**

```tsx
// src/components/timeline/ClipBlock.tsx
import type { Segment, Clip } from '../../types'
import { useAppStore } from '../../store/useAppStore'

const CLIP_COLORS: Record<string, string> = {
  a: 'linear-gradient(135deg,#5B21B6,#7C3AED)',
  b: 'linear-gradient(135deg,#0C5F78,#0891B2)',
  c: 'linear-gradient(135deg,#065F46,#059669)',
}

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

  const label = clip.name.replace(/\.[^.]+$/, '').slice(0, 1).toUpperCase()
  const bgKey = Object.keys(CLIP_COLORS)[clip.id.charCodeAt(0) % 3]
  const bg    = CLIP_COLORS[bgKey as keyof typeof CLIP_COLORS]

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
```

- [ ] **Step 5: Create Track**

```tsx
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
        style={{ minWidth: trackLabelWidth, width: trackLabelWidth, fontSize: 10, color: 'var(--muted)' }}
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
```

- [ ] **Step 6: Create Timeline**

```tsx
// src/components/timeline/Timeline.tsx
import { useState } from 'react'
import { Film, Type, Volume2 } from 'lucide-react'
import TimeRuler from './TimeRuler'
import Track from './Track'

const TRACK_LABEL_WIDTH = 78

export default function Timeline() {
  const [zoom, setZoom] = useState(1)

  return (
    <div
      className="flex flex-col shrink-0"
      style={{ height: 205, background: 'var(--bg)', borderTop: '1px solid var(--border)' }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-2.5 shrink-0"
        style={{ height: 30, background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--muted)', fontSize: 10 }}>Timeline</span>
          <button
            className="text-xs rounded cursor-pointer transition-all duration-150"
            style={{ padding: '2px 8px', color: 'var(--muted2)', background: 'transparent', border: '1px solid var(--border)' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(225,29,72,0.5)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted2)' }}
          >
            + Track
          </button>
        </div>
        <input type="range" min={0.5} max={5} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ width: 72, accentColor: '#E11D48', cursor: 'pointer' }} />
      </div>

      {/* Scrollable tracks */}
      <div className="flex-1 overflow-auto relative">
        <TimeRuler trackLabelWidth={TRACK_LABEL_WIDTH} />
        <div style={{ position: 'relative' }}>
          {/* Playhead */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: TRACK_LABEL_WIDTH + 80, width: 1.5, background: '#E11D48', zIndex: 20, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: -2, left: -5, width: 12, height: 8, background: '#E11D48', clipPath: 'polygon(0 0, 100% 0, 50% 100%)', borderRadius: 2 }} />
          </div>

          <Track trackIndex={0} label="V1" icon={<Film size={9} />} height={38} zoom={zoom} trackLabelWidth={TRACK_LABEL_WIDTH} />
          <Track trackIndex={1} label="Text" icon={<Type size={9} />} height={26} zoom={zoom} trackLabelWidth={TRACK_LABEL_WIDTH} />

          {/* Audio track (static) */}
          <div className="flex items-center" style={{ height: 28 }}>
            <div className="flex items-center gap-1 px-2 shrink-0" style={{ minWidth: TRACK_LABEL_WIDTH, width: TRACK_LABEL_WIDTH, fontSize: 10, color: 'var(--muted)' }}>
              <Volume2 size={9} /> Audio
            </div>
            <div style={{ position: 'relative', height: 18, width: 700, borderRadius: 4, overflow: 'hidden', margin: '5px 0', background: '#0A1A12' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg,#1A4A2A 0,#2E7040 3px,#1A4A2A 6px)', opacity: 0.65 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Final verification**

```bash
npm run dev
```
Expected: Full app renders — TopBar, IconSidebar (6 icons), LeftPanel (all tabs work), VideoPreview, PlaybackControls, Timeline. No console errors. Upload a video → it appears in Media grid.

- [ ] **Step 8: Final commit**
```bash
git add src/components/preview/ src/components/timeline/
git commit -m "feat: VideoPreview, PlaybackControls, and Timeline — Phase 1 complete"
```

---

## Phase 1 Complete ✓

**What works after Phase 1:**
- Full app layout matching the approved mockup
- All 6 tabs with their panels (static where noted)
- Media upload: drag-and-drop + file picker, thumbnails auto-generated
- Clips stored in Zustand, persisted across tab switches
- BPM panel fully wired to store (Generate button stubbed)
- Settings panel with working toggles
- Inspector panel reads selected segment from store
- Timeline renders clips from Zustand state
- Clicking a clip on the timeline opens Inspector

**Phase 2 covers:** HTML5 video preview + playback, BPM detection (Web Audio API), cutting algorithms (Sequential/Random/Forfeit), drag clips to timeline, Generate Cut working end-to-end.

**Phase 3 covers:** Effects application, Adjustment Layers, Transitions, FFmpeg.wasm export.
