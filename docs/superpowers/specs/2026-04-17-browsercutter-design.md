# BrowserCutter — Design Spec
**Date:** 2026-04-17

## Overview

A web-based video editor with WebAssembly-powered export, running entirely client-side. The defining feature is a BPM-based cutting tool that automatically slices multiple video clips into beat-aligned segments and assembles them in the timeline using configurable modes (Sequential, Random, Forfeit). The UI is modeled after VEED.io — dark, professional, multi-panel.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React + TypeScript |
| UI Components | shadcn/ui + Tailwind CSS |
| State Management | Zustand |
| Video Preview | HTML5 Video elements (native, no encoding) |
| Large File Handling | File System Access API (no full RAM load) |
| BPM Detection | Web Audio API |
| Export | FFmpeg.wasm in Web Worker |

**Core principle:** Video files are never fully loaded into RAM. The File System Access API provides a file handle; HTML5 Video elements seek within it natively. FFmpeg.wasm is invoked only at export time, running in an isolated Web Worker so the UI stays responsive.

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  [Project Name]                     [Export Button]  │  ← Top Bar
├────┬─────────┬───────────────────────────────────────────────┤
│    │         │                                               │
│Icons│  PANEL  │              VIDEO PREVIEW                   │
│    │(Tab or  │                                               │
│[M] │Inspector│         ┌─────────────────┐                  │
│[T] │depending│         │   Video Canvas  │                  │
│[E] │on select│         └─────────────────┘                  │
│[Tr]│ -ion)   │      [◀◀] [Play] [▶▶]  00:00 / 02:34        │
│[B] │         │                                               │
│    │         ├───────────────────────────────────────────────┤
│    │         │                  TIMELINE                     │
│    │         │  Track N  │▓▓▓░░░▓▓▓░░▓▓░░░│                 │
│    │         │  ...      │                │                 │
│    │         │  Audio    │~~~~~~~~~~~~~~~~│                 │
│    │         │           [zoom slider]    │                 │
└────┴─────────┴───────────────────────────────────────────────┘
```

**Left Icon Sidebar:** 5 permanent tab icons (Media, Text, Effects, Transitions, BPM Tool).

**Left Panel (context-switching):**
- Default: shows the content of the active tab
- When a timeline element is selected: switches to the **Inspector** for that element
- Clicking a tab icon restores the tab content

**Top Bar:** Logo, project name (editable), Export button always visible.

**Preview Area:** Large canvas with play/pause/seek controls below.

**Timeline:** Multi-track, horizontally scrollable, zoomable. Clips are draggable and resizable.

---

## Tabs

### Media Tab
- Drag & drop upload zone or file picker
- Grid of loaded clips with thumbnail and duration
- Clips can be dragged directly onto the timeline

### Text / Subtitles Tab
- Add text overlay elements (appear as clips on a dedicated text track)
- Import .srt subtitle files
- Inspector when selected: font, size, color, position, timing

### Effects Tab
- List of visual filters (brightness, contrast, black & white, blur, etc.)
- Click to apply to the currently selected clip
- Effects are also applied via Adjustment Layers (see below)

### Transitions Tab
- List of transitions (Fade, Cut, Wipe, etc.)
- Drag & drop between two adjacent clips on the timeline
- Inspector when selected: transition duration

### BPM Cutting Tool Tab
See dedicated section below.

---

## Effects System — Adjustment Layers

Effects are applied using an **Adjustment Layer** pattern (industry standard from Premiere Pro / After Effects):

- A special transparent clip type ("Adjustment Layer") is placed on a track above other clips
- All clips on tracks **below** it are affected for the duration of the Adjustment Layer
- Multiple effects can be stacked on a single Adjustment Layer
- Multiple Adjustment Layers can be stacked on top of each other
- Inspector when selected: add/remove effects, adjust intensity per effect

```
Track 3 │░░░[Adjustment Layer: Blur + Color Grade]░░░│
Track 2 │▓▓▓[Clip B]▓▓▓░░░[Clip C]░░░░░░░░░░░░░░░░░│  ← affected
Track 1 │▓▓▓▓▓▓[Clip A]▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░│  ← affected
```

---

## BPM Cutting Tool

The central feature of BrowserCutter. Automatically cuts multiple source clips into beat-aligned segments and assembles them in the timeline.

### UI

```
┌─────────────────────────────────┐
│  BPM CUTTING TOOL               │
│                                 │
│  Select Clips:                  │
│  [✓] Clip A  [✓] Clip B  [✓] C │
│                                 │
│  BPM:  [128    ] [Auto-Detect]  │
│                                 │
│  Mode:                          │
│  ( ) Sequential  A→B→C→A→B→C   │
│  ( ) Random      random order   │
│  ( ) Forfeit     focus shift    │
│                                 │
│  Segment Length:                │
│  [1 Beat ▾]  (1/2, 1, 2, 4)    │
│                                 │
│  Output Length:                 │
│  [30 sec] or [16 Beats]         │
│                                 │
│  [▶ Generate]                   │
└─────────────────────────────────┘
```

### Cutting Modes

| Mode | Behavior | Example (A, B, C) |
|---|---|---|
| Sequential | Cycles through clips in order | ABCABCABCABC |
| Random | Picks randomly from the pool | ACBABCCBAABC |
| Forfeit | Two clips alternate until one runs out of footage; the exhausted clip is replaced by the next clip in the pool | ABABAB→BCBCBC |

**Forfeit detail:** Starts with clips A and B alternating. When one clip's footage is fully consumed, it is replaced by the next clip from the selected pool (C, then D, etc.). The surviving clip continues alternating with the replacement. This repeats until output length is reached or all clips are exhausted.

### Generate Flow

1. Calculate beat positions from BPM (e.g., 120 BPM = beat every 0.5s)
2. Apply selected mode to determine clip order for each beat slot
3. Pick a segment from each source clip — each clip maintains a playhead that advances with each use. When clip A is used again, it continues from where it last left off (bookmark behavior, applies to all modes)
4. Place all segments consecutively in the timeline

### BPM Detection

- **Auto-Detect:** Web Audio API decodes the audio track of a selected clip and estimates BPM. User can manually correct the result.
- **Manual:** User types in a BPM number directly.

---

## State Structure (Zustand)

```ts
interface AppState {
  clips: Clip[]           // loaded source videos (File handles + metadata)
  timeline: Segment[]     // segments placed on timeline (clip ref + in/out times + track)
  bpmConfig: BpmConfig    // BPM value, mode, segment length, output length
  selectedId: string | null  // currently selected element (clip, effect, transition)
  projectSettings: {
    resolution: string    // e.g. "1920x1080"
    fps: number
    exportFormat: string  // e.g. "mp4"
  }
}
```

---

## Export Flow

1. User clicks Export
2. FFmpeg.wasm initializes in Web Worker (one-time ~25MB load)
3. Worker reads each source file sequentially via File System Access API
4. Cuts and assembles segments according to timeline
5. Applies effects and transitions via FFmpeg filters
6. Outputs MP4 — user downloads or saves via File System Access API

Note: Export is slow for long output videos. A progress bar is shown during export.

---

## Browser Requirements

- Chrome 86+ (File System Access API, WebAssembly)
- Firefox: partial support (no File System Access API — fallback to standard file input)
- Mobile: not supported (desktop-first)
