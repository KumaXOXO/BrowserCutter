// src/lib/audio/bpmDetector.ts

export interface BpmResult {
  bpm: number
  offset: number
}

export async function detectBpm(file: File): Promise<BpmResult> {
  const arrayBuffer = await file.arrayBuffer()
  const ctx = new AudioContext()

  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    const sampleRate = audioBuffer.sampleRate
    const maxSamples = Math.min(audioBuffer.length, sampleRate * 60)
    const data = audioBuffer.getChannelData(0).subarray(0, maxSamples)
    return computeBpm(data, sampleRate)
  } finally {
    await ctx.close()
  }
}

function computeBpm(data: Float32Array, sampleRate: number): BpmResult {
  const windowSize = Math.round(sampleRate * 0.05)
  const hopSize = Math.round(windowSize / 2)

  const odf: number[] = []
  let prevEnergy = 0
  for (let i = 0; i + windowSize < data.length; i += hopSize) {
    let energy = 0
    for (let j = 0; j < windowSize; j++) energy += data[i + j] ** 2
    energy /= windowSize
    odf.push(Math.max(0, energy - prevEnergy))
    prevEnergy = energy
  }

  const hopDuration = hopSize / sampleRate

  // BPM 60–200 → period 1.0s–0.3s
  const minLag = Math.max(1, Math.round(0.3 / hopDuration))
  const maxLag = Math.round(1.0 / hopDuration)

  let bestLag = minLag
  let bestCorr = -Infinity

  for (let lag = minLag; lag <= maxLag; lag++) {
    const n = odf.length - lag
    if (n <= 0) continue
    let corr = 0
    for (let i = 0; i < n; i++) corr += odf[i] * odf[i + lag]
    if (corr / n > bestCorr) {
      bestCorr = corr / n
      bestLag = lag
    }
  }

  const periodSeconds = bestLag * hopDuration
  let bpm = 60 / periodSeconds

  while (bpm < 60) bpm *= 2
  while (bpm > 200) bpm /= 2

  // Phase offset: find which position within one beat period has the strongest onsets
  let bestPhase = 0
  let bestPhaseSum = -Infinity
  for (let phi = 0; phi < bestLag; phi++) {
    let sum = 0
    for (let i = phi; i < odf.length; i += bestLag) sum += odf[i]
    if (sum > bestPhaseSum) {
      bestPhaseSum = sum
      bestPhase = phi
    }
  }
  const offset = bestPhase * hopDuration

  return { bpm: Math.round(bpm), offset: Math.round(offset * 1000) / 1000 }
}
