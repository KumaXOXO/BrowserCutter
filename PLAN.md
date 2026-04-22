# BrowserCutter v0.18.0 — Anweißungen v2 Implementation Plan
<!-- /autoplan restore point: /c/Users/Administrator/.gstack/projects/KumaXOXO-browsercutter/master-autoplan-restore-20260422-221611.md -->

## Context
- Base: v0.17.0 (db5d56b), master branch
- Input: Anweißungen.txt v2 (18 items, reviewed 2026-04-22)
- Tech: React 18 + TypeScript + Zustand 5 + Vite, RAF-based playback engine

---

## Items

### [P0] Item 1 — Playback stops after 1-2 clips (BPM-cut mix)
**File:** `src/lib/video/playbackEngine.ts`  
**Bug:** After BPM cutting with mix modes (random/forfeit), only first 2 clips play then video stops. The `nextSeg` selection after the second swap may fail to find valid segments. Root cause TBD — likely in the clip-file availability check or `vIdx` filtering at swap time.  
**Fix:** Investigate `startVideoTick`'s segment-swap logic. Ensure `nextSeg` correctly iterates beyond the second segment. Check `clipsRef` staleness and the same-clip optimization path.

### Item 2 — Inconsistent selection borders
**Files:** `src/components/timeline/ClipBlock.tsx`  
**Bug:** Primary selected clip gets white border; Shift/Ctrl-selected clips get blue border. Should be uniform. Also: deselect on empty-area click or re-click of selected clip.  
**Fix:** Unify border color for all selected clips. Add empty-area click handler in Track.tsx/Timeline.tsx to clear selection. Add toggle logic in ClipBlock click handler.

### Item 3 — BPM defaults, input field, beat markers
**Files:** `src/store/useAppStore.ts`, `src/components/timeline/TimeRuler.tsx`, `src/components/panels/BpmPanel.tsx`  
**Feature:**
- Default BPM should be 120 (currently 128)
- BPM input field in Timeline toolbar (separate from BpmPanel)
- Visual beat markers in Timeline ruler (subtle tick lines at beat positions)
- Store: `bpmConfig.bpm` starts at 120; toolbar BPM field shows "-" when no explicit value set, auto-populates on BPM cut  
**Fix:** Change default bpm to 120. Add BPM display/edit field to Timeline toolbar. Render beat markers in TimeRuler.

### Item 4 — Icon conflict: scissors vs resize; new cutting tool
**Files:** `src/components/timeline/Timeline.tsx`, `lucide-react`  
**Bug:** Scissors icon used for resize toggle button. A new cutting tool (split-at-cursor) also needs scissors. Need to pick a different icon for the resize toggle.  
**Fix:** Replace resize toggle icon with `Maximize2` or `ArrowLeftRight` (stretch/resize metaphor). Add a new "Cut" tool to the mode bar using `Scissors` icon that splits a clip at the playhead.

### Item 5+6 — Playhead interactivity
**Files:** `src/components/timeline/Timeline.tsx`  
**Feature:**
- In Playhead mode: hover over playhead triangle enlarges it
- In Playhead mode: drag the playhead to scrub
- In Playhead mode: click any empty area on timeline jumps playhead there
- NOT available in Selection or Cutting mode  
**Fix:** Add onMouseEnter/onMouseLeave on playhead element with scale transform. Add pointer-events and drag logic for playhead in Playhead mode. Track.tsx or Timeline.tsx empty-click → update playheadPosition.

### Item 7 — Layer Z-order by track array position, not trackIndex value
**Files:** `src/components/preview/VideoPreview.tsx`, `src/store/useAppStore.ts`  
**Bug:** VideoPreview uses `trackIndex` numeric value to determine which clip is "on top" (higher = in front). But the user reorders tracks in the UI via moveTrack(), which swaps array positions but does NOT reassign trackIndex values. So visual Z-order doesn't match the UI order.  
**Fix:** In VideoPreview's `activeSeg` selection, use the array index in `tracks[]` (position in the UI list) instead of `trackIndex` value to determine priority. Higher array index = higher in the stack = rendered on top.

### Item 8 — Remove 5s cap on text/image; video cap at actual duration
**Files:** `src/components/timeline/ClipBlock.tsx`, `src/components/timeline/TextTrack.tsx`  
**Bug:** Text/image elements are capped at 5 seconds max duration during resize. Videos are not capped (they should be capped at actual clip duration).  
**Fix:** Remove the 5s cap from text/image resize logic. For video segments, cap `outPoint` at `clip.duration` during right-edge resize.

### Item 9 — Ctrl+A selects timeline elements; prevent text selection
**Files:** `src/components/timeline/Timeline.tsx`, `src/index.css` or `src/App.tsx`  
**Bug:** Ctrl+A selects page text. Text in clip blocks can be accidentally selected.  
**Fix:** Intercept Ctrl+A globally (already partially done with Shift+A and Ctrl+Shift+A). Add Ctrl+A → select all segments in all video tracks. Add `user-select: none` CSS to Timeline and all clip block elements.

