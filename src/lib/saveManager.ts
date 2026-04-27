// src/lib/saveManager.ts
// Handles folder-based project save/load using File System Access API.
// Falls back to JSON download on unsupported browsers.

import { useAppStore } from '../store/useAppStore'

let _saveDir: FileSystemDirectoryHandle | null = null

export function hasSaveDir(): boolean { return _saveDir !== null }
export function getSaveDirName(): string | null { return _saveDir?.name ?? null }

async function pickDir(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const picker = (window as unknown as { showDirectoryPicker(o: { mode: string }): Promise<FileSystemDirectoryHandle> }).showDirectoryPicker
    const dir = await picker({ mode: 'readwrite' })
    _saveDir = dir
    return dir
  } catch {
    return null
  }
}

export async function ensureSaveDir(): Promise<FileSystemDirectoryHandle | null> {
  if (_saveDir) return _saveDir
  return pickDir()
}

export async function saveProjectFile(): Promise<{ ok: boolean; reason?: string; skippedFiles?: string[] }> {
  const { projectName, projectSettings, segments, textOverlays, bpmConfig, transitions, adjustmentLayers, clips, tracks } = useAppStore.getState()

  if ('showDirectoryPicker' in window) {
    if (!_saveDir) {
      const dir = await pickDir()
      if (!dir) return { ok: false, reason: 'cancelled' }
    }
    try {
      // Copy media files to media/ subdirectory — sequential to avoid multiple
      // simultaneous 2GB temp files that saturate disk and freeze the system.
      const skippedFiles: string[] = []
      const mediaDir = await _saveDir!.getDirectoryHandle('media', { create: true })
      const serializedClips: Record<string, unknown>[] = []
      for (const { file, ...meta } of clips) {
        if (!file) { serializedClips.push(meta); continue }
        try {
          // Skip write if an identically-sized file already exists in the media dir.
          let alreadySaved = false
          try {
            const existing = await mediaDir.getFileHandle(file.name)
            const existingFile = await existing.getFile()
            if (existingFile.size === file.size) alreadySaved = true
          } catch { /* file not yet saved, proceed */ }

          if (!alreadySaved) {
            const fh = await mediaDir.getFileHandle(file.name, { create: true })
            const writable = await fh.createWritable()
            await writable.write(file)
            await writable.close()
            // Keep the in-memory File reference — calling fh.getFile() would replace it
            // with an FSAPI snapshot that expires after tab focus changes.
          }
          serializedClips.push({ ...meta, mediaPath: `media/${file.name}` })
        } catch (e) {
          if (import.meta.env.DEV) console.error('[saveManager] failed to copy', file.name, e)
          skippedFiles.push(file.name)
          serializedClips.push(meta)
        }
      }

      const data = { projectName, projectSettings, segments, textOverlays, bpmConfig, transitions, adjustmentLayers, clips: serializedClips, tracks, savedAt: Date.now() }
      const fh = await _saveDir!.getFileHandle('project.json', { create: true })
      const writable = await fh.createWritable()
      await writable.write(JSON.stringify(data, null, 2))
      await writable.close()
      return { ok: true, skippedFiles }
    } catch (e: unknown) {
      // Only reset the saved directory when the handle is no longer valid
      // (e.g. user deleted the folder). Transient I/O errors keep the handle.
      if (e instanceof DOMException && (e.name === 'NotFoundError' || e.name === 'InvalidStateError')) {
        _saveDir = null
      }
      return { ok: false, reason: e instanceof Error ? e.message : String(e) }
    }
  } else {
    // Fallback: download JSON (no media bundling without directory access)
    const serializedClips = clips.map(({ file: _f, ...meta }) => meta)
    const data = { projectName, projectSettings, segments, textOverlays, bpmConfig, transitions, adjustmentLayers, clips: serializedClips, tracks, savedAt: Date.now() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName || 'project'}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    return { ok: true }
  }
}

export async function loadProjectFromDir(): Promise<{ ok: boolean; data?: Record<string, unknown>; reason?: string }> {
  if (!('showDirectoryPicker' in window)) {
    return { ok: false, reason: 'File System Access API not supported in this browser.' }
  }
  try {
    const picker = (window as unknown as { showDirectoryPicker(o: { mode: string }): Promise<FileSystemDirectoryHandle> }).showDirectoryPicker
    const dir = await picker({ mode: 'readwrite' })
    _saveDir = dir

    let projectFh: FileSystemFileHandle
    try {
      projectFh = await dir.getFileHandle('project.json')
    } catch {
      return { ok: false, reason: 'No project.json found in the selected folder. Did you pick the right folder?' }
    }

    const projectFile = await projectFh.getFile()
    const json = JSON.parse(await projectFile.text()) as Record<string, unknown>

    // Restore media files from the media/ subdirectory
    let mediaDir: FileSystemDirectoryHandle | null = null
    try { mediaDir = await dir.getDirectoryHandle('media') } catch { /* no media dir */ }

    if (mediaDir) {
      const rawClips = json.clips as Array<Record<string, unknown>>
      const md = mediaDir

      // Scan media/proxy/ for existing proxy files
      let proxyDir: FileSystemDirectoryHandle | null = null
      try { proxyDir = await md.getDirectoryHandle('proxy') } catch { /* no proxy dir */ }
      const proxyMap = new Map<string, File>()
      if (proxyDir) {
        for await (const [name, handle] of proxyDir as unknown as AsyncIterable<[string, FileSystemHandle]>) {
          if (handle.kind === 'file' && name.endsWith('_proxy.mp4')) {
            const file = await (handle as FileSystemFileHandle).getFile()
            const originalBase = name.replace(/_proxy\.mp4$/, '')
            proxyMap.set(originalBase, file)
          }
        }
      }

      json.clips = await Promise.all(rawClips.map(async (clip) => {
        const mediaPath = clip.mediaPath as string | undefined
        if (!mediaPath) return clip
        try {
          const filename = mediaPath.replace(/^media\//, '')
          const fileFh = await md.getFileHandle(filename)
          const snap = await fileFh.getFile()
          const buf = await snap.arrayBuffer()
          const file = new File([buf], snap.name, { type: snap.type, lastModified: snap.lastModified })

          const baseName = filename.replace(/\.[^.]+$/, '')
          const proxyFile = proxyMap.get(baseName)
          return proxyFile ? { ...clip, file, proxyFile } : { ...clip, file }
        } catch {
          return clip
        }
      }))
    }

    return { ok: true, data: json }
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') return { ok: false, reason: 'cancelled' }
    return { ok: false, reason: e instanceof Error ? e.message : String(e) }
  }
}

export async function getUniqueExportFilename(baseName: string, ext: string): Promise<string> {
  if (!_saveDir) return `${baseName}.${ext}`
  try {
    const exportDir = await _saveDir.getDirectoryHandle('export', { create: true })
    let candidate = `${baseName}.${ext}`
    let n = 2
    for (;;) {
      try {
        await exportDir.getFileHandle(candidate)
        candidate = `${baseName}_${n}.${ext}`
        n++
      } catch {
        break
      }
    }
    return candidate
  } catch {
    return `${baseName}.${ext}`
  }
}

export async function writeExportFile(buffer: ArrayBuffer, filename: string): Promise<boolean> {
  if (!_saveDir) return false
  try {
    const exportDir = await _saveDir.getDirectoryHandle('export', { create: true })
    const fh = await exportDir.getFileHandle(filename, { create: true })
    const writable = await fh.createWritable()
    await writable.write(buffer)
    await writable.close()
    return true
  } catch {
    return false
  }
}
