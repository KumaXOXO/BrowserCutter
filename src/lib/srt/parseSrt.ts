// src/lib/srt/parseSrt.ts
import { v4 as uuidv4 } from 'uuid'
import type { TextOverlay } from '../../types'

export function parseSrt(srtContent: string): TextOverlay[] {
  const blocks = srtContent.trim().split(/\n\s*\n/)
  return blocks.flatMap((block) => {
    const lines = block.trim().split('\n')
    if (lines.length < 3) return []
    const timeLine = lines[1]
    const match = timeLine.match(
      /(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/
    )
    if (!match) return []
    const startOnTimeline = srtTimeToSeconds(match[1])
    const endTime = srtTimeToSeconds(match[2])
    const text = lines.slice(2).join('\n').trim()
    if (!text) return []
    return [{
      id: uuidv4(),
      text,
      startOnTimeline,
      duration: Math.max(0.1, endTime - startOnTimeline),
      font: 'Inter',
      size: 32,
      color: '#FFFFFF',
      x: 0.5,
      y: 0.85,
    }] as TextOverlay[]
  })
}

function srtTimeToSeconds(t: string): number {
  const normalized = t.replace(',', '.')
  const [h, m, s] = normalized.split(':')
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s)
}
