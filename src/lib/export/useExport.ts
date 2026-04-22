// src/lib/export/useExport.ts
import { useState, useRef, useCallback } from 'react'
import type { WorkerMessage } from './exportWorker'
import { useAppStore } from '../../store/useAppStore'
import { writeExportFile } from '../saveManager'

export type ExportStatus = 'idle' | 'running' | 'done' | 'error'

export interface ExportState {
  status: ExportStatus
  progress: number
  label: string
  errorMsg: string
  startExport: () => void
  cancel: () => void
}

export function useExport(): ExportState {
  const [status, setStatus] = useState<ExportStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [label, setLabel] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const workerRef = useRef<Worker | null>(null)

  const cancel = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    setStatus('idle')
    setProgress(0)
    setLabel('')
  }, [])

  const startExport = useCallback(async () => {
    const { segments, clips, projectSettings, transitions, adjustmentLayers, tracks } = useAppStore.getState()

    const videoTrackIndices = new Set(tracks.filter((t) => t.type === 'video').map((t) => t.trackIndex))
    const videoSegs = segments.filter((s) => videoTrackIndices.has(s.trackIndex))
    if (videoSegs.length === 0) {
      setErrorMsg('Add at least one clip to the timeline before exporting.')
      setStatus('error')
      return
    }

    setStatus('running')
    setProgress(0)
    setLabel('Preparing...')
    setErrorMsg('')

    const clipData: Record<string, { buffer: ArrayBuffer; name: string }> = {}
    const needed = new Set(videoSegs.map((s) => s.clipId))

    const missingFiles = clips.filter((c) => needed.has(c.id) && !c.file).map((c) => c.name)
    if (missingFiles.length > 0) {
      setErrorMsg(`Cannot export: ${missingFiles.length} clip(s) have no source file. Re-import them in the Media tab: ${missingFiles.slice(0, 3).join(', ')}${missingFiles.length > 3 ? '…' : ''}`)
      setStatus('error')
      return
    }

    const unreadable: string[] = []
    for (const clip of clips) {
      if (!needed.has(clip.id)) continue
      if (!clip.file) continue
      try {
        const buffer = await clip.file.arrayBuffer()
        clipData[clip.id] = { buffer, name: clip.name }
      } catch {
        unreadable.push(clip.name)
      }
    }
    if (unreadable.length > 0) {
      setErrorMsg(`Cannot read ${unreadable.length} file(s): ${unreadable.slice(0, 3).join(', ')}${unreadable.length > 3 ? '…' : ''}. Re-import them in the Media tab and try again.`)
      setStatus('error')
      return
    }

    const worker = new Worker(
      new URL('./exportWorker.ts', import.meta.url),
      { type: 'module' },
    )
    workerRef.current = worker

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data
      if (msg.type === 'progress') {
        setProgress(msg.value)
        setLabel(msg.label)
      } else if (msg.type === 'done') {
        setProgress(1)
        setLabel('Done!')
        setStatus('done')
        const ext = projectSettings.format === 'webm' ? 'webm' : 'mp4'
        const filename = `browsercutter-export.${ext}`
        writeExportFile(msg.buffer, filename)
          .then((saved) => { if (!saved) downloadBuffer(msg.buffer, filename) })
          .catch(() => downloadBuffer(msg.buffer, filename))
          .finally(() => { workerRef.current = null })
      } else if (msg.type === 'error') {
        setErrorMsg(msg.message)
        setStatus('error')
        workerRef.current = null
      }
    }

    worker.onerror = (err) => {
      setErrorMsg(err.message ?? 'Worker error')
      setStatus('error')
      workerRef.current = null
    }

    const transferBuffers = Object.values(clipData).map((c) => c.buffer)

    const resolution = projectSettings.resolution === 'custom'
      ? `${projectSettings.customWidth ?? 1920}x${projectSettings.customHeight ?? 1080}`
      : projectSettings.resolution
    const fps = projectSettings.fps === 0 ? (projectSettings.customFps ?? 30) : projectSettings.fps

    worker.postMessage(
      {
        segments: videoSegs,
        clipData,
        fps,
        resolution,
        transitions,
        adjustmentLayers,
        format: projectSettings.format,
        quality: projectSettings.quality,
      },
      transferBuffers,
    )
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { status, progress, label, errorMsg, startExport, cancel }
}

function downloadBuffer(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: 'video/mp4' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
