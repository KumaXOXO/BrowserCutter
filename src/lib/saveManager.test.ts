// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { loadProjectFromDir } from './saveManager'

afterEach(() => {
  vi.unstubAllGlobals()
})

const BASE_PROJECT = {
  segments: [],
  clips: [{ id: 'c1', name: 'test.mp4', mediaPath: 'media/test.mp4' }],
  projectSettings: { resolution: '1920x1080' },
}

function makeProjectFh(json: object) {
  const projectFile = new File([JSON.stringify(json)], 'project.json', { type: 'application/json' })
  return { getFile: vi.fn().mockResolvedValue(projectFile) }
}

function makeDir(projectFh: object, mediaDirFh?: object) {
  return {
    getFileHandle: vi.fn().mockImplementation((name: string) =>
      name === 'project.json'
        ? Promise.resolve(projectFh)
        : Promise.reject(new DOMException('not found', 'NotFoundError')),
    ),
    getDirectoryHandle: mediaDirFh
      ? vi.fn().mockResolvedValue(mediaDirFh)
      : vi.fn().mockRejectedValue(new DOMException('no media', 'NotFoundError')),
  }
}

describe('loadProjectFromDir — Change 1: FSAPI permission fix', () => {
  it('returns clip.file=undefined (no crash) when snap.arrayBuffer() throws', async () => {
    const expiredSnap = {
      name: 'test.mp4', type: 'video/mp4', lastModified: 1000,
      arrayBuffer: vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotReadableError')),
    }
    const mediaFileFh = { getFile: vi.fn().mockResolvedValue(expiredSnap) }
    const mediaDirFh = { getFileHandle: vi.fn().mockResolvedValue(mediaFileFh) }
    const dirFh = makeDir(makeProjectFh(BASE_PROJECT), mediaDirFh)

    vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue(dirFh))

    const result = await loadProjectFromDir()

    expect(result.ok).toBe(true)
    const clips = result.data!.clips as Array<Record<string, unknown>>
    expect(clips).toHaveLength(1)
    expect(clips[0].file).toBeUndefined()
    expect(clips[0].mediaPath).toBe('media/test.mp4') // original data intact
  })

  it('returns a memory-backed File when arrayBuffer() succeeds', async () => {
    const fakeBuffer = new ArrayBuffer(8)
    const snap = {
      name: 'test.mp4', type: 'video/mp4', lastModified: 1000,
      arrayBuffer: vi.fn().mockResolvedValue(fakeBuffer),
    }
    const mediaFileFh = { getFile: vi.fn().mockResolvedValue(snap) }
    const mediaDirFh = { getFileHandle: vi.fn().mockResolvedValue(mediaFileFh) }
    const dirFh = makeDir(makeProjectFh(BASE_PROJECT), mediaDirFh)

    vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue(dirFh))

    const result = await loadProjectFromDir()

    expect(result.ok).toBe(true)
    const clips = result.data!.clips as Array<Record<string, unknown>>
    const file = clips[0].file as File
    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('test.mp4')
    expect(file.type).toBe('video/mp4')
    // Memory-backed: arrayBuffer() readable without FSAPI permission
    await expect(file.arrayBuffer()).resolves.toBeInstanceOf(ArrayBuffer)
  })

  it('returns clip without file when media/ directory does not exist', async () => {
    const dirFh = makeDir(makeProjectFh(BASE_PROJECT), undefined) // no mediaDirFh
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue(dirFh))

    const result = await loadProjectFromDir()

    expect(result.ok).toBe(true)
    const clips = result.data!.clips as Array<Record<string, unknown>>
    expect(clips[0].file).toBeUndefined()
  })
})

describe('saveProjectFile — Change 2: surface silent save failures', () => {
  function makeSaveDir(opts: {
    writeFails?: boolean
    filename?: string
  } = {}) {
    const { writeFails = false, filename = 'clip.mp4' } = opts
    const writable = {
      write: writeFails
        ? vi.fn().mockRejectedValue(new DOMException('disk full', 'QuotaExceededError'))
        : vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    }
    const mediaFileFh = { createWritable: vi.fn().mockResolvedValue(writable) }
    const mediaDirFh = { getFileHandle: vi.fn().mockResolvedValue(mediaFileFh) }
    const projectWritable = { write: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) }
    const projectFh = { createWritable: vi.fn().mockResolvedValue(projectWritable) }
    const saveDir = {
      getDirectoryHandle: vi.fn().mockResolvedValue(mediaDirFh),
      getFileHandle: vi.fn().mockImplementation((name: string) =>
        name === 'project.json' ? Promise.resolve(projectFh) : Promise.resolve(mediaFileFh)
      ),
      name: 'my-project',
    }
    return { saveDir, filename }
  }

  it('returns skippedFiles containing the filename when a media copy throws', async () => {
    const { saveDir, filename } = makeSaveDir({ writeFails: true, filename: 'clip.mp4' })
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue(saveDir))

    // Reset modules so _saveDir starts null regardless of earlier tests in this file
    vi.resetModules()
    const { ensureSaveDir, saveProjectFile } = await import('./saveManager')
    const { useAppStore } = await import('../store/useAppStore')

    await ensureSaveDir() // sets _saveDir = saveDir on the fresh module instance

    const fakeFile = new File([new ArrayBuffer(4)], filename, { type: 'video/mp4' })
    const prevClips = useAppStore.getState().clips
    useAppStore.setState({ clips: [{ id: 'c1', name: filename, file: fakeFile, duration: 1, width: 0, height: 0, type: 'video' }] })

    const result = await saveProjectFile()
    useAppStore.setState({ clips: prevClips })

    expect(result.ok).toBe(true)
    expect(result.skippedFiles).toContain(filename)
  })
})
