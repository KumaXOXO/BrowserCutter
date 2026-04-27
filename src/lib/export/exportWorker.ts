// src/lib/export/exportWorker.ts
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'
import type { Transition, AdjustmentLayer } from '../../types'
import { buildFilterComplex } from './exportWorkerUtils'

const MOUNT_THRESHOLD = 200 * 1024 * 1024 // 200 MB — use WORKERFS above this

export interface ExportRequest {
  segments: Array<{
    id: string; clipId: string; trackIndex: number
    startOnTimeline: number; inPoint: number; outPoint: number
    volume?: number; speed?: number; effects?: import('../../types').Effect[]
  }>
  clipFiles: Record<string, { url: string; name: string; file?: File }>
  fps: number
  resolution: string
  transitions: Transition[]
  adjustmentLayers: AdjustmentLayer[]
  format: 'mp4' | 'webm'
  quality: 'draft' | 'good' | 'best'
}

export type WorkerMessage =
  | { type: 'progress'; value: number; label: string }
  | { type: 'done'; buffer: ArrayBuffer }
  | { type: 'error'; message: string }

const QUALITY_PRESETS = {
  mp4:  { draft: 28, good: 22, best: 18 },
  webm: { draft: 40, good: 30, best: 20 },
}

const ffmpeg = new FFmpeg()

