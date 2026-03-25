import { afterEach, describe, expect, test } from 'bun:test'
import {
  clearRefs,
  getRefMap,
  isRef,
  resolveRef,
  updateRefs,
} from '../../src/browser/ref-resolver'

const SNAPSHOT = `
- heading "Login" [ref=@e1]
- textbox "Email" [ref=@e2]
- button "Sign In" [ref=@e3]
- link "Help" [ref=@e4]
`

afterEach(() => {
  clearRefs()
})

describe('updateRefs', () => {
  test('parses refs from snapshot', () => {
    updateRefs(SNAPSHOT)
    const map = getRefMap()
    expect(map.size).toBe(4)
    expect(map.has('@e1')).toBe(true)
    expect(map.has('@e2')).toBe(true)
    expect(map.has('@e3')).toBe(true)
    expect(map.has('@e4')).toBe(true)
  })

  test('stores role:name mapping', () => {
    updateRefs(SNAPSHOT)
    const map = getRefMap()
    expect(map.get('@e1')).toBe('heading:Login')
    expect(map.get('@e3')).toBe('button:Sign In')
  })

  test('clears old refs on update', () => {
    updateRefs(SNAPSHOT)
    expect(getRefMap().size).toBe(4)

    updateRefs('- button "New" [ref=@e10]\n')
    expect(getRefMap().size).toBe(1)
    expect(getRefMap().has('@e1')).toBe(false)
    expect(getRefMap().has('@e10')).toBe(true)
  })
})

describe('resolveRef', () => {
  test('resolves known @e ref', () => {
    updateRefs(SNAPSHOT)
    expect(resolveRef('@e1')).toBe('heading:Login')
  })

  test('returns original for unknown @e ref', () => {
    updateRefs(SNAPSHOT)
    expect(resolveRef('@e99')).toBe('@e99')
  })

  test('passes through CSS selectors unchanged', () => {
    expect(resolveRef('#myId')).toBe('#myId')
    expect(resolveRef('.my-class')).toBe('.my-class')
    expect(resolveRef('button[type="submit"]')).toBe('button[type="submit"]')
  })
})

describe('isRef', () => {
  test('recognizes @e refs', () => {
    expect(isRef('@e1')).toBe(true)
    expect(isRef('@e123')).toBe(true)
  })

  test('rejects non-refs', () => {
    expect(isRef('#id')).toBe(false)
    expect(isRef('.class')).toBe(false)
    expect(isRef('button')).toBe(false)
    expect(isRef('@eabc')).toBe(false)
    expect(isRef('')).toBe(false)
  })
})

describe('clearRefs', () => {
  test('empties the ref map', () => {
    updateRefs(SNAPSHOT)
    expect(getRefMap().size).toBe(4)
    clearRefs()
    expect(getRefMap().size).toBe(0)
  })
})
