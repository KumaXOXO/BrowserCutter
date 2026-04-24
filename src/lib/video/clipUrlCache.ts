// Blob URL cache: one stable URL per clip, reused by ClipVideoPool.ensure()
const clipUrlCache = new Map<string, string>()

export function getClipUrl(clipId: string, file: File): string {
  let url = clipUrlCache.get(clipId)
  if (!url) {
    url = URL.createObjectURL(file)
    clipUrlCache.set(clipId, url)
  }
  return url
}

export function revokeClipUrl(clipId: string): void {
  const url = clipUrlCache.get(clipId)
  if (url) {
    URL.revokeObjectURL(url)
    clipUrlCache.delete(clipId)
  }
}

export function revokeAllClipUrls(): void {
  clipUrlCache.forEach(url => URL.revokeObjectURL(url))
  clipUrlCache.clear()
}