self.onmessage = async (e: MessageEvent<ExportRequest>) => {
  const timeout = setTimeout(() => {
    self.postMessage({ type: 'error', message: 'Export timed out after 10 minutes. Try a shorter clip or lower quality.' } satisfies WorkerMessage)
  }, 600_000)

  try {
    await runExport(e.data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    self.postMessage({ type: 'error', message: msg } satisfies WorkerMessage)
  } finally {
    clearTimeout(timeout)
  }
}

async function runExport(req: ExportRequest) {
  post({ type: 'progress', value: 0.01, label: 'Loading FFmpeg...' })

  const base = new URL('/', self.location.href).href
  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${base}ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}ffmpeg-core.wasm`, 'application/wasm'),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`FFmpeg failed to load. Make sure the app is served via HTTP (not file://). Details: ${msg}`)
  }

  post({ type: 'progress', value: 0.05, label: 'Writing clips...' })

  const v1Segs = req.segments
    .filter((s) => s.trackIndex === 0)
    .sort((a, b) => a.startOnTimeline - b.startOnTimeline)

  if (v1Segs.length === 0) throw new Error('No video clips on the timeline.')

  // For large files (>200 MB), mount via WORKERFS to avoid copying into WASM memory.
  // For small files, use the existing fetch+writeFile path.
  const mountedDirs: string[] = []
  const writtenFiles = new Set<string>()
  const clipPathMap = new Map<string, string>()

  for (const seg of v1Segs) {
    const cd = req.clipFiles[seg.clipId]
    if (!cd) throw new Error(`Missing clip data for segment ${seg.id}`)
    const ext = cd.name.split('.').pop()?.toLowerCase() ?? 'mp4'
    const fname = `clip_${seg.clipId}.${ext}`

    if (clipPathMap.has(seg.clipId)) continue

    if (cd.file && cd.file.size > MOUNT_THRESHOLD) {
      const mountPoint = `/mount_${seg.clipId}`
      await ffmpeg.createDir(mountPoint)
      await ffmpeg.mount('WORKERFS' as never, { files: [cd.file] } as never, mountPoint)
      mountedDirs.push(mountPoint)
      clipPathMap.set(seg.clipId, `${mountPoint}/${cd.file.name}`)
    } else if (!writtenFiles.has(fname)) {
      const buf = await fetch(cd.url).then((r) => r.arrayBuffer())
      await ffmpeg.writeFile(fname, new Uint8Array(buf))
      writtenFiles.add(fname)
      clipPathMap.set(seg.clipId, fname)
    }
  }

  post({ type: 'progress', value: 0.2, label: 'Building timeline...' })

  const [width, height] = (req.resolution ?? '1920x1080').split('x').map(Number)
  const format = req.format ?? 'mp4'
  const quality = req.quality ?? 'good'
  const outputFile = `output.${format}`

  let lastLog = ''
  ffmpeg.on('log', ({ message }) => { lastLog = message })
  ffmpeg.on('progress', ({ progress }) => {
    post({ type: 'progress', value: 0.25 + progress * 0.7, label: 'Encoding...' })
  })

  post({ type: 'progress', value: 0.25, label: 'Encoding video...' })

  // Deduplicate: one -i per unique clip (not per segment) to avoid WASM OOM
  const clipInputMap = new Map<string, number>()
  const inputs: string[] = []
  for (const seg of v1Segs) {
    if (!clipInputMap.has(seg.clipId)) {
      const path = clipPathMap.get(seg.clipId)!
      clipInputMap.set(seg.clipId, clipInputMap.size)
      inputs.push('-i', path)
    }
  }
  const segInputIdx = v1Segs.map((s) => clipInputMap.get(s.clipId)!)

  const { filterComplex, videoOut, audioOut } = buildFilterComplex(
    v1Segs, req.transitions, req.adjustmentLayers, width, height, segInputIdx,
  )

  let exitCode = await ffmpeg.exec([
    ...inputs,
    '-filter_complex', filterComplex,
    '-map', `[${videoOut}]`, '-map', `[${audioOut}]`,
    ...buildEncodeArgs(format, quality, req.fps),
    '-y', outputFile,
  ])

  // If encoding failed (e.g. clip has no audio stream), the WASM may be in a
  // corrupted state. Terminate, reload, re-write/re-mount clips, then retry video-only.
  if (exitCode !== 0) {
    post({ type: 'progress', value: 0.25, label: 'Retrying (video only)...' })

    ffmpeg.terminate()
    await ffmpeg.load({
      coreURL: await toBlobURL(`${base}ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}ffmpeg-core.wasm`, 'application/wasm'),
    })

    mountedDirs.length = 0
    clipPathMap.clear()
    const retryInputs: string[] = []
    const retryClipInputMap = new Map<string, number>()

    for (const seg of v1Segs) {
      const cd = req.clipFiles[seg.clipId]
      if (!cd) continue
      if (clipPathMap.has(seg.clipId)) continue

      const ext = cd.name.split('.').pop()?.toLowerCase() ?? 'mp4'
      const fname = `clip_${seg.clipId}.${ext}`

      if (cd.file && cd.file.size > MOUNT_THRESHOLD) {
        const mountPoint = `/mount_${seg.clipId}`
        await ffmpeg.createDir(mountPoint)
        await ffmpeg.mount('WORKERFS' as never, { files: [cd.file] } as never, mountPoint)
        mountedDirs.push(mountPoint)
        clipPathMap.set(seg.clipId, `${mountPoint}/${cd.file.name}`)
      } else {
        const buf = await fetch(cd.url).then((r) => r.arrayBuffer())
        await ffmpeg.writeFile(fname, new Uint8Array(buf))
        clipPathMap.set(seg.clipId, fname)
      }
    }

    for (const seg of v1Segs) {
      if (!retryClipInputMap.has(seg.clipId)) {
        retryClipInputMap.set(seg.clipId, retryClipInputMap.size)
        retryInputs.push('-i', clipPathMap.get(seg.clipId)!)
      }
    }
    const retrySegIdx = v1Segs.map((s) => retryClipInputMap.get(s.clipId)!)

    const { filterComplex: videoOnlyFC, videoOut: vOut2 } = buildFilterComplex(
      v1Segs, req.transitions, req.adjustmentLayers, width, height, retrySegIdx, true,
    )
    exitCode = await ffmpeg.exec([
      ...retryInputs,
      '-filter_complex', videoOnlyFC,
      '-map', `[${vOut2}]`, '-an',
      ...buildEncodeArgs(format, quality, req.fps),
      '-y', outputFile,
    ])
  }

  if (exitCode !== 0) {
    for (const mp of mountedDirs) {
      try { await ffmpeg.unmount(mp) } catch { /* ignore */ }
    }
    throw new Error(`Export failed: ${lastLog || 'FFmpeg exited with code ' + exitCode}`)
  }

  post({ type: 'progress', value: 0.97, label: 'Reading output...' })

  const data = await ffmpeg.readFile(outputFile)
  const buffer = (data as Uint8Array).buffer

  for (const mp of mountedDirs) {
    try { await ffmpeg.unmount(mp) } catch { /* ignore */ }
  }

  post({ type: 'done', buffer } satisfies WorkerMessage, [buffer])
}

function buildEncodeArgs(
  format: 'mp4' | 'webm',
  quality: 'draft' | 'good' | 'best',
  fps: number,
  width?: number,
  height?: number,
): string[] {
  const crf = QUALITY_PRESETS[format][quality]
  const args: string[] = []

  if (format === 'webm') {
    args.push('-c:v', 'libvpx-vp9', '-crf', String(crf), '-b:v', '0')
    args.push('-c:a', 'libopus', '-b:a', '128k')
  } else {
    args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', String(crf))
    args.push('-c:a', 'aac', '-b:a', '128k')
    args.push('-movflags', '+faststart')
  }

  args.push('-r', String(fps))

  if (width != null && height != null) {
    args.push('-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`)
  }

  return args
}

function post(msg: WorkerMessage, transfer?: Transferable[]) {
  if (transfer) {
    self.postMessage(msg, { transfer })
  } else {
    self.postMessage(msg)
  }
}
