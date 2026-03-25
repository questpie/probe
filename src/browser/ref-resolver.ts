const REF_PATTERN = /^@e\d+$/

let refMap = new Map<string, string>()

export function updateRefs(snapshotText: string): void {
  refMap = new Map()

  const lines = snapshotText.split('\n')
  for (const line of lines) {
    const match = line.match(/\[ref=(@e\d+)\]/)
    if (!match) continue
    const ref = match[1]!

    const roleMatch = line.match(/^[\s-]*(\w+)\s+"([^"]*)"/)
    if (roleMatch) {
      refMap.set(ref, `${roleMatch[1]}:${roleMatch[2]}`)
    } else {
      refMap.set(ref, ref)
    }
  }
}

export function resolveRef(input: string): string {
  if (REF_PATTERN.test(input)) {
    return refMap.get(input) ?? input
  }
  return input
}

export function isRef(input: string): boolean {
  return REF_PATTERN.test(input)
}

export function getRefMap(): ReadonlyMap<string, string> {
  return refMap
}

export function clearRefs(): void {
  refMap = new Map()
}
