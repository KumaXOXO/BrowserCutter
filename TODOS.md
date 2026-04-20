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
**Status: DONE** (implemented in Phase 10, `thumbnails.ts:69-71`)