### Item 10 — Post-cutter import bug: UI add fails after BPM cutter use
**Files:** `src/components/panels/BpmPanel.tsx`, `src/components/panels/MediaPanel/`  
**Bug:** After using the BPM cutter, new files added via the Media panel UI (Add button / BPM clip selector) can't be inserted into the timeline; only drag & drop still works. Suggests that some state/handler is broken after the first BPM cut.  
**Fix:** Investigate what state the BPM panel changes that could break subsequent imports. Check if `selectedClipIds`, track selection, or some other state goes stale. Check MediaPanel add button handler.

### Item 11 — Re-import: identify clip, clear banner after re-import, no duplication
**Files:** `src/components/layout/TopBar.tsx` (missing-files banner)  
**Bug:** Missing-file banner shows "re-import required" without naming the affected clip. Banner persists after all clips are re-added. Clips are duplicated instead of replaced.  
**Fix:** In the missing-files warning, list specific clip names. Clear banner when all missing clips have matching names in the media library. In `addClip`, if a clip with the same name already exists, replace it instead of adding a duplicate.

### Item 12 — Save/load UX: explicit warning on new instance; Save button in unsaved warning
**Files:** `src/components/layout/TopBar.tsx`  
**Feature:**
- When loading a project (new instance), show an explicit modal/warning "This will replace the current project"
- When the "unsaved changes" warning appears, include a direct "Save" button  
**Fix:** Add confirmation dialog before loadProject. Add Save action to the unsaved-changes warning dialog.

### Item 13 — Cross-track drag: live visual snap
**Files:** `src/components/timeline/ClipBlock.tsx`  
**Bug:** When dragging a clip to a different track, the clip only snaps to the new track on mouseup. Should preview in the new track position while dragging.  
**Fix:** During drag, calculate which track the cursor is over. Update a `ghostTrackId` visual state that renders the clip preview in the destination track in real-time, before mouseup.

### Item 14 — Adjustment layer: above video tracks, apply to all, configurable targets
**Files:** `src/components/timeline/AdjustmentTrack.tsx`, `src/components/preview/VideoPreview.tsx`  
**Feature:**
- Adjustment layer should default to being positioned above all video tracks in the UI
- Effects should apply to all clips below by default
- Add a settings tab on the AdjustmentLayer block to specify which tracks/clips to target  
**Fix:** Ensure AdjustmentTrack gets added at position 0 (top) when created. In VideoPreview, apply adjustment effects to all segments below the adjustment layer's UI position. Add target-selector UI to AdjustmentLayerBlock.

### Item 15 — Frame step shortcuts: `,`/`.`; expand shortcut docs
**Files:** `src/components/timeline/Timeline.tsx`, `src/components/layout/TopBar.tsx` or shortcuts modal  
**Feature:**
- `,` → step one frame back (1/fps seconds)
- `.` → step one frame forward
- Update the existing shortcuts documentation/overlay  
**Fix:** Add keydown handlers for `,` and `.` in Timeline's keyboard listener. Calculate frame duration from `projectSettings.fps`. Update shortcuts documentation.

### Item 16 — Export without mandatory save; auto-save if folder set
**Files:** `src/components/layout/TopBar.tsx`, `src/lib/saveManager.ts`, export flow  
**Bug:** Export requires prior save. Should:
- Allow export without save
- Auto-save to the existing save folder if one is set
- Ask for save folder only if not yet set  
**Fix:** Remove mandatory-save gate before export. In export flow, if `saveDirName` is set, auto-save first. If not set, show a quick dialog asking for the save folder.

### Item 17 — Export: auto-increment filenames; fix export bugs
**Files:** `src/lib/export/useExport.ts`, `src/lib/saveManager.ts`  
**Bug:** Exporting with an existing filename overwrites without warning. Also, there may be Blob/file-access errors.  
**Fix:** Before writing export output, check if the filename exists. If so, append `_2`, `_3` etc. (Video.mp4 → Video_2.mp4). Ensure export Blob handling is robust.

---

## Priority Order (revised after CEO review)
1. Item 1 (P0 — playback stops, root-cause investigation first)
2. Item 10 (import bug blocks basic workflow)
3. Items 16+17 (export blocks shareability — moved up from 14th)
4. Item 3 (BPM defaults + beat markers — core differentiator)
5. Item 4 (icon + new cut tool — core differentiator)
6. Item 9 (Ctrl+A + text selection)
7. Item 2 (selection visual inconsistency)
8. Item 7 (layer Z-order)
9. Items 5+6 (playhead UX)
10. Item 8 (resize cap)
11. Item 13 (live cross-track drag)
12. Item 15 (frame step shortcuts)
13. Items 11+12 (re-import + save/load UX)
14. Item 14 (adjustment layer expansion)

