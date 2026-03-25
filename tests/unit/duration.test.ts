import { describe, expect, test } from 'bun:test'
import { formatDuration, parseDuration } from '../../src/utils/duration'

describe('parseDuration', () => {
  test('milliseconds', () => {
    expect(parseDuration('100ms')).toBe(100)
    expect(parseDuration('0ms')).toBe(0)
    expect(parseDuration('999ms')).toBe(999)
  })

  test('seconds', () => {
    expect(parseDuration('1s')).toBe(1_000)
    expect(parseDuration('30s')).toBe(30_000)
    expect(parseDuration('0.5s')).toBe(500)
  })

  test('minutes', () => {
    expect(parseDuration('1m')).toBe(60_000)
    expect(parseDuration('5m')).toBe(300_000)
    expect(parseDuration('1.5m')).toBe(90_000)
  })

  test('hours', () => {
    expect(parseDuration('1h')).toBe(3_600_000)
    expect(parseDuration('2h')).toBe(7_200_000)
  })

  test('days', () => {
    expect(parseDuration('1d')).toBe(86_400_000)
    expect(parseDuration('2d')).toBe(172_800_000)
  })

  test('rejects invalid input', () => {
    expect(() => parseDuration('')).toThrow('Invalid duration')
    expect(() => parseDuration('abc')).toThrow('Invalid duration')
    expect(() => parseDuration('10')).toThrow('Invalid duration')
    expect(() => parseDuration('10x')).toThrow('Invalid duration')
    expect(() => parseDuration('s')).toThrow('Invalid duration')
    expect(() => parseDuration('-5s')).toThrow('Invalid duration')
  })
})

describe('formatDuration', () => {
  test('milliseconds range', () => {
    expect(formatDuration(0)).toBe('0ms')
    expect(formatDuration(500)).toBe('500ms')
    expect(formatDuration(999)).toBe('999ms')
  })

  test('seconds range', () => {
    expect(formatDuration(1_000)).toBe('1.0s')
    expect(formatDuration(3_000)).toBe('3.0s')
    expect(formatDuration(59_999)).toBe('60.0s')
  })

  test('minutes range', () => {
    expect(formatDuration(60_000)).toBe('1m')
    expect(formatDuration(90_000)).toBe('1m 30s')
    expect(formatDuration(300_000)).toBe('5m')
    expect(formatDuration(3_599_999)).toBe('59m 59s')
  })

  test('hours range', () => {
    expect(formatDuration(3_600_000)).toBe('1h')
    expect(formatDuration(5_400_000)).toBe('1h 30m')
    expect(formatDuration(7_200_000)).toBe('2h')
  })
})
