// src/lib/video/playbackEngine.ts
// Playback state machine using ClipVideoPool (one <video> per clip, never changes .src).

import type { Clip, Segment, Transition, TransitionType, TimelineTrack } from '../../types'
import { applyTransitionStyles, resetTransitionStyles } from './transitionStyles'
import { getClipUrl, revokeClipUrl } from './clipUrlCache'
import type { ClipVideoPool } from './videoPool'
import {
  videoIndices, audioIndices, findTopSegmentAtTime,
  playWhenReady, activateClip, seekAndPlay,
} from './playbackHelpers'

export { getClipUrl } from './clipUrlCache'
export { playWhenReady } from './playbackHelpers'

// ── Named constants ──
const STALL_RESEEK_FRAMES = 60
const STALL_GIVEUP_FRAMES = 180
const AUTOPAUSE_INITIAL = 15
const AUTOPAUSE_RETRY_INTERVAL = 60
const FROZEN_NUDGE_FRAMES = 45
const FROZEN_REBUILD_FRAMES = 180
const LOOKAHEAD_S = 2.0
const GAP_SWAP_THRESHOLD_S = 0.033
const NORMAL_SWAP_BASE_S = 0.15
const SEEK_TOLERANCE_S = 0.5
const GAP_EPSILON_S = 0.1

const OVERLAY_TRANSITIONS: TransitionType[] = ['dissolve', 'wipe', 'slide', 'zoom']

export interface VideoTickParams {
  pool: ClipVideoPool
  activeClipIdRef: { current: string | null }
  audioRef: { current: HTMLAudioElement }
  segmentsRef: { current: Segment[] }
  clipsRef: { current: Clip[] }
  tracksRef: { current: TimelineTrack[] }
  activeSegRef: { current: Segment | null }
  stallCountRef: { current: number }
  rafRef: { current: number }
  cancelPlayRef: { current: () => void }
  playAbortRef: { current: { cancelled: boolean } }
  masterVolumeRef: { current: number }
  transitionsRef: { current: Transition[] }
  loopRegionRef: { current: { start: number; end: number } | null }
  setPlayheadPosition: (pos: number) => void
  setIsPlaying: (playing: boolean) => void
  initialGapTarget?: Segment | null
  initialPlayheadPosition?: number
}

