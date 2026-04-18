import { describe, it, expect } from 'vitest'
import { parseSrt } from './parseSrt'

const SRT = `1
00:00:01,000 --> 00:00:04,000
Hello world

2
00:00:05,500 --> 00:00:09,200
Second subtitle
with two lines`

describe('parseSrt', () => {
  it('parses two subtitle blocks', () => {
    const result = parseSrt(SRT)
    expect(result).toHaveLength(2)
  })

  it('first block has correct timing', () => {
    const [first] = parseSrt(SRT)
    expect(first.startOnTimeline).toBe(1)
    expect(first.duration).toBeCloseTo(3)
    expect(first.text).toBe('Hello world')
  })

  it('second block joins multi-line text', () => {
    const [, second] = parseSrt(SRT)
    expect(second.text).toBe('Second subtitle\nwith two lines')
    expect(second.startOnTimeline).toBeCloseTo(5.5)
    expect(second.duration).toBeCloseTo(3.7)
  })

  it('returns empty array for invalid input', () => {
    expect(parseSrt('')).toHaveLength(0)
    expect(parseSrt('not an srt')).toHaveLength(0)
  })
})
