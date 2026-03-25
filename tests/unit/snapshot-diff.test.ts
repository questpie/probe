import { describe, expect, test } from 'bun:test'
import { diffSnapshots } from '../../src/browser/snapshot-diff'

const LOGIN_SNAPSHOT = `URL: /login
- heading "Login" [ref=@e1]
- textbox "Email" [ref=@e2]
- textbox "Password" [ref=@e3]
- button "Sign In" [ref=@e4]
- link "Forgot password?" [ref=@e5]
`

const DASHBOARD_SNAPSHOT = `URL: /dashboard
- heading "Dashboard" [ref=@e6]
- button "Logout" [ref=@e7]
- link "Forgot password?" [ref=@e5]
- table "Data" [ref=@e8]
`

describe('diffSnapshots', () => {
  test('detects URL change', () => {
    const result = diffSnapshots(LOGIN_SNAPSHOT, DASHBOARD_SNAPSHOT)
    expect(result).toContain('URL: /login \u2192 /dashboard')
  })

  test('detects removed elements', () => {
    const result = diffSnapshots(LOGIN_SNAPSHOT, DASHBOARD_SNAPSHOT)
    expect(result).toContain('REMOVED: heading "Login" [@e1]')
    expect(result).toContain('REMOVED: textbox "Email" [@e2]')
    expect(result).toContain('REMOVED: textbox "Password" [@e3]')
    expect(result).toContain('REMOVED: button "Sign In" [@e4]')
  })

  test('detects added elements', () => {
    const result = diffSnapshots(LOGIN_SNAPSHOT, DASHBOARD_SNAPSHOT)
    expect(result).toContain('ADDED:   heading "Dashboard" [@e6]')
    expect(result).toContain('ADDED:   button "Logout" [@e7]')
    expect(result).toContain('ADDED:   table "Data" [@e8]')
  })

  test('does not report unchanged elements', () => {
    const result = diffSnapshots(LOGIN_SNAPSHOT, DASHBOARD_SNAPSHOT)
    // "Forgot password?" link exists in both
    expect(result).not.toContain('Forgot password')
  })

  test('identical snapshots returns no changes', () => {
    const result = diffSnapshots(LOGIN_SNAPSHOT, LOGIN_SNAPSHOT)
    expect(result).toBe('No changes detected')
  })

  test('handles empty previous', () => {
    const result = diffSnapshots('', LOGIN_SNAPSHOT)
    expect(result).toContain('ADDED:   heading "Login" [@e1]')
    expect(result).toContain('ADDED:   button "Sign In" [@e4]')
  })

  test('handles empty current', () => {
    const result = diffSnapshots(LOGIN_SNAPSHOT, '')
    expect(result).toContain('REMOVED: heading "Login" [@e1]')
    expect(result).toContain('REMOVED: button "Sign In" [@e4]')
  })

  test('no URL line when URLs are same', () => {
    const snap1 = `URL: /page\n- button "A" [ref=@e1]\n`
    const snap2 = `URL: /page\n- button "B" [ref=@e2]\n`
    const result = diffSnapshots(snap1, snap2)
    expect(result).not.toContain('URL:')
    expect(result).toContain('REMOVED: button "A"')
    expect(result).toContain('ADDED:   button "B"')
  })

  test('no URL line when snapshots lack URLs', () => {
    const snap1 = `- button "X" [ref=@e1]\n`
    const snap2 = `- button "Y" [ref=@e2]\n`
    const result = diffSnapshots(snap1, snap2)
    expect(result).not.toContain('URL:')
  })
})