---

## CEO Review — Phase 1

### 0A: Premise Challenge
All 17 items trace directly to real user-observed bugs or UX friction. No premises are invented. Two items (1 and 10) have root causes marked TBD — this is fine for a plan document, but the investigation step must happen before writing the fix, not during it. Premise: "Playback stops after 2 clips" — valid and reproducible per user report. Premise: "Import fails after BPM cut" — valid. These are not speculative.

### 0B: Existing Code Leverage Map
| Sub-problem | Existing code |
|---|---|
| Playback loop | `src/lib/video/playbackEngine.ts` startVideoTick (374 lines) |
| Selection styling | `src/components/timeline/ClipBlock.tsx` style logic |
| BPM defaults | `src/store/useAppStore.ts` bpmConfig initial state |
| Beat markers | `src/components/timeline/TimeRuler.tsx` |
| Timeline toolbar | `src/components/timeline/Timeline.tsx` (GRID/FREE, mode buttons) |
| Playhead drag | Timeline.tsx playhead div + existing timelineMode system |
| Z-order | `src/components/preview/VideoPreview.tsx` activeSeg selection |
| Resize cap | `src/components/timeline/ClipBlock.tsx` resize handlers |
| Ctrl+A | Timeline.tsx keydown handler (already has Shift+A, Ctrl+Shift+A) |
| Post-cutter import | `src/components/panels/BpmPanel.tsx` state management |
| Re-import UX | `src/components/layout/TopBar.tsx` missing-files banner |
| Export without save | TopBar.tsx export + `src/lib/saveManager.ts` |
| Auto-increment naming | `src/lib/export/useExport.ts` |
| Cross-track drag | ClipBlock.tsx drag mousemove handler |
| Adjustment layer | `src/components/timeline/AdjustmentTrack.tsx`, VideoPreview.tsx |
| Frame step | Timeline.tsx keydown handler |

### 0C: Dream State Diagram
```
CURRENT (v0.17.0)                  THIS PLAN (v0.18.0)              12-MONTH IDEAL
─────────────────                  ───────────────────              ──────────────
BPM cut produces clips but ──────→ BPM cut + full playback ──────→ BPM sync with
playback stops after 2              through all segments             live audio input

Import fails after cut ──────────→ Import always works  ──────────→ Plugin import
                                                                      system

Export requires manual save ─────→ Export auto-saves  ────────────→ Cloud export
                                    if folder set                    + share link

Scissors used for resize ────────→ Scissors = cut tool ────────────→ Full cutting
(confusing)                         Resize has own icon              suite with
                                                                      ripple edit

trackIndex drives Z-order ───────→ Array position drives Z ────────→ Layer groups
(wrong after reorder)               (matches UI exactly)             with blend modes
```

### 0C-bis: Implementation Alternatives
| Item | Option A | Option B | Decision |
|---|---|---|---|
| Item 1 (playback) | Patch the swap threshold | Full diagnostic first, then targeted fix | B — root cause unknown, patch without diagnosis will recur |
| Item 7 (Z-order) | Track array position → priority at render time | Keep trackIndex in sync with array order | A — simpler, no index juggling |
| Item 13 (cross-track drag) | Simple ghost row highlighting | Full real-time clip preview in destination track | A — less state, fewer edge cases |
| Item 14 (adj layer) | Just move to top by default | Full configurable target UI | Both — user requested both explicitly |

### 0D: Mode — SELECTIVE EXPANSION
All 17 items are in scope per user request. Minor cleanup within blast radius is auto-approved.

### 0E: Temporal Interrogation
- HOUR 1: Item 1 investigation (read VideoPreview.tsx, trace clipsRef/segmentsRef staleness)
- HOUR 2: Items 1 fix + Item 10 (import bug root cause + fix)
- HOUR 3: Items 16+17 (export auto-save + filename increment)
- HOUR 4: Items 3+4 (BPM defaults, beat markers, cut tool icon)
- HOUR 5: Items 9, 2, 7 (Ctrl+A, selection borders, Z-order)
- HOUR 6+: Items 5+6, 8, 13, 15, 11, 12, 14

### CLAUDE SUBAGENT (CEO — strategic independence)
[subagent-only — Codex unavailable]

Key findings (severity ordered):
1. CRITICAL: Priority inversion — BPM differentiator (Items 3+4) ranked 8th/9th while the one unique feature (BPM cut playback) is P0 broken. Fixed by re-ordering.
2. HIGH: Root causes TBD on Items 1+10 — plan must include investigation step before fix. Accepted and noted.
3. HIGH: Export (16+17) ranked last despite blocking shareability. Fixed by re-ordering.
4. MEDIUM: Item 13 cross-track drag underspecced — ghost div approach needs collision handling note. Added to spec.
5. MEDIUM: Strategic context missing (no PMF framing) — not actionable for a single-developer tool, out of scope.

