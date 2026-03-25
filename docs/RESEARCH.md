# Deep Research: Ako reprezentovať webovú stránku pre AI agenta
## + Kompletná mapa existujúcich nástrojov a gap analýza

---

## 1. Tri základné prístupy k vnímaniu stránky

### A) Screenshot (Vision-based)
Agent urobí screenshot → pošle ako obrázok do VLM (Vision Language Model).

**Výhody:** Vidí presne to čo človek. Zachytí layout, farby, vizuálny kontext.
**Nevýhody:** 
- 1,200–5,000 tokenov per screenshot (drahé)
- Nevidí skryté elementy, disabled state, aria atribúty
- Koordináty sú nestabilné ("klikni na pixel 342,187")
- Privacy risk — posiela celú obrazovku do cloudu

**Kto to používa:** OpenAI CUA/Operator (hybrid), Anthropic Computer Use

### B) DOM parsing (Raw HTML)
Agent dostane HTML source stránky.

**Výhody:** Kompletná informácia, vrátane skrytých elementov.
**Nevýhody:**
- Obrovský — bežná stránka = 50k–500k tokenov
- Väčšina je noise (CSS classes, tracking scripts, wrapper divy)
- Agent sa v tom stráca — "lost in the middle" problém

**Kto to používa:** Prakticky nikto v produkcii sám o sebe.

### C) Accessibility Tree (A11y Tree) ⭐ Winning approach
Browser automaticky vytvára zjednodušenú štruktúru pre screen readery. Obsahuje len meaningful elementy: buttons, links, inputs, headings — s ich roles a names.

**Výhody:**
- 10-100x menší než DOM
- Obsahuje len čo je relevantné pre interakciu
- Stabilné (semantic roles sa nemenia keď sa zmení CSS)
- Rovnaká data ako screen readery → dobre otestované browsermi

**Nevýhody:**
- Nevidí vizuálny layout (spacing, colors, alignment)
- Kvalita závisí od HTML kvality (div clickhandler vs semantic button)
- Shadow DOM — open shadow DOM funguje, closed nie

**Kto to používa:** Playwright MCP, agent-browser, PinchTab, Charlotte, Chrome DevTools MCP, OpenAI Atlas, Perplexity Comet

### D) Hybrid (A11y Tree + Screenshot) — Best practice
Najúspešnejšie riešenia kombinujú:
- A11y tree pre interakciu a navigation
- Screenshot pre vizuálnu verifikáciu

OpenAI CUA dosahuje 87% success rate na WebVoyager práve s hybrid prístupom.

---

## 2. Detail levels — Koľko kontextu agent potrebuje?

### Charlotte MCP — Tri úrovne detailu (najsofistikovanejší prístup)

Charlotte je MCP server, ktorý decomponuje stránku do structured representation a ponúka 3 úrovne:

| Úroveň | Čo vráti | Príklad veľkosti |
|---------|----------|-------------------|
| **minimal** (default) | Landmarks, headings, počty interaktívnych elementov per region | 336 chars (HN) |
| **summary** | + content summaries, form štruktúry | ~2k chars |
| **full** | Kompletný typed tree s element IDs, bounding boxes, metadata | ~10k chars |

**Workflow:**
```
navigate("https://example.com")     → 612 chars: title, landmarks, headings
find({ type: "link", text: "About" }) → len matchujúce elementy s IDs
click({ element_id: "lnk-a3f1" })  → vykoná akciu
```

**Kľúčový insight:** Agent NEPOTREBUJE celú stránku. Na navigáciu stačí minimal → potom targeted query na konkrétny element → interakcia. Charlotte dosahuje **25–182x menej dát** než Playwright MCP.

### agent-browser — Snapshot s filtrami

```bash
agent-browser snapshot         # Full a11y tree
agent-browser snapshot -i      # Len interactive elements (buttons, inputs, links)
agent-browser snapshot -c      # Compact (remove empty structural elements)
agent-browser snapshot -d 3    # Limit depth to 3 levels
agent-browser snapshot -s "#main"  # Scope na CSS selector
agent-browser snapshot -i -c -d 5  # Kombinácia
```