export function startVideoTick(params: VideoTickParams): void {
  const {
    pool, activeClipIdRef, audioRef, segmentsRef, clipsRef, tracksRef,
    activeSegRef, stallCountRef, rafRef, cancelPlayRef, playAbortRef,
    masterVolumeRef, transitionsRef, loopRegionRef,
    setPlayheadPosition, setIsPlaying,
  } = params

  let inGap = false
  let gapRealStart = 0
  let gapPlayheadStart = 0
  let gapNextSeg: Segment | null = null

  let overlayActive = false
  let overlayBClipId: string | null = null

  let lastRawTime = -1
  let frozenCount = 0
  let autopauseCount = 0

  // Cached track indices — rebuilt only when tracksRef changes
  let cachedTracks: TimelineTrack[] | null = null
  let cachedVIdx: Set<number> = new Set()
  let cachedAIdx: Set<number> = new Set()

  function getIndices() {
    if (tracksRef.current !== cachedTracks) {
      cachedTracks = tracksRef.current
      cachedVIdx = videoIndices(cachedTracks)
      cachedAIdx = audioIndices(cachedTracks)
    }
    return { vIdx: cachedVIdx, aIdx: cachedAIdx }
  }

  function clearOverlay(videoA: HTMLVideoElement) {
    if (!overlayActive) return
    const videoB = pool.get(overlayBClipId)
    if (videoB) resetTransitionStyles(videoA, videoB)
    overlayActive = false
    overlayBClipId = null
  }

  if (params.initialGapTarget) {
    inGap = true
    gapRealStart = performance.now()
    gapPlayheadStart = params.initialPlayheadPosition ?? 0
    gapNextSeg = params.initialGapTarget
  }

  const tick = () => {
    const video = pool.get(activeClipIdRef.current)

    // ── Gap mode ──
    if (inGap) {
      const elapsed = (performance.now() - gapRealStart) / 1000
      const pos = gapPlayheadStart + elapsed
      setPlayheadPosition(pos)

      const loop = loopRegionRef.current
      if (loop && pos >= loop.end) {
        inGap = false; gapNextSeg = null
        const { vIdx, aIdx } = getIndices()
        const loopStartSeg = findTopSegmentAtTime(loop.start, segmentsRef.current, tracksRef.current, vIdx)
        if (loopStartSeg) {
          const loopClip = clipsRef.current.find((c) => c.id === loopStartSeg.clipId)
          if (loopClip?.file) {
            cancelPlayRef.current()
            const seekTime = loopStartSeg.inPoint + (loop.start - loopStartSeg.startOnTimeline) * Math.max(0.01, loopStartSeg.speed ?? 1)
            activateClip(pool, loopClip, loopStartSeg, seekTime, masterVolumeRef.current, activeClipIdRef, cancelPlayRef, playAbortRef, setIsPlaying)
            activeSegRef.current = loopStartSeg
            stallCountRef.current = 0
            const audioLoopSegGap = segmentsRef.current.find(
              (s) => aIdx.has(s.trackIndex) && !s.muted &&
                loop.start >= s.startOnTimeline &&
                loop.start < s.startOnTimeline + (s.outPoint - s.inPoint),
            )
            if (audioLoopSegGap && !audioRef.current.paused) {
              audioRef.current.currentTime = audioLoopSegGap.inPoint + (loop.start - audioLoopSegGap.startOnTimeline)
            }
            rafRef.current = requestAnimationFrame(tick)
            return
          }
        }
        setIsPlaying(false); return
      }

      if (gapNextSeg && pos >= gapNextSeg.startOnTimeline) {
        const ns = gapNextSeg
        inGap = false; gapNextSeg = null
        const nextClip = clipsRef.current.find((c) => c.id === ns.clipId)
        if (!nextClip?.file) { setIsPlaying(false); return }
        cancelPlayRef.current()
        activateClip(pool, nextClip, ns, ns.inPoint, masterVolumeRef.current, activeClipIdRef, cancelPlayRef, playAbortRef, setIsPlaying)
        activeSegRef.current = ns
        stallCountRef.current = 0
      }

      rafRef.current = requestAnimationFrame(tick)
      return
    }

    // ── Normal mode ──
    const seg = activeSegRef.current
    if (!seg || !video) return

    const rawTime = video.currentTime
    const { vIdx, aIdx } = getIndices()

    if (rawTime < seg.inPoint) {
      if (!video.paused && !video.seeking && video.readyState >= 2) {
        stallCountRef.current += 1
        if (stallCountRef.current === STALL_RESEEK_FRAMES) {
          video.currentTime = seg.inPoint
        }
        if (stallCountRef.current > STALL_GIVEUP_FRAMES) {
          stallCountRef.current = 0
          setIsPlaying(false)
          return
        }
      }
      rafRef.current = requestAnimationFrame(tick)
      return
    }
    stallCountRef.current = 0

    // Chrome-initiated pause recovery (background suspend, power saving, etc.)
    if (!video.seeking && video.readyState >= 3 && video.paused) {
      autopauseCount++
      if (autopauseCount === AUTOPAUSE_INITIAL || (autopauseCount > AUTOPAUSE_INITIAL && autopauseCount % AUTOPAUSE_RETRY_INTERVAL === 0)) {
        video.play().catch(() => {})
      }
    } else {
      autopauseCount = 0
    }

    // Frozen video recovery — only when video is actively playing
    if (!video.seeking && !video.paused) {
      if (rawTime === lastRawTime) {
        frozenCount++
        if (frozenCount === FROZEN_NUDGE_FRAMES && video.readyState >= 3) {
          video.currentTime = rawTime + 0.001
          frozenCount = FROZEN_NUDGE_FRAMES + 1
        } else if (frozenCount >= FROZEN_REBUILD_FRAMES) {
          const clip = clipsRef.current.find(c => c.id === seg.clipId)
          if (clip?.file) {
            cancelPlayRef.current()
            pool.remove(clip.id)
            revokeClipUrl(clip.id)
            activateClip(pool, clip, seg, rawTime, masterVolumeRef.current, activeClipIdRef, cancelPlayRef, playAbortRef, setIsPlaying)
          }
          frozenCount = 0
        }
      } else {
        frozenCount = 0
      }
    }
    lastRawTime = rawTime

    const currentPlayhead = seg.startOnTimeline + (rawTime - seg.inPoint) / Math.max(0.01, seg.speed ?? 1)
    setPlayheadPosition(currentPlayhead)

    // ── Priority check ──
    const correctSeg = findTopSegmentAtTime(currentPlayhead, segmentsRef.current, tracksRef.current, vIdx)
    const correctClip = correctSeg ? clipsRef.current.find((c) => c.id === correctSeg.clipId) : null
    if (correctSeg && correctSeg.id !== seg.id && correctClip?.type !== 'image' && correctClip?.file) {
      cancelPlayRef.current()
      clearOverlay(video)
      const seekTime = correctSeg.inPoint +
        (currentPlayhead - correctSeg.startOnTimeline) * Math.max(0.01, correctSeg.speed ?? 1)
      if (correctClip.id === seg.clipId) {
        seekAndPlay(video, correctSeg, seekTime, masterVolumeRef.current, cancelPlayRef, playAbortRef, setIsPlaying)
      } else {
        activateClip(pool, correctClip, correctSeg, seekTime, masterVolumeRef.current, activeClipIdRef, cancelPlayRef, playAbortRef, setIsPlaying)
      }
      activeSegRef.current = correctSeg
      stallCountRef.current = 0
      rafRef.current = requestAnimationFrame(tick)
      return
    }

    // ── Loop region ──
    const loop = loopRegionRef.current
    if (loop && currentPlayhead >= loop.end) {
      const loopStartSeg = findTopSegmentAtTime(loop.start, segmentsRef.current, tracksRef.current, vIdx)
      if (loopStartSeg) {
        const loopClip = clipsRef.current.find((c) => c.id === loopStartSeg.clipId)
        if (loopClip?.file) {
          cancelPlayRef.current()
          clearOverlay(video)
          const seekTime = loopStartSeg.inPoint + (loop.start - loopStartSeg.startOnTimeline) * Math.max(0.01, loopStartSeg.speed ?? 1)
          if (loopStartSeg.id === seg.id) {
            seekAndPlay(video, loopStartSeg, seekTime, masterVolumeRef.current, cancelPlayRef, playAbortRef, setIsPlaying)
          } else {
            activateClip(pool, loopClip, loopStartSeg, seekTime, masterVolumeRef.current, activeClipIdRef, cancelPlayRef, playAbortRef, setIsPlaying)
          }
          activeSegRef.current = loopStartSeg
          stallCountRef.current = 0
          const audioLoopSeg = segmentsRef.current.find(
            (s) => aIdx.has(s.trackIndex) && !s.muted &&
              loop.start >= s.startOnTimeline &&
              loop.start < s.startOnTimeline + (s.outPoint - s.inPoint),
          )
          if (audioLoopSeg && !audioRef.current.paused) {
            audioRef.current.currentTime = audioLoopSeg.inPoint + (loop.start - audioLoopSeg.startOnTimeline)
          }
          rafRef.current = requestAnimationFrame(tick)
          return
        }
      }
    }

    // ── Audio sync ──
    const audioSeg = segmentsRef.current.find(
      (s) => aIdx.has(s.trackIndex) && !s.muted &&
        currentPlayhead >= s.startOnTimeline &&
        currentPlayhead < s.startOnTimeline + (s.outPoint - s.inPoint),
    )
    if (audioSeg && audioRef.current.paused && audioRef.current.src) {
      audioRef.current.play().catch(() => {})
    } else if (!audioSeg && !audioRef.current.paused) {
      audioRef.current.pause()
    }

    // ── Segment end ──
    const segEnd = seg.startOnTimeline + (seg.outPoint - seg.inPoint) / Math.max(0.01, seg.speed ?? 1)
    const coveringNext = findTopSegmentAtTime(segEnd + 0.001, segmentsRef.current, tracksRef.current, vIdx)
    const fallbackNext = coveringNext ? null : segmentsRef.current
      .filter((s) => vIdx.has(s.trackIndex) && !s.hidden && s.startOnTimeline > segEnd)
      .sort((a, b) => a.startOnTimeline - b.startOnTimeline)[0] ?? null
    const nextSeg = coveringNext ?? fallbackNext ?? null
    const hasGap = !coveringNext && !!fallbackNext && fallbackNext.startOnTimeline > segEnd + GAP_EPSILON_S

    // ── Overlay transitions (dissolve/wipe/slide/zoom) ──
    if (nextSeg) {
      const trans = transitionsRef.current.find(
        (t) => t.beforeSegmentId === seg.id && t.afterSegmentId === nextSeg.id &&
          OVERLAY_TRANSITIONS.includes(t.type) && t.duration > 0,
      )
      if (trans) {
        const segDuration = (seg.outPoint - seg.inPoint) / Math.max(0.01, seg.speed ?? 1)
        const transStart = seg.startOnTimeline + segDuration - trans.duration
        if (currentPlayhead >= transStart) {
          const nextClip = clipsRef.current.find((c) => c.id === nextSeg.clipId)
          if (nextClip?.file) {
            const videoB = pool.ensure(nextClip.id, nextClip.file)
            if (!overlayActive) {
              videoB.currentTime = nextSeg.inPoint
              videoB.volume = 0
              videoB.playbackRate = nextSeg.speed ?? 1
              videoB.play().catch(() => {})
              overlayActive = true
              overlayBClipId = nextClip.id
            }
            pool.showBoth(activeClipIdRef.current!, nextClip.id)
            const progress = Math.min(1, (currentPlayhead - transStart) / trans.duration)
            applyTransitionStyles(trans.type, progress, video, videoB)
          }
        }
      }
    }

    const nextSeekTime = nextSeg && nextSeg.startOnTimeline < segEnd
      ? nextSeg.inPoint + (segEnd - nextSeg.startOnTimeline) * Math.max(0.01, nextSeg.speed ?? 1)
      : nextSeg?.inPoint ?? 0

    // ── Lookahead: pre-seek next clip's element so it's buffered at swap time ──
    const segDurForPreload = (seg.outPoint - seg.inPoint) / Math.max(0.01, seg.speed ?? 1)
    const timeToEnd = (seg.startOnTimeline + segDurForPreload) - currentPlayhead
    if (!hasGap && nextSeg && timeToEnd <= LOOKAHEAD_S && timeToEnd > 0.1) {
      const nextClipPre = clipsRef.current.find((c) => c.id === nextSeg.clipId)
      if (nextClipPre?.file && nextClipPre.id !== seg.clipId) {
        const nv = pool.ensure(nextClipPre.id, nextClipPre.file)
        if (Math.abs(nv.currentTime - nextSeekTime) > SEEK_TOLERANCE_S) {
          nv.currentTime = nextSeekTime
        }
      }
    }

    const swapThreshold = hasGap ? GAP_SWAP_THRESHOLD_S : Math.max(NORMAL_SWAP_BASE_S, NORMAL_SWAP_BASE_S * (seg.speed ?? 1))

    if (rawTime >= seg.outPoint - swapThreshold) {
      if (nextSeg) {
        clearOverlay(video)

        if (hasGap) {
          cancelPlayRef.current()
          pool.hideAll()
          pool.pauseAll()
          activeSegRef.current = null
          activeClipIdRef.current = null
          inGap = true
          gapRealStart = performance.now()
          gapPlayheadStart = segEnd
          gapNextSeg = nextSeg
          setPlayheadPosition(segEnd)
          rafRef.current = requestAnimationFrame(tick)
          return
        }

        const nextClip = clipsRef.current.find((c) => c.id === nextSeg.clipId)
        if (nextClip?.file) {
          cancelPlayRef.current()
          stallCountRef.current = 0
          if (nextClip.id === seg.clipId) {
            seekAndPlay(video, nextSeg, nextSeekTime, masterVolumeRef.current, cancelPlayRef, playAbortRef, setIsPlaying)
          } else {
            activateClip(pool, nextClip, nextSeg, nextSeekTime, masterVolumeRef.current, activeClipIdRef, cancelPlayRef, playAbortRef, setIsPlaying)
          }
          activeSegRef.current = nextSeg
        } else {
          setIsPlaying(false)
          return
        }
      } else {
        setIsPlaying(false)
        return
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  rafRef.current = requestAnimationFrame(tick)
}

export interface AudioOnlyTickParams {
  audioRef: { current: HTMLAudioElement }
  rafRef: { current: number }
  cancelPlayRef: { current: () => void }
  playAbortRef: { current: { cancelled: boolean } }
  segmentsRef: { current: Segment[] }
  clipsRef: { current: import('../../types').Clip[] }
  tracksRef: { current: TimelineTrack[] }
  audioUrlRef: { current: string | null }
  masterVolumeRef: { current: number }
  initialSeg: Segment
  setPlayheadPosition: (pos: number) => void
  setIsPlaying: (playing: boolean) => void
}

export function startAudioOnlyTick(params: AudioOnlyTickParams): () => void {
  const {
    audioRef, rafRef, cancelPlayRef, playAbortRef,
    segmentsRef, clipsRef, tracksRef, audioUrlRef, masterVolumeRef, initialSeg,
    setPlayheadPosition, setIsPlaying,
  } = params

  const currentSegRef = { current: initialSeg }

  const tick = () => {
    const seg = currentSegRef.current
    if (!seg || audioRef.current.paused) return

    const rawTime = audioRef.current.currentTime
    setPlayheadPosition(seg.startOnTimeline + (rawTime - seg.inPoint))

    if (rawTime >= seg.outPoint - 0.05) {
      const aIdx2 = audioIndices(tracksRef.current)
      const nextSeg = segmentsRef.current
        .filter((s) => aIdx2.has(s.trackIndex) && !s.muted && s.startOnTimeline > seg.startOnTimeline)
        .sort((a, b) => a.startOnTimeline - b.startOnTimeline)[0]

      if (nextSeg) {
        const nextClip = clipsRef.current.find((c) => c.id === nextSeg.clipId)
        if (nextClip?.file) {
          cancelPlayRef.current()
          const url = getClipUrl(nextClip.id, nextClip.file)
          audioUrlRef.current = url
          audioRef.current.src = url
          audioRef.current.currentTime = nextSeg.inPoint
          audioRef.current.volume = Math.min(1, (nextSeg.volume ?? 1) * masterVolumeRef.current)
          playAbortRef.current = { cancelled: false }
          cancelPlayRef.current = playWhenReady(audioRef.current, () => setIsPlaying(false), playAbortRef.current)
          currentSegRef.current = nextSeg
        } else {
          setIsPlaying(false)
          return
        }
      } else {
        setIsPlaying(false)
        return
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  rafRef.current = requestAnimationFrame(tick)

  return () => {}
}