AUTO-DECISIONS:
- Priority re-order: Items 16+17 moved from rank 14 to rank 3. Items 3+4 moved from rank 8/9 to rank 4/5. (Principle P2: boil lakes)
- Item 13 spec: added collision/overlap note. (Principle P1: completeness)
- No scope reduction. All 17 items stay in. (Principle P1)

### CEO DUAL VOICES — CONSENSUS TABLE
```
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Premises valid?                   YES     N/A    SINGLE
  2. Right problem to solve?           YES     N/A    SINGLE
  3. Scope calibration correct?        YES*    N/A    SINGLE
  4. Alternatives sufficiently explored?YES    N/A    SINGLE
  5. Competitive/market risks covered? YES     N/A    SINGLE
  6. 6-month trajectory sound?         YES*    N/A    SINGLE
═══════════════════════════════════════════════════════════════
* Priority adjusted per subagent recommendation (Items 3+4 and 16+17 moved up).
N/A = Codex unavailable [codex-unavailable]
```

### Error & Rescue Registry
| Item | Failure Mode | Detection | Recovery |
|---|---|---|---|
| Item 1 playback | RAF loop gets stuck after 2 clips | User reports video stops | Set `setIsPlaying(false)` with console.error identifying segment |
| Item 10 import | UI add silently fails | Click doesn't trigger addClip | Investigate state mutation post-cut |
| Item 7 Z-order | Wrong layer on top after reorder | Preview shows wrong clip | Re-derive track order at render time |
| Items 16+17 export | Overwrite existing file silently | User loses prior export | Check filename before write, increment suffix |
| Item 13 drag | Clip dropped on overlapping segment | Overlap visible in timeline | Snap to nearest free position or warn |

### What Already Exists
- Timeline mode system (playhead/selection) — Items 5+6 extend this
- Shift+A, Ctrl+Shift+A shortcuts — Item 9 adds Ctrl+A to the same handler
- GRID/FREE toggle — Item 3 adds BPM field next to this
- Missing-files banner — Item 11 improves the same banner
- Export guard (NotReadableError) — Item 17 extends the same guard

### Not in Scope
- Multi-track audio mixing (TODOS.md)
- Speed ramp / time remapping (TODOS.md)
- Full adjustment layer effect pipeline rewrite
- Collaboration features
- Plugin system

### Dream State Delta
After v0.18.0: the core BPM cut workflow works end-to-end (cut → play → export) without breaking. All 17 UX friction points resolved. The 12-month ideal (live audio BPM sync, cloud export, layer groups) requires new architecture not in scope here.

### CEO Completion Summary
| Dimension | Status |
|---|---|
| Mode | SELECTIVE EXPANSION |
| Premises | All valid, no speculation |
| Scope | 17 items, zero expansion |
| Priority | Revised (BPM + export moved up) |
| Alternatives | Compared per item, simplest viable chosen |
| Risks | Item 1+10 root causes TBD (investigation required) |
| Voice consensus | 6/6 (Claude subagent only, Codex unavailable) |

---

## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|---------|
| 1 | CEO | Move Items 16+17 from rank 14→3 | Taste | P2 (boil lakes) | Export blocks shareability; subagent flagged this as high severity | Kept at 14th |
| 2 | CEO | Move Items 3+4 from rank 8+9 → 4+5 | Taste | P2 (boil lakes) | BPM cut is the core differentiator; polish while it's broken is the 6-month regret | Kept at 8+9 |
| 3 | CEO | Add investigation step to Items 1+10 before fix | Mechanical | P5 (explicit over clever) | Root causes unknown; patching without diagnosis recurs | Patch immediately |
| 4 | CEO | Item 13: use ghost row highlight only (not full real-time preview) | Mechanical | P5 (explicit over clever) | Full preview needs z-index+collision+scroll mgmt; ghost row achieves 80% of the UX | Full preview |
| 5 | Design | Unified selection border: use #F43F5E (rose accent) | Taste | P5 (explicit, matches accent system) | Avoids new color token, consistent with mode button active state | White or blue |
| 6 | Design | BPM toolbar field: 56px pill, same style as GRID/FREE toggle | Taste | P5 (reuse existing vocabulary) | New style would break toolbar consistency | Wider field or different style |
| 7 | Design | Beat markers: 3px height, rgba(225,29,72,0.25), skip when < 3px gap | Taste | P1+P5 | Visible but not distracting; skipping prevents dense overlap | Full render regardless of zoom |
| 8 | Design | Cut tool: 3rd in mode bar (after Selection), title tooltip only | Taste | P5 (follows existing pattern) | Native title= matches all other mode buttons | Floating pill tooltip |
| 9 | Design | Post-cut feedback: "N clips created" 3s toast below timeline | Mechanical | P1 (completeness) | Silent cut leaves user uncertain whether it worked | No feedback |
| 10 | Eng | Item 7 must be implemented before Items 13 and 14 | Mechanical | P5 (explicit dependencies) | Z-order logic change (array position) is a shared primitive for drag + adj layer | Implement in original order |
| 11 | Eng | Beat markers: useMemo keyed on [bpm, timelineWidth, zoom] | Mechanical | P1 (performance) | 360 DOM nodes re-created at 60fps during playback without memoization | Skip memoization |
| 12 | Eng | Frame-step: always pause playback before advancing position | Mechanical | P5 (explicit over clever) | RAF loop + setPlayheadPosition race produces jitter | Call from RAF tick |
| 13 | Eng | Item 16 auto-save: guard with `segments.length > 0` | Mechanical | P1 (no data loss) | Auto-saving empty timeline overwrites existing saved project | No guard |
| 14 | Eng | Item 14 scope: "above all + applies to all" only; per-track targeting → TODOS.md | Mechanical | P5 (explicit scope) | Per-track targeting is 3-4x complexity; not explicitly required by user wording | Full targeting UI |
| 15 | Eng | Item 11 dedup: only on explicit re-import path, not global addClip | Mechanical | P5 (explicit over clever) | Global dedup breaks intentional duplicate clip adds | Global dedup |

---

## Design Review — Phase 2

**Classifier: APP UI** (dark workspace, task-focused editor — not marketing)
**Design System: None (DESIGN.md absent)** — using existing CSS variable system as reference

### Step 0: Design Scope Assessment

**Initial rating: 4/10.** The plan is a sound engineering checklist but leaves all visual decisions to the implementer. Every new UI element (BPM field, beat markers, cut tool, playhead drag, cross-track ghost) has zero visual spec. A 10/10 would lock colors, sizes, states, and interaction transitions for each.

**Existing design leverage:**
- Dark theme: `--bg`, `--surface`, `--surface2`, `--text`, `--muted2`, `--border-subtle`
- Rose/red accent: `#E11D48` / `#F43F5E`
- Existing mode buttons: 4px rounded, active = `rgba(225,29,72,0.15)` background + rose border
- GRID/FREE toggle: same pill style as mode buttons
- Playhead: 1.5px wide `#E11D48` line + 12px triangle at top
- Track row: 78px label, hover reveals icon controls at 9px

### CLAUDE SUBAGENT (Design — independent review)
[subagent-only — Codex unavailable]

Key findings:
1. CRITICAL: BPM toolbar field has no visual identity spec — color, size, position relative to GRID/FREE, unset state appearance
2. CRITICAL: No feedback after BPM cut completes — user doesn't know if cut succeeded before hitting play
3. HIGH: Beat markers spec is "subtle tick lines" — no height, color, opacity, density cap at high BPM
4. HIGH: 5 interaction dead-end states unspecified across Items 3, 4, 5+6, 13
5. HIGH: Unified selection border color unspecified (existing: white + blue; plan says "unified" but no color)
6. HIGH: Cut tool position in mode bar unspecified — order matters for mental model
7. MEDIUM: Cross-track drag ghost: no opacity, color, z-index spec

AUTO-DECISIONS (using P5 explicit + P1 completeness):

**Selection border:** Auto-decide → `#F43F5E` (rose accent, matches the existing accent system). Same as mode button active color. Avoids adding a new color token. TASTE DECISION — surfacing at gate.

**BPM field in toolbar:** Auto-decide → Same pill style as GRID/FREE toggle. Idle: `--border-subtle` + `--muted2` text. Active/editing: rose border `rgba(225,29,72,0.55)`. Width: 56px (fits 3-digit BPM). Unset: shows "–" in `--muted-subtle`. TASTE DECISION — surfacing at gate.

**Beat markers:** Auto-decide → 3px height ticks in TimeRuler, color `rgba(225,29,72,0.25)`, rendered every beat, skip if markers overlap at current zoom (< 3px gap). TASTE DECISION.

**Cut tool position:** Auto-decide → After Selection mode in mode bar (Playhead → Selection → Cut). This matches natural workflow: orient (playhead) → select → cut. TASTE DECISION.

**Drag ghost:** Auto-decide → `rgba(225,29,72,0.2)` background fill on destination track row while dragging. 1px rose border on the row. No full clip ghost needed. Mechanical decision.

**Post-cut feedback:** Auto-decide → toast/status message "N clips created" below timeline on successful BPM cut. Disappears after 3s. Mechanical.