Výsledok: **200–400 tokenov** pre typickú stránku (interactive only).

### PinchTab — Flat JSON s refs

```json
{
  "refs": [
    {"id": "e0", "role": "link", "text": "Sign In", "selector": "a[href='/login']"},
    {"id": "e1", "role": "textbox", "label": "Email"},
    {"id": "e2", "role": "button", "text": "Submit"}
  ],
  "text": "... readable text version ...",
  "title": "Login Page"
}
```

~800 tokenov per page. Plus readability mode (stripped nav/ads) alebo raw mode.

### Playwright CLI — YAML snapshots na disk

CLI uloží snapshot ako YAML súbor na disk. Agent ho prečíta len keď potrebuje. 68 tokenov na celý skill popis. **4-10x menej tokenov** než MCP.

---

## 3. Element Identification — Ako referencovať elementy

| Nástroj | Pattern | Príklad | Stabilita |
|---------|---------|---------|-----------|
| agent-browser | @eN refs | `@e1`, `@e2` | Stabilné v rámci session |
| PinchTab | eN refs | `e0`, `e5`, `e21` | Cached per tab after snapshot |
| Charlotte | typed IDs | `lnk-a3f1`, `btn-c7e2` | Obsahujú typ elementu |
| Playwright MCP | a11y tree index | index v tree | Nestabilné pri DOM zmene |
| Playwright CLI | eN refs | `e15`, `e21` | Snapshot-based |

**Insight:** Všetky moderné nástroje konvergujú na **ref pattern** (e1, e2...) — krátke, stabilné, token-efektívne identifikátory naviazané na accessibility tree. Toto je de facto štandard.

---

## 4. Prístup k logom — Kľúčová požiadavka

### Browser console logy

| Nástroj | Console access | Ako |
|---------|---------------|-----|
| **agent-browser** | ✅ | `agent-browser console` — log, error, warn, info + `--clear` |
| **agent-browser** | ✅ | `agent-browser errors` — uncaught JS exceptions |
| **Charlotte** | ✅ | `console` tool — severity levels, filtering, timestamps |
| **Charlotte** | ✅ | `requests` tool — full HTTP history, method/status/type filtering |
| **Playwright MCP** | ✅ | `browser_console_messages` tool |
| **Chrome DevTools MCP** | ✅ | Full DevTools access: console, network, performance, heap |
| **PinchTab** | ⚠️ | Cez `eval` (JavaScript execution) |

### Dev server / Process logy

| Nástroj | Process logs | Ako |
|---------|-------------|-----|
| **agent-tail** ⭐ NEW | ✅ | Pipe stdout/stderr do log files, agent číta cez `cat`/`grep` |
| **Frontman** | ✅ | Middleware do dev servera — vidí server logs + client state |
| **BrowserTools MCP** | ⚠️ | Chrome extension → Node middleware → MCP |
| agent-browser | ❌ | Len browser, nie process management |
| Charlotte | ⚠️ | `dev_serve` pre static files, nie arbitrary processes |

### agent-tail — Najzaujímavejší pre tvoj use case

```bash
# Spusti dev server + zachytávaj logy
agent-tail run 'fe: bun dev' 'api: bun run server'

# Logy sú v tmp/logs/latest/
tail -f tmp/logs/latest/*.log

# Agent môže čítať:
cat tmp/logs/latest/fe.log | grep ERROR
```

- **Vite plugin** — zachytáva browser `console.*` output do rovnakého log systému
- **Next.js plugin** — to isté pre Next
- **Zero token overhead** — žiadne MCP schema, len file reads
- Logy sú plain text so timestamps, levels, source locations, stack traces

### Frontman — AI agent v browseri so server-side visibility

