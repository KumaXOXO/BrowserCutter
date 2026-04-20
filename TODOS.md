# TODOS

## Phase 11+

### Wipe/zoom/slide transition rendering
**What:** Implement preview rendering for `wipe`, `zoom`, and `slide` TransitionTypes in `startVideoTick`.  
**Why:** 3 of 6 TransitionTypes are defined in `types/index.ts` and selectable in TransitionsPanel but silently render as cuts. Users who pick these see no visual feedback that the transition isn't working.  
**Pros:** Completes the transition system — all 6 types have preview parity.  
**Cons:** ~60 LOC per type; `wipe` and `slide` require CSS clip-path or canvas compositing; `zoom` requires scale transform synchronized to the cut. Moderate complexity per type.  
**Context:** Phase 10 implements `fade` (fade-to-black, CSS overlay) and `dissolve` (true crossfade, two video elements). The data model (`state.transitions[]`, `Transition` type) is already correct — only the rendering is missing. Start in `src/lib/video/playbackEngine.ts` → `startVideoTick`, look at how dissolve is implemented, and follow the same boundary-detection pattern.  
**Depends on:** Phase 10 dissolve implementation (ships the two-video-element pattern that wipe/slide may reuse).

---

### Safari OffscreenCanvas fallback for thumbnail extraction
**What:** Feature-detect `OffscreenCanvas` in `thumbnails.ts` and fall back to `createElement('canvas')` (main thread) when unavailable.  
**Why:** `OffscreenCanvas` is unavailable on Safari < 16.4 and all iOS WebViews before that version. Phase 10 thumbnails silently fail on those browsers with no error surfaced.  
**Pros:** ~15 LOC guard; fixes silent failure for a still-common browser version on mobile.  
**Cons:** Main-thread canvas fallback blocks the render thread during `drawImage`. Fine for one-at-a-time use; the concurrency queue (max 5) prevents pile-up.  
**Context:** `src/lib/video/thumbnails.ts` — the extraction step is `ctx.drawImage(video, 0, 0, ...)`. Guard: `if (typeof OffscreenCanvas !== 'undefined') { use OffscreenCanvas } else { use document.createElement('canvas') }`. Worker path is not affected.  
**Depends on:** Phase 10 thumbnails.ts implementation.