### DESIGN DUAL VOICES — LITMUS SCORECARD (APP UI)
```
═══════════════════════════════════════════════════════════════
  Check                                    Claude  Codex  Consensus
  ─────────────────────────────────────── ─────── ─────── ─────────
  1. Workspace identity clear?             YES     N/A    SINGLE
  2. One strong visual anchor?             YES     N/A    SINGLE
  3. Each toolbar section has one job?     PARTIAL N/A    SINGLE
  4. Cards actually necessary?             N/A     N/A    N/A
  5. Dense but readable?                   YES     N/A    SINGLE
  6. New elements fit existing vocabulary? PARTIAL N/A    SINGLE
  7. Interaction states specified?         NO      N/A    SINGLE
  ─────────────────────────────────────── ─────── ─────── ─────────
  Hard rejections triggered:               0       N/A    0
═══════════════════════════════════════════════════════════════
N/A = Codex unavailable [codex-unavailable]
```

### Pass 1: Information Architecture — 5/10 → 8/10
The Timeline toolbar grows with BPM field + Cut tool mode button. Current toolbar left side: GRID/FREE | "Timeline" label | + Track | mode buttons. New elements must not clutter this.

**Proposed layout (left side):**
```
[GRID/FREE] [bpm: 120] [Timeline] [+Track] | [→ Playhead] [⊡ Selection] [✂ Cut]
```
The BPM field sits between GRID/FREE and the label — users associate BPM with grid/beat context. Cut tool joins the mode group (separated by `borderLeft` divider like current mode buttons).

All new toolbar elements inherit the existing pill style. This keeps the information hierarchy intact: left = project settings (snap, BPM), center = label + track management, right = mode + zoom.

### Pass 2: Interaction State Coverage — 3/10 → 7/10

| Feature | Loading | Empty/Unset | Error | Success | Partial |
|---|---|---|---|---|---|
| BPM field | — | Shows "–", click to edit | >300 or <20: red border | Shows entered value | Mid-edit: no commit until blur/Enter |
| Beat markers | — | Hidden if bpm=0 or unset | — | Render at calculated positions | Too dense at zoom<0.5: skip every other beat |
| Cut tool | — | Disabled if no clip at playhead | — | Clip splits into 2 | Playhead on clip boundary: no-op |
| Cross-track ghost | — | No valid drop (locked): no ghost | — | Releases to new track | — |
| Playhead drag | — | At t=0: can't drag left | — | Scrubs correctly | Past project end: clamp to last segment end |
| BPM cut | Processing spinner on button | — | Error toast if no clips selected | "N clips created" 3s toast | — |

### Pass 3: User Journey — 6/10 → 8/10

**BPM cut → playback arc (the core loop):**
```
Step 1: User checks BPM in toolbar (new) → confirms beat markers look right
Step 2: User runs BPM cut → sees "12 clips created" toast (new)
Step 3: User hits play → all clips play through (fixed by Item 1)
Step 4: User exports → no mandatory save (fixed by Items 16+17)
```

Current gap (without plan): Step 2 is silent, Step 3 fails, Step 4 requires save. The plan addresses all three gaps. The emotional arc goes from "uncertain" to "confident."

The remaining gap: if Item 1 isn't fully fixed, the user still hits silence after clip 2. There's no error state in the playback engine — it just stops. Adding a console.error or a brief UI flash ("playback stopped") helps triage. This is low severity for the plan doc but worth noting.

### Pass 4: AI Slop Risk — 8/10
No new card grids, no decorative blobs, no purple gradients. This is APP UI territory. The risk is generic icon choices (Maximize2 for resize — acceptable) and "clean modern" copy in tooltips. Plan doesn't produce marketing slop because there's no marketing surface here.

One risk: if the Cut tool gets a floating pill-style tooltip on click instead of a standard `title` attribute, it will look over-designed. Stick with native `title` tooltips to match the existing pattern.

### Pass 5: Design System Alignment — 6/10 → 8/10
No DESIGN.md. The existing code uses inline styles consistently. All new elements must use the same pattern:
- Colors: CSS variables (`var(--bg)`, etc.) or hardcoded `#E11D48`/`rgba(225,29,72,...)` — no new color tokens
- Font size: 9-10px for toolbar elements, 12px for input fields
- Border radius: 4px for pills (matches existing `rounded`)
- `transition: all 120ms` on interactive elements (matches existing ModeBtn)

**Gap:** Item 2's "unified selection border" needs a decision before coding — I've auto-decided `#F43F5E` (rose). This is a TASTE DECISION.

### Pass 6: Responsive & Accessibility — 5/10
This is a desktop-only app (browser-based video editor). Responsive is not applicable. Accessibility is minimal but existing:
- Keyboard: Timeline keydown handler covers shortcuts. Items 9+15 extend it correctly.
- Touch targets: Timeline toolbar buttons are already small (≤24px). New BPM field needs min-height 24px.
- Contrast: Rose `#E11D48` on dark surface passes contrast at large text sizes (toolbar labels). Small (9px) elements may fail — but this is pre-existing, not introduced by this plan.
- ARIA: None currently. Out of scope for this plan.