- Middleware do dev servera (Vite, Next.js, Astro)
- Vidí oboje: **client-side** (DOM, component tree, console) + **server-side** (routes, module graph, logs, middleware state)
- Mapuje runtime elementy späť na source code cez sourcemaps
- Open-source, žiadne limity

---

## 5. Kompletná mapa nástrojov (Marec 2026)

### Browser Control (výber najlepších)

| Nástroj | Jazyk | Prístup | Token cost/page | Console | Network | Process mgmt |
|---------|-------|---------|-----------------|---------|---------|--------------|
| **agent-browser** | Rust+Node | CLI | ~200-400 | ✅ | ✅ fetch | ❌ |
| **Playwright CLI** | Node | CLI | ~200-400 (file) | ✅ | ✅ | ❌ |
| **Playwright MCP** | Node | MCP | ~3,600+/page | ✅ | ✅ | ❌ |
| **Charlotte** | Node | MCP | ~336-612 | ✅ | ✅ | ❌ |
| **PinchTab** | Go | HTTP API | ~800 | ⚠️ | ⚠️ | ❌ |
| **Chrome DevTools MCP** | Node | MCP | varies | ✅✅ | ✅✅ | ❌ |
| **Stagehand v3** | TypeScript | SDK | varies (LLM) | ❌ | ❌ | ❌ |

### Log Management

| Nástroj | Browser logs | Server logs | File-based | Token-efficient |
|---------|-------------|-------------|------------|-----------------|
| **agent-tail** | ✅ (plugin) | ✅ | ✅ | ✅✅✅ |
| **Frontman** | ✅ | ✅ | ❌ (middleware) | ✅✅ |
| **BrowserTools MCP** | ✅ | ❌ | ❌ (MCP) | ⚠️ (13-18k schema) |

### Process Management

**NIKTO.** Žiadny existujúci nástroj nerieši:
- `start(cmd, readyPattern)` → čakaj na "ready"
- `healthCheck(url, interval, timeout)`
- `stop(processId)`
- `compose({db, server, browser})`

---

## 6. Odporúčanie: Architektúra tvojho package

### Tier 1: Core (čo existuje a funguje)
**Použi, nekopíruj:**
- `agent-browser` — browser control, snapshot, refs, console, screenshots
- `agent-tail` pattern — log capture do files pre token efficiency

### Tier 2: Orchestration (čo chýba = tvoja hodnota)
**Postav:**
- **Process Manager** — start/stop/health-check dev serverov
- **Log Aggregator** — browser console + process stdout/stderr → unified stream
- **Test Session** — record/replay/diff
- **MCP Server** — expose všetko pre Claude Code

### Tier 3: Intelligence (budúcnosť)
**Pridaj neskôr:**
- Charlotte-style detail levels pre tvoj QUESTPIE admin
- Smart diff (čo sa zmenilo od poslednej akcie)
- Framework-aware mode (QUESTPIE routes, collections, blocks)

### Navrhovaná architektúra:

```
┌────────────────────────────────────────────────────────┐
│            Tvoj Package (MCP + CLI)                    │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Process     │  │    Log       │  │    Test      │ │
│  │   Manager     │  │  Aggregator  │  │   Session    │ │
│  │               │  │              │  │              │ │
│  │ • start()     │  │ • browser    │  │ • record()   │ │
│  │ • stop()      │  │   console    │  │ • replay()   │ │
│  │ • health()    │  │ • process    │  │ • diff()     │ │
│  │ • restart()   │  │   stdout/err │  │ • assert()   │ │
│  │ • compose()   │  │ • unified    │  │              │ │
│  │               │  │   stream     │  │              │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                  │          │
│  ┌──────┴─────────────────┴──────────────────┴───────┐ │
│  │          Browser Driver Adapter                    │ │
│  │                                                    │ │
│  │  ┌─────────────────┐  ┌────────────────────────┐  │ │
│  │  │  agent-browser   │  │   playwright-cli       │  │ │
│  │  │  (default)       │  │   (optional)           │  │ │
│  │  │                  │  │                        │  │ │
│  │  │  • snapshot -i   │  │  • snapshot            │  │ │
│  │  │  • @e refs       │  │  • e refs              │  │ │
│  │  │  • console       │  │  • test codegen        │  │ │
│  │  │  • screenshot    │  │  • network intercept   │  │ │
│  │  │  • annotate      │  │  • cross-browser       │  │ │
│  │  └─────────────────┘  └────────────────────────┘  │ │
│  └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### Prečo nie Charlotte alebo PinchTab?
- Charlotte — zaujímavý detail-level pattern, ale je to MCP-only server (ťažké wrappovať). Pattern **skopíruj** do svojho adaptéra.
- PinchTab — Go binary, HTTP API. Zaujímavé, ale agent-browser je lepšie integrované s coding agents a má väčšiu community.

### Prečo agent-browser + playwright-cli combo:
1. **agent-browser** ako default: persistent daemon, Rust-fast, token-efficient, annotated screenshots, console/errors
2. **playwright-cli** keď treba: cross-browser, network intercept, test codegen, full Playwright ecosystem
3. Oba používajú **rovnaký ref pattern** (e1, e2...) → adapter je jednoduchý
4. Oba sú **CLI-first** → token-efficient (žiadna MCP schema overhead)
5. Oba sú **MIT/Apache licensed**

---

## 7. Key Insight: Token Efficiency Hierarchy

```
agent-browser snapshot -i -c     ~200 tokens   ← najlepšie
Charlotte minimal                ~336 chars
PinchTab snapshot                ~800 tokens
Playwright CLI (file ref)        ~20 tokens (path only!)
agent-tail log read              ~0 tokens (file read)
                    ─── vs ───
Playwright MCP schema            ~3,600 tokens (upfront)
Playwright MCP snapshot          ~3,000-10,000 tokens/page
Full DOM                         ~50,000-500,000 tokens
Screenshot (vision)              ~1,200-5,000 tokens
```

Pre dev testing s 20+ page interactions, CLI prístup (agent-browser/playwright-cli) ušetrí **desiatky tisíc tokenov** oproti MCP.

---

## 8. Zdroje

### Kľúčové projekty
- [agent-browser](https://github.com/vercel-labs/agent-browser) — Vercel Labs, Rust CLI
- [Playwright CLI](https://github.com/microsoft/playwright-cli) — Microsoft, Token-efficient
- [Playwright MCP](https://github.com/microsoft/playwright-mcp) — Microsoft, MCP server
- [Charlotte](https://github.com/TickTockBent/charlotte) — Detail-level page representation
- [PinchTab](https://github.com/pinchtab/pinchtab) — Go binary, HTTP API
- [agent-tail](https://github.com/gillkyle/agent-tail) — Log capture pre AI agentov
- [Frontman](https://dev.to/bluehotdog/i-built-an-ai-coding-agent-that-lives-in-your-browser-4oc4) — Framework-aware browser agent
- [Chrome DevTools MCP](https://developer.chrome.com/blog/chrome-devtools-mcp) — Google, full DevTools
- [BrowserTools MCP](https://github.com/AgentDeskAI/browser-tools-mcp) — Console/network monitoring

### Benchmarky a analýzy
- [Better Stack: CLI vs MCP](https://betterstack.com/community/guides/ai/playwright-cli-vs-mcp-browser/) — Head-to-head token comparison
- [Pulumi: Self-Verifying Agents](https://www.pulumi.com/blog/self-verifying-ai-agents-vercels-agent-browser-in-the-ralph-wiggum-loop/) — agent-browser real-world test
- [No Hacks: How AI Agents See Websites](https://nohacks.co/blog/how-ai-agents-see-your-website) — A11y tree as primary interface
- [Arcade: Stop Pasting Console Logs](https://www.arcade.dev/blog/stop-pasting-chromes-console-logs-into-your-agent/) — Console log problem analysis
