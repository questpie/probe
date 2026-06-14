---
"@questpie/probe": minor
---

Add `qprobe design <url>` — measure the rendered UI for layout and design-token defects, deterministically and without a vision model. Launches headless Chromium, and for each `--viewport` runs a DOM geometry scan (overflow, truncation, collapse, sibling overlap, near-miss misalignment, tap targets, sub-16px input fonts) plus a CSS-variable token-conformance scan (off-palette colors, off-token box-shadows, off-token border-radii), printing JSON findings. The scanners are shared verbatim with the agent-board `agent-board-design-qa` skill.
