// src/lib/audio/bpmDetector.ts

export async function detectBpm(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer()
  const ctx = new AudioContext()

  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    const sampleRate = audioBuffer.sampleRate
    const maxSamples = Math.min(audioBuffer.length, sampleRate * 60) // analyze first 60s
    const data = audioBuffer.getChannelData(0).subarray(0, maxSamples)
    return computeBpm(data, sampleRate)
  } finally {
    await ctx.close()
  }
}

function computeBpm(data: Float32Array, sampleRate: number): number {
  // Compute RMS energy in overlapping 50ms windows
  const windowSize = Math.round(sampleRate * 0.05)
  const hopSize = Math.round(windowSize / 2)
  const energies: number[] = []

  for (let i = 0; i + windowSize < data.length; i += hopSize) {
    let energy = 0
    for (let j = 0; j < windowSize; j++) energy += data[i + j] ** 2
    energies.push(energy / windowSize)
  }

  // Find onset peaks: local maximum that's 30% above local average
  const contextLen = 20
  const onsetTimes: number[] = []
  let lastOnset = -Infinity

  for (let i = contextLen; i < energies.length - contextLen; i++) {
    const localAvg = energies.slice(i - contextLen, i).reduce((a, b) => a + b, 0) / contextLen
    const isLocalMax = energies[i] > energies[i - 1] && energies[i] > energies[i + 1]

    if (isLocalMax && energies[i] > localAvg * 1.3) {
      const t = (i * hopSize) / sampleRate
      if (t - lastOnset > 0.2) { // min 200ms between onsets (max 300 BPM)
        onsetTimes.push(t)
        lastOnset = t
      }
    }
  }

  if (onsetTimes.length < 4) return 120 // not enough onsets — return default

  // Compute inter-onset intervals, take median
  const intervals: number[] = []
  for (let i = 1; i < onsetTimes.length; i++) {
    intervals.push(onsetTimes[i] - onsetTimes[i - 1])
  }

  const sorted = [...intervals].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]

  let bpm = 60 / median

  // Normalize to 60–200 BPM range
  while (bpm < 60) bpm *= 2
  while (bpm > 200) bpm /= 2

  return Math.round(bpm)
}