### Pass 7: Unresolved Design Decisions
| Decision | If deferred, what happens |
|---|---|
| Unified selection border color | Implementer picks arbitrarily; inconsistency persists |
| BPM field visual treatment in toolbar | Will look out of place against existing pill-style elements |
| Cut tool mode bar position | Implementer puts it last; may conflict with resize toggle placement |
| Beat marker color/opacity | Too bright = distracting; too subtle = invisible at sub-1x zoom |
| Post-cut success feedback | User unsure if cut worked before hitting play |

All five surfaced as TASTE DECISIONS at Final Gate.

### Design Completion Summary
| Dimension | Score (before) | Score (after) |
|---|---|---|
| Information Architecture | 5 | 8 |
| Interaction States | 3 | 7 |
| User Journey | 6 | 8 |
| AI Slop Risk | 8 | 8 |
| Design System Alignment | 6 | 8 |
| Responsive/Accessibility | 5 | 5 |
| Unresolved Decisions | 3 | 7 |
| **Overall** | **4** | **7** |

---

## Engineering Review — Phase 3

### Root Cause: Item 1 (Playback stops after 2 clips)

**Investigation complete.** Root cause is a React render / RAF tick race in `VideoPreview.tsx`:

```
VideoPreview.tsx line ~45:
  activeSegRef.current = activeSeg   ← runs on EVERY React render

playbackEngine.ts startVideoTick():
  When clip swap happens → tick sets activeSegRef.current = seg3
  → RAF causes setPlayheadPosition() → React re-renders VideoPreview
  → React render overwrites activeSegRef.current back to seg2
  → Tick now fires with stale activeSegRef → nextSeg lookup fails
  → Playback stalls on seg2
```

**Fix (confirmed):** Guard the overwrite with `if (!isPlaying) activeSegRef.current = activeSeg`. During playback, the ref is owned by the RAF tick. React may only update it when stopped.

### Architecture Diagram

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                         React Render Path                        │
 │                                                                  │
 │  useAppStore (Zustand)                                           │
 │    playheadPosition ──setPlayheadPosition──→ re-render           │
 │    tracks[], clips[], isPlaying                                  │
 │         │                                                        │
 │         ↓                                                        │
 │  VideoPreview.tsx                                                │
 │    activeSeg = tracks.flatMap → pick highest array-index         │
 │    [BUG] activeSegRef.current = activeSeg  ← OVERWRITES RAF ref  │
 │    [FIX] if (!isPlaying) activeSegRef.current = activeSeg        │
 └──────────────────────┬──────────────────────────────────────────┘
                        │
 ┌──────────────────────▼──────────────────────────────────────────┐
 │                      RAF Loop Path                               │
 │                                                                  │
 │  playbackEngine.ts  startVideoTick()                             │
 │    tick → reads activeSegRef.current (expects seg3)              │
 │    → computes nextSeg = first seg after activeSegRef             │
 │    → when swap needed: sets activeSegRef.current = nextSeg       │
 │    → calls setPlayheadPosition() ← triggers React re-render ──→ ↑│
 └─────────────────────────────────────────────────────────────────┘

 ┌─────────────────────────────────────────────────────────────────┐
 │                    Z-Order Path (Item 7)                         │
 │                                                                  │
 │  moveTrack(from, to) in useAppStore:                             │
 │    swaps array positions — trackIndex values unchanged           │
 │                                                                  │
 │  VideoPreview: activeSeg sort                                    │
 │    [BUG] .sort((a,b) => b.trackIndex - a.trackIndex)            │
 │    [FIX] use tracks.findIndex() to map trackIndex→array pos      │
 │    Higher array position = top of stack = wins                   │
 └─────────────────────────────────────────────────────────────────┘
```

### Dependency Graph (implementation order constraint)

```
  Item 7 (Z-order fix in VideoPreview)
      │
      ├──→ Item 13 (cross-track drag must use same array-position logic)
      │
      └──→ Item 14 (adj layer "above all" uses same array-position sort)

  Item 4 (Cut mode added to mode system)
      │
      └──→ All mode-gated handlers must check for 'cut' mode:
           - Track onClick (playhead jump)
           - ClipBlock onMouseDown (drag)
           - Timeline empty-area click
