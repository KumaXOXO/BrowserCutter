// src/components/panels/MediaPanel/UploadZone.tsx
import { Upload } from 'lucide-react'
import { openVideoFiles, fileToClip } from '../../../lib/video/fileHandler'
import { useAppStore } from '../../../store/useAppStore'

export default function UploadZone() {
  const addClip = useAppStore((s) => s.addClip)

  async function handleUpload() {
    const files = await openVideoFiles()
    for (const file of files) {
      const clip = await fileToClip(file)
      addClip(clip)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    Promise.all(files.map(fileToClip)).then((clips) => clips.forEach(addClip))
  }

  return (
    <button
      onClick={handleUpload}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="w-full text-center rounded-xl cursor-pointer transition-all duration-200"
      style={{ padding: '18px 12px', border: '1.5px dashed rgba(255,255,255,0.12)', background: 'transparent' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(225,29,72,0.5)'; e.currentTarget.style.background = 'rgba(225,29,72,0.04)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'transparent' }}
    >
      <Upload size={20} className="mx-auto mb-2" style={{ color: 'var(--muted-subtle)' }} />
      <p className="text-xs" style={{ color: 'var(--muted2)' }}>
        Drop files or <span style={{ color: '#E11D48' }}>browse</span>
      </p>
    </button>
  )
}
