import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { currentSharedPaths } from './session'

/**
 * Reference counting for shared (cross-session) services. Each shared service
 * tracks the set of session ids that currently depend on it, so `compose down`
 * only stops it once the LAST referencing session releases it.
 *
 * Refs live at `<root>/shared/refs/<name>.json` and hold a deduped list of
 * session ids (tracking ids — not just a number — lets a future GC drop refs
 * held by sessions that no longer exist).
 */
function refsFile(name: string): string {
  return join(currentSharedPaths().base, 'refs', `${name}.json`)
}

export async function readRefs(name: string): Promise<string[]> {
  try {
    const content = await readFile(refsFile(name), 'utf-8')
    const parsed = JSON.parse(content) as unknown
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

async function writeRefs(name: string, refs: string[]): Promise<void> {
  const file = refsFile(name)
  await mkdir(join(currentSharedPaths().base, 'refs'), { recursive: true })
  await writeFile(file, JSON.stringify(refs, null, 2), 'utf-8')
}

/** Add `session` to the ref set for `name` (idempotent). Returns the new set. */
export async function addRef(name: string, session: string): Promise<string[]> {
  const refs = await readRefs(name)
  if (!refs.includes(session)) refs.push(session)
  await writeRefs(name, refs)
  return refs
}

/** Remove `session` from the ref set for `name`. Returns the remaining set. */
export async function removeRef(name: string, session: string): Promise<string[]> {
  const remaining = (await readRefs(name)).filter((s) => s !== session)
  if (remaining.length > 0) {
    await writeRefs(name, remaining)
  } else {
    await rm(refsFile(name), { force: true })
  }
  return remaining
}
