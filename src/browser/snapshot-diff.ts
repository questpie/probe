interface SnapshotElement {
  ref: string
  role: string
  name: string
}

function parseSnapshot(text: string): SnapshotElement[] {
  const elements: SnapshotElement[] = []
  const lines = text.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('URL:')) continue

    // Match: - button "Sign In" [ref=@e4]
    const match = trimmed.match(/^-\s+(\w+)\s+"([^"]*)"\s+\[ref=(@e\d+)\]/)
    if (match) {
      elements.push({ role: match[1]!, name: match[2]!, ref: match[3]! })
      continue
    }

    // Match without quotes: - heading Login [ref=@e1]
    const matchNoQuote = trimmed.match(/^-\s+(\w+)\s+(.+?)\s+\[ref=(@e\d+)\]/)
    if (matchNoQuote) {
      elements.push({ role: matchNoQuote[1]!, name: matchNoQuote[2]!, ref: matchNoQuote[3]! })
    }
  }

  return elements
}

function extractUrl(text: string): string | null {
  const match = text.match(/^URL:\s*(.+)$/m)
  return match ? match[1]!.trim() : null
}

function elementKey(el: SnapshotElement): string {
  return `${el.role}:${el.name}`
}

export function diffSnapshots(previous: string, current: string): string {
  const prevElements = parseSnapshot(previous)
  const currElements = parseSnapshot(current)

  const prevUrl = extractUrl(previous)
  const currUrl = extractUrl(current)

  const prevKeys = new Map<string, SnapshotElement>()
  for (const el of prevElements) {
    prevKeys.set(elementKey(el), el)
  }

  const currKeys = new Map<string, SnapshotElement>()
  for (const el of currElements) {
    currKeys.set(elementKey(el), el)
  }

  const lines: string[] = []

  if (prevUrl && currUrl && prevUrl !== currUrl) {
    lines.push(`URL: ${prevUrl} \u2192 ${currUrl}`)
  }

  for (const [key, el] of prevKeys) {
    if (!currKeys.has(key)) {
      lines.push(`REMOVED: ${el.role} "${el.name}" [${el.ref}]`)
    }
  }

  for (const [key, el] of currKeys) {
    if (!prevKeys.has(key)) {
      lines.push(`ADDED:   ${el.role} "${el.name}" [${el.ref}]`)
    }
  }

  if (lines.length === 0) {
    return 'No changes detected'
  }

  return lines.join('\n')
}