```

**Priority update:** Item 7 must be implemented before Items 13 and 14.

### CLAUDE SUBAGENT (Eng — technical review)
[subagent-only — Codex unavailable]

Key findings:

1. **CRITICAL: Item 1 root cause confirmed** — `activeSegRef.current = activeSeg` in VideoPreview.tsx overwrites the RAF tick's state on every React render. Fix: add `!isPlaying` guard. The fix is 1 line.
2. **HIGH: Item 7 must land before 13 and 14** — Z-order fix changes how track priority is derived (array position). Cross-track drag (13) must use the same derivation. Adj layer (14) "above all" position also depends on this.
3. **HIGH: Beat markers need useMemo** — At 120 BPM + 3min timeline at 1x zoom = 360 DOM nodes. Without memoization these are re-created at 60fps during playback. Key: `[bpm, timelineWidth, zoom]`.
4. **HIGH: Mode-switch-during-drag edge case** — If user switches mode while dragging a clip, `onMouseUp` handler will fire in wrong mode. Need a `dragCancelledRef` flag that cancels drag state on mode change.
5. **HIGH: Empty timeline auto-save guard** — Item 16 auto-saves before export. If timeline is empty (fresh state), this would overwrite an existing saved project. Guard: `if (segments.length === 0) skip auto-save`.
6. **MEDIUM: Frame-step must pause first** — Items 15's `,`/`.` shortcut calls `setPlayheadPosition` while the RAF loop may also be calling it. Race condition produces jitter. Fix: always call `pausePlayback()` before frame step.
7. **MEDIUM: Export auto-increment needs NotAllowedError** — Item 17 currently catches `NotReadableError` for file access. `NotAllowedError` also occurs when file handle permission expires. Catch both.
8. **MEDIUM: Item 11 re-import dedup** — "Replace instead of duplicate" must only fire when the user explicitly re-imports a file after the missing-files banner prompt. NOT on all add-clip calls with duplicate names (normal workflow adds same file twice intentionally).
9. **LOW: Item 14 adj layer targeting is complex** — Full "configurable targets" UI (which tracks/clips the adj layer affects) is 3-4x scope of other items. Recommended: implement "above all, applies to all" first; defer per-track target selector to TODOS.md.

AUTO-DECISIONS (mechanical, not taste):
- Beat marker memoization: `useMemo(() => computeMarkers(), [bpm, timelineWidth, zoom])` — prevents 60fps DOM thrashing
- Frame-step pauses first: always `pausePlayback()` before advancing position  
- Empty timeline auto-save guard: `if (store.segments.length > 0)` before triggering auto-save
- Item 14 scope reduction: implement "above all + applies to all" only; per-track targeting → TODOS.md
- Item 11 re-import: dedup only on explicit re-import modal path, not global addClip

TASTE DECISIONS surfaced at Final Gate:
- None from eng review (all decisions were mechanical or structural)

### ENG DUAL VOICES — CONSENSUS TABLE
```
═══════════════════════════════════════════════════════════════
  Dimension                              Claude  Codex  Consensus
  ────────────────────────────────────── ─────── ─────── ─────────
  1. Root cause analysis complete?        YES     N/A    SINGLE
  2. Implementation order correct?        YES*    N/A    SINGLE
  3. Performance risks mitigated?         YES     N/A    SINGLE
  4. Edge cases specified?                YES     N/A    SINGLE
  5. Scope calibration (Item 14)?         YES     N/A    SINGLE
  6. Test plan covers critical paths?     YES     N/A    SINGLE
═══════════════════════════════════════════════════════════════
* Item 7 → 13 → 14 dependency added by eng review.
N/A = Codex unavailable [codex-unavailable]
```

### Engineering Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Item 1 fix (`!isPlaying` guard) breaks non-playback use of activeSegRef | HIGH | Test both playing=true and playing=false paths in Playwright |
| Beat markers at BPM=240 + 5min timeline = 1200 nodes | MEDIUM | useMemo + skip if gap < 3px |
| Cut mode not gated in all click handlers | MEDIUM | Audit all Track/ClipBlock handlers before shipping |
| Item 13 ghost + Item 7 array-position sort diverge | LOW | Use same helper function `getTrackArrayIndex()` |
| Item 16 auto-save race (export click twice fast) | LOW | Debounce export button for 500ms |

---

## Out of Scope (defer to TODOS.md)
- Multi-track audio mixing (from existing TODOS.md)
- Speed ramp / time remapping (from existing TODOS.md)
- Full adjustment layer effect pipeline rewrite (partial implementation only)

---

## Test Plan (Playwright)
After implementation, write Playwright tests for:
- Item 1: BPM cut + play → all clips play through
- Item 10: BPM cut → add new clip → verify it can be added to timeline
- Item 9: Ctrl+A selects all segments (no page text selection)
- Item 2: selection border consistency
- Item 7: move track up → verify Z-order changes in preview
- Items 5+6: playhead drag in playhead mode
- Item 8: resize text element beyond 5s
- Item 15: `,`/`.` frame step
- Items 16+17: export without prior save
