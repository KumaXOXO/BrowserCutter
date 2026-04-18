// src/components/timeline/ClipBlock.tsx
import { useEffect, useRef } from 'react'
import type { Segment, Clip } from '../../types'
import { useAppStore } from '../../store/useAppStore'

const CLIP_GRADIENTS = [
  'linear-gradient(135deg,#5B21B6,#7C3AED)',
  'linear-gradient(135deg,#0C5F78,#0891B2)',
  'linear-gradient(135deg,#065F46,#059669)',
]

const AUDIO_GRADIENT = 'linear-gradient(135deg,#1A4A2A,#2E7040)'

const PX_PER_SEC = 20

interface Props {
  segment: Segment
  clip: Clip
  zoom: number
}

export default function ClipBlock({ segment, clip, zoom }: Props) {
  const { selectedElement, setSelectedElement, removeSegment, updateSegment } = useAppStore()
  const isSelected = selectedElement?.id === segment.id
  const px = PX_PER_SEC * zoom
  const left  = segment.startOnTimeline * px
  const width = (segment.outPoint - segment.inPoint) * px

  const bgIndex = clip.id.charCodeAt(0) % CLIP_GRADIENTS.length
  const bg = clip.type === 'audio' ? AUDIO_GRADIENT : CLIP_GRADIENTS[bgIndex]
  const label = clip.name.replace(/\.[^.]+$/, '').slice(0, 4).toUpperCase()

  // Keep a stable ref for trim handlers to read current outPoint/inPoint
  const segRef = useRef(segment)
  segRef.current = segment

  // Delete with Delete/Backspace when selected
  useEffect(() => {
    if (!isSelected) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        setSelectedElement(null)
        removeSegment(segment.id)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isSelected, segment.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Move drag: mousedown on body
  const handleBodyMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    setSelectedElement({ type: 'segment', id: segment.id })

    const trackContent = (e.currentTarget as HTMLElement).parentElement!
    const trackRect = trackContent.getBoundingClientRect()
    const offsetX = e.clientX - trackRect.left - left

    const handleMouseMove = (ev: MouseEvent) => {
      const newStart = Math.max(0, (ev.clientX - trackRect.left - offsetX) / px)
      updateSegment(segment.id, { startOnTimeline: newStart })
    }
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Left trim: changes inPoint + startOnTimeline together (right edge stays fixed)
  const handleLeftTrimMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    const startX = e.clientX
    const initialInPoint = segRef.current.inPoint
    const initialStart = segRef.current.startOnTimeline

    const handleMouseMove = (ev: MouseEvent) => {
      const dSec = (ev.clientX - startX) / px
      const newInPoint = Math.max(0, Math.min(segRef.current.outPoint - 0.1, initialInPoint + dSec))
      const delta = newInPoint - initialInPoint
      const newStart = Math.max(0, initialStart + delta)
      updateSegment(segment.id, { inPoint: newInPoint, startOnTimeline: newStart })
    }
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Right trim: changes outPoint only (left edge stays fixed)
  const handleRightTrimMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    const startX = e.clientX
    const initialOutPoint = segRef.current.outPoint

    const handleMouseMove = (ev: MouseEvent) => {
      const dSec = (ev.clientX - startX) / px
      const newOutPoint = Math.max(segRef.current.inPoint + 0.1, Math.min(clip.duration, initialOutPoint + dSec))
      updateSegment(segment.id, { outPoint: newOutPoint })
    }
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      onMouseDown={handleBodyMouseDown}
      style={{
        position: 'absolute',
        top: 4, bottom: 4,
        left, width,
        borderRadius: 5,
        background: bg,
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        outline: isSelected ? '2px solid rgba(255,255,255,0.9)' : 'none',
        outlineOffset: 1,
        transition: 'filter 120ms',
      }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.filter = 'brightness(1.2)' }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = '' }}
    >
      {/* Left trim handle */}
      <div
        onMouseDown={handleLeftTrimMouseDown}
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 8,
          cursor: 'ew-resize', zIndex: 2,
          background: 'rgba(255,255,255,0.25)',
          borderRadius: '5px 0 0 5px',
        }}
      />
      <span style={{
        fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
        padding: '0 12px', whiteSpace: 'nowrap', letterSpacing: 0.3,
        pointerEvents: 'none', zIndex: 1,
      }}>
        {label}
      </span>
      {/* Right trim handle */}
      <div
        onMouseDown={handleRightTrimMouseDown}
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 8,
          cursor: 'ew-resize', zIndex: 2,
          background: 'rgba(255,255,255,0.25)',
          borderRadius: '0 5px 5px 0',
        }}
      />
    </div>
  )
}

export { PX_PER_SEC }
