// src/lib/video/fileHandler.ts
import { v4 as uuidv4 } from 'uuid'
import type { Clip } from '../../types'
import { generateThumbnail } from './thumbnail'

export async function openVideoFiles(): Promise<File[]> {
  // Use standard file input — FSAPI (showOpenFilePicker) files lose read
  // permission after focus changes, causing NotReadableError at export time.
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'video/*,audio/*,image/*'
    input.onchange = () => resolve(Array.from(input.files ?? []))
    input.click()
  })
}

const VIDEO_EXTS = new Set(['mp4', 'mov', 'avi', 'webm', 'mkv', 'm4v', 'ogv'])
const AUDIO_EXTS = new Set(['mp3', 'wav', 'aac', 'ogg', 'm4a', 'flac', 'opus'])

export async function fileToClip(file: File): Promise<Clip> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const type = file.type.startsWith('video/') || VIDEO_EXTS.has(ext) ? 'video'
    : file.type.startsWith('audio/') || AUDIO_EXTS.has(ext) ? 'audio'
    : 'image'

  const id = uuidv4()

  if (type === 'video') {
    try {
      const { duration, width, height, thumbnail } = await getVideoMeta(file)
      return { id, file, name: file.name, duration, width, height, type, thumbnail }
    } catch {
      return { id, file, name: file.name, duration: 0, width: 0, height: 0, type }
    }
  }

  if (type === 'audio') {
    const duration = await getAudioDuration(file)
    return { id, file, name: file.name, duration, width: 0, height: 0, type }
  }

  // image — convert to data URL so it persists across project save/load
  const thumbnail = await new Promise<string>((resolve) => {
    const blobUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 160; canvas.height = 90
      canvas.getContext('2d')!.drawImage(img, 0, 0, 160, 90)
      URL.revokeObjectURL(blobUrl)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve('') }
    img.src = blobUrl
  })
  return { id, file, name: file.name, duration: 5, width: 0, height: 0, type, thumbnail }
}

async function getVideoMeta(file: File): Promise<{ duration: number; width: number; height: number; thumbnail: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.src = url
    video.preload = 'metadata'
    video.onloadedmetadata = async () => {
      const { duration, videoWidth: width, videoHeight: height } = video
      const thumbnail = await generateThumbnail(video)
      URL.revokeObjectURL(url)
      resolve({ duration, width, height, thumbnail })
    }
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load video')) }
  })
}

async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio')
    const url = URL.createObjectURL(file)
    audio.src = url
    audio.onloadedmetadata = () => { resolve(audio.duration); URL.revokeObjectURL(url) }
    audio.onerror = () => { resolve(0); URL.revokeObjectURL(url) }
  })
}
