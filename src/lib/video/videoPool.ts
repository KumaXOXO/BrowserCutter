import { getClipUrl, revokeClipUrl, revokeAllClipUrls } from './clipUrlCache'

interface PoolEntry {
  clipId: string
  element: HTMLVideoElement
}

const BASE_STYLE = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:transparent;display:none;opacity:0'

export class ClipVideoPool {
  private entries = new Map<string, PoolEntry>()
  private container: HTMLElement | null = null
  private objectFit: 'contain' | 'fill' = 'contain'

  private static hideElement(el: HTMLVideoElement): void {
    el.style.display = 'none'
    el.style.opacity = '0'
    el.style.transform = ''
    el.style.clipPath = ''
  }

  attach(container: HTMLElement): void {
    this.container = container
  }

  ensure(clipId: string, file: File): HTMLVideoElement {
    const existing = this.entries.get(clipId)
    if (existing) return existing.element

    const el = document.createElement('video')
    el.playsInline = true
    el.preload = 'auto'
    el.loop = false
    el.style.cssText = BASE_STYLE
    el.style.objectFit = this.objectFit
    el.src = getClipUrl(clipId, file)
    this.container?.appendChild(el)
    this.entries.set(clipId, { clipId, element: el })
    return el
  }

  get(clipId: string | null): HTMLVideoElement | null {
    if (!clipId) return null
    return this.entries.get(clipId)?.element ?? null
  }

  showOnly(clipId: string): void {
    for (const [id, entry] of this.entries) {
      if (id === clipId) {
        entry.element.style.display = 'block'
        entry.element.style.opacity = '1'
      } else {
        ClipVideoPool.hideElement(entry.element)
      }
    }
  }

  showBoth(clipIdA: string, clipIdB: string): void {
    for (const [id, entry] of this.entries) {
      if (id === clipIdA || id === clipIdB) {
        entry.element.style.display = 'block'
      } else {
        ClipVideoPool.hideElement(entry.element)
      }
    }
  }

  hideAll(): void {
    for (const entry of this.entries.values()) {
      ClipVideoPool.hideElement(entry.element)
    }
  }

  pauseAllExcept(activeClipId: string): void {
    for (const [id, entry] of this.entries) {
      if (id !== activeClipId && !entry.element.paused) {
        entry.element.pause()
      }
    }
  }

  pauseAll(): void {
    for (const entry of this.entries.values()) {
      if (!entry.element.paused) entry.element.pause()
    }
  }

  applyFilter(clipId: string, filter: string): void {
    const entry = this.entries.get(clipId)
    if (entry) entry.element.style.filter = filter
  }

  clearAllFilters(): void {
    for (const entry of this.entries.values()) {
      entry.element.style.filter = ''
    }
  }

  setObjectFit(fit: 'contain' | 'fill'): void {
    this.objectFit = fit
    for (const entry of this.entries.values()) {
      entry.element.style.objectFit = fit
    }
  }

  remove(clipId: string): void {
    const entry = this.entries.get(clipId)
    if (!entry) return
    entry.element.pause()
    entry.element.removeAttribute('src')
    entry.element.load()
    entry.element.remove()
    this.entries.delete(clipId)
    revokeClipUrl(clipId)
  }

  syncToClips(activeClipIds: Set<string>): void {
    for (const clipId of this.entries.keys()) {
      if (!activeClipIds.has(clipId)) this.remove(clipId)
    }
  }

  resetStyles(): void {
    for (const entry of this.entries.values()) {
      ClipVideoPool.hideElement(entry.element)
      entry.element.style.filter = ''
    }
  }

  destroy(): void {
    for (const entry of this.entries.values()) {
      entry.element.pause()
      entry.element.removeAttribute('src')
      entry.element.load()
      entry.element.remove()
    }
    this.entries.clear()
    revokeAllClipUrls()
    this.container = null
  }
}
